'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/i18n/config';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'ats-locale';

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && LOCALES.includes(stored)) setLocaleState(stored);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
    // For a real next-intl setup, trigger router refresh
    window.location.reload();
  };

  return { locale, setLocale };
}

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
        <Globe className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs font-medium">{LOCALE_LABELS[locale]}</span>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
            {LOCALES.map(l => (
              <button key={l} onClick={() => { setLocale(l); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${locale === l ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                {LOCALE_LABELS[l]}
                {locale === l && <span className="ml-auto text-xs text-indigo-500">✓</span>}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
