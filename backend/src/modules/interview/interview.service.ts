import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from '../ai/gemini.service';
import type { GenerateInterviewDto } from './dto/generate-interview.dto';

@Injectable()
export class InterviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  async generate(dto: GenerateInterviewDto, userId?: string) {
    const questions = await this.gemini.generateInterviewQuestions(
      dto.resumeText,
      dto.jobDescription,
      dto.domain,
      dto.difficulty ?? 'medium',
    );

    const saved = await this.prisma.interviewSession.create({
      data: {
        userId: userId ?? null,
        resumeText: dto.resumeText,
        jobDescription: dto.jobDescription,
        domain: dto.domain,
        difficulty: dto.difficulty ?? 'medium',
        questions: questions as object,
      },
    });

    return {
      success: true,
      data: {
        id: saved.id,
        questions,
        domain: dto.domain,
        difficulty: dto.difficulty ?? 'medium',
        createdAt: saved.createdAt,
      },
    };
  }

  async getUserHistory(userId: string) {
    const sessions = await this.prisma.interviewSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        domain: true,
        difficulty: true,
        questions: true,
        createdAt: true,
      },
    });
    return { success: true, data: sessions };
  }
}
