import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ApiKeysService, hashApiKey } from '../modules/api-keys/api-keys.service';
import { extractApiKey } from '../modules/api-keys/api-key.strategy';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  apiKey: {
    create:    jest.fn(),
    findMany:  jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update:    jest.fn(),
  },
};

describe('ApiKeysService', () => {
  let service: ApiKeysService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ApiKeysService>(ApiKeysService);
    jest.clearAllMocks();
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('createKey()', () => {
    it('returns an ats_ key once and stores only its hash', async () => {
      mockPrisma.apiKey.create.mockResolvedValue({ id: 'k1', name: 'My Key', createdAt: new Date() });
      const result = await service.createKey('u1', 'My Key');
      expect(result.data.key).toMatch(/^ats_[0-9a-f]{64}$/);

      const { data } = mockPrisma.apiKey.create.mock.calls[0][0];
      expect(data).toEqual({ userId: 'u1', name: 'My Key', keyHash: hashApiKey(result.data.key), keyLast8: result.data.key.slice(-8) });
      expect(JSON.stringify(data)).not.toContain(result.data.key);
    });
  });

  describe('listKeys()', () => {
    it('returns masked keys built from the last 8 characters', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([
        { id: 'k1', keyLast8: '12345678', name: 'Test', isActive: true, usageCount: 5, lastUsed: null, createdAt: new Date() },
      ]);
      const result = await service.listKeys('u1');
      expect(result.data[0].key).toBe(`ats_${'*'.repeat(24)}12345678`);
      expect(result.data[0]).not.toHaveProperty('keyLast8');
    });
  });

  describe('revokeKey()', () => {
    it('throws NotFoundException if key not found', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue(null);
      await expect(service.revokeKey('u1', 'k_missing')).rejects.toThrow(NotFoundException);
    });

    it('deactivates the key if found', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue({ id: 'k1', userId: 'u1', isActive: true });
      mockPrisma.apiKey.update.mockResolvedValue({ id: 'k1', isActive: false });
      const result = await service.revokeKey('u1', 'k1');
      expect(result.success).toBe(true);
    });
  });

  describe('authenticate()', () => {
    const key = `ats_${'a'.repeat(64)}`;

    it('returns the owner of an active key and counts the use', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({ id: 'k1', isActive: true, user: { id: 'u1', email: 'a@b.c' } });
      await expect(service.authenticate(key)).resolves.toEqual({ id: 'u1', email: 'a@b.c' });
      expect(mockPrisma.apiKey.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { keyHash: hashApiKey(key) } }));
      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'k1' },
        data: { usageCount: { increment: 1 }, lastUsed: expect.any(Date) },
      });
    });

    it('refuses a revoked key without counting it', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({ id: 'k1', isActive: false, user: { id: 'u1', email: 'a@b.c' } });
      await expect(service.authenticate(key)).resolves.toBeNull();
      expect(mockPrisma.apiKey.update).not.toHaveBeenCalled();
    });

    it('refuses an unknown key', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue(null);
      await expect(service.authenticate(key)).resolves.toBeNull();
    });

    it.each(['', 'ats_short', `ats_${'A'.repeat(64)}`, `xyz_${'a'.repeat(64)}`, 'eyJhbGciOi.jwt.token'])(
      'refuses the malformed key "%s" without a database lookup', async bad => {
        await expect(service.authenticate(bad)).resolves.toBeNull();
        expect(mockPrisma.apiKey.findUnique).not.toHaveBeenCalled();
      });
  });
});

describe('extractApiKey()', () => {
  const req = (headers: Record<string, string>) => ({ headers } as any);

  it('reads the X-API-Key header', () => {
    expect(extractApiKey(req({ 'x-api-key': ' ats_abc ' }))).toBe('ats_abc');
  });

  it('reads an ats_ key from a Bearer header', () => {
    expect(extractApiKey(req({ authorization: 'Bearer ats_abc' }))).toBe('ats_abc');
  });

  it('ignores a login token (JWT) in the Bearer header', () => {
    expect(extractApiKey(req({ authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.x.y' }))).toBeNull();
  });

  it('returns null when no key is sent', () => {
    expect(extractApiKey(req({}))).toBeNull();
  });
});
