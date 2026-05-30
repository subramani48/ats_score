import { BatchService } from './batch.service';
import { BatchAnalyzeDto } from './dto/batch-analyze.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';
export declare class BatchController {
    private readonly service;
    constructor(service: BatchService);
    analyze(dto: BatchAnalyzeDto, user: AuthUser | null): Promise<{
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
    getHistory(user: AuthUser): Promise<{
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
