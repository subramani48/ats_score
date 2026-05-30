import { Worker } from 'bullmq';
import type { AnalysisJobPayload } from '../../../types';
export declare const analysisWorker: Worker<AnalysisJobPayload, any, string>;
