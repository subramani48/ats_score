// Small stand-ins shared by the AI and chat specs. Nothing here calls Google or a database.
import type { ConfigService } from '@nestjs/config';
import { GeminiService } from '../../modules/ai/gemini.service';

/** A GeminiService with an invented configuration (any setting not given is unset). */
export function makeGeminiService(env: Record<string, string | undefined> = {}) {
  const config = { get: (k: string, d?: unknown) => env[k] ?? d } as unknown as ConfigService;
  return new GeminiService(config);
}

/**
 * Makes the mocked `getGenerativeModel` return a model whose `generateContent` is `generate`.
 * (`mockGetModel` is the jest.fn each spec installs with jest.mock('@google/generative-ai').)
 */
export function stubGeminiModel(
  mockGetModel: jest.Mock,
  generate: jest.Mock = jest.fn().mockResolvedValue({ response: { text: () => '{"ok":true}' } }),
) {
  const chat = { sendMessageStream: jest.fn() };
  const model = { generateContent: generate, startChat: jest.fn().mockReturnValue(chat) };
  mockGetModel.mockReset().mockReturnValue(model);
  return { model, chat, generate };
}

/** An error shaped like the Google library's: a numeric status, and the status written into the message. */
export const googleError = (status: number, text: string) =>
  Object.assign(
    new Error(`[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/x: [${status} ${text}] details`),
    { status },
  );

/** A stand-in for the Express response that behaves like the real one: writing after end() is an error. */
export function fakeRes(opts: { headersSent?: boolean; contentType?: string } = {}) {
  const frames: string[] = [];
  const res = {
    writableEnded: false,
    destroyed: false,
    headersSent: opts.headersSent ?? false,
    endCalls: 0,
    writeAfterEnd: 0,
    frames,
    headers: {} as Record<string, string>,
    statusCode: undefined as number | undefined,
    body: undefined as unknown,
    setHeader(k: string, v: string) { res.headers[k.toLowerCase()] = v; },
    getHeader(k: string) { return k.toLowerCase() === 'content-type' ? (opts.contentType ?? res.headers['content-type']) : res.headers[k.toLowerCase()]; },
    flushHeaders() { res.headersSent = true; },
    write(chunk: string) { if (res.writableEnded) res.writeAfterEnd++; frames.push(chunk); return true; },
    end() { res.endCalls++; res.writableEnded = true; },
    status(code: number) { res.statusCode = code; return res; },
    json(body: unknown) { res.body = body; res.writableEnded = true; return res; },
  };
  return res;
}
