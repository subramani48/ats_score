import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import type { AnalysisJobPayload } from '../../types';
export declare class QueueService {
    private readonly queue;
    private readonly config;
    private readonly redisHost;
    private readonly redisPort;
    private readonly redisPassword;
    constructor(queue: Queue, config: ConfigService);
    enqueue(payload: AnalysisJobPayload): Promise<string>;
    getJobStatus(jobId: string): Promise<{
        success: boolean;
        jobId: string;
        state: import("bullmq").JobState | "unknown";
        progress: import("bullmq").JobProgress;
        result: any;
        failedReason: string | null;
    }>;
    createProgressStream(jobId: string): Observable<MessageEvent>;
}
