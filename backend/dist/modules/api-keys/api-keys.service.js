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
exports.ApiKeysService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../prisma/prisma.service");
let ApiKeysService = class ApiKeysService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createKey(userId, name) {
        const key = `ats_${(0, crypto_1.randomBytes)(32).toString('hex')}`;
        const apiKey = await this.prisma.apiKey.create({
            data: { userId, key, name },
        });
        return { success: true, data: { id: apiKey.id, key, name, createdAt: apiKey.createdAt } };
    }
    async listKeys(userId) {
        const keys = await this.prisma.apiKey.findMany({
            where: { userId },
            select: {
                id: true,
                name: true,
                isActive: true,
                usageCount: true,
                lastUsed: true,
                createdAt: true,
                key: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return {
            success: true,
            data: keys.map(k => ({
                ...k,
                key: `ats_${'*'.repeat(24)}${k.key.slice(-8)}`,
            })),
        };
    }
    async revokeKey(userId, keyId) {
        const existing = await this.prisma.apiKey.findFirst({ where: { id: keyId, userId } });
        if (!existing)
            throw new common_1.NotFoundException('API key not found');
        await this.prisma.apiKey.update({
            where: { id: keyId },
            data: { isActive: false },
        });
        return { success: true };
    }
};
exports.ApiKeysService = ApiKeysService;
exports.ApiKeysService = ApiKeysService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ApiKeysService);
//# sourceMappingURL=api-keys.service.js.map