import type { Response } from 'express';
import { AnalysisService } from './analysis.service';
import { ChatDto } from './dto/chat.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';
export declare class AnalysisController {
    private readonly analysisService;
    constructor(analysisService: AnalysisService);
    getUserHistory(user: AuthUser): Promise<{
        success: boolean;
        data: ({
            resume: {
                id: string;
                originalName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            mode: string;
            domain: string;
            jobDescription: string | null;
            userId: string | null;
            score: number | null;
            keywordsMatched: string[];
            keywordsMissed: string[];
            suggestions: string[];
            warnings: string[];
            breakdown: import("@prisma/client/runtime/client").JsonValue | null;
            keywordGap: import("@prisma/client/runtime/client").JsonValue | null;
            rewrittenText: string | null;
            emailSent: boolean;
            processingMs: number | null;
            resumeId: string;
        })[];
    }>;
    getUserAnalytics(user: AuthUser): Promise<{
        success: boolean;
        data: {
            totalAnalyses: number;
            avgScore: number;
            scoreImprovement: number;
            topMissingKeywords: {
                keyword: string;
                count: number;
            }[];
            scoreOverTime: {
                date: string;
                score: number;
                domain: string;
            }[];
            bestScore: {
                score: number;
                analysisId: string;
            };
        };
    }>;
    compareAnalyses(ids: string): Promise<{
        success: boolean;
        data: (({
            resume: {
                originalName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            mode: string;
            domain: string;
            jobDescription: string | null;
            userId: string | null;
            score: number | null;
            keywordsMatched: string[];
            keywordsMissed: string[];
            suggestions: string[];
            warnings: string[];
            breakdown: import("@prisma/client/runtime/client").JsonValue | null;
            keywordGap: import("@prisma/client/runtime/client").JsonValue | null;
            rewrittenText: string | null;
            emailSent: boolean;
            processingMs: number | null;
            resumeId: string;
        }) | null)[];
    }>;
    getPeerBenchmark(domain: string, score: string): Promise<{
        success: boolean;
        data: {
            percentile: null;
            avgDomainScore: null;
            totalSamples: number;
            userScore: number;
            domain: string;
            message: string;
        };
    } | {
        success: boolean;
        data: {
            percentile: number;
            avgDomainScore: number;
            totalSamples: number;
            userScore: number;
            domain: string;
            message: string;
        };
    }>;
    findOne(id: string): Promise<{
        success: boolean;
        data: {
            resume: {
                id: string;
                originalName: string;
                extractedText: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            mode: string;
            domain: string;
            jobDescription: string | null;
            userId: string | null;
            score: number | null;
            keywordsMatched: string[];
            keywordsMissed: string[];
            suggestions: string[];
            warnings: string[];
            breakdown: import("@prisma/client/runtime/client").JsonValue | null;
            keywordGap: import("@prisma/client/runtime/client").JsonValue | null;
            rewrittenText: string | null;
            emailSent: boolean;
            processingMs: number | null;
            resumeId: string;
        };
    }>;
    getKeywordGap(id: string): Promise<{
        success: boolean;
        data: import("../../types").KeywordGapResult;
    }>;
    chatWithAI(id: string, dto: ChatDto, res: Response): Promise<void>;
}
