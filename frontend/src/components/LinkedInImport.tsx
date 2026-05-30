'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Linkedin, Loader2, CheckCircle2, ChevronDown, ChevronUp, Copy } from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

interface LinkedInProfile {
  name: string; headline: string; about: string; experience: string;
  education: string; skills: string[]; rawText: string;
}

interface Props {
  onImport: (resumeText: string) => void;
  token?: string | null;
}

export default function LinkedInImport({ onImport, token }: Props) {
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleImport = async () => {
    if (!input.trim()) return;
    setLoading(true); setError(''); setProfile(null);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/scraper/linkedin-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ input: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Import failed');
      setProfile(data.data);
      // Auto-fill with rawText
      onImport(data.data.rawText);
    } catch (e) { setError(e instanceof Error ? e.message : 'Import failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="border border-blue-200 dark:border-blue-500/30 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-500/10">
        <Linkedin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">LinkedIn Profile Import</span>
        <span className="text-xs text-blue-500 dark:text-blue-400 ml-auto">Paste URL or profile text</span>
      </div>
      <div className="p-4 space-y-3">
        <textarea value={input} onChange={e => setInput(e.target.value)} rows={3}
          placeholder="Paste your LinkedIn profile URL (https://linkedin.com/in/yourname) or copy-paste your LinkedIn profile text here..."
          className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none" />

        {error && <p className="text-xs text-red-500">{error}</p>}

        <motion.button onClick={handleImport} disabled={loading || !input.trim()}
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Importing...</> : <><Linkedin className="w-4 h-4" />Import Profile</>}
        </motion.button>

        {/* Imported Profile Preview */}
        <AnimatePresence>
          {profile && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <div className="border border-green-200 dark:border-green-500/30 rounded-xl overflow-hidden">
                <button onClick={() => setExpanded(!expanded)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-green-50 dark:bg-green-500/10 text-left">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                      Imported: {profile.name || 'Profile'}
                    </span>
                  </div>
                  {expanded ? <ChevronUp className="w-4 h-4 text-green-600" /> : <ChevronDown className="w-4 h-4 text-green-600" />}
                </button>
                <AnimatePresence>
                  {expanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                      className="p-4 space-y-2 bg-white dark:bg-white/5">
                      {profile.headline && <p className="text-xs text-gray-500"><strong>Headline:</strong> {profile.headline}</p>}
                      {profile.skills.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-400 mb-1">Skills Detected ({profile.skills.length})</p>
                          <div className="flex flex-wrap gap-1">
                            {profile.skills.slice(0, 15).map(s => (
                              <span key={s} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-full text-xs">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <button onClick={() => { navigator.clipboard.writeText(profile.rawText); }}
                        className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-600 mt-2">
                        <Copy className="w-3 h-3" />Copy full profile text
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
