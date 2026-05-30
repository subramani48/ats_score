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
var GeminiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const generative_ai_1 = require("@google/generative-ai");
const keyword_gap_prompts_1 = require("./prompts/keyword-gap.prompts");
let GeminiService = GeminiService_1 = class GeminiService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(GeminiService_1.name);
        this.genAI = new generative_ai_1.GoogleGenerativeAI(config.get('GEMINI_API_KEY', ''));
    }
    async withRetry(fn, retries = 3) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await fn();
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                this.logger.warn(`Gemini attempt ${attempt}/${retries} failed: ${msg}`);
                if (attempt === retries) {
                    throw new common_1.ServiceUnavailableException(`Gemini AI failed after ${retries} attempts: ${msg}`);
                }
                await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
            }
        }
        throw new common_1.ServiceUnavailableException('Unreachable');
    }
    async analyze(resumeText, domain) {
        return this.withRetry(async () => {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: (0, keyword_gap_prompts_1.analyzePrompt)(resumeText, domain) }] }],
                generationConfig: { responseMimeType: 'application/json' },
            });
            return JSON.parse(result.response.text());
        });
    }
    async rewrite(resumeText, jobDescription) {
        return this.withRetry(async () => {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
            const result = await model.generateContent((0, keyword_gap_prompts_1.rewritePrompt)(resumeText, jobDescription));
            return result.response.text();
        });
    }
    async keywordGap(resumeText, jd) {
        return this.withRetry(async () => {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: (0, keyword_gap_prompts_1.keywordGapPrompt)(resumeText, jd) }] }],
                generationConfig: { responseMimeType: 'application/json' },
            });
            return JSON.parse(result.response.text());
        });
    }
    async generateCoverLetter(resumeText, jobDescription, companyName, role, tone) {
        return this.withRetry(async () => {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
            const result = await model.generateContent((0, keyword_gap_prompts_1.coverLetterPrompt)(resumeText, jobDescription, companyName, role, tone));
            return result.response.text();
        });
    }
    async generateInterviewQuestions(resumeText, jobDescription, domain, difficulty) {
        return this.withRetry(async () => {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: (0, keyword_gap_prompts_1.interviewQuestionsPrompt)(resumeText, jobDescription, domain, difficulty) }],
                    },
                ],
                generationConfig: { responseMimeType: 'application/json' },
            });
            return JSON.parse(result.response.text());
        });
    }
    async companyAtsAnalysis(resumeText, company, role) {
        return this.withRetry(async () => {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: (0, keyword_gap_prompts_1.companyAtsPrompt)(resumeText, company, role) }] }],
                generationConfig: { responseMimeType: 'application/json' },
            });
            return JSON.parse(result.response.text());
        });
    }
    async startChat(resumeText, score, domain, missingKeywords) {
        const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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
    }
};
exports.GeminiService = GeminiService;
exports.GeminiService = GeminiService = GeminiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GeminiService);
//# sourceMappingURL=gemini.service.js.map