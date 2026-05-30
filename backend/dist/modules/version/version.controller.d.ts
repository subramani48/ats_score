import { VersionService } from './version.service';
export declare class VersionController {
    private readonly service;
    constructor(service: VersionService);
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
    createSnapshot(resumeId: string, body: {
        label?: string;
        score?: number;
        domain?: string;
    }): Promise<{
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
    compare(ids: string): Promise<{
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
