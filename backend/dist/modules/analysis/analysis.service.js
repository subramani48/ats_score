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
exports.AnalysisService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const gemini_service_1 = require("../ai/gemini.service");
let AnalysisService = class AnalysisService {
    constructor(prisma, gemini) {
        this.prisma = prisma;
        this.gemini = gemini;
    }
    async findById(id) {
        const analysis = await this.prisma.analysis.findUnique({
            where: { id },
            include: { resume: { select: { id: true, originalName: true, extractedText: true } } },
        });
        if (!analysis)
            throw new common_1.NotFoundException('Analysis not found');
        return { success: true, data: analysis };
    }
    async findByUserId(userId) {
        const analyses = await this.prisma.analysis.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: { resume: { select: { id: true, originalName: true } } },
        });
        return { success: true, data: analyses };
    }
    async getUserAnalytics(userId) {
        const analyses = await this.prisma.analysis.findMany({
            where: { userId, mode: 'analyze' },
            orderBy: { createdAt: 'asc' },
            select: { id: true, score: true, createdAt: true, keywordsMissed: true, domain: true },
        });
        if (!analyses.length) {
            return {
                success: true,
                data: {
                    totalAnalyses: 0,
                    avgScore: 0,
                    scoreImprovement: 0,
                    topMissingKeywords: [],
                    scoreOverTime: [],
                    bestScore: { score: 0, analysisId: '' },
                },
            };
        }
        const scores = analyses.filter(a => a.score !== null).map(a => a.score);
        const avgScore = scores.length
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0;
        const bestScoreValue = scores.length ? Math.max(...scores) : 0;
        const bestScoreIdx = scores.indexOf(bestScoreValue);
        const scoreImprovement = scores.length >= 2 ? scores[scores.length - 1] - scores[0] : 0;
        const kwCounts = {};
        for (const a of analyses) {
            for (const kw of a.keywordsMissed) {
                kwCounts[kw] = (kwCounts[kw] ?? 0) + 1;
            }
        }
        const topMissingKeywords = Object.entries(kwCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([keyword, count]) => ({ keyword, count }));
        const scoreOverTime = analyses.map(a => ({
            date: a.createdAt.toISOString().split('T')[0],
            score: a.score ?? 0,
            domain: a.domain,
        }));
        return {
            success: true,
            data: {
                totalAnalyses: analyses.length,
                avgScore,
                scoreImprovement,
                topMissingKeywords,
                scoreOverTime,
                bestScore: {
                    score: bestScoreValue,
                    analysisId: analyses[bestScoreIdx]?.id ?? '',
                },
            },
        };
    }
    async compareAnalyses(ids) {
        if (ids.length < 2)
            throw new common_1.BadRequestException('Provide at least 2 analysis IDs via ?ids=id1,id2');
        const results = await Promise.all(ids.slice(0, 5).map(id => this.prisma.analysis.findUnique({
            where: { id },
            include: { resume: { select: { originalName: true } } },
        })));
        return { success: true, data: results.filter(Boolean) };
    }
    async getKeywordGap(id) {
        const analysis = await this.prisma.analysis.findUnique({ where: { id } });
        if (!analysis)
            throw new common_1.NotFoundException('Analysis not found');
        if (!analysis.jobDescription) {
            throw new common_1.BadRequestException('No job description for this analysis');
        }
        const resume = await this.prisma.resume.findUnique({ where: { id: analysis.resumeId } });
        const gap = await this.gemini.keywordGap(resume?.extractedText ?? '', analysis.jobDescription);
        return { success: true, data: gap };
    }
    async startChatSession(id) {
        const analysis = await this.prisma.analysis.findUnique({
            where: { id },
            include: { resume: { select: { extractedText: true } } },
        });
        if (!analysis)
            throw new common_1.NotFoundException('Analysis not found');
        return {
            chat: await this.gemini.startChat(analysis.resume.extractedText ?? '', analysis.score ?? 0, analysis.domain, analysis.keywordsMissed),
        };
    }
    async getPeerBenchmark(domain, userScore) {
        const domainAnalyses = await this.prisma.analysis.findMany({
            where: { domain, score: { not: null }, mode: 'analyze' },
            select: { score: true },
        });
        if (domainAnalyses.length < 5) {
            return {
                success: true,
                data: {
                    percentile: null,
                    avgDomainScore: null,
                    totalSamples: domainAnalyses.length,
                    userScore,
                    domain,
                    message: 'Not enough data for this domain yet — be the first to set the benchmark!',
                },
            };
        }
        const scores = domainAnalyses.map(a => a.score);
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        const below = scores.filter(s => s < userScore).length;
        const percentile = Math.round((below / scores.length) * 100);
        return {
            success: true,
            data: {
                percentile,
                avgDomainScore: avg,
                totalSamples: scores.length,
                userScore,
                domain,
                message: `Your score is in the top ${100 - percentile}% of ${domain} resumes on our platform`,
            },
        };
    }
};
exports.AnalysisService = AnalysisService;
exports.AnalysisService = AnalysisService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        gemini_service_1.GeminiService])
], AnalysisService);
//# sourceMappingURL=analysis.service.js.map