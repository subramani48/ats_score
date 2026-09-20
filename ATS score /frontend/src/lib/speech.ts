// Client-side helpers for spoken-answer metrics. Everything runs in the browser.

const FILLERS = /\b(um+|uh+|erm|er|you know|basically|actually|literally|kind of|sort of|i mean)\b/gi;

export const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

export const countFillers = (text: string) => (text.match(FILLERS) ?? []).length;

/** Words per minute, or undefined when the sample is too short to be meaningful. */
export const wordsPerMinute = (text: string, seconds: number) =>
  seconds >= 8 ? Math.round(countWords(text) / (seconds / 60)) : undefined;

export const speak = (text: string) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1;
  window.speechSynthesis.speak(u);
};

export const stopSpeaking = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
};
