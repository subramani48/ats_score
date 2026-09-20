import {
  BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException,
} from '@nestjs/common';
import type { MockInterview } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from '../ai/gemini.service';
import { asObjects as objects, asStrings } from '../../common/ai-output';
import {
  mockAnswerPrompt, mockFirstQuestionPrompt, mockReportPrompt, type MockContext,
} from '../ai/prompts/interview-pro.prompts';
import type { StartMockInterviewDto, SubmitAnswerDto } from './dto/mock-interview.dto';

export interface Evaluation {
  scores: Record<'relevance' | 'structure' | 'depth' | 'clarity' | 'confidence', number>;
  overall: number;
  strengths: string[];
  improvements: string[];
  betterAnswer: string;
  deliveryNote?: string;
}

export interface Turn {
  question: string;
  category: string;
  answer?: string;
  delivery?: SubmitAnswerDto['delivery'];
  evaluation?: Evaluation;
}

interface AnswerResult {
  evaluation: Evaluation;
  nextQuestion: { question: string; category: string } | null;
}

const clamp = (n: unknown, min: number, max: number) => {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.min(max, Math.max(min, Math.round(v * 10) / 10));
};
const strings = (a: unknown) => asStrings(a, { maxItems: 8 });

function cleanEvaluation(e: Evaluation): Evaluation {
  const s = e?.scores ?? ({} as Evaluation['scores']);
  return {
    scores: {
      relevance: clamp(s.relevance, 0, 10),
      structure: clamp(s.structure, 0, 10),
      depth: clamp(s.depth, 0, 10),
      clarity: clamp(s.clarity, 0, 10),
      confidence: clamp(s.confidence, 0, 10),
    },
    overall: clamp(e?.overall, 0, 10),
    strengths: strings(e?.strengths),
    improvements: strings(e?.improvements),
    betterAnswer: typeof e?.betterAnswer === 'string' ? e.betterAnswer : '',
    deliveryNote: typeof e?.deliveryNote === 'string' ? e.deliveryNote : '',
  };
}

@Injectable()
export class MockInterviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  private ctx(s: Pick<MockInterview, 'role' | 'company' | 'domain' | 'difficulty' | 'persona' | 'resumeText' | 'jobDescription'>): MockContext {
    return { ...s };
  }

  private view(s: MockInterview) {
    return {
      id: s.id,
      role: s.role,
      company: s.company,
      domain: s.domain,
      difficulty: s.difficulty,
      persona: s.persona,
      totalQuestions: s.totalQuestions,
      status: s.status,
      turns: s.turns as unknown as Turn[],
      report: s.report,
      createdAt: s.createdAt,
    };
  }

  private async getOwned(id: string, userId: string) {
    const session = await this.prisma.mockInterview.findFirst({ where: { id, userId } });
    if (!session) throw new NotFoundException('Mock interview not found');
    return session;
  }

  async start(dto: StartMockInterviewDto, userId: string) {
    const base = {
      role: dto.role,
      company: dto.company ?? null,
      domain: dto.domain,
      difficulty: dto.difficulty ?? 'medium',
      persona: dto.persona ?? 'neutral',
      resumeText: dto.resumeText,
      jobDescription: dto.jobDescription ?? null,
    };
    const first = await this.gemini.generateJson<{ question: string; category: string }>(
      mockFirstQuestionPrompt(this.ctx(base)),
    );
    if (!first?.question) throw new ServiceUnavailableException('AI did not return a question, please retry');

    const turns: Turn[] = [{ question: first.question, category: first.category || 'aboutYou' }];
    const saved = await this.prisma.mockInterview.create({
      data: { ...base, userId, totalQuestions: dto.totalQuestions ?? 5, turns: turns as object },
    });
    return { success: true, data: this.view(saved) };
  }

  async answer(id: string, dto: SubmitAnswerDto, userId: string) {
    const session = await this.getOwned(id, userId);
    if (session.status !== 'active') throw new BadRequestException('This interview is already finished');

    const turns = session.turns as unknown as Turn[];
    const current = turns[turns.length - 1];
    if (!current || current.answer !== undefined) throw new BadRequestException('There is no pending question');

    const isLast = turns.length >= session.totalQuestions;
    const result = await this.gemini.generateJson<AnswerResult>(
      mockAnswerPrompt(this.ctx(session), turns, dto.answer, dto.delivery, isLast),
    );
    if (!result?.evaluation) throw new ServiceUnavailableException('AI did not return feedback, please retry');
    if (!isLast && !result.nextQuestion?.question) {
      throw new ServiceUnavailableException('AI did not return the next question, please retry');
    }

    current.answer = dto.answer;
    current.delivery = dto.delivery;
    current.evaluation = cleanEvaluation(result.evaluation);
    if (!isLast && result.nextQuestion) {
      turns.push({ question: result.nextQuestion.question, category: result.nextQuestion.category || 'technical' });
    }

    // Optimistic lock: a double-submit must not overwrite the first answer.
    const { count } = await this.prisma.mockInterview.updateMany({
      where: { id, userId, status: 'active', updatedAt: session.updatedAt },
      data: { turns: turns as object },
    });
    if (count === 0) throw new ConflictException('This answer was already submitted');

    return { success: true, data: this.view(await this.getOwned(id, userId)) };
  }

  async finish(id: string, userId: string) {
    const session = await this.getOwned(id, userId);
    if (session.report) return { success: true, data: this.view(session) };

    const turns = session.turns as unknown as Turn[];
    if (!turns.some(t => t.answer !== undefined)) {
      throw new BadRequestException('Answer at least one question before finishing');
    }

    const raw = await this.gemini.generateJson<Record<string, unknown>>(mockReportPrompt(this.ctx(session), turns));
    const cs = (raw?.categoryScores ?? {}) as Record<string, number>;
    const report = {
      readinessScore: clamp(raw?.readinessScore, 0, 100),
      verdict: typeof raw?.verdict === 'string' ? raw.verdict : '',
      categoryScores: {
        communication: clamp(cs.communication, 0, 10),
        structure: clamp(cs.structure, 0, 10),
        technicalDepth: clamp(cs.technicalDepth, 0, 10),
        relevance: clamp(cs.relevance, 0, 10),
        confidence: clamp(cs.confidence, 0, 10),
      },
      strengths: strings(raw?.strengths),
      topFixes: objects(raw?.topFixes).slice(0, 5).map(f => ({ issue: String(f.issue ?? ''), fix: String(f.fix ?? '') })),
      practicePlan: objects(raw?.practicePlan).slice(0, 7).map((p, i) => ({
        day: typeof p.day === 'number' ? p.day : i + 1,
        focus: String(p.focus ?? ''),
        task: String(p.task ?? ''),
      })),
    };

    const updated = await this.prisma.mockInterview.update({
      where: { id },
      data: { status: 'completed', report: report as object },
    });
    return { success: true, data: this.view(updated) };
  }

  async get(id: string, userId: string) {
    return { success: true, data: this.view(await this.getOwned(id, userId)) };
  }

  async history(userId: string) {
    const rows = await this.prisma.mockInterview.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, role: true, company: true, status: true, report: true, createdAt: true },
    });
    return {
      success: true,
      data: rows.map(r => ({
        id: r.id,
        role: r.role,
        company: r.company,
        status: r.status,
        readinessScore: (r.report as { readinessScore?: number } | null)?.readinessScore ?? null,
        createdAt: r.createdAt,
      })),
    };
  }
}
