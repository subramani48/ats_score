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
exports.VersionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let VersionService = class VersionService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getVersions(resumeId) {
        const versions = await this.prisma.resumeVersion.findMany({
            where: { resumeId },
            orderBy: { versionNum: 'desc' },
        });
        return { success: true, data: versions };
    }
    async createVersion(resumeId, label, score, domain) {
        const resume = await this.prisma.resume.findUnique({ where: { id: resumeId } });
        if (!resume)
            throw new common_1.NotFoundException('Resume not found');
        const latest = await this.prisma.resumeVersion.findFirst({
            where: { resumeId },
            orderBy: { versionNum: 'desc' },
        });
        const versionNum = (latest?.versionNum ?? 0) + 1;
        const version = await this.prisma.resumeVersion.create({
            data: {
                resumeId,
                versionNum,
                label: label ?? `Version ${versionNum}`,
                extractedText: resume.extractedText,
                score: score ?? null,
                domain: domain ?? null,
            },
        });
        return { success: true, data: version };
    }
    async compareVersions(versionIds) {
        const versions = await this.prisma.resumeVersion.findMany({
            where: { id: { in: versionIds } },
            orderBy: { versionNum: 'asc' },
        });
        const comparison = versions.map(v => ({
            id: v.id,
            versionNum: v.versionNum,
            label: v.label,
            score: v.score,
            domain: v.domain,
            createdAt: v.createdAt,
            wordCount: v.extractedText ? v.extractedText.split(/\s+/).length : 0,
        }));
        return { success: true, data: comparison };
    }
};
exports.VersionService = VersionService;
exports.VersionService = VersionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VersionService);
//# sourceMappingURL=version.service.js.map