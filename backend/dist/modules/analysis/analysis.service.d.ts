import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from '../ai/gemini.service';
export declare class AnalysisService {
    private readonly prisma;
    private readonly gemini;
    constructor(prisma: PrismaService, gemini: GeminiService);
    findById(id: string): Promise<{
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
    findByUserId(userId: string): Promise<{
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
    getUserAnalytics(userId: string): Promise<{
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
    compareAnalyses(ids: string[]): Promise<{
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
    getKeywordGap(id: string): Promise<{
        success: boolean;
        data: import("../../types").KeywordGapResult;
    }>;
    startChatSession(id: string): Promise<{
        chat: import("@google/generative-ai").ChatSession;
    }>;
    getPeerBenchmark(domain: string, userScore: number): Promise<{
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
}
