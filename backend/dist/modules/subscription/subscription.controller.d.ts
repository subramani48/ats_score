import { SubscriptionService, type Tier } from './subscription.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
declare class UpgradeTierDto {
    tier: string;
}
export declare class SubscriptionController {
    private readonly service;
    constructor(service: SubscriptionService);
    getTierInfo(user: AuthUser): Promise<{
        success: boolean;
        data: {
            tier: Tier;
            limits: import("./subscription.service").TierLimits;
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
    upgradeTier(user: AuthUser, dto: UpgradeTierDto): Promise<{
        success: boolean;
        message: string;
    }>;
}
export {};
