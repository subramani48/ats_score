import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from '../ai/gemini.service';
import type { GenerateCoverLetterDto } from './dto/generate-cover-letter.dto';

@Injectable()
export class CoverLetterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  async generate(dto: GenerateCoverLetterDto, userId?: string) {
    const generatedText = await this.gemini.generateCoverLetter(
      dto.resumeText,
      dto.jobDescription,
      dto.companyName ?? '',
      dto.role ?? '',
      dto.tone ?? 'professional',
    );

    const saved = await this.prisma.coverLetter.create({
      data: {
        userId: userId ?? null,
        resumeText: dto.resumeText,
        jobDescription: dto.jobDescription,
        companyName: dto.companyName ?? null,
        role: dto.role ?? null,
        generatedText,
        tone: dto.tone ?? 'professional',
      },
    });

    return { success: true, data: { id: saved.id, generatedText, createdAt: saved.createdAt } };
  }

  async getUserHistory(userId: string) {
    const letters = await this.prisma.coverLetter.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        companyName: true,
        role: true,
        tone: true,
        generatedText: true,
        createdAt: true,
      },
    });
    return { success: true, data: letters };
  }
}
