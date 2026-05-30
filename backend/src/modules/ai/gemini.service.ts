import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  keywordGapPrompt,
  analyzePrompt,
  rewritePrompt,
  coverLetterPrompt,
  interviewQuestionsPrompt,
  companyAtsPrompt,
} from './prompts/keyword-gap.prompts';
import type { KeywordGapResult, AnalysisResult } from '../../types';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor(private readonly config: ConfigService) {
    this.genAI = new GoogleGenerativeAI(config.get<string>('GEMINI_API_KEY', ''));
  }

  private async withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Gemini attempt ${attempt}/${retries} failed: ${msg}`);
        if (attempt === retries) {
          throw new ServiceUnavailableException(`Gemini AI failed after ${retries} attempts: ${msg}`);
        }
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
    throw new ServiceUnavailableException('Unreachable');
  }

  async analyze(resumeText: string, domain: string): Promise<Partial<AnalysisResult>> {
    return this.withRetry(async () => {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: analyzePrompt(resumeText, domain) }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });
      return JSON.parse(result.response.text()) as Partial<AnalysisResult>;
    });
  }

  async rewrite(resumeText: string, jobDescription: string): Promise<string> {
    return this.withRetry(async () => {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      const result = await model.generateContent(rewritePrompt(resumeText, jobDescription));
      return result.response.text();
    });
  }

  async keywordGap(resumeText: string, jd: string): Promise<KeywordGapResult> {
    return this.withRetry(async () => {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: keywordGapPrompt(resumeText, jd) }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });
      return JSON.parse(result.response.text()) as KeywordGapResult;
    });
  }

  async generateCoverLetter(
    resumeText: string,
    jobDescription: string,
    companyName: string,
    role: string,
    tone: string,
  ): Promise<string> {
    return this.withRetry(async () => {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      const result = await model.generateContent(
        coverLetterPrompt(resumeText, jobDescription, companyName, role, tone),
      );
      return result.response.text();
    });
  }

  async generateInterviewQuestions(
    resumeText: string,
    jobDescription: string,
    domain: string,
    difficulty: string,
  ): Promise<unknown> {
    return this.withRetry(async () => {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: interviewQuestionsPrompt(resumeText, jobDescription, domain, difficulty) }],
          },
        ],
        generationConfig: { responseMimeType: 'application/json' },
      });
      return JSON.parse(result.response.text());
    });
  }

  async companyAtsAnalysis(resumeText: string, company: string, role: string): Promise<unknown> {
    return this.withRetry(async () => {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: companyAtsPrompt(resumeText, company, role) }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });
      return JSON.parse(result.response.text());
    });
  }

  async startChat(resumeText: string, score: number, domain: string, missingKeywords: string[]) {
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
}
