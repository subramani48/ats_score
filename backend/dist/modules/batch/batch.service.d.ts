import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from '../ai/gemini.service';
import type { BatchAnalyzeDto } from './dto/batch-analyze.dto';
export declare class BatchService {
    private readonly prisma;
    private readonly gemini;
    constructor(prisma: PrismaService, gemini: GeminiService);
    analyze(dto: BatchAnalyzeDto, userId?: string): Promise<{
        success: boolean;
        data: {
            batchId: string;
            totalJDs: number;
            completedJDs: number;
            results: ({
                title: string;
                company: string | null;
                keywordGap: import("../../types").KeywordGapResult | null;
                companyAnalysis: unknown;
                error: string | null;
            } | {
                title: string;
                error: string;
            })[];
        };
    }>;
    getUserBatchJobs(userId: string): Promise<{
        success: boolean;
        data: {
            status: string;
            id: string;
            createdAt: Date;
            domain: string;
            totalJDs: number;
            completedJDs: number;
        }[];
    }>;
}
