import { QueueService } from '../queue/queue.service';
import type { AnalysisJobPayload } from '../../types';
import type { Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
export declare class ResumeService {
    private readonly queueService;
    constructor(queueService: QueueService);
    enqueue(payload: AnalysisJobPayload, mode?: 'analyze' | 'rewrite'): Promise<string>;
    getJobStatus(jobId: string): Promise<{
        success: boolean;
        jobId: string;
        state: import("bullmq").JobState | "unknown";
        progress: import("bullmq").JobProgress;
        result: any;
        failedReason: string | null;
    }>;
    streamProgress(jobId: string): Observable<MessageEvent>;
}
