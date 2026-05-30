"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisRepository = void 0;
const database_1 = require("../config/database");
exports.analysisRepository = {
    findById: (id) => database_1.prisma.analysis.findUnique({ where: { id }, include: { resume: true } }),
    findByUserId: (userId, limit = 20) => database_1.prisma.analysis.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { resume: { select: { originalName: true } } },
    }),
    getUserAnalytics: async (userId) => {
        const analyses = await database_1.prisma.analysis.findMany({
            where: { userId, mode: 'analyze', score: { not: null } },
            orderBy: { createdAt: 'asc' },
            select: { id: true, score: true, domain: true, createdAt: true, keywordsMissed: true },
        });
        if (!analyses.length)
            return null;
        const scores = analyses.map(a => a.score);
        const avgScore = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
        const scoreImprovement = scores.length > 1 ? scores[scores.length - 1] - scores[0] : 0;
        const bestAnalysis = analyses.reduce((best, a) => (a.score > best.score ? a : best));
        const allMissed = analyses.flatMap(a => a.keywordsMissed);
        const missedCounts = allMissed.reduce((acc, kw) => { acc[kw] = (acc[kw] ?? 0) + 1; return acc; }, {});
        const topMissing = Object.entries(missedCounts).sort(([, a], [, b]) => b - a).slice(0, 10).map(([kw]) => kw);
        return {
            totalAnalyses: analyses.length,
            avgScore,
            scoreImprovement,
            topMissingKeywords: topMissing,
            scoreOverTime: analyses.map(a => ({ date: a.createdAt.toISOString().slice(0, 10), score: a.score, domain: a.domain })),
            bestScore: { score: bestAnalysis.score, analysisId: bestAnalysis.id },
        };
    },
};
//# sourceMappingURL=analysis.repository.js.map