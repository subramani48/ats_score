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
exports.InterviewService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const gemini_service_1 = require("../ai/gemini.service");
let InterviewService = class InterviewService {
    constructor(prisma, gemini) {
        this.prisma = prisma;
        this.gemini = gemini;
    }
    async generate(dto, userId) {
        const questions = await this.gemini.generateInterviewQuestions(dto.resumeText, dto.jobDescription, dto.domain, dto.difficulty ?? 'medium');
        const saved = await this.prisma.interviewSession.create({
            data: {
                userId: userId ?? null,
                resumeText: dto.resumeText,
                jobDescription: dto.jobDescription,
                domain: dto.domain,
                difficulty: dto.difficulty ?? 'medium',
                questions: questions,
            },
        });
        return {
            success: true,
            data: {
                id: saved.id,
                questions,
                domain: dto.domain,
                difficulty: dto.difficulty ?? 'medium',
                createdAt: saved.createdAt,
            },
        };
    }
    async getUserHistory(userId) {
        const sessions = await this.prisma.interviewSession.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                domain: true,
                difficulty: true,
                questions: true,
                createdAt: true,
            },
        });
        return { success: true, data: sessions };
    }
};
exports.InterviewService = InterviewService;
exports.InterviewService = InterviewService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        gemini_service_1.GeminiService])
], InterviewService);
//# sourceMappingURL=interview.service.js.map