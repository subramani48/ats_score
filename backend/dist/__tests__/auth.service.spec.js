"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const jwt_1 = require("@nestjs/jwt");
const common_1 = require("@nestjs/common");
const auth_service_1 = require("../modules/auth/auth.service");
const prisma_service_1 = require("../prisma/prisma.service");
const mockPrisma = {
    user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
};
const mockJwt = { sign: jest.fn(() => 'mock-token') };
describe('AuthService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                auth_service_1.AuthService,
                { provide: prisma_service_1.PrismaService, useValue: mockPrisma },
                { provide: jwt_1.JwtService, useValue: mockJwt },
            ],
        }).compile();
        service = module.get(auth_service_1.AuthService);
        jest.clearAllMocks();
    });
    describe('register()', () => {
        it('creates a new user and returns a token', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);
            mockPrisma.user.create.mockResolvedValue({ id: 'u1', email: 'test@test.com', name: 'Alice' });
            const result = await service.register({ email: 'test@test.com', name: 'Alice', password: 'secret123' });
            expect(result.success).toBe(true);
            expect(result.token).toBe('mock-token');
            expect(result.user.email).toBe('test@test.com');
        });
        it('throws ConflictException if email already registered', async () => {
            mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'test@test.com' });
            await expect(service.register({ email: 'test@test.com', name: 'Bob', password: 'secret123' }))
                .rejects.toThrow(common_1.ConflictException);
        });
    });
    describe('login()', () => {
        it('throws UnauthorizedException for unknown email', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);
            await expect(service.login({ email: 'no@one.com', password: '123' }))
                .rejects.toThrow(common_1.UnauthorizedException);
        });
        it('throws UnauthorizedException for wrong password', async () => {
            mockPrisma.user.findUnique.mockResolvedValue({
                id: 'u1',
                email: 'test@test.com',
                passwordHash: '$2a$12$invalidhash',
            });
            await expect(service.login({ email: 'test@test.com', password: 'wrong_password' }))
                .rejects.toThrow(common_1.UnauthorizedException);
        });
    });
});
//# sourceMappingURL=auth.service.spec.js.map