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
exports.CoverLetterService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const gemini_service_1 = require("../ai/gemini.service");
let CoverLetterService = class CoverLetterService {
    constructor(prisma, gemini) {
        this.prisma = prisma;
        this.gemini = gemini;
    }
    async generate(dto, userId) {
        const generatedText = await this.gemini.generateCoverLetter(dto.resumeText, dto.jobDescription, dto.companyName ?? '', dto.role ?? '', dto.tone ?? 'professional');
        const saved = await this.prisma.coverLetter.create({
            data: {
                userId: userId ?? null,
                resumeText: dto.resumeText,
                jobDescription: dto.jobDescription,
                companyName: dto.companyName ?? null,
                role: dto.role ?? null,
                generatedText,
                tone: dto.tone ?? 'professional',
            },
        });
        return { success: true, data: { id: saved.id, generatedText, createdAt: saved.createdAt } };
    }
    async getUserHistory(userId) {
        const letters = await this.prisma.coverLetter.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                companyName: true,
                role: true,
                tone: true,
                generatedText: true,
                createdAt: true,
            },
        });
        return { success: true, data: letters };
    }
};
exports.CoverLetterService = CoverLetterService;
exports.CoverLetterService = CoverLetterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        gemini_service_1.GeminiService])
], CoverLetterService);
//# sourceMappingURL=cover-letter.service.js.map