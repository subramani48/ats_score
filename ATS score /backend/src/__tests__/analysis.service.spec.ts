import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AnalysisService } from '../modules/analysis/analysis.service';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../modules/ai/gemini.service';

// Fix 8: an analysis (and the resume text inside it) can only be read by its owner
const mockPrisma = {
  analysis: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
  resume: { findUnique: jest.fn() },
};
const mockGemini = { keywordGap: jest.fn(), startChat: jest.fn() };

describe('AnalysisService: owner-only access', () => {
  let service: AnalysisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GeminiService, useValue: mockGemini },
      ],
    }).compile();
    service = module.get(AnalysisService);
    jest.resetAllMocks();
  });

  describe('findById()', () => {
    it('looks up by id AND owner and returns the analysis', async () => {
      mockPrisma.analysis.findFirst.mockResolvedValue({ id: 'A1', resume: { extractedText: 'text' } });
      const result = await service.findById('A1', 'u1');
      expect(mockPrisma.analysis.findFirst.mock.calls[0][0].where).toEqual({ id: 'A1', userId: 'u1' });
      expect(result.data.id).toBe('A1');
    });

    it('gives someone else\'s analysis and an unknown id the SAME NotFound, so ids cannot be probed', async () => {
      mockPrisma.analysis.findFirst.mockResolvedValue(null);
      const other = await service.findById('A1', 'u2').catch(e => e);
      const unknown = await service.findById('ZZZ', 'u2').catch(e => e);
      expect(other).toBeInstanceOf(NotFoundException);
      expect(unknown).toBeInstanceOf(NotFoundException);
      expect(other.message).toBe(unknown.message);
    });

    it.each([undefined, '', null])('refuses a missing user id (%p) without querying, because Prisma ignores undefined filters', async userId => {
      await expect(service.findById('A1', userId as never)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.analysis.findFirst).not.toHaveBeenCalled();
    });

    it('no longer uses the unscoped findUnique', async () => {
      mockPrisma.analysis.findFirst.mockResolvedValue({ id: 'A1' });
      await service.findById('A1', 'u1');
      expect(mockPrisma.analysis.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('compareAnalyses()', () => {
    it('returns only the caller\'s analyses, in the order asked for', async () => {
      mockPrisma.analysis.findMany.mockResolvedValue([{ id: 'A1' }, { id: 'A4' }]);
      const result = await service.compareAnalyses(['A4', 'A2', 'A1'], 'u1');
      expect(mockPrisma.analysis.findMany.mock.calls[0][0].where).toEqual({ id: { in: ['A4', 'A2', 'A1'] }, userId: 'u1' });
      expect(result.data.map(a => a?.id)).toEqual(['A4', 'A1']);
    });

    it('uses at most 5 ids', async () => {
      mockPrisma.analysis.findMany.mockResolvedValue([]);
      await service.compareAnalyses(['1', '2', '3', '4', '5', '6', '7'], 'u1');
      expect(mockPrisma.analysis.findMany.mock.calls[0][0].where.id.in).toHaveLength(5);
    });

    it('still needs at least 2 ids, and refuses a missing user id', async () => {
      await expect(service.compareAnalyses(['A1'], 'u1')).rejects.toThrow(BadRequestException);
      await expect(service.compareAnalyses(['A1', 'A2'], undefined as never)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.analysis.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getKeywordGap()', () => {
    it('uses the owner\'s resume text', async () => {
      mockPrisma.analysis.findFirst.mockResolvedValue({ id: 'A1', resumeId: 'R1', jobDescription: 'jd' });
      mockPrisma.resume.findUnique.mockResolvedValue({ extractedText: 'owner resume' });
      mockGemini.keywordGap.mockResolvedValue({ criticalMissing: [] });
      await service.getKeywordGap('A1', 'u1');
      expect(mockGemini.keywordGap).toHaveBeenCalledWith('owner resume', 'jd');
    });

    it('never calls the AI for someone else\'s analysis or a missing user', async () => {
      mockPrisma.analysis.findFirst.mockResolvedValue(null);
      await expect(service.getKeywordGap('A1', 'u2')).rejects.toThrow(NotFoundException);
      await expect(service.getKeywordGap('A1', undefined as never)).rejects.toThrow(NotFoundException);
      expect(mockGemini.keywordGap).not.toHaveBeenCalled();
    });

    it('still requires a job description', async () => {
      mockPrisma.analysis.findFirst.mockResolvedValue({ id: 'A1', jobDescription: null });
      await expect(service.getKeywordGap('A1', 'u1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('startChatSession()', () => {
    it('starts a chat about the owner\'s own resume', async () => {
      mockPrisma.analysis.findFirst.mockResolvedValue({ id: 'A1', score: 80, domain: 'React', keywordsMissed: ['x'], resume: { extractedText: 'owner resume' } });
      mockGemini.startChat.mockResolvedValue({ chat: true });
      await service.startChatSession('A1', 'u1');
      expect(mockGemini.startChat).toHaveBeenCalledWith('owner resume', 80, 'React', ['x']);
    });

    it('never starts a chat for someone else\'s analysis or a missing user', async () => {
      mockPrisma.analysis.findFirst.mockResolvedValue(null);
      await expect(service.startChatSession('A1', 'u2')).rejects.toThrow(NotFoundException);
      await expect(service.startChatSession('A1', '')).rejects.toThrow(NotFoundException);
      expect(mockGemini.startChat).not.toHaveBeenCalled();
    });
  });
});
