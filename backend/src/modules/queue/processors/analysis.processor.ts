import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { ParserService } from '../../resume/parser.service';
import { AnalyzerService } from '../../resume/analyzer.service';
import { GeminiService } from '../../ai/gemini.service';
import { EmailService } from '../../email/email.service';
import { NotificationService } from '../../notification/notification.service';
import type { AnalysisJobPayload } from '../../../types';

@Injectable()
@Processor('resume-analysis', { concurrency: 5 })
export class AnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalysisProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: ParserService,
    private readonly analyzer: AnalyzerService,
    private readonly gemini: GeminiService,
    private readonly email: EmailService,
    private readonly notification: NotificationService,
  ) {
    super();
  }

  async process(job: Job<AnalysisJobPayload>): Promise<unknown> {
    const start = Date.now();
    const { resumeBuffer, mode, domain, jobDescription, userId, name, email, originalName, mimeType, sizeBytes } =
      job.data;

    this.logger.log(`Processing job ${job.id} — mode=${mode} domain=${domain}`);

    await job.updateProgress({ step: 'parsing', percent: 10, message: 'Extracting text from resume…' });
    const buffer = Buffer.from(resumeBuffer as string, 'base64');
    const text = await this.parser.extractText(buffer, mimeType);

    await job.updateProgress({ step: 'saving', percent: 20, message: 'Saving resume to database…' });
    const resume = await this.prisma.resume.create({
      data: { userId: userId ?? null, originalName, mimeType, sizeBytes, extractedText: text },
    });

    if (mode === 'rewrite') {
      await job.updateProgress({ step: 'rewriting', percent: 30, message: 'Gemini AI is rewriting your resume…' });
      const rewrittenText = await this.gemini.rewrite(text, jobDescription!);

      await job.updateProgress({ step: 'gap-analysis', percent: 65, message: 'Analysing keyword gaps…' });
      const keywordGap = await this.gemini.keywordGap(text, jobDescription!).catch(() => null);

      await job.updateProgress({ step: 'saving', percent: 80, message: 'Saving analysis to database…' });
      const analysis = await this.prisma.analysis.create({
        data: {
          userId: userId ?? null,
          resumeId: resume.id,
          mode: 'rewrite',
          domain,
          rewrittenText,
          jobDescription: jobDescription ?? null,
          keywordGap: keywordGap ? (keywordGap as object) : undefined,
          keywordsMatched: [],
          keywordsMissed: [],
          suggestions: [],
          warnings: [],
          processingMs: Date.now() - start,
        },
      });

      await job.updateProgress({ step: 'email', percent: 90, message: 'Sending your rewritten resume by email…' });
      const emailSent = await this.email.sendRewriteEmail(name, email, rewrittenText);
      await this.prisma.analysis.update({ where: { id: analysis.id }, data: { emailSent } });
      await this.notification.sendToAdmin(buffer, originalName, mimeType, { name, email, domain, score: 'N/A (rewrite)' });

      await job.updateProgress({ step: 'done', percent: 100, message: 'Complete!' });
      return { success: true, mode: 'rewrite', analysisId: analysis.id, rewrittenText, keywordGap, emailSent };
    }

    await job.updateProgress({ step: 'analyzing', percent: 40, message: `Analysing against ${domain} ATS criteria…` });
    const result = this.analyzer.analyze(text, domain);

    let keywordGap = null;
    if (jobDescription) {
      await job.updateProgress({ step: 'gap-analysis', percent: 65, message: 'Running AI keyword gap analysis…' });
      keywordGap = await this.gemini.keywordGap(text, jobDescription).catch(() => null);
    }

    await job.updateProgress({ step: 'saving', percent: 80, message: 'Saving analysis…' });
    const analysis = await this.prisma.analysis.create({
      data: {
        userId: userId ?? null,
        resumeId: resume.id,
        mode: 'analyze',
        domain,
        score: result.score,
        breakdown: result.breakdown as object,
        keywordsMatched: result.matchedKeywords,
        keywordsMissed: result.missingKeywords,
        suggestions: result.suggestions,
        warnings: result.warnings,
        jobDescription: jobDescription ?? null,
        keywordGap: keywordGap ? (keywordGap as object) : undefined,
        processingMs: Date.now() - start,
      },
    });

    await job.updateProgress({ step: 'email', percent: 90, message: 'Sending your report by email…' });
    const emailSent = await this.email.sendAnalysisEmail(name, email, result);
    await this.prisma.analysis.update({ where: { id: analysis.id }, data: { emailSent } });
    await this.notification.sendToAdmin(buffer, originalName, mimeType, { name, email, domain, score: result.score });

    await job.updateProgress({ step: 'done', percent: 100, message: 'Complete!' });
    return {
      success: true,
      mode: 'analyze',
      analysisId: analysis.id,
      score: result.score,
      breakdown: result.breakdown,
      keywordsMatched: result.matchedKeywords,
      keywordsMissed: result.missingKeywords,
      suggestions: result.suggestions,
      warnings: result.warnings,
      keywordGap,
      emailSent,
    };
  }
}
