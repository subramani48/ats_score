export declare const analysisRepository: {
    findById: (id: string) => import(".prisma/client").Prisma.Prisma__AnalysisClient<({
        resume: {
            id: string;
            createdAt: Date;
            userId: string | null;
            originalName: string;
            mimeType: string;
            sizeBytes: number;
            storagePath: string | null;
            extractedText: string | null;
        };
    } & {
        domain: string;
        mode: string;
        jobDescription: string | null;
        id: string;
        createdAt: Date;
        userId: string | null;
        resumeId: string;
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
    }) | null, null, import("@prisma/client/runtime/client").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    findByUserId: (userId: string, limit?: number) => import(".prisma/client").Prisma.PrismaPromise<({
        resume: {
            originalName: string;
        };
    } & {
        domain: string;
        mode: string;
        jobDescription: string | null;
        id: string;
        createdAt: Date;
        userId: string | null;
        resumeId: string;
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
    })[]>;
    getUserAnalytics: (userId: string) => Promise<{
        totalAnalyses: number;
        avgScore: number;
        scoreImprovement: number;
        topMissingKeywords: string[];
        scoreOverTime: {
            date: string;
            score: number;
            domain: string;
        }[];
        bestScore: {
            score: number;
            analysisId: string;
        };
    } | null>;
};
