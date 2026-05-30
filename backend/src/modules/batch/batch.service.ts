import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from '../ai/gemini.service';
import type { BatchAnalyzeDto } from './dto/batch-analyze.dto';

@Injectable()
export class BatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  async analyze(dto: BatchAnalyzeDto, userId?: string) {
    const batchJob = await this.prisma.batchJob.create({
      data: {
        userId: userId ?? null,
        status: 'processing',
        totalJDs: dto.jobDescriptions.length,
        domain: dto.domain,
      },
    });

    // Process all JDs in parallel (fan-out pattern)
    const results = await Promise.allSettled(
      dto.jobDescriptions.map(async (jdItem) => {
        const [keywordGap, companyAnalysis] = await Promise.allSettled([
          this.gemini.keywordGap(dto.resumeText, jdItem.jd),
          jdItem.company
            ? this.gemini.companyAtsAnalysis(dto.resumeText, jdItem.company, jdItem.title)
            : Promise.resolve(null),
        ]);

        return {
          title: jdItem.title,
          company: jdItem.company ?? null,
          keywordGap: keywordGap.status === 'fulfilled' ? keywordGap.value : null,
          companyAnalysis: companyAnalysis.status === 'fulfilled' ? companyAnalysis.value : null,
          error: keywordGap.status === 'rejected' ? String(keywordGap.reason) : null,
        };
      }),
    );

    const processedResults = results.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : { title: dto.jobDescriptions[i].title, error: String(r.reason) },
    );

    const completedCount = processedResults.filter(r => !('error' in r && r.error)).length;

    await this.prisma.batchJob.update({
      where: { id: batchJob.id },
      data: {
        status: 'completed',
        completedJDs: completedCount,
        results: processedResults as object,
      },
    });

    return {
      success: true,
      data: {
        batchId: batchJob.id,
        totalJDs: dto.jobDescriptions.length,
        completedJDs: completedCount,
        results: processedResults,
      },
    };
  }

  async getUserBatchJobs(userId: string) {
    const jobs = await this.prisma.batchJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        totalJDs: true,
        completedJDs: true,
        domain: true,
        createdAt: true,
      },
    });
    return { success: true, data: jobs };
  }
}
