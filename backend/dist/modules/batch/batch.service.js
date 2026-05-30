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
exports.BatchService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const gemini_service_1 = require("../ai/gemini.service");
let BatchService = class BatchService {
    constructor(prisma, gemini) {
        this.prisma = prisma;
        this.gemini = gemini;
    }
    async analyze(dto, userId) {
        const batchJob = await this.prisma.batchJob.create({
            data: {
                userId: userId ?? null,
                status: 'processing',
                totalJDs: dto.jobDescriptions.length,
                domain: dto.domain,
            },
        });
        const results = await Promise.allSettled(dto.jobDescriptions.map(async (jdItem) => {
            const [keywordGap, companyAnalysis] = await Promise.allSettled([
                this.gemini.keywordGap(dto.resumeText, jdItem.jd),
                jdItem.company
                    ? this.gemini.companyAtsAnalysis(dto.resumeText, jdItem.company, jdItem.title)
                    : Promise.resolve(null),
            ]);
            return {
                title: jdItem.title,
                company: jdItem.company ?? null,
                keywordGap: keywordGap.status === 'fulfilled' ? keywordGap.value : null,
                companyAnalysis: companyAnalysis.status === 'fulfilled' ? companyAnalysis.value : null,
                error: keywordGap.status === 'rejected' ? String(keywordGap.reason) : null,
            };
        }));
        const processedResults = results.map((r, i) => r.status === 'fulfilled'
            ? r.value
            : { title: dto.jobDescriptions[i].title, error: String(r.reason) });
        const completedCount = processedResults.filter(r => !('error' in r && r.error)).length;
        await this.prisma.batchJob.update({
            where: { id: batchJob.id },
            data: {
                status: 'completed',
                completedJDs: completedCount,
                results: processedResults,
            },
        });
        return {
            success: true,
            data: {
                batchId: batchJob.id,
                totalJDs: dto.jobDescriptions.length,
                completedJDs: completedCount,
                results: processedResults,
            },
        };
    }
    async getUserBatchJobs(userId) {
        const jobs = await this.prisma.batchJob.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                status: true,
                totalJDs: true,
                completedJDs: true,
                domain: true,
                createdAt: true,
            },
        });
        return { success: true, data: jobs };
    }
};
exports.BatchService = BatchService;
exports.BatchService = BatchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        gemini_service_1.GeminiService])
], BatchService);
//# sourceMappingURL=batch.service.js.map