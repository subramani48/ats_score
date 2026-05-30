import { Queue, QueueEvents } from 'bullmq';
import type { AnalysisJobPayload } from '../../types';
export declare const analysisQueue: Queue<AnalysisJobPayload, any, string, AnalysisJobPayload, any, string>;
export declare const analysisQueueEvents: QueueEvents;
export declare const enqueueAnalysis: (payload: AnalysisJobPayload) => Promise<string>;
