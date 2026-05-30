"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const TIER_LIMITS = {
    free: {
        analysesPerMonth: 5,
        coverLettersPerMonth: 3,
        batchJDsPerRun: 2,
        interviewsPerMonth: 3,
        apiKeysMax: 1,
        priorityQueue: false,
        advancedAnalytics: false,
    },
    pro: {
        analysesPerMonth: 50,
        coverLettersPerMonth: 20,
        batchJDsPerRun: 10,
        interviewsPerMonth: 20,
        apiKeysMax: 5,
        priorityQueue: true,
        advancedAnalytics: true,
    },
    enterprise: {
        analysesPerMonth: Infinity,
        coverLettersPerMonth: Infinity,
        batchJDsPerRun: 20,
        interviewsPerMonth: Infinity,
        apiKeysMax: 20,
        priorityQueue: true,
        advancedAnalytics: true,
    },
};
let SubscriptionService = class SubscriptionService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    getLimits(tier) {
        return TIER_LIMITS[tier] ?? TIER_LIMITS.free;
    }
    async getUserTier(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { tier: true } });
        return (user?.tier ?? 'free');
    }
    async getTierInfo(userId) {
        const tier = await this.getUserTier(userId);
        const limits = this.getLimits(tier);
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const [analyses, coverLetters, interviews] = await Promise.all([
            this.prisma.analysis.count({ where: { userId, createdAt: { gte: startOfMonth } } }),
            this.prisma.coverLetter.count({ where: { userId, createdAt: { gte: startOfMonth } } }),
            this.prisma.interviewSession.count({ where: { userId, createdAt: { gte: startOfMonth } } }),
        ]);
        return {
            success: true,
            data: {
                tier,
                limits,
                usage: {
                    analyses,
                    coverLetters,
                    interviews,
                },
                remaining: {
                    analyses: Math.max(0, limits.analysesPerMonth === Infinity ? 999 : limits.analysesPerMonth - analyses),
                    coverLetters: Math.max(0, limits.coverLettersPerMonth === Infinity ? 999 : limits.coverLettersPerMonth - coverLetters),
                    interviews: Math.max(0, limits.interviewsPerMonth === Infinity ? 999 : limits.interviewsPerMonth - interviews),
                },
                upgradeRequired: false,
            },
        };
    }
    async checkLimit(userId, feature) {
        const tier = await this.getUserTier(userId);
        const limits = this.getLimits(tier);
        if (feature === 'analysesPerMonth') {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            const count = await this.prisma.analysis.count({ where: { userId, createdAt: { gte: startOfMonth } } });
            if (limits.analysesPerMonth !== Infinity && count >= limits.analysesPerMonth) {
                throw new common_1.ForbiddenException(`You've reached your monthly limit of ${limits.analysesPerMonth} analyses. Upgrade to Pro for more.`);
            }
        }
        if (feature === 'coverLettersPerMonth') {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            const count = await this.prisma.coverLetter.count({ where: { userId, createdAt: { gte: startOfMonth } } });
            if (limits.coverLettersPerMonth !== Infinity && count >= limits.coverLettersPerMonth) {
                throw new common_1.ForbiddenException(`You've reached your monthly limit of ${limits.coverLettersPerMonth} cover letters. Upgrade to Pro.`);
            }
        }
        return true;
    }
    async upgradeTier(userId, newTier) {
        await this.prisma.user.update({ where: { id: userId }, data: { tier: newTier } });
        return { success: true, message: `Tier upgraded to ${newTier}` };
    }
};
exports.SubscriptionService = SubscriptionService;
exports.SubscriptionService = SubscriptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubscriptionService);
//# sourceMappingURL=subscription.service.js.map