import { ConfigService } from '@nestjs/config';
import type { KeywordGapResult, AnalysisResult } from '../../types';
export declare class GeminiService {
    private readonly config;
    private readonly logger;
    private readonly genAI;
    constructor(config: ConfigService);
    private withRetry;
    analyze(resumeText: string, domain: string): Promise<Partial<AnalysisResult>>;
    rewrite(resumeText: string, jobDescription: string): Promise<string>;
    keywordGap(resumeText: string, jd: string): Promise<KeywordGapResult>;
    generateCoverLetter(resumeText: string, jobDescription: string, companyName: string, role: string, tone: string): Promise<string>;
    generateInterviewQuestions(resumeText: string, jobDescription: string, domain: string, difficulty: string): Promise<unknown>;
    companyAtsAnalysis(resumeText: string, company: string, role: string): Promise<unknown>;
    startChat(resumeText: string, score: number, domain: string, missingKeywords: string[]): Promise<import("@google/generative-ai").ChatSession>;
}
