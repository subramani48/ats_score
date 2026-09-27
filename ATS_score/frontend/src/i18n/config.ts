export const LOCALES = ['en', 'ta', 'hi'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  ta: 'தமிழ்',
  hi: 'हिंदी',
};

export const DEFAULT_LOCALE: Locale = 'en';

// For toLocaleDateString / toLocaleString
export const DATE_LOCALES: Record<Locale, string> = { en: 'en-US', ta: 'ta-IN', hi: 'hi-IN' };
