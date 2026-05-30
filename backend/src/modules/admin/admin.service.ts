import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

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

  async getUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
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
      this.prisma.user.count(),
    ]);
    return { success: true, data: { users, total, page, limit } };
  }
}
