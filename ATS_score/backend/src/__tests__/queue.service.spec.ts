import { lastValueFrom, toArray } from 'rxjs';
import {
  QueueService, CONCURRENCY, STALE_LOCK_MS, MAX_ATTEMPTS, FINISHED_JOB_TTL_MS, MAX_JOB_AGE_MS,
} from '../modules/queue/queue.service';

// Jobs are kept in the AnalysisJob table. These tests use a small in-memory stand-in for that table that
// understands the where clauses QueueService sends (equality, null, { lt }, OR), so the claiming, locking
// and cleanup rules are tested as they would run against the database.
type Row = Record<string, any>;

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === 'OR') return (cond as Row[]).some(w => matches(row, w));
    if (cond && typeof cond === 'object' && !(cond instanceof Date) && 'lt' in cond) {
      return row[key] != null && row[key] < cond.lt;
    }
    const value = row[key] ?? null;
    if (cond instanceof Date) return value instanceof Date && value.getTime() === cond.getTime();
    return value === (cond ?? null);
  });
}

function pick(row: Row, select?: Row): Row {
  if (!select) return { ...row };
  return Object.fromEntries(Object.keys(select).map(k => [k, row[k] ?? null]));
}

function fakeDb() {
  const rows = new Map<string, Row>();
  let clock = 0;
  const analysisJob = {
    create: jest.fn(async ({ data }: { data: Row }) => {
      const row: Row = {
        state: 'waiting', progress: null, result: null, failedReason: null, attempts: 0,
        lockedBy: null, lockedAt: null, finishedAt: null, createdAt: new Date(Date.now() + clock++), ...data,
      };
      rows.set(row.id, row);
      return { ...row };
    }),
    findFirst: jest.fn(async ({ where, orderBy, select }: Row) => {
      const found = [...rows.values()].filter(r => matches(r, where));
      if (orderBy?.createdAt === 'asc') found.sort((a, b) => a.createdAt - b.createdAt);
      return found[0] ? pick(found[0], select) : null;
    }),
    findUnique: jest.fn(async ({ where, select }: Row) => {
      const row = rows.get(where.id);
      return row ? pick(row, select) : null;
    }),
    updateMany: jest.fn(async ({ where, data }: Row) => {
      const hit = [...rows.values()].filter(r => matches(r, where));
      for (const r of hit) {
        for (const [k, v] of Object.entries(data as Row)) {
          r[k] = v && typeof v === 'object' && 'increment' in v ? r[k] + v.increment : v;
        }
      }
      return { count: hit.length };
    }),
    deleteMany: jest.fn(async ({ where }: Row) => {
      const hit = [...rows.values()].filter(r => matches(r, where));
      hit.forEach(r => rows.delete(r.id));
      return { count: hit.length };
    }),
  };
  return { rows, prisma: { analysisJob } };
}

const payload = () => ({
  resumeBuffer: Buffer.from('%PDF resume').toString('base64'), name: 'N', email: 'e@x.com', mode: 'analyze',
  domain: 'd', originalName: 'r.pdf', mimeType: 'application/pdf', sizeBytes: 11,
});
const MIN = 60_000;

function setup(process: jest.Mock = jest.fn().mockResolvedValue({ analysisId: 'a1' }), db = fakeDb()) {
  const service = new QueueService(db.prisma as never, { process } as never);
  return { service, process, ...db };
}

