import { PrismaService } from '../../prisma/prisma.service';
export type Tier = 'free' | 'pro' | 'enterprise';
export interface TierLimits {
    analysesPerMonth: number;
    coverLettersPerMonth: number;
    batchJDsPerRun: number;
    interviewsPerMonth: number;
    apiKeysMax: number;
    priorityQueue: boolean;
    advancedAnalytics: boolean;
}
export declare class SubscriptionService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getLimits(tier: Tier): TierLimits;
    getUserTier(userId: string): Promise<Tier>;
    getTierInfo(userId: string): Promise<{
        success: boolean;
        data: {
            tier: Tier;
            limits: TierLimits;
            usage: {
                analyses: number;
                coverLetters: number;
                interviews: number;
            };
            remaining: {
                analyses: number;
                coverLetters: number;
                interviews: number;
            };
            upgradeRequired: boolean;
        };
    }>;
    checkLimit(userId: string, feature: keyof TierLimits): Promise<boolean>;
    upgradeTier(userId: string, newTier: Tier): Promise<{
        success: boolean;
        message: string;
    }>;
}
