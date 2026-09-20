import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ApplicationsService } from '../modules/applications/applications.service';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../modules/ai/gemini.service';

const mockPrisma = {
  jobApplication: {
    create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), deleteMany: jest.fn(), groupBy: jest.fn(),
  },
};
const mockGemini = { generateJson: jest.fn() };

describe('ApplicationsService', () => {
  let service: ApplicationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GeminiService, useValue: mockGemini },
      ],
    }).compile();
    service = module.get(ApplicationsService);
    jest.resetAllMocks();
    mockPrisma.jobApplication.create.mockImplementation(async ({ data }) => ({ id: 'a1', ...data }));
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('create()', () => {
    it('defaults to "applied" and stamps the applied date automatically', async () => {
      await service.create({ company: 'Acme', role: 'Dev' } as never, 'u1');
      const data = mockPrisma.jobApplication.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ userId: 'u1', status: 'applied' });
      expect(data.appliedAt).toBeInstanceOf(Date);
    });

    it('does NOT stamp an applied date for the wishlist', async () => {
      await service.create({ company: 'Acme', role: 'Dev', status: 'wishlist' } as never, 'u1');
      expect(mockPrisma.jobApplication.create.mock.calls[0][0].data.appliedAt).toBeUndefined();
    });

    it('keeps an applied date the user supplied, converted to a Date', async () => {
      await service.create({ company: 'Acme', role: 'Dev', appliedAt: '2026-03-01' } as never, 'u1');
      expect(mockPrisma.jobApplication.create.mock.calls[0][0].data.appliedAt).toEqual(new Date('2026-03-01'));
    });
  });

  describe('list()', () => {
    it('is limited to the caller and to 500 rows', async () => {
      mockPrisma.jobApplication.findMany.mockResolvedValue([]);
      await service.list('u1');
      expect(mockPrisma.jobApplication.findMany.mock.calls[0][0]).toMatchObject({ where: { userId: 'u1' }, take: 500 });
    });

    it('filters by a valid status but ignores an invalid one', async () => {
      mockPrisma.jobApplication.findMany.mockResolvedValue([]);
      await service.list('u1', 'offer');
      expect(mockPrisma.jobApplication.findMany.mock.calls[0][0].where).toEqual({ userId: 'u1', status: 'offer' });
      await service.list('u1', 'DROP TABLE');
      expect(mockPrisma.jobApplication.findMany.mock.calls[1][0].where).toEqual({ userId: 'u1' });
    });
  });

  describe('update() and remove() (owner-only)', () => {
    it('update() throws NotFound for someone else\'s application and writes nothing', async () => {
      mockPrisma.jobApplication.findFirst.mockResolvedValue(null);
      await expect(service.update('a1', { status: 'offer' } as never, 'u2')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.jobApplication.findFirst).toHaveBeenCalledWith({ where: { id: 'a1', userId: 'u2' } });
      expect(mockPrisma.jobApplication.update).not.toHaveBeenCalled();
    });

    it('update() converts dates for the owner', async () => {
      mockPrisma.jobApplication.findFirst.mockResolvedValue({ id: 'a1', userId: 'u1' });
      mockPrisma.jobApplication.update.mockResolvedValue({ id: 'a1' });
      await service.update('a1', { nextStepAt: '2027-01-15T00:00:00.000Z' } as never, 'u1');
      expect(mockPrisma.jobApplication.update.mock.calls[0][0].data.nextStepAt).toEqual(new Date('2027-01-15T00:00:00.000Z'));
    });

    it('remove() deletes only when id AND owner match', async () => {
      mockPrisma.jobApplication.deleteMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.remove('a1', 'u2')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.jobApplication.deleteMany).toHaveBeenCalledWith({ where: { id: 'a1', userId: 'u2' } });
      mockPrisma.jobApplication.deleteMany.mockResolvedValueOnce({ count: 1 });
      expect(await service.remove('a1', 'u1')).toEqual({ success: true });
    });
  });

  describe('stats()', () => {
    it('computes response, interview and offer rates from applied (not wishlist) items', async () => {
      mockPrisma.jobApplication.groupBy.mockResolvedValue([
        { status: 'wishlist', _count: { _all: 2 } }, { status: 'applied', _count: { _all: 3 } },
        { status: 'interview', _count: { _all: 1 } }, { status: 'offer', _count: { _all: 1 } },
      ]);
      mockPrisma.jobApplication.findMany.mockResolvedValue([{ id: 'x', company: 'C', role: 'R', status: 'interview', nextStepAt: new Date() }]);
      const { data } = await service.stats('u1');
      expect(data.total).toBe(7);
      expect(data.applied).toBe(5);           // 7 minus 2 wishlist
      expect(data.responseRate).toBe(40);     // (interview 1 + offer 1) / 5
      expect(data.interviewRate).toBe(40);
      expect(data.offerRate).toBe(20);
      expect(data.counts).toMatchObject({ wishlist: 2, applied: 3, screening: 0, accepted: 0, rejected: 0 });
      expect(data.upcoming).toHaveLength(1);
    });

    it('does not divide by zero when nothing has been applied yet', async () => {
      mockPrisma.jobApplication.groupBy.mockResolvedValue([{ status: 'wishlist', _count: { _all: 2 } }]);
      mockPrisma.jobApplication.findMany.mockResolvedValue([]);
      const { data } = await service.stats('u1');
      expect([data.applied, data.responseRate, data.interviewRate, data.offerRate]).toEqual([0, 0, 0, 0]);
    });

    it('only looks at the caller\'s data, and upcoming steps that are in the future and still open', async () => {
      mockPrisma.jobApplication.groupBy.mockResolvedValue([]);
      mockPrisma.jobApplication.findMany.mockResolvedValue([]);
      await service.stats('u1');
      expect(mockPrisma.jobApplication.groupBy.mock.calls[0][0].where).toEqual({ userId: 'u1' });
      const where = mockPrisma.jobApplication.findMany.mock.calls[0][0].where;
      expect(where.userId).toBe('u1');
      expect(where.nextStepAt.gte).toBeInstanceOf(Date);
      expect(where.status).toEqual({ notIn: ['rejected', 'accepted'] });
    });
  });

  describe('followUp()', () => {
    it('throws NotFound for someone else\'s application without calling the AI', async () => {
      mockPrisma.jobApplication.findFirst.mockResolvedValue(null);
      await expect(service.followUp('a1', { type: 'thank-you' }, 'u2')).rejects.toThrow(NotFoundException);
      expect(mockGemini.generateJson).not.toHaveBeenCalled();
    });

    it('returns the drafted subject and body', async () => {
      mockPrisma.jobApplication.findFirst.mockResolvedValue({ id: 'a1', company: 'Acme', role: 'Dev', notes: null });
      mockGemini.generateJson.mockResolvedValue({ subject: 'Thanks', body: 'Hello' });
      const result = await service.followUp('a1', { type: 'thank-you', interviewerName: 'Sam' }, 'u1');
      expect(result.data).toEqual({ subject: 'Thanks', body: 'Hello' });
      expect(mockGemini.generateJson.mock.calls[0][0]).toContain('Acme');
    });

    it('throws ServiceUnavailable when the AI returns an incomplete email', async () => {
      mockPrisma.jobApplication.findFirst.mockResolvedValue({ id: 'a1', company: 'A', role: 'R', notes: null });
      mockGemini.generateJson.mockResolvedValue({ subject: 'only a subject' });
      await expect(service.followUp('a1', { type: 'follow-up' }, 'u1')).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
