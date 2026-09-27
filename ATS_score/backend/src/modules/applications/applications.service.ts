import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from '../ai/gemini.service';
import { followUpEmailPrompt } from '../ai/prompts/interview-pro.prompts';
import {
  APPLICATION_STATUSES, type CreateApplicationDto, type FollowUpDto, type UpdateApplicationDto,
} from './dto/applications.dto';

const toDates = <T extends { appliedAt?: string; nextStepAt?: string }>(dto: T) => ({
  ...dto,
  appliedAt: dto.appliedAt ? new Date(dto.appliedAt) : undefined,
  nextStepAt: dto.nextStepAt ? new Date(dto.nextStepAt) : undefined,
});

const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  private async getOwned(id: string, userId: string) {
    const app = await this.prisma.jobApplication.findFirst({ where: { id, userId } });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async create(dto: CreateApplicationDto, userId: string) {
    const status = dto.status ?? 'applied';
    const data = toDates(dto);
    const created = await this.prisma.jobApplication.create({
      data: {
        ...data,
        userId,
        status,
        // Stamp the applied date automatically for anything past the wishlist.
        appliedAt: data.appliedAt ?? (status === 'wishlist' ? undefined : new Date()),
      },
    });
    return { success: true, data: created };
  }

  async list(userId: string, status?: string) {
    const data = await this.prisma.jobApplication.findMany({
      where: { userId, ...(status && (APPLICATION_STATUSES as readonly string[]).includes(status) ? { status } : {}) },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
    return { success: true, data };
  }

  async update(id: string, dto: UpdateApplicationDto, userId: string) {
    await this.getOwned(id, userId);
    const data = await this.prisma.jobApplication.update({ where: { id }, data: toDates(dto) });
    return { success: true, data };
  }

  async remove(id: string, userId: string) {
    const { count } = await this.prisma.jobApplication.deleteMany({ where: { id, userId } });
    if (count === 0) throw new NotFoundException('Application not found');
    return { success: true };
  }

  async stats(userId: string) {
    const grouped = await this.prisma.jobApplication.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
    });
    const counts: Record<string, number> = Object.fromEntries(APPLICATION_STATUSES.map(s => [s, 0]));
    for (const g of grouped) counts[g.status] = g._count._all;

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const applied = total - counts.wishlist;
    const responded = counts.screening + counts.interview + counts.offer + counts.accepted;
    const offers = counts.offer + counts.accepted;

    const upcoming = await this.prisma.jobApplication.findMany({
      where: { userId, nextStepAt: { gte: new Date() }, status: { notIn: ['rejected', 'accepted'] } },
      orderBy: { nextStepAt: 'asc' },
      take: 5,
      select: { id: true, company: true, role: true, status: true, nextStepAt: true },
    });

    return {
      success: true,
      data: {
        counts,
        total,
        applied,
        responseRate: pct(responded, applied),
        interviewRate: pct(counts.interview + offers, applied),
        offerRate: pct(offers, applied),
        upcoming,
      },
    };
  }

  async followUp(id: string, dto: FollowUpDto, userId: string) {
    const app = await this.getOwned(id, userId);
    const email = await this.gemini.generateJson<{ subject?: string; body?: string }>(
      followUpEmailPrompt({
        type: dto.type,
        company: app.company,
        role: app.role,
        interviewerName: dto.interviewerName,
        context: dto.context,
        notes: app.notes,
      }),
    );
    if (!email?.subject || !email?.body) {
      throw new ServiceUnavailableException('AI did not return an email, please retry');
    }
    return { success: true, data: { subject: email.subject, body: email.body } };
  }
}
