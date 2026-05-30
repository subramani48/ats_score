import { PrismaService } from '../../prisma/prisma.service';
export declare class VersionService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getVersions(resumeId: string): Promise<{
        success: boolean;
        data: {
            id: string;
            createdAt: Date;
            domain: string | null;
            extractedText: string | null;
            score: number | null;
            resumeId: string;
            versionNum: number;
            label: string | null;
        }[];
    }>;
    createVersion(resumeId: string, label?: string, score?: number, domain?: string): Promise<{
        success: boolean;
        data: {
            id: string;
            createdAt: Date;
            domain: string | null;
            extractedText: string | null;
            score: number | null;
            resumeId: string;
            versionNum: number;
            label: string | null;
        };
    }>;
    compareVersions(versionIds: string[]): Promise<{
        success: boolean;
        data: {
            id: string;
            versionNum: number;
            label: string | null;
            score: number | null;
            domain: string | null;
            createdAt: Date;
            wordCount: number;
        }[];
    }>;
}
