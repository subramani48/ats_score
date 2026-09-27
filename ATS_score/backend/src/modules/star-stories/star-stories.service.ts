import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from '../ai/gemini.service';
import { asStrings, asText as str } from '../../common/ai-output';
import { starExtractPrompt, starMatchPrompt } from '../ai/prompts/interview-pro.prompts';
import type { GenerateStoriesDto, MatchStoryDto, UpdateStoryDto } from './dto/star-stories.dto';

interface RawStory {
  title?: unknown;
  competencies?: unknown;
  situation?: unknown;
  task?: unknown;
  action?: unknown;
  result?: unknown;
  metrics?: unknown;
  followUps?: unknown;
}

const strs = (v: unknown, max: number) => asStrings(v, { maxLength: max, maxItems: 10 });

@Injectable()
export class StarStoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  async generate(dto: GenerateStoriesDto, userId: string) {
    const { stories } = await this.gemini.generateJson<{ stories?: RawStory[] }>(
      starExtractPrompt(dto.resumeText, dto.count ?? 6),
    );
    const valid = (stories ?? []).filter(s => str(s.title, 200) && str(s.situation, 2000) && str(s.action, 3000));
    if (valid.length === 0) throw new ServiceUnavailableException('AI did not return any stories, please retry');

    const created = await this.prisma.$transaction(
      valid.map(s =>
        this.prisma.starStory.create({
          data: {
            userId,
            title: str(s.title, 200),
            competencies: strs(s.competencies, 80),
            situation: str(s.situation, 2000),
            task: str(s.task, 2000),
            action: str(s.action, 3000),
            result: str(s.result, 2000),
            metrics: strs(s.metrics, 200),
            followUps: strs(s.followUps, 300),
          },
        }),
      ),
    );
    return { success: true, data: created };
  }

  async list(userId: string) {
    const data = await this.prisma.starStory.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return { success: true, data };
  }

  async update(id: string, dto: UpdateStoryDto, userId: string) {
    const { count } = await this.prisma.starStory.updateMany({ where: { id, userId }, data: dto });
    if (count === 0) throw new NotFoundException('Story not found');
    return { success: true, data: await this.prisma.starStory.findUnique({ where: { id } }) };
  }

  async remove(id: string, userId: string) {
    const { count } = await this.prisma.starStory.deleteMany({ where: { id, userId } });
    if (count === 0) throw new NotFoundException('Story not found');
    return { success: true };
  }

  async match(dto: MatchStoryDto, userId: string) {
    const stories = await this.prisma.starStory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    if (stories.length === 0) throw new BadRequestException('Generate your story bank first');

    const raw = await this.gemini.generateJson<{
      matches?: Array<{ storyId: string; fitScore: number; whyItFits: string; howToAdapt: string; openingLine: string }>;
      gap?: string;
    }>(starMatchPrompt(dto.question, stories));

    const byId = new Map(stories.map(s => [s.id, s]));
    const matches = (raw.matches ?? [])
      .filter(m => byId.has(m.storyId))
      .slice(0, 3)
      .map(m => ({
        story: byId.get(m.storyId),
        fitScore: Math.min(100, Math.max(0, Math.round(Number(m.fitScore) || 0))),
        whyItFits: str(m.whyItFits, 600),
        howToAdapt: str(m.howToAdapt, 800),
        openingLine: str(m.openingLine, 300),
      }));
    return { success: true, data: { matches, gap: str(raw.gap, 300) } };
  }
}
