import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { VersionService } from '../modules/version/version.service';
import { CreateSnapshotDto } from '../modules/version/dto/create-snapshot.dto';
import { PrismaService } from '../prisma/prisma.service';

// Fix 10: resume versions are owner-only, and the snapshot input is validated
const mockPrisma = {
  resume: { findFirst: jest.fn(), findUnique: jest.fn() },
  resumeVersion: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
};

describe('VersionService: owner-only access', () => {
  let service: VersionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VersionService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(VersionService);
    jest.resetAllMocks();
  });

  describe('getVersions()', () => {
    it('checks the resume belongs to the caller, then lists its versions', async () => {
      mockPrisma.resume.findFirst.mockResolvedValue({ id: 'R1' });
      mockPrisma.resumeVersion.findMany.mockResolvedValue([{ id: 'V2' }, { id: 'V1' }]);
      const result = await service.getVersions('R1', 'u1');
      expect(mockPrisma.resume.findFirst).toHaveBeenCalledWith({ where: { id: 'R1', userId: 'u1' } });
      expect(result.data).toHaveLength(2);
    });

    it('answers NotFound for someone else\'s resume WITHOUT even querying the versions', async () => {
      mockPrisma.resume.findFirst.mockResolvedValue(null);
      await expect(service.getVersions('R2', 'u1')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.resumeVersion.findMany).not.toHaveBeenCalled();
    });

    it.each([undefined, ''])('refuses a missing user id (%p) without querying anything', async userId => {
      await expect(service.getVersions('R1', userId as never)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.resume.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.resumeVersion.findMany).not.toHaveBeenCalled();
    });
  });

  describe('createVersion()', () => {
    it('copies the owner\'s resume text into the next version number', async () => {
      mockPrisma.resume.findFirst.mockResolvedValue({ id: 'R1', extractedText: 'owner text' });
      mockPrisma.resumeVersion.findFirst.mockResolvedValue({ versionNum: 2 });
      mockPrisma.resumeVersion.create.mockImplementation(async ({ data }) => ({ id: 'V3', ...data }));
      const result = await service.createVersion('R1', 'u1');
      expect(result.data).toMatchObject({ resumeId: 'R1', versionNum: 3, label: 'Version 3', extractedText: 'owner text', score: null, domain: null });
    });

    it('stores a label, score and domain when given', async () => {
      mockPrisma.resume.findFirst.mockResolvedValue({ id: 'R1', extractedText: 't' });
      mockPrisma.resumeVersion.findFirst.mockResolvedValue(null);
      mockPrisma.resumeVersion.create.mockImplementation(async ({ data }) => data);
      const result = await service.createVersion('R1', 'u1', 'My label', 88, 'React');
      expect(result.data).toMatchObject({ versionNum: 1, label: 'My label', score: 88, domain: 'React' });
    });

    it('writes NOTHING to someone else\'s resume', async () => {
      mockPrisma.resume.findFirst.mockResolvedValue(null);
      await expect(service.createVersion('R2', 'u1')).rejects.toThrow(NotFoundException);
      await expect(service.createVersion('R2', undefined as never)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.resumeVersion.create).not.toHaveBeenCalled();
    });

    it('no longer uses the unscoped resume.findUnique', async () => {
      mockPrisma.resume.findFirst.mockResolvedValue({ id: 'R1', extractedText: 't' });
      mockPrisma.resumeVersion.findFirst.mockResolvedValue(null);
      mockPrisma.resumeVersion.create.mockResolvedValue({});
      await service.createVersion('R1', 'u1');
      expect(mockPrisma.resume.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('compareVersions()', () => {
    it('only returns versions of the caller\'s own resumes, as scores and word counts (never the text)', async () => {
      mockPrisma.resumeVersion.findMany.mockResolvedValue([
        { id: 'V1', versionNum: 1, label: 'a', score: 50, domain: 'React', createdAt: new Date(), extractedText: 'one two three' },
      ]);
      const result = await service.compareVersions(['V1', 'V3'], 'u1');
      expect(mockPrisma.resumeVersion.findMany.mock.calls[0][0].where).toEqual({ id: { in: ['V1', 'V3'] }, resume: { userId: 'u1' } });
      expect(result.data[0]).toMatchObject({ id: 'V1', wordCount: 3 });
      expect(result.data[0]).not.toHaveProperty('extractedText');
    });

    it('uses at most 5 ids', async () => {
      mockPrisma.resumeVersion.findMany.mockResolvedValue([]);
      await service.compareVersions(['1', '2', '3', '4', '5', '6', '7', '8'], 'u1');
      expect(mockPrisma.resumeVersion.findMany.mock.calls[0][0].where.id.in).toHaveLength(5);
    });

    it('refuses a missing user id without querying', async () => {
      await expect(service.compareVersions(['V1'], undefined as never)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.resumeVersion.findMany).not.toHaveBeenCalled();
    });
  });
});

describe('CreateSnapshotDto input rules (the same options the server uses)', () => {
  const opts = { whitelist: true, forbidNonWhitelisted: true };
  const errorsFor = async (input: unknown) => validate(plainToInstance(CreateSnapshotDto, input as object), opts);

  it.each([[{}], [{ label: 'Before edits' }], [{ label: 'x', score: 100, domain: 'React' }], [{ score: 0 }], [{ label: 'x'.repeat(100) }]])(
    'accepts %j', async input => expect(await errorsFor(input)).toHaveLength(0),
  );

  it.each([
    [{ label: 'x'.repeat(101) }], [{ score: 101 }], [{ score: -1 }], [{ score: 'abc' }], [{ score: 55.5 }],
    [{ label: 123 }], [{ domain: 'x'.repeat(101) }], [{ label: 'x', isAdmin: true }],
  ])('refuses %j', async input => expect((await errorsFor(input)).length).toBeGreaterThan(0));
});
