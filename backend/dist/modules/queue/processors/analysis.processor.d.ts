import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { ParserService } from '../../resume/parser.service';
import { AnalyzerService } from '../../resume/analyzer.service';
import { GeminiService } from '../../ai/gemini.service';
import { EmailService } from '../../email/email.service';
import { NotificationService } from '../../notification/notification.service';
import type { AnalysisJobPayload } from '../../../types';
export declare class AnalysisProcessor extends WorkerHost {
    private readonly prisma;
    private readonly parser;
    private readonly analyzer;
    private readonly gemini;
    private readonly email;
    private readonly notification;
    private readonly logger;
    constructor(prisma: PrismaService, parser: ParserService, analyzer: AnalyzerService, gemini: GeminiService, email: EmailService, notification: NotificationService);
    process(job: Job<AnalysisJobPayload>): Promise<unknown>;
}
