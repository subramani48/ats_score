export const LOCALES = ['en', 'hi', 'ta', 'fr', 'de'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: '🇬🇧 English',
  hi: '🇮🇳 हिंदी',
  ta: '🇮🇳 தமிழ்',
  fr: '🇫🇷 Français',
  de: '🇩🇪 Deutsch',
};

export const DEFAULT_LOCALE: Locale = 'en';
