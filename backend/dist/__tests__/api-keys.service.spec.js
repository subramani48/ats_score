"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const api_keys_service_1 = require("../modules/api-keys/api-keys.service");
const prisma_service_1 = require("../prisma/prisma.service");
const mockPrisma = {
    apiKey: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
    },
};
describe('ApiKeysService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                api_keys_service_1.ApiKeysService,
                { provide: prisma_service_1.PrismaService, useValue: mockPrisma },
            ],
        }).compile();
        service = module.get(api_keys_service_1.ApiKeysService);
        jest.clearAllMocks();
    });
    it('should be defined', () => expect(service).toBeDefined());
    describe('createKey()', () => {
        it('creates an API key with ats_ prefix', async () => {
            mockPrisma.apiKey.create.mockResolvedValue({
                id: 'k1', key: 'ats_abc123', name: 'My Key', isActive: true, createdAt: new Date(), usageCount: 0, lastUsed: null,
            });
            const result = await service.createKey('u1', 'My Key');
            expect(result.data.key).toMatch(/^ats_/);
        });
    });
    describe('listKeys()', () => {
        it('returns masked keys', async () => {
            mockPrisma.apiKey.findMany.mockResolvedValue([
                { id: 'k1', key: 'ats_1234567890abcdef12345678', name: 'Test', isActive: true, usageCount: 5, lastUsed: null, createdAt: new Date() },
            ]);
            const result = await service.listKeys('u1');
            expect(result.data[0].key).not.toBe('ats_1234567890abcdef12345678');
            expect(result.data[0].key).toContain('****');
        });
    });
    describe('revokeKey()', () => {
        it('throws NotFoundException if key not found', async () => {
            mockPrisma.apiKey.findFirst.mockResolvedValue(null);
            await expect(service.revokeKey('u1', 'k_missing')).rejects.toThrow(common_1.NotFoundException);
        });
        it('deactivates the key if found', async () => {
            mockPrisma.apiKey.findFirst.mockResolvedValue({ id: 'k1', userId: 'u1', isActive: true });
            mockPrisma.apiKey.update.mockResolvedValue({ id: 'k1', isActive: false });
            const result = await service.revokeKey('u1', 'k1');
            expect(result.success).toBe(true);
        });
    });
});
//# sourceMappingURL=api-keys.service.spec.js.map