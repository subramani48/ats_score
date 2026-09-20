import { lastValueFrom, toArray } from 'rxjs';
import { QueueService } from '../modules/queue/queue.service';

// Fix 5: finished jobs are erased and the uploaded file is dropped from memory
const payload = () => ({
  resumeBuffer: 'A'.repeat(1000), name: 'N', email: 'e@x.com', mode: 'analyze', domain: 'd',
  originalName: 'r.pdf', mimeType: 'application/pdf', sizeBytes: 1000,
});
const MIN = 60_000;

describe('QueueService', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  const jobsOf = (service: QueueService) => (service as unknown as { jobs: Map<string, { data: { resumeBuffer: string } }> }).jobs;

  it('runs a job, keeps its result readable, drops the uploaded file, then erases the job after 10 minutes', async () => {
    const processor = { process: jest.fn().mockResolvedValue({ analysisId: 'a1' }) };
    const service = new QueueService(processor as never);
    const id = await service.enqueue(payload() as never);
    await jest.advanceTimersByTimeAsync(0);

    const status = await service.getJobStatus(id);
    expect(status).toMatchObject({ state: 'completed', result: { analysisId: 'a1' } });
    expect(jobsOf(service).get(id)?.data.resumeBuffer).toBe('');   // 5a: the big file is gone

    await jest.advanceTimersByTimeAsync(10 * MIN - 1);
    expect(jobsOf(service).has(id)).toBe(true);                    // still readable just before 10 minutes
    await jest.advanceTimersByTimeAsync(1);
    expect(jobsOf(service).has(id)).toBe(false);                   // 5b: erased at 10 minutes
    await expect(service.getJobStatus(id)).rejects.toThrow(/not found/i);
  });

  it('also drops the file and erases a job that failed', async () => {
    const service = new QueueService({ process: jest.fn().mockRejectedValue(new Error('boom')) } as never);
    const id = await service.enqueue(payload() as never);
    await jest.advanceTimersByTimeAsync(0);
    expect(await service.getJobStatus(id)).toMatchObject({ state: 'failed', failedReason: 'boom' });
    expect(jobsOf(service).get(id)?.data.resumeBuffer).toBe('');
    await jest.advanceTimersByTimeAsync(10 * MIN);
    expect(jobsOf(service).size).toBe(0);
  });

  it('erases a job that never finishes after 30 minutes (safety net)', async () => {
    const service = new QueueService({ process: jest.fn(() => new Promise(() => undefined)) } as never);
    const id = await service.enqueue(payload() as never);
    await jest.advanceTimersByTimeAsync(0);
    expect((await service.getJobStatus(id)).state).toBe('active');
    await jest.advanceTimersByTimeAsync(30 * MIN - 1);
    expect(jobsOf(service).has(id)).toBe(true);
    await jest.advanceTimersByTimeAsync(1);
    expect(jobsOf(service).has(id)).toBe(false);
  });

  it('does not let its cleanup timers keep the server alive (they are unref-ed)', async () => {
    const spy = jest.spyOn(global, 'setTimeout');
    const service = new QueueService({ process: jest.fn().mockResolvedValue({}) } as never);
    await service.enqueue(payload() as never);
    await jest.advanceTimersByTimeAsync(0);
    const cleanupTimers = spy.mock.results.filter((_, i) => [10 * MIN, 30 * MIN].includes(spy.mock.calls[i][1] as number));
    expect(cleanupTimers.length).toBeGreaterThanOrEqual(2);
    for (const r of cleanupTimers) expect(typeof (r.value as { unref?: unknown }).unref).toBe('function');
    spy.mockRestore();
  });

  describe('progress stream', () => {
    it('answers a missing job with a "Job not found" message and closes, instead of crashing', async () => {
      const service = new QueueService({ process: jest.fn() } as never);
      const events = await lastValueFrom(service.createProgressStream('nope').pipe(toArray()));
      expect(events).toEqual([{ data: { message: 'Job not found' }, type: 'error' }]);
    });

    it('sends the result of an already-finished job once, then closes', async () => {
      const service = new QueueService({ process: jest.fn().mockResolvedValue({ analysisId: 'a1' }) } as never);
      const id = await service.enqueue(payload() as never);
      await jest.advanceTimersByTimeAsync(0);
      const events = await lastValueFrom(service.createProgressStream(id).pipe(toArray()));
      expect(events).toEqual([{ data: { analysisId: 'a1' }, type: 'completed' }]);
    });

    it('sends the failure of an already-failed job, then closes', async () => {
      const service = new QueueService({ process: jest.fn().mockRejectedValue(new Error('boom')) } as never);
      const id = await service.enqueue(payload() as never);
      await jest.advanceTimersByTimeAsync(0);
      const events = await lastValueFrom(service.createProgressStream(id).pipe(toArray()));
      expect(events).toEqual([{ data: { message: 'boom' }, type: 'error' }]);
    });

    it('streams progress then the result of a running job, and closes itself afterwards', async () => {
      let release!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; });
      const processor = {
        process: jest.fn(async (job: { updateProgress: (p: unknown) => Promise<void> }) => {
          await gate;
          await job.updateProgress({ step: 'x', percent: 80, message: 'nearly' });
          return { analysisId: 'a2' };
        }),
      };
      const service = new QueueService(processor as never);
      const id = await service.enqueue(payload() as never);
      await jest.advanceTimersByTimeAsync(0);

      const collected = lastValueFrom(service.createProgressStream(id).pipe(toArray()));
      release();
      await jest.advanceTimersByTimeAsync(0);
      const events = await collected;
      expect(events.map(e => e.type)).toEqual(['progress', 'completed']);
    });
  });
});
