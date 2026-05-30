'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Sparkles, Clock, Copy, Download, Check, Link, Loader2, Building2, User as UserIcon, ChevronDown } from 'lucide-react';
import { useAnalysisStore } from '@/stores/analysisStore';
import { api } from '@/lib/api';
import type { CoverLetterHistory } from '@/lib/api';

const TONES = [
  { value: 'professional', label: '👔 Professional', desc: 'Formal and polished' },
  { value: 'enthusiastic', label: '🚀 Enthusiastic', desc: 'Energetic and passionate' },
  { value: 'concise',      label: '⚡ Concise',      desc: 'Brief and direct' },
] as const;

export default function CoverLetterPage() {
  const { token } = useAnalysisStore();
  const [resumeText, setResumeText]   = useState('');
  const [jobDesc, setJobDesc]         = useState('');
  const [company, setCompany]         = useState('');
  const [role, setRole]               = useState('');
  const [tone, setTone]               = useState<'professional' | 'enthusiastic' | 'concise'>('professional');
  const [jobUrl, setJobUrl]           = useState('');
  const [result, setResult]           = useState('');
  const [loading, setLoading]         = useState(false);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [error, setError]             = useState('');
  const [copied, setCopied]           = useState(false);
  const [history, setHistory]         = useState<CoverLetterHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeHistory, setActiveHistory] = useState<CoverLetterHistory | null>(null);

  useEffect(() => {
    if (!token) return;
    api.getCoverLetterHistory(token).then(r => setHistory(r.data)).catch(() => {});
  }, [token]);

  const fetchFromUrl = async () => {
    if (!jobUrl.trim()) return;
    setFetchingUrl(true); setError('');
    try {
      const r = await api.fetchJobFromUrl(jobUrl.trim(), token ?? undefined);
      setJobDesc(r.description);
      if (r.company) setCompany(r.company);
      if (r.title)   setRole(r.title);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch job');
    } finally { setFetchingUrl(false); }
  };

  const generate = async () => {
    if (!resumeText.trim() || !jobDesc.trim()) { setError('Resume text and job description are required.'); return; }
    setLoading(true); setError(''); setResult('');
    try {
      const r = await api.generateCoverLetter({ resumeText, jobDescription: jobDesc, companyName: company, role, tone }, token ?? undefined);
      setResult(r.data.generatedText);
      api.getCoverLetterHistory(token!).then(h => setHistory(h.data)).catch(() => {});
    } catch (e) { setError(e instanceof Error ? e.message : 'Generation failed'); }
    finally { setLoading(false); }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(result);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const exportTxt = () => {
    const blob = new Blob([result], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `cover-letter-${company || 'draft'}.txt`; a.click();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-500" />Cover Letter Generator
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">AI-powered personalized cover letters in seconds</p>
        </div>
        {history.length > 0 && (
          <button onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
            <Clock className="w-4 h-4" />History ({history.length})
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* History Panel */}
      <AnimatePresence>
        {showHistory && history.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-white/10">
              <h3 className="text-sm font-semibold">Recent Cover Letters</h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-white/10 max-h-64 overflow-y-auto">
              {history.map(h => (
                <button key={h.id} onClick={() => { setActiveHistory(h); setResult(h.generatedText); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between group">
                  <div>
                    <p className="text-sm font-medium">{h.companyName ?? 'Unknown Company'} — {h.role ?? 'Unknown Role'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{h.tone} · {new Date(h.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xs text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">View →</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left — Inputs */}
        <div className="space-y-4">
          {/* Resume Text */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">
              Your Resume Text *
            </label>
            <textarea value={resumeText} onChange={e => setResumeText(e.target.value)}
              rows={6} placeholder="Paste your resume content here..."
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none" />
          </div>

          {/* Job URL Fetch */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input value={jobUrl} onChange={e => setJobUrl(e.target.value)}
                placeholder="Or paste job URL to auto-fill..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all" />
            </div>
            <button onClick={fetchFromUrl} disabled={fetchingUrl || !jobUrl.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-500 text-white rounded-xl text-sm font-semibold hover:bg-purple-600 disabled:opacity-50 transition-colors shrink-0">
              {fetchingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Fetch'}
            </button>
          </div>

          {/* Job Description */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">
              Job Description *
            </label>
            <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)}
              rows={5} placeholder="Paste job description here..."
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none" />
          </div>

          {/* Company + Role */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Building2 className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input value={company} onChange={e => setCompany(e.target.value)}
                placeholder="Company name"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all" />
            </div>
            <div className="relative">
              <UserIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input value={role} onChange={e => setRole(e.target.value)}
                placeholder="Job role/title"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all" />
            </div>
          </div>

          {/* Tone */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">Tone</label>
            <div className="grid grid-cols-3 gap-2">
              {TONES.map(t => (
                <button key={t.value} onClick={() => setTone(t.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${
                    tone === t.value
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300'
                      : 'border-gray-200 dark:border-white/10 hover:border-purple-300 dark:hover:border-purple-500/30'
                  }`}>
                  <span className="text-sm font-medium">{t.label}</span>
                  <span className="text-xs text-gray-400">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <motion.button onClick={generate} disabled={loading || !resumeText.trim() || !jobDesc.trim()}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4" />Generate Cover Letter</>}
          </motion.button>
        </div>

        {/* Right — Result */}
        <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-white/10">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Generated Letter</span>
            {result && (
              <div className="flex items-center gap-2">
                <button onClick={copyResult} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={exportTxt} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors">
                  <Download className="w-3.5 h-3.5" />Download
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 p-5 overflow-y-auto min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                <p className="text-sm">Crafting your personalized cover letter...</p>
              </div>
            ) : result ? (
              <motion.pre initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300 font-sans">
                {result}
              </motion.pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                <FileText className="w-12 h-12 opacity-20" />
                <p className="text-sm">Your cover letter will appear here</p>
                <p className="text-xs">Fill in the form and click Generate</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
