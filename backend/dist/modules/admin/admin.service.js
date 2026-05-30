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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let AdminService = class AdminService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getPlatformStats() {
        const [totalUsers, totalAnalyses, totalCoverLetters, totalInterviews, recentAnalyses, topDomains, avgScoreAgg] = await Promise.all([
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
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dailyRaw = await this.prisma.analysis.findMany({
            where: { createdAt: { gte: thirtyDaysAgo } },
            select: { createdAt: true },
        });
        const dailyMap = {};
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
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map