describe('QueueService (jobs kept in the database)', () => {
  afterEach(() => jest.useRealTimers());

  it('saves a job with the file kept apart from the other details, and starts it right away', async () => {
    const { service, process, rows } = setup();
    const id = await service.enqueue(payload() as never);
    const saved = rows.get(id)!;
    expect(Buffer.from(saved.fileData).toString()).toBe('%PDF resume');
    expect(saved.payload).not.toHaveProperty('resumeBuffer');
    expect(saved.payload.email).toBe('e@x.com');

    await service.whenIdle();
    expect(process).toHaveBeenCalledTimes(1);
    expect(process.mock.calls[0][0].data.resumeBuffer).toBe(payload().resumeBuffer);
  });

  it('stores the result, drops the file, and keeps the result readable', async () => {
    const { service, rows } = setup();
    const id = await service.enqueue(payload() as never);
    await service.whenIdle();

    expect(rows.get(id)).toMatchObject({ state: 'completed', result: { analysisId: 'a1' }, fileData: null, attempts: 1 });
    expect(rows.get(id)!.finishedAt).toBeInstanceOf(Date);
    await expect(service.getJobStatus(id)).resolves.toMatchObject({ state: 'completed', result: { analysisId: 'a1' } });
  });

  it('stores the failure reason and drops the file of a job that failed', async () => {
    const { service, rows } = setup(jest.fn().mockRejectedValue(new Error('boom')));
    const id = await service.enqueue(payload() as never);
    await service.whenIdle();
    expect(rows.get(id)).toMatchObject({ state: 'failed', failedReason: 'boom', fileData: null });
  });

  it('saves progress to the database so any server can report it', async () => {
    let release!: () => void;
    const process = jest.fn(async job => {
      await job.updateProgress({ step: 'parsing', percent: 10, message: 'Extracting…' });
      await new Promise<void>(r => { release = r; });
      return { ok: true };
    });
    const { service, rows } = setup(process);
    const id = await service.enqueue(payload() as never);
    await new Promise(r => setImmediate(r));

    expect(rows.get(id)).toMatchObject({ state: 'active', progress: { step: 'parsing', percent: 10 } });
    await expect(service.getJobStatus(id)).resolves.toMatchObject({ state: 'active', progress: { percent: 10 } });
    release();
    await service.whenIdle();
  });

  it(`runs at most ${CONCURRENCY} jobs at once on one server and starts the next when one ends`, async () => {
    const releases: Array<() => void> = [];
    const process = jest.fn(() => new Promise(r => releases.push(() => r({}))));
    const { service, rows } = setup(process);
    const ids = [];
    for (let i = 0; i < CONCURRENCY + 1; i++) ids.push(await service.enqueue(payload() as never));
    await new Promise(r => setImmediate(r));

    expect(process).toHaveBeenCalledTimes(CONCURRENCY);
    expect(rows.get(ids[CONCURRENCY])!.state).toBe('waiting');

    releases[0]();
    await new Promise(r => setTimeout(r, 10));
    expect(process).toHaveBeenCalledTimes(CONCURRENCY + 1);
    releases.forEach(r => r());
    await service.whenIdle();
  });

  it('a job saved before a restart is run by the new server (nothing is lost)', async () => {
    const db = fakeDb();
    // The old server saved the job and then stopped before starting it.
    await db.prisma.analysisJob.create({ data: { id: 'j1', payload: { mode: 'analyze' }, fileData: new Uint8Array([1]) } });

    const { service, process } = setup(undefined, db);
    await service.tick();
    await service.whenIdle();
    expect(process).toHaveBeenCalledTimes(1);
    expect(db.rows.get('j1')!.state).toBe('completed');
  });

  it('takes over a job whose server stopped in the middle (its lock went stale)', async () => {
    const db = fakeDb();
    await db.prisma.analysisJob.create({
      data: { id: 'j1', payload: {}, fileData: new Uint8Array([1]), state: 'active', attempts: 1, lockedBy: 'dead-server', lockedAt: new Date(Date.now() - STALE_LOCK_MS - 1000) },
    });
    const { service, process } = setup(undefined, db);
    await service.tick();
    await service.whenIdle();
    expect(process).toHaveBeenCalledTimes(1);
    expect(db.rows.get('j1')).toMatchObject({ state: 'completed', attempts: 2, lockedBy: service.workerId });
  });

  it('leaves alone a job another server is still working on', async () => {
    const db = fakeDb();
    await db.prisma.analysisJob.create({
      data: { id: 'j1', payload: {}, state: 'active', attempts: 1, lockedBy: 'live-server', lockedAt: new Date() },
    });
    const { service, process } = setup(undefined, db);
    await service.tick();
    expect(process).not.toHaveBeenCalled();
    expect(db.rows.get('j1')!.lockedBy).toBe('live-server');
  });

  it(`gives up on a job after ${MAX_ATTEMPTS} interrupted runs`, async () => {
    const db = fakeDb();
    await db.prisma.analysisJob.create({
      data: { id: 'j1', payload: {}, fileData: new Uint8Array([1]), state: 'active', attempts: MAX_ATTEMPTS, lockedBy: 'dead', lockedAt: new Date(Date.now() - STALE_LOCK_MS - 1000) },
    });
    const { service, process } = setup(undefined, db);
    await service.tick();
    expect(process).not.toHaveBeenCalled();
    expect(db.rows.get('j1')).toMatchObject({ state: 'failed', fileData: null });
    expect(db.rows.get('j1')!.failedReason).toMatch(/upload your resume again/);
  });

  it('two servers polling the same table never run the same job twice', async () => {
    const db = fakeDb();
    const a = setup(undefined, db);
    const b = setup(undefined, db);
    for (let i = 0; i < 6; i++) await db.prisma.analysisJob.create({ data: { id: `j${i}`, payload: {}, fileData: new Uint8Array([1]) } });

    await Promise.all([a.service.tick(), b.service.tick(), a.service.tick(), b.service.tick()]);
    while ([...db.rows.values()].some(r => r.state !== 'completed')) {
      await Promise.all([a.service.whenIdle(), b.service.whenIdle()]);
      await Promise.all([a.service.tick(), b.service.tick()]);
    }
    const runs = [...a.process.mock.calls, ...b.process.mock.calls].map(c => c[0].id).sort();
    expect(runs).toEqual(['j0', 'j1', 'j2', 'j3', 'j4', 'j5']);
  });

  it('a server that lost its lock cannot overwrite the result of the server that took over', async () => {
    let release!: () => void;
    const { service, rows } = setup(jest.fn(() => new Promise(r => { release = () => r({ from: 'old' }); })));
    const id = await service.enqueue(payload() as never);
    await new Promise(r => setImmediate(r));

    Object.assign(rows.get(id)!, { lockedBy: 'other-server', state: 'completed', result: { from: 'new' } });
    release();
    await service.whenIdle();
    expect(rows.get(id)!.result).toEqual({ from: 'new' });
  });

  it('erases finished jobs after 10 minutes and anything older than a day', async () => {
    const { service, rows, prisma } = setup();
    const now = Date.now();
    await prisma.analysisJob.create({ data: { id: 'recent', payload: {}, state: 'completed', finishedAt: new Date(now - 5 * MIN) } });
    await prisma.analysisJob.create({ data: { id: 'old', payload: {}, state: 'completed', finishedAt: new Date(now - FINISHED_JOB_TTL_MS - MIN) } });
    await prisma.analysisJob.create({ data: { id: 'ancient', payload: {}, state: 'waiting', createdAt: new Date(now - MAX_JOB_AGE_MS - MIN) } });
    await prisma.analysisJob.create({ data: { id: 'waiting', payload: {} } });

    await service.cleanup();
    expect([...rows.keys()].sort()).toEqual(['recent', 'waiting']);
  });

  it('does not let its timers keep the server alive (they are unref-ed)', () => {
    const { service } = setup();
    const spy = jest.spyOn(global, 'setInterval');
    service.onModuleInit();
    const timers = spy.mock.results.map(r => r.value as NodeJS.Timeout);
    expect(timers.length).toBeGreaterThan(0);
    timers.forEach(t => expect(t.hasRef()).toBe(false));
    service.onModuleDestroy();
    spy.mockRestore();
  });

  it('answers the status of an unknown job with 404', async () => {
    const { service } = setup();
    await expect(service.getJobStatus('nope')).rejects.toThrow('Job not found');
  });

  describe('progress stream', () => {
    it('answers a missing job with a "Job not found" message and closes, instead of crashing', async () => {
      const { service } = setup();
      const events = await lastValueFrom(service.createProgressStream('nope').pipe(toArray()));
      expect(events).toEqual([{ data: { message: 'Job not found' }, type: 'error' }]);
    });

    it('sends the result of an already-finished job once, then closes', async () => {
      const { service } = setup();
      const id = await service.enqueue(payload() as never);
      await service.whenIdle();
      const events = await lastValueFrom(service.createProgressStream(id).pipe(toArray()));
      expect(events).toEqual([{ data: { analysisId: 'a1' }, type: 'completed' }]);
    });

    it('sends the failure of an already-failed job, then closes', async () => {
      const { service } = setup(jest.fn().mockRejectedValue(new Error('bad file')));
      const id = await service.enqueue(payload() as never);
      await service.whenIdle();
      const events = await lastValueFrom(service.createProgressStream(id).pipe(toArray()));
      expect(events).toEqual([{ data: { message: 'bad file' }, type: 'error' }]);
    });

    it('streams each new progress step once, then the result, and closes itself afterwards', async () => {
      const gates: Array<() => void> = [];
      const step = (job: any, percent: number) => job.updateProgress({ step: 's', percent, message: `${percent}%` })
        .then(() => new Promise<void>(r => gates.push(r)));
      const process = jest.fn(async job => { await step(job, 10); await step(job, 60); return { done: true }; });
      const { service } = setup(process);
      const id = await service.enqueue(payload() as never);
      await new Promise(r => setImmediate(r));

      const events: unknown[] = [];
      const finished = new Promise<void>(resolve => service.createProgressStream(id).subscribe({ next: e => events.push(e), complete: resolve }));
      await new Promise(r => setTimeout(r, 1200));   // more than one poll on the same step
      gates.shift()!();
      await new Promise(r => setTimeout(r, 1200));
      gates.shift()!();
      await finished;

      expect(events).toEqual([
        { data: { step: 's', percent: 10, message: '10%' }, type: 'progress' },
        { data: { step: 's', percent: 60, message: '60%' }, type: 'progress' },
        { data: { done: true }, type: 'completed' },
      ]);
    });

    it('keeps the stream open through a database hiccup', async () => {
      const db = fakeDb();
      const { service } = setup(undefined, db);
      const id = await service.enqueue(payload() as never);
      await service.whenIdle();
      db.prisma.analysisJob.findUnique.mockRejectedValueOnce(new Error('connection reset'));

      const events = await lastValueFrom(service.createProgressStream(id).pipe(toArray()));
      expect(events).toEqual([{ data: { analysisId: 'a1' }, type: 'completed' }]);
    });
  });
});
