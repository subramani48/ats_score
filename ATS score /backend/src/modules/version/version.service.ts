import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// The most versions one comparison may ask for (the website compares at most 3).
const MAX_COMPARE = 5;

@Injectable()
export class VersionService {
  constructor(private readonly prisma: PrismaService) {}

  // A resume, and every version of it, may only be used by the user who owns the resume. Someone else's
  // resume gets the same "not found" as an ID that does not exist, so IDs cannot be probed.
  // A missing user ID is refused outright: Prisma silently ignores a filter whose value is undefined,
  // which would turn "only mine" into "everyone's".
  private assertUser(userId: string): void {
    if (!userId) throw new NotFoundException('Resume not found');
  }

  private async findOwnedResume(resumeId: string, userId: string) {
    this.assertUser(userId);
    const resume = await this.prisma.resume.findFirst({ where: { id: resumeId, userId } });
    if (!resume) throw new NotFoundException('Resume not found');
    return resume;
  }

  async getVersions(resumeId: string, userId: string) {
    await this.findOwnedResume(resumeId, userId);
    const versions = await this.prisma.resumeVersion.findMany({
      where: { resumeId },
      orderBy: { versionNum: 'desc' },
    });
    return { success: true, data: versions };
  }

  async createVersion(resumeId: string, userId: string, label?: string, score?: number, domain?: string) {
    const resume = await this.findOwnedResume(resumeId, userId);

    const latest = await this.prisma.resumeVersion.findFirst({
      where: { resumeId },
      orderBy: { versionNum: 'desc' },
    });

    const versionNum = (latest?.versionNum ?? 0) + 1;

    const version = await this.prisma.resumeVersion.create({
      data: {
        resumeId,
        versionNum,
        label: label ?? `Version ${versionNum}`,
        extractedText: resume.extractedText,
        score: score ?? null,
        domain: domain ?? null,
      },
    });

    return { success: true, data: version };
  }

  async compareVersions(versionIds: string[], userId: string) {
    this.assertUser(userId);
    // Only versions of the caller's own resumes come back; other IDs are silently left out.
    const versions = await this.prisma.resumeVersion.findMany({
      where: { id: { in: versionIds.slice(0, MAX_COMPARE) }, resume: { userId } },
      orderBy: { versionNum: 'asc' },
    });

    const comparison = versions.map(v => ({
      id: v.id,
      versionNum: v.versionNum,
      label: v.label,
      score: v.score,
      domain: v.domain,
      createdAt: v.createdAt,
      wordCount: v.extractedText ? v.extractedText.split(/\s+/).length : 0,
    }));

    return { success: true, data: comparison };
  }
}
