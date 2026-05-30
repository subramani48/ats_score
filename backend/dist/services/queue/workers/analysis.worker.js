"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisWorker = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../../../config/redis");
const database_1 = require("../../../config/database");
const parser_service_1 = require("../../resume/parser.service");
const analyzer_service_1 = require("../../resume/analyzer.service");
const gemini_service_1 = require("../../ai/gemini.service");
const email_service_1 = require("../../email.service");
const notification_service_1 = require("../../notification.service");
const logger_1 = require("../../../lib/logger");
const progress = (job, step, percent, message) => {
    const data = { step, percent, message };
    return job.updateProgress(data);
};
exports.analysisWorker = new bullmq_1.Worker('resume-analysis', async (job) => {
    const start = Date.now();
    const { resumeBuffer, mode, domain, jobDescription, userId, name, email, originalName, mimeType, sizeBytes } = job.data;
    await progress(job, 'parsing', 10, 'Extracting text from resume…');
    const buffer = Buffer.isBuffer(resumeBuffer) ? resumeBuffer : Buffer.from(resumeBuffer, 'base64');
    const text = await (0, parser_service_1.extractText)(buffer, mimeType);
    await progress(job, 'saving', 20, 'Saving resume to database…');
    const resume = await database_1.prisma.resume.create({
        data: { userId: userId ?? null, originalName, mimeType, sizeBytes, extractedText: text },
    });
    if (mode === 'rewrite') {
        await progress(job, 'rewriting', 30, 'Gemini AI is rewriting your resume…');
        const rewrittenText = await (0, gemini_service_1.geminiRewrite)(text, jobDescription);
        await progress(job, 'gap-analysis', 65, 'Analysing keyword gaps…');
        const keywordGap = await (0, gemini_service_1.geminiKeywordGap)(text, jobDescription).catch(() => null);
        await progress(job, 'saving', 80, 'Saving analysis to database…');
        const analysis = await database_1.prisma.analysis.create({
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
        await progress(job, 'email', 90, 'Sending your rewritten resume by email…');
        const emailSent = await (0, email_service_1.sendRewriteEmail)(name, email, rewrittenText);
        await database_1.prisma.analysis.update({ where: { id: analysis.id }, data: { emailSent } });
        await (0, notification_service_1.sendResumeToAdmin)(originalName, { name, email, domain, score: 'N/A (rewrite)' });
        await progress(job, 'done', 100, 'Complete!');
        return { success: true, mode: 'rewrite', analysisId: analysis.id, rewrittenText, keywordGap, emailSent };
    }
    // analyze mode
    await progress(job, 'analyzing', 40, `Analysing against ${domain} ATS criteria…`);
    const result = (0, analyzer_service_1.analyzeResume)(text, domain);
    if (jobDescription) {
        await progress(job, 'gap-analysis', 65, 'Running AI keyword gap analysis…');
        const keywordGap = await (0, gemini_service_1.geminiKeywordGap)(text, jobDescription).catch(() => null);
        result.keywordGap = keywordGap;
    }
    await progress(job, 'saving', 80, 'Saving analysis…');
    const analysis = await database_1.prisma.analysis.create({
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
            keywordGap: result.keywordGap ? result.keywordGap : undefined,
            processingMs: Date.now() - start,
        },
    });
    await progress(job, 'email', 90, 'Sending your report by email…');
    const emailSent = await (0, email_service_1.sendAnalysisEmail)(name, email, result);
    await database_1.prisma.analysis.update({ where: { id: analysis.id }, data: { emailSent } });
    await (0, notification_service_1.sendResumeToAdmin)(originalName, { name, email, domain, score: result.score });
    await progress(job, 'done', 100, 'Complete!');
    return { success: true, mode: 'analyze', analysisId: analysis.id, ...result, emailSent };
}, {
    connection: redis_1.redis,
    concurrency: 5,
});
exports.analysisWorker.on('failed', (job, err) => {
    logger_1.logger.error({ message: 'Analysis job failed', jobId: job?.id, error: err.message });
});
exports.analysisWorker.on('completed', (job) => {
    logger_1.logger.info({ message: 'Analysis job completed', jobId: job.id });
});
//# sourceMappingURL=analysis.worker.js.map