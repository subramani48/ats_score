import { Injectable, NotFoundException } from '@nestjs/common';
import { Observable, Subject, Subscription } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import type { AnalysisJobPayload } from '../../types';
import { AnalysisProcessor, InMemoryJob } from './processors/analysis.processor';
import { v4 as uuidv4 } from 'uuid';

// A finished job is kept briefly so the website can still read its result, then erased. The analysis
// itself is saved in the database, so nothing is lost.
const FINISHED_JOB_TTL_MS = 10 * 60 * 1000;
// Safety net: any job this old is erased even if it never finished (for example a stuck one).
const MAX_JOB_AGE_MS = 30 * 60 * 1000;

@Injectable()
export class QueueService {
  private readonly jobs = new Map<string, InMemoryJob>();
  private readonly events$ = new Subject<{ jobId: string; type: string; data: any }>();

  constructor(
    private readonly processor: AnalysisProcessor,
  ) {}

  async enqueue(payload: AnalysisJobPayload): Promise<string> {
    const jobId = uuidv4();

    const job: InMemoryJob = {
      id: jobId,
      data: payload,
      progress: null,
      state: 'waiting',
      returnvalue: null,
      failedReason: null,
      updateProgress: async (progress) => {
        job.progress = progress;
        this.events$.next({ jobId, type: 'progress', data: progress });
      },
    };

    this.jobs.set(jobId, job);
    this.scheduleRemoval(jobId, MAX_JOB_AGE_MS);

    // Asynchronously run the processor so the controller can return the jobId immediately
    setTimeout(async () => {
      try {
        job.state = 'active';
        const result = await this.processor.process(job);
        job.state = 'completed';
        job.returnvalue = result;
        this.events$.next({ jobId, type: 'completed', data: result });
      } catch (error: any) {
        job.state = 'failed';
        job.failedReason = error?.message || String(error);
        this.events$.next({ jobId, type: 'failed', data: error?.message || String(error) });
      } finally {
        // The uploaded file is the biggest thing held in memory and is not needed once the job is over.
        job.data = { ...job.data, resumeBuffer: '' };
        this.scheduleRemoval(jobId, FINISHED_JOB_TTL_MS);
      }
    }, 0);

    return jobId;
  }

  /** Erases a job from memory after `delayMs`. Safe to call twice for the same job. */
  private scheduleRemoval(jobId: string, delayMs: number): void {
    // unref so a pending timer never keeps the server from shutting down
    setTimeout(() => this.jobs.delete(jobId), delayMs).unref();
  }

  async getJobStatus(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) throw new NotFoundException('Job not found');
    return {
      success: true,
      jobId,
      state: job.state,
      progress: job.progress,
      result: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  createProgressStream(jobId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>(subscriber => {
      const job = this.jobs.get(jobId);
      // Declared before `cleanup` so cleanup can run at any point, including the early returns below.
      let subscription: Subscription | undefined;

      const heartbeat = setInterval(() => {
        subscriber.next({ data: { heartbeat: true } } as MessageEvent);
      }, 25000);

      const cleanup = () => {
        clearInterval(heartbeat);
        subscription?.unsubscribe();
      };

      // Sends the last message and then closes the stream, so no connection is left open.
      const finish = (event: MessageEvent) => {
        subscriber.next(event);
        subscriber.complete();
        cleanup();
      };

      if (!job) {
        finish({ data: { message: 'Job not found' }, type: 'error' } as MessageEvent);
        return;
      }

      if (job.state === 'completed') {
        finish({ data: job.returnvalue, type: 'completed' } as MessageEvent);
        return;
      }
      if (job.state === 'failed') {
        finish({ data: { message: job.failedReason }, type: 'error' } as MessageEvent);
        return;
      }

      subscription = this.events$.subscribe({
        next: (event) => {
          if (event.jobId !== jobId) return;
          if (event.type === 'progress') {
            subscriber.next({ data: event.data, type: 'progress' } as MessageEvent);
          } else if (event.type === 'completed') {
            finish({ data: event.data, type: 'completed' } as MessageEvent);
          } else if (event.type === 'failed') {
            finish({ data: { message: event.data }, type: 'error' } as MessageEvent);
          }
        },
      });

      return () => cleanup();
    });
  }
}
