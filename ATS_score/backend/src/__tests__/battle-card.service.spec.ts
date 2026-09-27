import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { BattleCardService } from '../modules/battle-card/battle-card.service';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../modules/ai/gemini.service';

const mockPrisma = { battleCard: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), deleteMany: jest.fn() } };
const mockGemini = { generateJson: jest.fn() };
const dto = { company: 'Acme', role: 'Engineer' };

describe('BattleCardService', () => {
  let service: BattleCardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BattleCardService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GeminiService, useValue: mockGemini },
      ],
    }).compile();
    service = module.get(BattleCardService);
    jest.resetAllMocks();
    mockPrisma.battleCard.create.mockImplementation(async ({ data }) => ({ id: 'c1', ...data }));
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('generate()', () => {
    it('saves a fully shaped card for the caller', async () => {
      mockGemini.generateJson.mockResolvedValue({
        companySnapshot: 'snap',
        likelyRounds: [{ name: 'Phone', format: '30m', whatTheyTest: 'fit', prepTips: ['t'] }],
        topQuestions: [{ question: 'q', angle: 'a' }],
        questionsToAsk: ['ask'], redFlagsToProbe: ['flag'], talkingPoints: ['tp'],
        salaryNegotiation: { researchSteps: ['r'], anchoringScript: 'A', counterOfferScript: 'B', beyondBaseSalary: ['bonus'], avoid: ['x'] },
        first90Days: [{ phase: 'Days 1-30', goals: ['g'] }], disclaimer: 'verify this',
      });
      const result = await service.generate(dto as never, 'u1');
      const data = mockPrisma.battleCard.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ userId: 'u1', company: 'Acme', role: 'Engineer' });
      expect(data.content.salaryNegotiation.anchoringScript).toBe('A');
      expect(result.data.id).toBe('c1');
    });

    it('rebuilds missing or wrong-typed AI fields so the page can never crash on them', async () => {
      mockGemini.generateJson.mockResolvedValue({
        likelyRounds: [{ name: 'R1' }, null, 'junk'],
        topQuestions: 'not a list', questionsToAsk: [1, 'ok'], salaryNegotiation: null,
      });
      await service.generate(dto as never, 'u1');
      const c = mockPrisma.battleCard.create.mock.calls[0][0].data.content;
      expect(c.likelyRounds).toEqual([{ name: 'R1', format: '', whatTheyTest: '', prepTips: [] }]);
      expect(c.topQuestions).toEqual([]);
      expect(c.questionsToAsk).toEqual(['ok']);
      expect(c.salaryNegotiation).toEqual({ researchSteps: [], anchoringScript: '', counterOfferScript: '', beyondBaseSalary: [], avoid: [] });
      expect(c.first90Days).toEqual([]);
      expect(c.disclaimer).toBe('');
    });

    it('throws ServiceUnavailable when the AI returns no rounds at all', async () => {
      mockGemini.generateJson.mockResolvedValue({ companySnapshot: 'x' });
      await expect(service.generate(dto as never, 'u1')).rejects.toThrow(ServiceUnavailableException);
      expect(mockPrisma.battleCard.create).not.toHaveBeenCalled();
    });
  });

  describe('owner-only access', () => {
    it('list() returns only summaries of the caller\'s cards', async () => {
      mockPrisma.battleCard.findMany.mockResolvedValue([]);
      await service.list('u1');
      const arg = mockPrisma.battleCard.findMany.mock.calls[0][0];
      expect(arg.where).toEqual({ userId: 'u1' });
      expect(arg.select).not.toHaveProperty('content');
    });

    it('get() looks up by id AND owner, otherwise NotFound', async () => {
      mockPrisma.battleCard.findFirst.mockResolvedValueOnce(null);
      await expect(service.get('c1', 'u2')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.battleCard.findFirst).toHaveBeenCalledWith({ where: { id: 'c1', userId: 'u2' } });
      mockPrisma.battleCard.findFirst.mockResolvedValueOnce({ id: 'c1' });
      expect((await service.get('c1', 'u1')).data).toEqual({ id: 'c1' });
    });

    it('remove() deletes only when id AND owner match, otherwise NotFound', async () => {
      mockPrisma.battleCard.deleteMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.remove('c1', 'u2')).rejects.toThrow(NotFoundException);
      mockPrisma.battleCard.deleteMany.mockResolvedValueOnce({ count: 1 });
      expect(await service.remove('c1', 'u1')).toEqual({ success: true });
    });
  });
});
