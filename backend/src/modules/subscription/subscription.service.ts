import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type Tier = 'free' | 'pro' | 'enterprise';

export interface TierLimits {
  analysesPerMonth:    number;
  coverLettersPerMonth: number;
  batchJDsPerRun:      number;
  interviewsPerMonth:  number;
  apiKeysMax:          number;
  priorityQueue:       boolean;
  advancedAnalytics:   boolean;
}

const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: {
    analysesPerMonth:    5,
    coverLettersPerMonth: 3,
    batchJDsPerRun:      2,
    interviewsPerMonth:  3,
    apiKeysMax:          1,
    priorityQueue:       false,
    advancedAnalytics:   false,
  },
  pro: {
    analysesPerMonth:    50,
    coverLettersPerMonth: 20,
    batchJDsPerRun:      10,
    interviewsPerMonth:  20,
    apiKeysMax:          5,
    priorityQueue:       true,
    advancedAnalytics:   true,
  },
  enterprise: {
    analysesPerMonth:    Infinity,
    coverLettersPerMonth: Infinity,
    batchJDsPerRun:      20,
    interviewsPerMonth:  Infinity,
    apiKeysMax:          20,
    priorityQueue:       true,
    advancedAnalytics:   true,
  },
};

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  getLimits(tier: Tier): TierLimits {
    return TIER_LIMITS[tier] ?? TIER_LIMITS.free;
  }

  async getUserTier(userId: string): Promise<Tier> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { tier: true } });
    return (user?.tier ?? 'free') as Tier;
  }

  async getTierInfo(userId: string) {
    const tier   = await this.getUserTier(userId);
    const limits = this.getLimits(tier);

    // Count usage this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

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
          analyses:     Math.max(0, limits.analysesPerMonth    === Infinity ? 999 : limits.analysesPerMonth    - analyses),
          coverLetters: Math.max(0, limits.coverLettersPerMonth === Infinity ? 999 : limits.coverLettersPerMonth - coverLetters),
          interviews:   Math.max(0, limits.interviewsPerMonth  === Infinity ? 999 : limits.interviewsPerMonth  - interviews),
        },
        upgradeRequired: false,
      },
    };
  }

  async checkLimit(userId: string, feature: keyof TierLimits) {
    const tier   = await this.getUserTier(userId);
    const limits = this.getLimits(tier);

    if (feature === 'analysesPerMonth') {
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
      const count = await this.prisma.analysis.count({ where: { userId, createdAt: { gte: startOfMonth } } });
      if (limits.analysesPerMonth !== Infinity && count >= limits.analysesPerMonth) {
        throw new ForbiddenException(
          `You've reached your monthly limit of ${limits.analysesPerMonth} analyses. Upgrade to Pro for more.`,
        );
      }
    }

    if (feature === 'coverLettersPerMonth') {
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
      const count = await this.prisma.coverLetter.count({ where: { userId, createdAt: { gte: startOfMonth } } });
      if (limits.coverLettersPerMonth !== Infinity && count >= limits.coverLettersPerMonth) {
        throw new ForbiddenException(
          `You've reached your monthly limit of ${limits.coverLettersPerMonth} cover letters. Upgrade to Pro.`,
        );
      }
    }

    return true;
  }

  /** Simulate upgrading a user's tier (in production, call Stripe webhook) */
  async upgradeTier(userId: string, newTier: Tier) {
    await this.prisma.user.update({ where: { id: userId }, data: { tier: newTier } });
    return { success: true, message: `Tier upgraded to ${newTier}` };
  }
}
