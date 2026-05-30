"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AnalysisProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const parser_service_1 = require("../../resume/parser.service");
const analyzer_service_1 = require("../../resume/analyzer.service");
const gemini_service_1 = require("../../ai/gemini.service");
const email_service_1 = require("../../email/email.service");
const notification_service_1 = require("../../notification/notification.service");
let AnalysisProcessor = AnalysisProcessor_1 = class AnalysisProcessor extends bullmq_1.WorkerHost {
    constructor(prisma, parser, analyzer, gemini, email, notification) {
        super();
        this.prisma = prisma;
        this.parser = parser;
        this.analyzer = analyzer;
        this.gemini = gemini;
        this.email = email;
        this.notification = notification;
        this.logger = new common_1.Logger(AnalysisProcessor_1.name);
    }
    async process(job) {
        const start = Date.now();
        const { resumeBuffer, mode, domain, jobDescription, userId, name, email, originalName, mimeType, sizeBytes } = job.data;
        this.logger.log(`Processing job ${job.id} — mode=${mode} domain=${domain}`);
        await job.updateProgress({ step: 'parsing', percent: 10, message: 'Extracting text from resume…' });
        const buffer = Buffer.from(resumeBuffer, 'base64');
        const text = await this.parser.extractText(buffer, mimeType);
        await job.updateProgress({ step: 'saving', percent: 20, message: 'Saving resume to database…' });
        const resume = await this.prisma.resume.create({
            data: { userId: userId ?? null, originalName, mimeType, sizeBytes, extractedText: text },
        });
        if (mode === 'rewrite') {
            await job.updateProgress({ step: 'rewriting', percent: 30, message: 'Gemini AI is rewriting your resume…' });
            const rewrittenText = await this.gemini.rewrite(text, jobDescription);
            await job.updateProgress({ step: 'gap-analysis', percent: 65, message: 'Analysing keyword gaps…' });
            const keywordGap = await this.gemini.keywordGap(text, jobDescription).catch(() => null);
            await job.updateProgress({ step: 'saving', percent: 80, message: 'Saving analysis to database…' });
            const analysis = await this.prisma.analysis.create({
                data: {
                    userId: userId ?? null,
                    resumeId: resume.id,
                    mode: 'rewrite',
                    domain,
                    rewrittenText,
                    jobDescription: jobDescription ?? null,
                    keywordGap: keywordGap ? keywordGap : undefined,
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
                breakdown: result.breakdown,
                keywordsMatched: result.matchedKeywords,
                keywordsMissed: result.missingKeywords,
                suggestions: result.suggestions,
                warnings: result.warnings,
                jobDescription: jobDescription ?? null,
                keywordGap: keywordGap ? keywordGap : undefined,
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
};
exports.AnalysisProcessor = AnalysisProcessor;
exports.AnalysisProcessor = AnalysisProcessor = AnalysisProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, bullmq_1.Processor)('resume-analysis', { concurrency: 5 }),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        parser_service_1.ParserService,
        analyzer_service_1.AnalyzerService,
        gemini_service_1.GeminiService,
        email_service_1.EmailService,
        notification_service_1.NotificationService])
], AnalysisProcessor);
//# sourceMappingURL=analysis.processor.js.map