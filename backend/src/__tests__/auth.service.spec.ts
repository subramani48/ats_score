import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../modules/auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst:  jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
  },
};

const mockJwt = { sign: jest.fn(() => 'mock-token') };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService,    useValue: mockJwt },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ── register ──────────────────────────────────────────────────────────────
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
        .rejects.toThrow(ConflictException);
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────
  describe('login()', () => {
    it('throws UnauthorizedException for unknown email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: 'no@one.com', password: '123' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      // bcrypt hash of 'correct_password'
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'test@test.com',
        passwordHash: '$2a$12$invalidhash',
      });
      await expect(service.login({ email: 'test@test.com', password: 'wrong_password' }))
        .rejects.toThrow(UnauthorizedException);
    });
  });


});
