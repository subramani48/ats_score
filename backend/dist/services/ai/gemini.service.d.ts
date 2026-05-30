import type { KeywordGapResult, AnalysisResult } from '../../types';
export declare const geminiAnalyze: (resumeText: string, domain: string) => Promise<Partial<AnalysisResult>>;
export declare const geminiRewrite: (resumeText: string, jobDescription: string) => Promise<string>;
export declare const geminiKeywordGap: (resumeText: string, jd: string) => Promise<KeywordGapResult>;
export declare const startResumeChat: (resumeText: string, score: number, domain: string, missingKeywords: string[]) => Promise<import("@google/generative-ai").ChatSession>;
