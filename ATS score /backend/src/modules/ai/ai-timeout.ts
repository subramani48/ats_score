// Time limits and safe messages for every call to the AI, so a stuck call cannot hold a request open forever
// and users never see Google's raw error text (which contains URLs, model names and quota details).

export const DEFAULT_AI_TIMEOUT_MS = 90_000;   // the slowest tested call (battle card) took 57 s
const MIN_AI_TIMEOUT_MS = 1_000;
const MAX_AI_TIMEOUT_MS = 300_000;

export const AI_UNAVAILABLE_MESSAGE = 'The AI service is unavailable right now. Please try again in a moment.';
export const AI_TIMEOUT_MESSAGE = 'The AI took too long to respond. Please try again.';
export const AI_CHAT_FAILED_MESSAGE = 'The AI could not answer right now. Please try again.';
export const AI_BAD_OUTPUT_MESSAGE = 'The AI did not return a usable result. Please try again.';
export const AI_RATE_LIMIT_MESSAGE = 'The AI is busy or has reached its usage limit right now. Please try again later.';

export class AiTimeoutError extends Error {
  constructor(ms: number) {
    super(`AI call timed out after ${ms} ms`);
    this.name = 'AiTimeoutError';
  }
}

/** Reads GEMINI_TIMEOUT_MS; anything missing, invalid or out of range falls back to a safe value. */
export function resolveAiTimeoutMs(raw?: string | number | null): number {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n)) return DEFAULT_AI_TIMEOUT_MS;
  return Math.min(MAX_AI_TIMEOUT_MS, Math.max(MIN_AI_TIMEOUT_MS, n));
}

/** Rejects with AiTimeoutError if `promise` has not settled after `ms`. The timer never keeps the process alive. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AiTimeoutError(ms)), ms);
    timer.unref?.();
    promise.then(
      v => { clearTimeout(timer); resolve(v); },
      e => { clearTimeout(timer); reject(e); },
    );
  });
}

/** True for our own timeout and for the abort error the Google library raises when its request timer fires. */
export function isTimeoutError(err: unknown): boolean {
  if (err instanceof AiTimeoutError) return true;
  const e = err as { name?: string; message?: string } | null;
  return e?.name === 'AbortError' || /aborted/i.test(e?.message ?? '');
}

/** Log-safe text: removes anything that looks like an API key, and the configured key itself. */
export function scrubSecrets(text: string, apiKey?: string): string {
  let out = text;
  if (apiKey) out = out.split(apiKey).join('<hidden>');
  return out.replace(/key=[^&\s"]+/gi, 'key=<hidden>').replace(/AIza[0-9A-Za-z_-]{10,}/g, '<hidden>');
}

/** The HTTP status the Google library attaches to its errors, or undefined for network and parsing failures. */
function statusOf(err: unknown): number | undefined {
  const e = err as { status?: unknown; message?: string } | null;
  if (typeof e?.status === 'number') return e.status;
  const m = /\[(\d{3})[ \]]/.exec(e?.message ?? '');   // the library also writes the status into its message
  return m ? Number(m[1]) : undefined;
}

/** True for quota and rate-limit errors (HTTP 429). */
export function isRateLimitError(err: unknown): boolean {
  return statusOf(err) === 429;
}

/**
 * Whether trying again can help. A quota or rate-limit error must NOT be retried (each retry uses more quota and
 * fails the same way), and neither should a permanent client error (bad request, bad key, unknown model).
 * Server errors, timeouts of the upstream service (408), network failures and unreadable answers are temporary.
 */
export function isRetryableError(err: unknown): boolean {
  const status = statusOf(err);
  if (status === undefined) return true;   // network error or an answer that could not be read
  return status === 408 || status >= 500;
}

/** The message shown in the chat stream for a failure. */
export function chatFailureMessage(err: unknown): string {
  if (isTimeoutError(err)) return AI_TIMEOUT_MESSAGE;
  if (isRateLimitError(err)) return AI_RATE_LIMIT_MESSAGE;
  return AI_CHAT_FAILED_MESSAGE;
}
