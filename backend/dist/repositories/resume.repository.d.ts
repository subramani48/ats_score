export declare const resumeRepository: {
    findById: (id: string) => import(".prisma/client").Prisma.Prisma__ResumeClient<({
        analyses: {
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
        }[];
    } & {
        id: string;
        createdAt: Date;
        userId: string | null;
        originalName: string;
        mimeType: string;
        sizeBytes: number;
        storagePath: string | null;
        extractedText: string | null;
    }) | null, null, import("@prisma/client/runtime/client").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    findByUserId: (userId: string) => import(".prisma/client").Prisma.PrismaPromise<({
        analyses: {
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
        }[];
    } & {
        id: string;
        createdAt: Date;
        userId: string | null;
        originalName: string;
        mimeType: string;
        sizeBytes: number;
        storagePath: string | null;
        extractedText: string | null;
    })[]>;
    create: (data: {
        userId?: string | null;
        originalName: string;
        mimeType: string;
        sizeBytes: number;
        extractedText?: string;
    }) => import(".prisma/client").Prisma.Prisma__ResumeClient<{
        id: string;
        createdAt: Date;
        userId: string | null;
        originalName: string;
        mimeType: string;
        sizeBytes: number;
        storagePath: string | null;
        extractedText: string | null;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
};
