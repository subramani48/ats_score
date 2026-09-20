import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { MockInterviewService } from '../modules/mock-interview/mock-interview.service';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../modules/ai/gemini.service';

const mockPrisma = {
  mockInterview: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  },
};
const mockGemini = { generateJson: jest.fn() };

const session = (over: Record<string, unknown> = {}) => ({
  id: 's1', userId: 'u1', role: 'Engineer', company: null, domain: 'Node.js', difficulty: 'medium',
  persona: 'neutral', totalQuestions: 3, status: 'active', resumeText: 'SECRET RESUME', jobDescription: null,
  turns: [{ question: 'Q1', category: 'aboutYou' }], report: null, createdAt: new Date(),
  updatedAt: new Date('2026-01-01T00:00:00Z'), ...over,
});
const evaluation = (over: Record<string, unknown> = {}) => ({
  scores: { relevance: 8, structure: 7, depth: 6, clarity: 8, confidence: 7 }, overall: 7,
  strengths: ['clear'], improvements: ['add numbers'], betterAnswer: 'better', deliveryNote: '', ...over,
});

describe('MockInterviewService', () => {
  let service: MockInterviewService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockInterviewService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GeminiService, useValue: mockGemini },
      ],
    }).compile();
    service = module.get(MockInterviewService);
    jest.resetAllMocks();
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('start()', () => {
    const dto = { role: 'Engineer', domain: 'Node.js', resumeText: 'SECRET RESUME' };

    it('stores the first question with defaults (5 questions, medium, neutral)', async () => {
      mockGemini.generateJson.mockResolvedValue({ question: 'Tell me about yourself', category: 'aboutYou' });
      mockPrisma.mockInterview.create.mockImplementation(async ({ data }) => session({ ...data, id: 's9' }));
      const result = await service.start(dto as never, 'u1');
      const data = mockPrisma.mockInterview.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ userId: 'u1', totalQuestions: 5, difficulty: 'medium', persona: 'neutral' });
      expect(data.turns).toEqual([{ question: 'Tell me about yourself', category: 'aboutYou' }]);
      expect(result.data.id).toBe('s9');
    });

    it('never returns the stored resume text', async () => {
      mockGemini.generateJson.mockResolvedValue({ question: 'Q', category: 'technical' });
      mockPrisma.mockInterview.create.mockResolvedValue(session());
      const result = await service.start(dto as never, 'u1');
      expect(JSON.stringify(result)).not.toContain('SECRET RESUME');
    });

    it('throws ServiceUnavailable when the AI returns no question', async () => {
      mockGemini.generateJson.mockResolvedValue({});
      await expect(service.start(dto as never, 'u1')).rejects.toThrow(ServiceUnavailableException);
      expect(mockPrisma.mockInterview.create).not.toHaveBeenCalled();
    });
  });

  describe('answer()', () => {
    it("throws NotFound for someone else's or an unknown interview", async () => {
      mockPrisma.mockInterview.findFirst.mockResolvedValue(null);
      await expect(service.answer('s1', { answer: 'x' }, 'u2')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.mockInterview.findFirst).toHaveBeenCalledWith({ where: { id: 's1', userId: 'u2' } });
    });

    it('refuses a finished interview', async () => {
      mockPrisma.mockInterview.findFirst.mockResolvedValue(session({ status: 'completed' }));
      await expect(service.answer('s1', { answer: 'x' }, 'u1')).rejects.toThrow(BadRequestException);
    });

    it('refuses when there is no pending question', async () => {
      mockPrisma.mockInterview.findFirst.mockResolvedValue(session({ turns: [{ question: 'Q1', category: 'x', answer: 'done' }] }));
      await expect(service.answer('s1', { answer: 'x' }, 'u1')).rejects.toThrow(BadRequestException);
    });

    it('scores the answer, appends the next question, and saves with an optimistic lock', async () => {
      const s = session();
      mockPrisma.mockInterview.findFirst.mockResolvedValue(s);
      mockGemini.generateJson.mockResolvedValue({ evaluation: evaluation(), nextQuestion: { question: 'Q2', category: 'technical' } });
      mockPrisma.mockInterview.updateMany.mockResolvedValue({ count: 1 });
      await service.answer('s1', { answer: 'my answer', delivery: { fillerCount: 2 } }, 'u1');
      const call = mockPrisma.mockInterview.updateMany.mock.calls[0][0];
      expect(call.where).toEqual({ id: 's1', userId: 'u1', status: 'active', updatedAt: s.updatedAt });
      expect(call.data.turns).toHaveLength(2);
      expect(call.data.turns[0]).toMatchObject({ answer: 'my answer', delivery: { fillerCount: 2 } });
      expect(call.data.turns[1]).toEqual({ question: 'Q2', category: 'technical' });
    });

    it('clamps out-of-range and non-numeric AI scores to 0-10', async () => {
      const s = session();
      mockPrisma.mockInterview.findFirst.mockResolvedValue(s);
      mockGemini.generateJson.mockResolvedValue({
        evaluation: evaluation({ overall: 99, scores: { relevance: -5, structure: 'high', depth: 12, clarity: 3.14159, confidence: null } }),
        nextQuestion: { question: 'Q2', category: 'x' },
      });
      mockPrisma.mockInterview.updateMany.mockResolvedValue({ count: 1 });
      await service.answer('s1', { answer: 'a' }, 'u1');
      const ev = mockPrisma.mockInterview.updateMany.mock.calls[0][0].data.turns[0].evaluation;
      expect(ev.overall).toBe(10);
      expect(ev.scores).toEqual({ relevance: 0, structure: 0, depth: 10, clarity: 3.1, confidence: 0 });
    });

    it('does not ask for a next question on the last one', async () => {
      const s = session({ totalQuestions: 1 });
      mockPrisma.mockInterview.findFirst.mockResolvedValue(s);
      mockGemini.generateJson.mockResolvedValue({ evaluation: evaluation(), nextQuestion: null });
      mockPrisma.mockInterview.updateMany.mockResolvedValue({ count: 1 });
      await service.answer('s1', { answer: 'a' }, 'u1');
      expect(mockPrisma.mockInterview.updateMany.mock.calls[0][0].data.turns).toHaveLength(1);
    });

    it('throws ServiceUnavailable (and saves nothing) if the AI gives no feedback', async () => {
      mockPrisma.mockInterview.findFirst.mockResolvedValue(session());
      mockGemini.generateJson.mockResolvedValue({});
      await expect(service.answer('s1', { answer: 'a' }, 'u1')).rejects.toThrow(ServiceUnavailableException);
      expect(mockPrisma.mockInterview.updateMany).not.toHaveBeenCalled();
    });

    it('throws ServiceUnavailable (and saves nothing) if a next question is needed but missing', async () => {
      mockPrisma.mockInterview.findFirst.mockResolvedValue(session());
      mockGemini.generateJson.mockResolvedValue({ evaluation: evaluation(), nextQuestion: null });
      await expect(service.answer('s1', { answer: 'a' }, 'u1')).rejects.toThrow(ServiceUnavailableException);
      expect(mockPrisma.mockInterview.updateMany).not.toHaveBeenCalled();
    });

    it('throws Conflict when the same answer is submitted twice at once', async () => {
      mockPrisma.mockInterview.findFirst.mockResolvedValue(session());
      mockGemini.generateJson.mockResolvedValue({ evaluation: evaluation(), nextQuestion: { question: 'Q2', category: 'x' } });
      mockPrisma.mockInterview.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.answer('s1', { answer: 'a' }, 'u1')).rejects.toThrow(ConflictException);
    });
  });

  describe('finish()', () => {
    const answered = [{ question: 'Q1', category: 'x', answer: 'a', evaluation: evaluation() }];

    it('throws NotFound for someone else\'s interview', async () => {
      mockPrisma.mockInterview.findFirst.mockResolvedValue(null);
      await expect(service.finish('s1', 'u2')).rejects.toThrow(NotFoundException);
    });

    it('refuses to finish before any answer', async () => {
      mockPrisma.mockInterview.findFirst.mockResolvedValue(session());
      await expect(service.finish('s1', 'u1')).rejects.toThrow(BadRequestException);
      expect(mockGemini.generateJson).not.toHaveBeenCalled();
    });

    it('returns an existing report without calling the AI again', async () => {
      const report = { readinessScore: 70 };
      mockPrisma.mockInterview.findFirst.mockResolvedValue(session({ report, turns: answered }));
      const result = await service.finish('s1', 'u1');
      expect(result.data.report).toEqual(report);
      expect(mockGemini.generateJson).not.toHaveBeenCalled();
    });

    it('cleans the AI report: clamps scores, caps lists, fills missing fields', async () => {
      mockPrisma.mockInterview.findFirst.mockResolvedValue(session({ turns: answered }));
      mockGemini.generateJson.mockResolvedValue({
        readinessScore: 250, verdict: 'ok',
        categoryScores: { communication: 11, structure: -1, technicalDepth: 'x' },
        strengths: ['a', 42, 'b'],
        topFixes: [null, { issue: 'i1', fix: 'f1' }, 'string', { issue: 'i2' }, {}, {}, {}, {}],
        practicePlan: Array.from({ length: 9 }, (_, i) => ({ focus: `f${i}` })),
      });
      mockPrisma.mockInterview.update.mockImplementation(async ({ data }) => session({ status: data.status, report: data.report, turns: answered }));
      await service.finish('s1', 'u1');
      const { data } = mockPrisma.mockInterview.update.mock.calls[0][0];
      expect(data.status).toBe('completed');
      expect(data.report.readinessScore).toBe(100);
      expect(data.report.categoryScores).toEqual({ communication: 10, structure: 0, technicalDepth: 0, relevance: 0, confidence: 0 });
      expect(data.report.strengths).toEqual(['a', 'b']);
      expect(data.report.topFixes).toHaveLength(5);
      expect(data.report.topFixes[0]).toEqual({ issue: 'i1', fix: 'f1' });
      expect(data.report.practicePlan).toHaveLength(7);
      expect(data.report.practicePlan[0]).toMatchObject({ day: 1, focus: 'f0', task: '' });
    });
  });

  describe('get() and history()', () => {
    it('get() throws NotFound for non-owners and hides the resume text for owners', async () => {
      mockPrisma.mockInterview.findFirst.mockResolvedValueOnce(null);
      await expect(service.get('s1', 'u2')).rejects.toThrow(NotFoundException);
      mockPrisma.mockInterview.findFirst.mockResolvedValueOnce(session());
      const result = await service.get('s1', 'u1');
      expect(JSON.stringify(result)).not.toContain('SECRET RESUME');
    });

    it('history() lists only the caller\'s sessions with the readiness score', async () => {
      mockPrisma.mockInterview.findMany.mockResolvedValue([
        { id: 'a', role: 'r', company: null, status: 'completed', report: { readinessScore: 81 }, createdAt: new Date() },
        { id: 'b', role: 'r', company: null, status: 'active', report: null, createdAt: new Date() },
      ]);
      const result = await service.history('u1');
      expect(mockPrisma.mockInterview.findMany.mock.calls[0][0].where).toEqual({ userId: 'u1' });
      expect(result.data.map(r => r.readinessScore)).toEqual([81, null]);
    });
  });
});
