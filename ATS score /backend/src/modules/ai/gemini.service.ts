import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  keywordGapPrompt,
  rewritePrompt,
  coverLetterPrompt,
  interviewQuestionsPrompt,
  companyAtsPrompt,
  chatSystemPrompt,
} from './prompts/keyword-gap.prompts';
import {
  AI_BAD_OUTPUT_MESSAGE,
  AI_RATE_LIMIT_MESSAGE,
  AI_TIMEOUT_MESSAGE,
  AI_UNAVAILABLE_MESSAGE,
  isRateLimitError,
  isRetryableError,
  isTimeoutError,
  resolveAiTimeoutMs,
  scrubSecrets,
  withTimeout,
} from './ai-timeout';
import { findUnsupportedTerms } from './rewrite-guard';
import type { KeywordGapResult } from '../../types';

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Room for one chat answer. Gemini 2.5 and newer models use part of this limit for internal "thinking" before they
 * write anything, so the old value of 800 left almost nothing: live tests saw answers cut off mid-sentence or empty.
 */
export const CHAT_MAX_OUTPUT_TOKENS = 4096;

/** Raised inside a call when the AI answered but the answer is not usable. Retried, then shown generically. */
class UnusableAiOutputError extends Error {}

const wordCount = (t: string) => (t.match(/\S+/g) ?? []).length;

/**
 * A rewritten resume should be about as long as the original. If the AI was talked into answering something
 * else (a few sentences instead of a resume), it is far shorter, and it must not be handed to the user.
 */
export function isPlausibleRewrite(original: string, rewritten: string): boolean {
  const out = wordCount(rewritten);
  if (out === 0) return false;
  const orig = wordCount(original);
  return orig < 40 || out >= orig * 0.3;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor(private readonly config: ConfigService) {
    this.genAI = new GoogleGenerativeAI(config.get<string>('GEMINI_API_KEY', ''));
  }

  /** One setting for every AI feature. */
  private get modelName(): string {
    return this.config.get<string>('GEMINI_MODEL') || DEFAULT_GEMINI_MODEL;
  }

  private get timeoutMs(): number {
    return resolveAiTimeoutMs(this.config.get<string | number>('GEMINI_TIMEOUT_MS'));
  }

  private getModel(extra: Record<string, unknown> = {}) {
    return this.genAI.getGenerativeModel(
      { model: this.modelName, ...extra },
      { timeout: this.timeoutMs },   // the library aborts the request itself; withRetry also enforces a total limit
    );
  }

  /**
   * Runs an AI call with a time limit and up to `retries` tries. Whatever goes wrong, the caller only ever sees a
   * short generic message: Google's own error text (URLs, model names, quota details) stays in the server log.
   * Retries are only for temporary failures (server errors, network problems, an unreadable answer). A timeout is
   * not retried, so one stuck call cannot multiply into several, and a quota or rate-limit error (429) is not
   * retried either, because every retry would use more quota and fail the same way.
   */
  private async withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY', '');
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // The library's own timer fires at timeoutMs; this outer limit is a little later and catches a hang
        // after the response has started (for example while the body is being read).
        return await withTimeout(fn(), this.timeoutMs + 2000);
      } catch (err: unknown) {
        const raw = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Gemini attempt ${attempt}/${retries} failed: ${scrubSecrets(raw, apiKey)}`);
        if (isTimeoutError(err)) throw new ServiceUnavailableException(AI_TIMEOUT_MESSAGE);
        if (isRateLimitError(err)) throw new ServiceUnavailableException(AI_RATE_LIMIT_MESSAGE);
        if (!isRetryableError(err)) throw new ServiceUnavailableException(AI_UNAVAILABLE_MESSAGE);   // e.g. unknown model, bad key
        if (attempt === retries) {
          throw new ServiceUnavailableException(
            err instanceof UnusableAiOutputError ? AI_BAD_OUTPUT_MESSAGE : AI_UNAVAILABLE_MESSAGE,
          );
        }
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }
    throw new ServiceUnavailableException(AI_UNAVAILABLE_MESSAGE);
  }

  async rewrite(resumeText: string, jobDescription: string): Promise<string> {
    let correction: string | undefined;   // filled in after a refused answer, so the next try knows what to avoid
    return this.withRetry(async () => {
      const result = await this.getModel().generateContent(rewritePrompt(resumeText, jobDescription, correction));
      const text = result.response.text();
      if (!isPlausibleRewrite(resumeText, text)) {
        throw new UnusableAiOutputError('Rewrite is far shorter than the original resume');
      }
      // A rewrite may never claim a technology the original resume does not contain (for example React).
      const unsupported = findUnsupportedTerms(resumeText, jobDescription, text);
      if (unsupported.length > 0) {
        correction = `Your previous answer claimed skills that are not in the original resume (${unsupported.join(', ')}). Rewrite again and do not mention them at all.`;
        throw new UnusableAiOutputError(`Rewrite claims skills that are not in the resume: ${unsupported.join(', ')}`);
      }
      return text;
    });
  }

  keywordGap(resumeText: string, jd: string): Promise<KeywordGapResult> {
    return this.generateJson<KeywordGapResult>(keywordGapPrompt(resumeText, jd));
  }

  async generateCoverLetter(
    resumeText: string,
    jobDescription: string,
    companyName: string,
    role: string,
    tone: string,
  ): Promise<string> {
    return this.withRetry(async () => {
      const result = await this.getModel().generateContent(
        coverLetterPrompt(resumeText, jobDescription, companyName, role, tone),
      );
      return result.response.text();
    });
  }

  generateInterviewQuestions(resumeText: string, jobDescription: string, domain: string, difficulty: string): Promise<unknown> {
    return this.generateJson<unknown>(interviewQuestionsPrompt(resumeText, jobDescription, domain, difficulty));
  }

  companyAtsAnalysis(resumeText: string, company: string, role: string): Promise<unknown> {
    return this.generateJson<unknown>(companyAtsPrompt(resumeText, company, role));
  }

  /** The one structured-output (JSON) call: every feature that needs JSON from the AI goes through here. */
  async generateJson<T>(prompt: string): Promise<T> {
    return this.withRetry(async () => {
      const result = await this.getModel().generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      });
      return JSON.parse(result.response.text()) as T;
    });
  }

  async startChat(resumeText: string, score: number, domain: string, missingKeywords: string[]) {
    // The resume and analysis go in the system instruction (marked as untrusted data), not in a fake first
    // user message, so text inside the resume cannot pose as something the user said.
    const model = this.getModel({
      systemInstruction: chatSystemPrompt(resumeText, score, domain, missingKeywords),
    });
    return model.startChat({ generationConfig: { maxOutputTokens: CHAT_MAX_OUTPUT_TOKENS } });
  }
}
