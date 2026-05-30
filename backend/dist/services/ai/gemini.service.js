"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startResumeChat = exports.geminiKeywordGap = exports.geminiRewrite = exports.geminiAnalyze = void 0;
const generative_ai_1 = require("@google/generative-ai");
const env_1 = require("../../config/env");
const logger_1 = require("../../lib/logger");
const errors_1 = require("../../lib/errors");
const keyword_gap_1 = require("./prompts/keyword-gap");
const genAI = new generative_ai_1.GoogleGenerativeAI(env_1.env.GEMINI_API_KEY);
const withRetry = async (fn, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            const isLast = attempt === retries;
            const msg = err instanceof Error ? err.message : String(err);
            logger_1.logger.warn({ message: `Gemini attempt ${attempt} failed: ${msg}`, attempt, retries });
            if (isLast)
                throw new errors_1.AppError(`Gemini AI failed after ${retries} attempts: ${msg}`, 503, 'AI_SERVICE_ERROR');
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
        }
    }
    throw new errors_1.AppError('Unreachable', 500);
};
const geminiAnalyze = async (resumeText, domain) => {
    return withRetry(async () => {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: (0, keyword_gap_1.analyzePrompt)(resumeText, domain) }] }],
            generationConfig: { responseMimeType: 'application/json' },
        });
        const text = result.response.text();
        return JSON.parse(text);
    });
};
exports.geminiAnalyze = geminiAnalyze;
const geminiRewrite = async (resumeText, jobDescription) => {
    return withRetry(async () => {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        const result = await model.generateContent((0, keyword_gap_1.rewritePrompt)(resumeText, jobDescription));
        return result.response.text();
    });
};
exports.geminiRewrite = geminiRewrite;
const geminiKeywordGap = async (resumeText, jd) => {
    return withRetry(async () => {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: (0, keyword_gap_1.keywordGapPrompt)(resumeText, jd) }] }],
            generationConfig: { responseMimeType: 'application/json' },
        });
        const text = result.response.text();
        return JSON.parse(text);
    });
};
exports.geminiKeywordGap = geminiKeywordGap;
const startResumeChat = async (resumeText, score, domain, missingKeywords) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const systemContext = `You are an expert resume coach with access to the candidate's resume and ATS analysis.
RESUME: ${resumeText.slice(0, 3000)}
ATS SCORE: ${score}/100
DOMAIN: ${domain}
MISSING KEYWORDS: ${missingKeywords.slice(0, 10).join(', ')}
Give specific, actionable advice about THIS resume.`;
    return model.startChat({
        history: [{ role: 'user', parts: [{ text: systemContext }] }],
        generationConfig: { maxOutputTokens: 800 },
    });
};
exports.startResumeChat = startResumeChat;
//# sourceMappingURL=gemini.service.js.map