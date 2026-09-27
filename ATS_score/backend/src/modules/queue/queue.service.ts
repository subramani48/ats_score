import { Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import type { AnalysisJobPayload } from '../../types';
import { AnalysisProcessor, JobProgress } from './processors/analysis.processor';

// Jobs live in the AnalysisJob table, so a server restart does not lose them and several servers can share
// the work. Each server polls for waiting jobs and claims one with a conditional update, so two servers
// never run the same job. While a job runs its lock is renewed; a lock that stops being renewed means that
// server died, and the job is picked up again (at most MAX_ATTEMPTS runs in total).
export const POLL_MS = 1000;
export const CONCURRENCY = 2;               // jobs one server runs at the same time
export const HEARTBEAT_MS = 15 * 1000;
export const STALE_LOCK_MS = 60 * 1000;     // no heartbeat for this long: the server is gone
export const MAX_ATTEMPTS = 3;
// A finished job is kept briefly so the website can still read its result, then erased. The analysis
// itself is saved in its own table, so nothing is lost.
export const FINISHED_JOB_TTL_MS = 10 * 60 * 1000;
// Safety net: any job this old is erased whatever its state.
export const MAX_JOB_AGE_MS = 24 * 60 * 60 * 1000;
const CLEANUP_MS = 60 * 1000;

type JobRow = { id: string; state: string; payload: Prisma.JsonValue; fileData: Uint8Array | null; lockedAt: Date | null; attempts: number };

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  readonly workerId = uuidv4();
  private readonly running = new Map<string, Promise<void>>();
  private timers: NodeJS.Timeout[] = [];
  private ticking: Promise<void> | null = null;
  private tickAgain = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly processor: AnalysisProcessor,
  ) {}

  onModuleInit() {
    // unref so a pending timer never keeps the server from shutting down
    this.timers = [
      setInterval(() => void this.tick(), POLL_MS).unref(),
      setInterval(() => void this.cleanup(), CLEANUP_MS).unref(),
    ];
  }

  onModuleDestroy() {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }

  async enqueue(payload: AnalysisJobPayload): Promise<string> {
    const jobId = uuidv4();
    const { resumeBuffer, ...rest } = payload;
    const file = new Uint8Array(typeof resumeBuffer === 'string' ? Buffer.from(resumeBuffer, 'base64') : resumeBuffer);

    await this.prisma.analysisJob.create({
      data: { id: jobId, payload: rest as unknown as Prisma.InputJsonValue, fileData: file },
    });
    void this.tick();   // start now instead of at the next poll
    return jobId;
  }

  /** Starts waiting jobs while this server has free slots. Safe to call at any time. */
  tick(): Promise<void> {
    // A call during a running pass (new upload, finished job) asks for one more pass, so the new job is
    // not left for the next poll.
    this.tickAgain = true;
    if (!this.ticking) {
      this.ticking = (async () => {
        while (this.tickAgain) {
          this.tickAgain = false;
          await this.claimAndStart();
        }
      })().finally(() => { this.ticking = null; });
    }
    return this.ticking;
  }

  private async claimAndStart(): Promise<void> {
    try {
      while (this.running.size < CONCURRENCY) {
        const job = await this.claimNext();
        if (!job) break;
        const run = this.run(job).finally(() => {
          this.running.delete(job.id);
          void this.tick();
        });
        this.running.set(job.id, run);
      }
    } catch (err) {
      this.logger.error(`Queue poll failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** Resolves once this server is neither claiming nor running a job (used by tests). */
  async whenIdle(): Promise<void> {
    while (this.ticking || this.running.size > 0) {
      await this.ticking;
      await Promise.allSettled([...this.running.values()]);
    }
  }

  private async claimNext(): Promise<JobRow | null> {
    // A few tries, because another server may claim the same candidate first.
    for (let i = 0; i < 5; i++) {
      const staleBefore = new Date(Date.now() - STALE_LOCK_MS);
      const candidate = await this.prisma.analysisJob.findFirst({
        where: { OR: [{ state: 'waiting' }, { state: 'active', lockedAt: { lt: staleBefore } }] },
        orderBy: { createdAt: 'asc' },
        select: { id: true, state: true, lockedAt: true, attempts: true },
      });
      if (!candidate) return null;

      // Matching on the state and lock we just read makes the claim atomic: if anyone changed the row
      // in between, nothing is updated and we try again.
      const unchanged = { id: candidate.id, state: candidate.state, lockedAt: candidate.lockedAt };

      if (candidate.attempts >= MAX_ATTEMPTS) {
        await this.prisma.analysisJob.updateMany({
          where: unchanged,
          data: {
            state: 'failed', fileData: null, finishedAt: new Date(),
            failedReason: 'The analysis was interrupted several times. Please upload your resume again.',
          },
        });
        continue;
      }

      const { count } = await this.prisma.analysisJob.updateMany({
        where: unchanged,
        data: { state: 'active', lockedBy: this.workerId, lockedAt: new Date(), attempts: { increment: 1 } },
      });
      if (count !== 1) continue;

      if (candidate.state === 'active') this.logger.warn(`Job ${candidate.id} was abandoned by a stopped server; running it again`);
      return this.prisma.analysisJob.findUnique({
        where: { id: candidate.id },
        select: { id: true, state: true, payload: true, fileData: true, lockedAt: true, attempts: true },
      });
    }
    return null;
  }

  private async run(job: JobRow): Promise<void> {
    // Every write is limited to rows this server still holds, so a server that lost its lock (for example
    // after a long pause) cannot overwrite the work of the server that took the job over.
    const mine = { id: job.id, lockedBy: this.workerId };
    const heartbeat = setInterval(() => {
      this.prisma.analysisJob.updateMany({ where: mine, data: { lockedAt: new Date() } }).catch(() => undefined);
    }, HEARTBEAT_MS).unref();

    const finish = (data: Prisma.AnalysisJobUpdateManyMutationInput) =>
      this.prisma.analysisJob
        .updateMany({ where: mine, data: { ...data, fileData: null, finishedAt: new Date() } })
        .catch(err => this.logger.error(`Could not save the end of job ${job.id}: ${err?.message ?? err}`));

    try {
      const payload = job.payload as unknown as Omit<AnalysisJobPayload, 'resumeBuffer'>;
      const result = await this.processor.process({
        id: job.id,
        data: { ...payload, resumeBuffer: Buffer.from(job.fileData ?? new Uint8Array()).toString('base64') },
        updateProgress: async (progress: JobProgress) => {
          await this.prisma.analysisJob.updateMany({
            where: mine,
            data: { progress: progress as unknown as Prisma.InputJsonValue, lockedAt: new Date() },
          });
        },
      });
      await finish({ state: 'completed', result: (result ?? null) as Prisma.InputJsonValue });
    } catch (error: any) {
      await finish({ state: 'failed', failedReason: error?.message || String(error) });
    } finally {
      clearInterval(heartbeat);
    }
  }

  /** Erases finished jobs after FINISHED_JOB_TTL_MS, and anything older than MAX_JOB_AGE_MS. */
  async cleanup(): Promise<void> {
    const now = Date.now();
    try {
      await this.prisma.analysisJob.deleteMany({
        where: {
          OR: [
            { finishedAt: { lt: new Date(now - FINISHED_JOB_TTL_MS) } },
            { createdAt: { lt: new Date(now - MAX_JOB_AGE_MS) } },
          ],
        },
      });
    } catch (err) {
      this.logger.error(`Job cleanup failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private readJob(jobId: string) {
    return this.prisma.analysisJob.findUnique({
      where: { id: jobId },
      select: { state: true, progress: true, result: true, failedReason: true },
    });
  }

  async getJobStatus(jobId: string) {
    const job = await this.readJob(jobId);
    if (!job) throw new NotFoundException('Job not found');
    return {
      success: true,
      jobId,
      state: job.state,
      progress: job.progress,
      result: job.result,
      failedReason: job.failedReason,
    };
  }

  /** Server-sent events for one job. Reads the database, so it works whichever server runs the job. */
  createProgressStream(jobId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>(subscriber => {
      let closed = false;
      let polling = false;
      let lastProgress = '';

      const heartbeat = setInterval(() => {
        subscriber.next({ data: { heartbeat: true } } as MessageEvent);
      }, 25000);
      const poller = setInterval(() => void poll(), POLL_MS);

      const cleanup = () => {
        closed = true;
        clearInterval(heartbeat);
        clearInterval(poller);
      };

      // Sends the last message and then closes the stream, so no connection is left open.
      const finish = (event: MessageEvent) => {
        if (closed) return;
        subscriber.next(event);
        subscriber.complete();
        cleanup();
      };

      const poll = async () => {
        if (closed || polling) return;
        polling = true;
        try {
          const job = await this.readJob(jobId);
          if (closed) return;
          if (!job) return finish({ data: { message: 'Job not found' }, type: 'error' } as MessageEvent);
          if (job.state === 'completed') return finish({ data: job.result, type: 'completed' } as MessageEvent);
          if (job.state === 'failed') return finish({ data: { message: job.failedReason }, type: 'error' } as MessageEvent);

          const progress = JSON.stringify(job.progress);
          if (job.progress && progress !== lastProgress) {
            lastProgress = progress;
            subscriber.next({ data: job.progress, type: 'progress' } as MessageEvent);
          }
        } catch (err) {
          // A database hiccup should not end the stream; the next poll tries again.
          this.logger.warn(`Progress poll for job ${jobId} failed: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
          polling = false;
        }
      };

      void poll();
      return () => cleanup();
    });
  }
}
