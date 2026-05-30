import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly service;
    constructor(service: AdminService);
    getStats(): Promise<{
        success: boolean;
        data: {
            totalUsers: number;
            totalAnalyses: number;
            totalCoverLetters: number;
            totalInterviews: number;
            avgScore: number;
            topDomains: {
                domain: string;
                count: number;
            }[];
            recentAnalyses: {
                resume: {
                    originalName: string;
                };
                id: string;
                createdAt: Date;
                mode: string;
                domain: string;
                score: number | null;
            }[];
            analysesPerDay: {
                date: string;
                count: number;
            }[];
        };
    }>;
    getUsers(page?: string, limit?: string): Promise<{
        success: boolean;
        data: {
            users: {
                name: string | null;
                id: string;
                email: string;
                role: string;
                tier: string;
                createdAt: Date;
                _count: {
                    analyses: number;
                };
            }[];
            total: number;
            page: number;
            limit: number;
        };
    }>;
}
