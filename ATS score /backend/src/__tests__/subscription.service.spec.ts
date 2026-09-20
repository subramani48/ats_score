import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { SubscriptionService } from '../modules/subscription/subscription.service';
import { SubscriptionController } from '../modules/subscription/subscription.controller';
import { PrismaService } from '../prisma/prisma.service';

// Fix 11: plan limits are enforced. Fix 2: the free upgrade route is closed.
const mockPrisma = {
  user: { findUnique: jest.fn(), update: jest.fn() },
  analysis: { count: jest.fn() },
  coverLetter: { count: jest.fn() },
  interviewSession: { count: jest.fn() },
  apiKey: { count: jest.fn() },
};

describe('SubscriptionService.checkLimit()', () => {
  let service: SubscriptionService;
  const tier = (t: string | null) => mockPrisma.user.findUnique.mockResolvedValue(t ? { tier: t } : null);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubscriptionService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(SubscriptionService);
    jest.resetAllMocks();
  });

  describe.each([
    ['analysesPerMonth', 'analysis', { free: 5, pro: 50 }, /analyses/],
    ['coverLettersPerMonth', 'coverLetter', { free: 3, pro: 20 }, /cover letters/],
    ['interviewsPerMonth', 'interviewSession', { free: 3, pro: 20 }, /interview sessions/],
  ] as const)('%s', (feature, table, limits, wording) => {
    it.each(['free', 'pro'] as const)('%s plan: one below the limit passes, at the limit is refused', async plan => {
      tier(plan);
      mockPrisma[table].count.mockResolvedValue(limits[plan] - 1);
      await expect(service.checkLimit('u1', feature)).resolves.toBe(true);
      mockPrisma[table].count.mockResolvedValue(limits[plan]);
      const error = await service.checkLimit('u1', feature).catch(e => e);
      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.message).toMatch(wording);
      expect(error.message).not.toMatch(/upgrade/i);   // upgrades are not available, so the message must not promise one
    });

    it('enterprise is unlimited', async () => {
      tier('enterprise');
      mockPrisma[table].count.mockResolvedValue(100000);
      await expect(service.checkLimit('u1', feature)).resolves.toBe(true);
    });

    it('counts only this user\'s rows since the start of this month', async () => {
      tier('free');
      mockPrisma[table].count.mockResolvedValue(0);
      await service.checkLimit('u1', feature);
      const where = mockPrisma[table].count.mock.calls[0][0].where;
      expect(where.userId).toBe('u1');
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      expect(where.createdAt.gte.getTime()).toBe(monthStart.getTime());
    });
  });

  describe('apiKeysMax', () => {
    it('counts only ACTIVE keys (a revoked key does not use up the allowance)', async () => {
      tier('free');
      mockPrisma.apiKey.count.mockResolvedValue(0);
      await expect(service.checkLimit('u1', 'apiKeysMax')).resolves.toBe(true);
      expect(mockPrisma.apiKey.count.mock.calls[0][0].where).toEqual({ userId: 'u1', isActive: true });
    });

    it.each([['free', 1, /1 active API key\./], ['pro', 5, /5 active API keys/]])('%s: refuses at %d active keys', async (plan, max, wording) => {
      tier(plan);
      mockPrisma.apiKey.count.mockResolvedValue(max);
      const error = await service.checkLimit('u1', 'apiKeysMax').catch(e => e);
      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.message).toMatch(wording);
    });
  });

  describe('batchJDsPerRun', () => {
    it.each([['free', 2], ['pro', 10], ['enterprise', 20]])('%s: allows %d job descriptions and refuses one more', async (plan, max) => {
      tier(plan);
      await expect(service.checkLimit('u1', 'batchJDsPerRun', max)).resolves.toBe(true);
      await expect(service.checkLimit('u1', 'batchJDsPerRun', max + 1)).rejects.toThrow(ForbiddenException);
    });
  });

  it('refuses a missing user id without any database call', async () => {
    await expect(service.checkLimit(undefined as never, 'analysesPerMonth')).rejects.toThrow(/Login required/);
    await expect(service.checkLimit('', 'analysesPerMonth')).rejects.toThrow(/Login required/);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('treats a user with no record as Free', async () => {
    tier(null);
    mockPrisma.analysis.count.mockResolvedValue(5);
    await expect(service.checkLimit('ghost', 'analysesPerMonth')).rejects.toThrow(/Free plan/);
  });

  it('does not treat the on/off features as limits', async () => {
    tier('free');
    await expect(service.checkLimit('u1', 'priorityQueue')).resolves.toBe(true);
    await expect(service.checkLimit('u1', 'advancedAnalytics')).resolves.toBe(true);
  });
});

describe('SubscriptionController.upgradeTier() (Fix 2)', () => {
  it('always refuses, and never touches the service or anyone\'s plan', () => {
    const service = { getTierInfo: jest.fn() };
    const controller = new SubscriptionController(service as never);
    expect(() => controller.upgradeTier()).toThrow(ForbiddenException);
    expect(service.getTierInfo).not.toHaveBeenCalled();
  });

  it('the service has no method that sets a user\'s plan (upgrades must come from a verified payment step)', () => {
    expect((SubscriptionService.prototype as unknown as Record<string, unknown>).upgradeTier).toBeUndefined();
  });
});
