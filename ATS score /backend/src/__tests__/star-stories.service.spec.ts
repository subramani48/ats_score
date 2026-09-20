import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { StarStoriesService } from '../modules/star-stories/star-stories.service';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../modules/ai/gemini.service';

const mockPrisma = {
  starStory: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
  $transaction: jest.fn(),
};
const mockGemini = { generateJson: jest.fn() };

const rawStory = (over: Record<string, unknown> = {}) => ({
  title: 'Led a migration', competencies: ['leadership'], situation: 'monolith', task: 'split it',
  action: 'planned rollout', result: 'deploys 8x faster', metrics: ['2h to 15m'], followUps: ['Why then?'], ...over,
});

describe('StarStoriesService', () => {
  let service: StarStoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StarStoriesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GeminiService, useValue: mockGemini },
      ],
    }).compile();
    service = module.get(StarStoriesService);
    jest.resetAllMocks();
    // $transaction receives the already-created records; return them as a real one would
    mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => ops);
    mockPrisma.starStory.create.mockImplementation(({ data }) => ({ id: `id-${data.title}`, ...data }));
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('generate()', () => {
    it('saves valid stories for the caller and asks the AI for 6 by default', async () => {
      mockGemini.generateJson.mockResolvedValue({ stories: [rawStory(), rawStory({ title: 'Second' })] });
      const result = await service.generate({ resumeText: 'resume' } as never, 'u1');
      expect(mockGemini.generateJson.mock.calls[0][0]).toContain('into 6 reusable STAR');
      expect(result.data).toHaveLength(2);
      expect(mockPrisma.starStory.create.mock.calls.every(c => c[0].data.userId === 'u1')).toBe(true);
    });

    it('drops stories that are missing a title, situation or action', async () => {
      mockGemini.generateJson.mockResolvedValue({
        stories: [rawStory(), rawStory({ title: '' }), rawStory({ situation: undefined }), rawStory({ action: 5 })],
      });
      const result = await service.generate({ resumeText: 'r', count: 4 } as never, 'u1');
      expect(result.data).toHaveLength(1);
    });

    it('cleans field types and lengths from the AI', async () => {
      mockGemini.generateJson.mockResolvedValue({
        stories: [rawStory({ title: 'x'.repeat(500), competencies: ['ok', 7, null], metrics: 'not a list', followUps: new Array(20).fill('f') })],
      });
      await service.generate({ resumeText: 'r' } as never, 'u1');
      const data = mockPrisma.starStory.create.mock.calls[0][0].data;
      expect(data.title).toHaveLength(200);
      expect(data.competencies).toEqual(['ok']);
      expect(data.metrics).toEqual([]);
      expect(data.followUps).toHaveLength(10);
    });

    it('throws ServiceUnavailable when nothing usable comes back', async () => {
      mockGemini.generateJson.mockResolvedValue({});
      await expect(service.generate({ resumeText: 'r' } as never, 'u1')).rejects.toThrow(ServiceUnavailableException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('list / update / remove (owner-only)', () => {
    it('list() only asks for the caller\'s stories', async () => {
      mockPrisma.starStory.findMany.mockResolvedValue([]);
      await service.list('u1');
      expect(mockPrisma.starStory.findMany.mock.calls[0][0].where).toEqual({ userId: 'u1' });
    });

    it('update() edits only when id AND owner match, otherwise NotFound', async () => {
      mockPrisma.starStory.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.update('st1', { title: 'x' }, 'u2')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.starStory.updateMany).toHaveBeenCalledWith({ where: { id: 'st1', userId: 'u2' }, data: { title: 'x' } });
      mockPrisma.starStory.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.starStory.findUnique.mockResolvedValue({ id: 'st1', title: 'x' });
      expect((await service.update('st1', { title: 'x' }, 'u1')).data).toEqual({ id: 'st1', title: 'x' });
    });

    it('remove() deletes only when id AND owner match, otherwise NotFound', async () => {
      mockPrisma.starStory.deleteMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.remove('st1', 'u2')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.starStory.deleteMany).toHaveBeenCalledWith({ where: { id: 'st1', userId: 'u2' } });
      mockPrisma.starStory.deleteMany.mockResolvedValueOnce({ count: 1 });
      expect(await service.remove('st1', 'u1')).toEqual({ success: true });
    });
  });

  describe('match()', () => {
    const stories = [
      { id: 'a', title: 'A', competencies: [], situation: 's', result: 'r' },
      { id: 'b', title: 'B', competencies: [], situation: 's', result: 'r' },
    ];

    it('asks the user to generate stories first when they have none', async () => {
      mockPrisma.starStory.findMany.mockResolvedValue([]);
      await expect(service.match({ question: 'q' }, 'u1')).rejects.toThrow(BadRequestException);
      expect(mockGemini.generateJson).not.toHaveBeenCalled();
    });

    it('only considers the caller\'s latest 30 stories', async () => {
      mockPrisma.starStory.findMany.mockResolvedValue(stories);
      mockGemini.generateJson.mockResolvedValue({ matches: [], gap: '' });
      await service.match({ question: 'q' }, 'u1');
      expect(mockPrisma.starStory.findMany.mock.calls[0][0]).toMatchObject({ where: { userId: 'u1' }, take: 30 });
    });

    it('ignores story ids the AI invented, clamps fit scores, and returns at most 3', async () => {
      const many = ['a', 'b', 'c', 'd'].map(id => ({ id, title: id, competencies: [], situation: 's', result: 'r' }));
      mockPrisma.starStory.findMany.mockResolvedValue(many);
      mockGemini.generateJson.mockResolvedValue({
        matches: [
          { storyId: 'ghost', fitScore: 90, whyItFits: 'x', howToAdapt: 'x', openingLine: 'x' },
          { storyId: 'a', fitScore: 150, whyItFits: 'w', howToAdapt: 'h', openingLine: 'o' },
          { storyId: 'b', fitScore: -20, whyItFits: 'w', howToAdapt: 'h', openingLine: 'o' },
          { storyId: 'c', fitScore: 'high', whyItFits: 'w', howToAdapt: 'h', openingLine: 'o' },
          { storyId: 'd', fitScore: 50, whyItFits: 'w', howToAdapt: 'h', openingLine: 'o' },
        ],
        gap: 'a conflict story',
      });
      const result = await service.match({ question: 'q' }, 'u1');
      expect(result.data.matches.map(m => m.story?.id)).toEqual(['a', 'b', 'c']);
      expect(result.data.matches.map(m => m.fitScore)).toEqual([100, 0, 0]);
      expect(result.data.gap).toBe('a conflict story');
    });
  });
});
