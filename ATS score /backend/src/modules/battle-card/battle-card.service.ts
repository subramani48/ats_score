import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from '../ai/gemini.service';
import { asObjects as list, asStrings as strs, asText as text, type Obj } from '../../common/ai-output';
import { battleCardPrompt } from '../ai/prompts/interview-pro.prompts';
import type { GenerateBattleCardDto } from './dto/battle-card.dto';

/** The frontend renders every field, so guarantee the shape whatever the model returned. */
function normalize(raw: Obj) {
  const sal = (raw.salaryNegotiation ?? {}) as Obj;
  return {
    companySnapshot: text(raw.companySnapshot),
    likelyRounds: list(raw.likelyRounds).map(r => ({
      name: text(r.name), format: text(r.format), whatTheyTest: text(r.whatTheyTest), prepTips: strs(r.prepTips),
    })),
    topQuestions: list(raw.topQuestions).map(q => ({ question: text(q.question), angle: text(q.angle) })),
    questionsToAsk: strs(raw.questionsToAsk),
    redFlagsToProbe: strs(raw.redFlagsToProbe),
    talkingPoints: strs(raw.talkingPoints),
    salaryNegotiation: {
      researchSteps: strs(sal.researchSteps),
      anchoringScript: text(sal.anchoringScript),
      counterOfferScript: text(sal.counterOfferScript),
      beyondBaseSalary: strs(sal.beyondBaseSalary),
      avoid: strs(sal.avoid),
    },
    first90Days: list(raw.first90Days).map(p => ({ phase: text(p.phase), goals: strs(p.goals) })),
    disclaimer: text(raw.disclaimer),
  };
}

@Injectable()
export class BattleCardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  async generate(dto: GenerateBattleCardDto, userId: string) {
    const raw = await this.gemini.generateJson<Record<string, unknown>>(battleCardPrompt(dto));
    if (!raw || !Array.isArray(raw.likelyRounds)) {
      throw new ServiceUnavailableException('AI returned an incomplete battle card, please retry');
    }
    const content = normalize(raw);
    const saved = await this.prisma.battleCard.create({
      data: { userId, company: dto.company, role: dto.role, content: content as object },
    });
    return { success: true, data: saved };
  }

  async list(userId: string) {
    const data = await this.prisma.battleCard.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, company: true, role: true, createdAt: true },
    });
    return { success: true, data };
  }

  async get(id: string, userId: string) {
    const card = await this.prisma.battleCard.findFirst({ where: { id, userId } });
    if (!card) throw new NotFoundException('Battle card not found');
    return { success: true, data: card };
  }

  async remove(id: string, userId: string) {
    const { count } = await this.prisma.battleCard.deleteMany({ where: { id, userId } });
    if (count === 0) throw new NotFoundException('Battle card not found');
    return { success: true };
  }
}
