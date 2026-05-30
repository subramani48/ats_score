import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import type { AnalysisJobPayload } from '../../types';

@Injectable()
export class QueueService {
  private readonly redisHost: string;
  private readonly redisPort: number;
  private readonly redisPassword: string | undefined;

  constructor(
    @InjectQueue('resume-analysis') private readonly queue: Queue,
    private readonly config: ConfigService,
  ) {
    const rawUrl = config.get<string>('REDIS_URL', 'redis://localhost:6379');
    const url = new URL(rawUrl);
    this.redisHost = url.hostname;
    this.redisPort = parseInt(url.port || '6379', 10);
    this.redisPassword = url.password || undefined;
  }

  async enqueue(payload: AnalysisJobPayload): Promise<string> {
    const job = await this.queue.add('analyze', payload);
    return job.id!;
  }

  async getJobStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) throw new NotFoundException('Job not found');
    const state = await job.getState();
    const result = state === 'completed' ? job.returnvalue : null;
    const failedReason = state === 'failed' ? job.failedReason : null;
    return { success: true, jobId, state, progress: job.progress, result, failedReason };
  }

  createProgressStream(jobId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>(subscriber => {
      let queueEvents: QueueEvents | null = null;

      const heartbeat = setInterval(() => {
        subscriber.next({ data: { heartbeat: true } } as MessageEvent);
      }, 25000);

      const cleanup = () => {
        clearInterval(heartbeat);
        if (queueEvents) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          queueEvents.off('progress', onProgress as any);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          queueEvents.off('completed', onCompleted as any);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          queueEvents.off('failed', onFailed as any);
          void queueEvents.close();
          queueEvents = null;
        }
      };

      const onProgress = ({ jobId: jid, data }: { jobId: string; data: unknown }) => {
        if (jid === jobId) {
          subscriber.next({ data: data as object, type: 'progress' } as MessageEvent);
        }
      };

      const onCompleted = ({ jobId: jid, returnvalue }: { jobId: string; returnvalue: unknown }) => {
        if (jid === jobId) {
          // QueueEvents returns returnvalue as a JSON string from Redis — parse it
          let parsed: unknown = returnvalue;
          if (typeof returnvalue === 'string') {
            try { parsed = JSON.parse(returnvalue); } catch { /* leave as-is */ }
          }
          subscriber.next({ data: parsed as object, type: 'completed' } as MessageEvent);
          cleanup();
        }
      };

      const onFailed = ({ jobId: jid, failedReason }: { jobId: string; failedReason: string }) => {
        if (jid === jobId) {
          subscriber.next({ data: { message: failedReason }, type: 'error' } as MessageEvent);
          cleanup();
        }
      };

      void this.queue.getJob(jobId).then(async job => {
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!job) {
          subscriber.next({ data: { message: 'Job not found' }, type: 'error' } as MessageEvent);
          cleanup();
          return;
        }

        const state = await job.getState();
        if (state === 'completed') {
          subscriber.next({ data: job.returnvalue as object, type: 'completed' } as MessageEvent);
          cleanup();
          return;
        }
        if (state === 'failed') {
          subscriber.next({ data: { message: job.failedReason }, type: 'error' } as MessageEvent);
          cleanup();
          return;
        }

        queueEvents = new QueueEvents('resume-analysis', {
          connection: {
            host: this.redisHost,
            port: this.redisPort,
            password: this.redisPassword,
            maxRetriesPerRequest: null,
          },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        queueEvents.on('progress', onProgress as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        queueEvents.on('completed', onCompleted as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        queueEvents.on('failed', onFailed as any);
      });

      return () => cleanup();
    });
  }
}
