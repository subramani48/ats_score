import { PrismaService } from '../../prisma/prisma.service';
export declare class AdminService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getPlatformStats(): Promise<{
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
    getUsers(page?: number, limit?: number): Promise<{
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
