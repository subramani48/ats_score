'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Linkedin, Loader2, CheckCircle2, X } from 'lucide-react';
import { api, type LinkedInProfile } from '@/lib/api';
import { useT } from '@/i18n';

interface Props {
  onImport: (resumeText: string) => void;
  token?: string | null;
}

/**
 * A small "Import from LinkedIn" link placed under a resume text box. Opens a panel where the user
 * pastes their profile; the cleaned text replaces the resume box's content.
 */
export default function LinkedInImport({ onImport, token }: Props) {
  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const t = useT();

  const handleImport = async () => {
    if (!input.trim()) return;
    setLoading(true); setError('');
    try {
      const data = await api.importLinkedIn(input.trim(), token ?? undefined);
      if (!data.data.rawText.trim()) throw new Error(t('linkedin.noText'));
      setProfile(data.data);
      onImport(data.data.rawText);
      setInput('');
      setOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : t('linkedin.failed')); }
    finally { setLoading(false); }
  };

  return (
    <div className="mt-2">
      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" onClick={() => { setOpen(o => !o); setError(''); }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          <Linkedin className="w-3.5 h-3.5" />{t('linkedin.import')}
        </button>
        {profile && !open && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t('linkedin.imported', { name: profile.name || t('linkedin.profile') })}{profile.skills.length > 0 && ` · ${t('linkedin.skills', { n: profile.skills.length })}`}
          </span>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="mt-2 p-3 space-y-2 border border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10 rounded-xl">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {t('linkedin.help')}
                </p>
                <button type="button" onClick={() => setOpen(false)} aria-label={t('common.close')}
                  className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-white shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea value={input} onChange={e => setInput(e.target.value)} rows={4} maxLength={30000}
                placeholder={t('linkedin.placeholder')} aria-label={t('linkedin.placeholder')}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none" />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button type="button" onClick={handleImport} disabled={loading || !input.trim()}
                className="w-full py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-semibold text-xs disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{t('linkedin.importing')}</> : <><Linkedin className="w-3.5 h-3.5" />{t('linkedin.importProfile')}</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
