import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VersionService {
  constructor(private readonly prisma: PrismaService) {}

  async getVersions(resumeId: string) {
    const versions = await this.prisma.resumeVersion.findMany({
      where: { resumeId },
      orderBy: { versionNum: 'desc' },
    });
    return { success: true, data: versions };
  }

  async createVersion(resumeId: string, label?: string, score?: number, domain?: string) {
    const resume = await this.prisma.resume.findUnique({ where: { id: resumeId } });
    if (!resume) throw new NotFoundException('Resume not found');

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

  async compareVersions(versionIds: string[]) {
    const versions = await this.prisma.resumeVersion.findMany({
      where: { id: { in: versionIds } },
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
