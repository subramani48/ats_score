'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { DEFAULT_LOCALE, LOCALES, type Locale } from './config';
import en from './messages/en';
import ta from './messages/ta';
import hi from './messages/hi';

// Website texts in English, Tamil and Hindi. English (messages/en.ts) is the source: the other files
// must have exactly the same keys, which the `Messages` type enforces at build time. Texts written by
// the AI (analyses, cover letters, questions) and messages from the server stay in English.

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Messages = Widen<typeof en>;

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
/** Every text key, such as "nav.overview". A typo is a type error. */
export type MessageKey = Leaves<Messages>;
export type Vars = Record<string, string | number>;

const MESSAGES: Record<Locale, Messages> = { en, ta, hi };
const STORAGE_KEY = 'ats-locale';
const CHANGE_EVENT = 'ats-locale-change';

function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** Text for `key` in `locale`, with {name} placeholders filled from `vars`. Falls back to English. */
export function translate(locale: Locale, key: MessageKey, vars?: Vars): string {
  const text = lookup(MESSAGES[locale], key) ?? lookup(en, key) ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : text;
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('storage', onChange);      // another tab changed it
  window.addEventListener(CHANGE_EVENT, onChange);   // this tab changed it
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
};

const readLocale = (): Locale => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return LOCALES.find(l => l === stored) ?? DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;   // storage blocked (private mode, strict settings)
  }
};

export function useLocale() {
  const locale = useSyncExternalStore(subscribe, readLocale, () => DEFAULT_LOCALE);

  const setLocale = useCallback((l: Locale) => {
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* storage blocked: the choice cannot be kept */ }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  // Screen readers and the browser's font choice follow the page language.
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);

  return { locale, setLocale };
}

/** `const t = useT(); t('nav.overview')` */
export function useT() {
  const { locale } = useLocale();
  return useCallback((key: MessageKey, vars?: Vars) => translate(locale, key, vars), [locale]);
}
