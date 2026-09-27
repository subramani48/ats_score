import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserNotificationsService } from '../user-notifications/user-notifications.service';
import type { Tier } from '../subscription/subscription.service';

const TIER_NAMES: Record<Tier, string> = { free: 'Free', pro: 'Pro', enterprise: 'Enterprise' };

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: UserNotificationsService,
  ) {}

  async getPlatformStats() {
    const [totalUsers, totalAnalyses, totalCoverLetters, totalInterviews, recentAnalyses, topDomains, avgScoreAgg] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.analysis.count(),
        this.prisma.coverLetter.count(),
        this.prisma.interviewSession.count(),
        this.prisma.analysis.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            domain: true,
            score: true,
            mode: true,
            createdAt: true,
            resume: { select: { originalName: true } },
          },
        }),
        this.prisma.analysis.groupBy({
          by: ['domain'],
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 8,
        }),
        this.prisma.analysis.aggregate({
          _avg: { score: true },
          where: { score: { not: null } },
        }),
      ]);

    // Analyses per day — last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dailyRaw = await this.prisma.analysis.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    });

    const dailyMap: Record<string, number> = {};
    for (const a of dailyRaw) {
      const day = a.createdAt.toISOString().split('T')[0];
      dailyMap[day] = (dailyMap[day] ?? 0) + 1;
    }
    const analysesPerDay = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    return {
      success: true,
      data: {
        totalUsers,
        totalAnalyses,
        totalCoverLetters,
        totalInterviews,
        avgScore: Math.round(avgScoreAgg._avg.score ?? 0),
        topDomains: topDomains.map(d => ({ domain: d.domain, count: d._count.id })),
        recentAnalyses,
        analysesPerDay,
      },
    };
  }

  async getUsers(page = 1, limit = 20, q?: string) {
    // Query-string numbers can be anything; keep them sane so a bad value cannot load every user.
    page  = Number.isInteger(page) && page > 0 ? page : 1;
    limit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 100) : 20;
    const search = q?.trim().slice(0, 100);
    const where = search
      ? { OR: [{ email: { contains: search, mode: 'insensitive' as const } }, { name: { contains: search, mode: 'insensitive' as const } }] }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          tier: true,
          role: true,
          createdAt: true,
          _count: { select: { analyses: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { success: true, data: { users, total, page, limit } };
  }

  async setUserTier(userId: string, tier: Tier, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { tier: true } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { tier },
      select: { id: true, email: true, name: true, tier: true, role: true },
    });

    // Audit trail: who changed which plan.
    this.logger.log(`Admin ${adminId} set the plan of user ${userId} from ${user.tier} to ${tier}`);

    if (user.tier !== tier) {
      await this.notifications.create(
        userId,
        'Your plan has changed',
        `You are now on the ${TIER_NAMES[tier]} plan. Your monthly limits have been updated.`,
        'success',
      );
    }
    return { success: true, data: updated };
  }
}
