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

  /** First moment of the current month (server time). Monthly limits count from here. */
  private monthStart(): Date {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Throws a 403 if the user has reached the limit for `feature` on their plan; otherwise returns true.
   * `requested` is only used by batchJDsPerRun (how many job descriptions this run asks for).
   * Unlimited plans use Infinity. The messages do not promise an upgrade, because upgrades are not
   * available until payments exist. The on/off features (priorityQueue, advancedAnalytics) are not limits.
   */
  async checkLimit(userId: string, feature: keyof TierLimits, requested = 1) {
    if (!userId) throw new ForbiddenException('Login required');
    const tier   = await this.getUserTier(userId);
    const limits = this.getLimits(tier);
    const plan   = tier.charAt(0).toUpperCase() + tier.slice(1);
    const reached = (used: number, limit: number) => limit !== Infinity && used >= limit;

    switch (feature) {
      case 'analysesPerMonth': {
        const used = await this.prisma.analysis.count({ where: { userId, createdAt: { gte: this.monthStart() } } });
        if (reached(used, limits.analysesPerMonth)) {
          throw new ForbiddenException(
            `You've reached your monthly limit of ${limits.analysesPerMonth} analyses on the ${plan} plan. It resets at the start of next month.`,
          );
        }
        break;
      }
      case 'coverLettersPerMonth': {
        const used = await this.prisma.coverLetter.count({ where: { userId, createdAt: { gte: this.monthStart() } } });
        if (reached(used, limits.coverLettersPerMonth)) {
          throw new ForbiddenException(
            `You've reached your monthly limit of ${limits.coverLettersPerMonth} cover letters on the ${plan} plan. It resets at the start of next month.`,
          );
        }
        break;
      }
      case 'interviewsPerMonth': {
        const used = await this.prisma.interviewSession.count({ where: { userId, createdAt: { gte: this.monthStart() } } });
        if (reached(used, limits.interviewsPerMonth)) {
          throw new ForbiddenException(
            `You've reached your monthly limit of ${limits.interviewsPerMonth} interview sessions on the ${plan} plan. It resets at the start of next month.`,
          );
        }
        break;
      }
      case 'apiKeysMax': {
        const used = await this.prisma.apiKey.count({ where: { userId, isActive: true } });
        if (reached(used, limits.apiKeysMax)) {
          throw new ForbiddenException(
            `Your ${plan} plan allows up to ${limits.apiKeysMax} active API key${limits.apiKeysMax === 1 ? '' : 's'}. Revoke one to create another.`,
          );
        }
        break;
      }
      case 'batchJDsPerRun': {
        if (limits.batchJDsPerRun !== Infinity && requested > limits.batchJDsPerRun) {
          throw new ForbiddenException(
            `Your ${plan} plan allows up to ${limits.batchJDsPerRun} job descriptions per batch.`,
          );
        }
        break;
      }
      default:
        break;
    }

    return true;
  }
}
