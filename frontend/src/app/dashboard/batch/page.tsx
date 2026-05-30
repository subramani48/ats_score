'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Plus, Trash2, Sparkles, Loader2, CheckCircle2, XCircle, TrendingUp, Building2, ChevronDown, ChevronUp, Link } from 'lucide-react';
import { useAnalysisStore } from '@/stores/analysisStore';
import { api } from '@/lib/api';
import type { BatchResult, KeywordGapResult, CompanyAtsResult } from '@/lib/api';

const DOMAINS = ['Node.js','React','Python','DevOps','Cybersecurity','Marketing','Laravel','WordPress','Data Engineering','ML Engineering','Cloud Architecture','Product Management'];

interface JDEntry { id: string; title: string; company: string; jd: string; url: string }

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300' : score >= 50 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300';
  return <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${color}`}>{score}%</span>;
}

function ResultCard({ result, index }: { result: BatchResult['results'][0]; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const kgap = result.keywordGap as KeywordGapResult | null;
  const cats = result.companyAnalysis as CompanyAtsResult | null;
  const fitScore = cats?.companyFitScore ?? 0;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07 }}
      className={`border rounded-2xl overflow-hidden ${result.error ? 'border-red-200 dark:border-red-500/20' : 'border-gray-100 dark:border-white/10'} bg-white dark:bg-white/5`}>
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${result.error ? 'bg-red-100 dark:bg-red-500/20' : 'bg-indigo-100 dark:bg-indigo-500/20'}`}>
            {result.error ? <XCircle className="w-4.5 h-4.5 text-red-500" /> : <Building2 className="w-4.5 h-4.5 text-indigo-500" />}
          </div>
          <div>
            <p className="font-semibold text-sm">{result.title}</p>
            {result.company && <p className="text-xs text-gray-400">{result.company}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!result.error && cats && <ScoreBadge score={fitScore} />}
          {result.error && <span className="text-xs text-red-500">Failed</span>}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && !result.error && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100 dark:border-white/10 p-4 space-y-4">
            {/* Company Fit */}
            {cats && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Company Fit Score</span>
                  <ScoreBadge score={cats.companyFitScore} />
                </div>
                <div className="h-2 bg-gray-100 dark:bg-white/10 rounded-full">
                  <motion.div animate={{ width: `${cats.companyFitScore}%` }} transition={{ delay: 0.2, duration: 0.8, ease: 'easeOut' }}
                    className={`h-full rounded-full ${cats.companyFitScore >= 70 ? 'bg-green-500' : cats.companyFitScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} />
                </div>
                {cats.recommendations.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-bold text-gray-400 mb-2">Recommendations</p>
                    <ul className="space-y-1">
                      {cats.recommendations.slice(0, 3).map((r, i) => (
                        <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                          <span className="text-indigo-500 mt-0.5">→</span>{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Keyword Gap Summary */}
            {kgap && (
              <div className="grid grid-cols-2 gap-3">
                {kgap.criticalMissing?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-red-500 mb-1.5">Critical Missing ({kgap.criticalMissing.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {kgap.criticalMissing.slice(0, 5).map(k => (
                        <span key={k} className="px-2 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 rounded-full text-xs">{k}</span>
                      ))}
                      {kgap.criticalMissing.length > 5 && <span className="text-xs text-gray-400">+{kgap.criticalMissing.length - 5} more</span>}
                    </div>
                  </div>
                )}
                {kgap.presentKeywords?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-green-500 mb-1.5">Present ({kgap.presentKeywords.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {kgap.presentKeywords.slice(0, 5).map(k => (
                        <span key={k} className="px-2 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 rounded-full text-xs">{k}</span>
                      ))}
                      {kgap.presentKeywords.length > 5 && <span className="text-xs text-gray-400">+{kgap.presentKeywords.length - 5} more</span>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
        {expanded && result.error && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-red-100 dark:border-red-500/20 p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function BatchPage() {
  const { token } = useAnalysisStore();
  const [resumeText, setResumeText] = useState('');
  const [domain, setDomain]         = useState('React');
  const [jds, setJds]               = useState<JDEntry[]>([{ id: '1', title: '', company: '', jd: '', url: '' }]);
  const [loading, setLoading]       = useState(false);
  const [fetchingIdx, setFetchingIdx] = useState<number | null>(null);
  const [error, setError]           = useState('');
  const [result, setResult]         = useState<BatchResult | null>(null);

  const addJD = () => setJds(prev => [...prev, { id: Date.now().toString(), title: '', company: '', jd: '', url: '' }]);
  const removeJD = (id: string) => setJds(prev => prev.filter(j => j.id !== id));
  const updateJD = (id: string, field: keyof JDEntry, value: string) =>
    setJds(prev => prev.map(j => j.id === id ? { ...j, [field]: value } : j));

  const fetchJDFromUrl = async (idx: number) => {
    const jd = jds[idx];
    if (!jd.url.trim()) return;
    setFetchingIdx(idx); setError('');
    try {
      const r = await api.fetchJobFromUrl(jd.url.trim(), token ?? undefined);
      updateJD(jd.id, 'jd', r.description);
      if (r.title)   updateJD(jd.id, 'title', r.title);
      if (r.company) updateJD(jd.id, 'company', r.company);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to fetch JD'); }
    finally { setFetchingIdx(null); }
  };

  const analyze = async () => {
    const validJDs = jds.filter(j => j.jd.trim());
    if (!resumeText.trim()) { setError('Resume text is required.'); return; }
    if (validJDs.length === 0) { setError('Add at least one job description.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await api.batchAnalyze({
        resumeText,
        domain,
        jobDescriptions: validJDs.map(j => ({ title: j.title || 'Untitled', company: j.company || undefined, jd: j.jd })),
      }, token ?? undefined);
      setResult(r.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Batch analysis failed'); }
    finally { setLoading(false); }
  };

  const successCount = result?.results.filter(r => !r.error).length ?? 0;
  const avgFit = result
    ? Math.round(result.results.filter(r => !r.error && r.companyAnalysis).reduce((a, r) => a + (r.companyAnalysis as CompanyAtsResult).companyFitScore, 0) / successCount)
    : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="w-6 h-6 text-green-500" />Batch Analysis
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">Analyze your resume against multiple jobs at once</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Inputs — 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">Resume Text *</label>
            <textarea value={resumeText} onChange={e => setResumeText(e.target.value)} rows={6}
              placeholder="Paste your resume..."
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all resize-none" />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">Domain</label>
            <select value={domain} onChange={e => setDomain(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-green-500 transition-all appearance-none cursor-pointer">
              {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* JD Entries */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Job Descriptions *</label>
              <button onClick={addJD} disabled={jds.length >= 5}
                className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:text-green-700 disabled:opacity-40 font-semibold">
                <Plus className="w-3.5 h-3.5" />Add JD
              </button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {jds.map((jd, i) => (
                <div key={jd.id} className="border border-gray-200 dark:border-white/10 rounded-xl p-3 space-y-2 bg-white dark:bg-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 w-5 text-center">#{i + 1}</span>
                    <input value={jd.title} onChange={e => updateJD(jd.id, 'title', e.target.value)}
                      placeholder="Job Title" className="flex-1 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-xs outline-none focus:border-green-500 transition-all" />
                    {jds.length > 1 && (
                      <button onClick={() => removeJD(jd.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <input value={jd.company} onChange={e => updateJD(jd.id, 'company', e.target.value)}
                    placeholder="Company (optional)" className="w-full px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-xs outline-none focus:border-green-500 transition-all" />
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Link className="absolute left-2 top-2 w-3 h-3 text-gray-400" />
                      <input value={jd.url} onChange={e => updateJD(jd.id, 'url', e.target.value)}
                        placeholder="Job URL" className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-xs outline-none focus:border-green-500 transition-all" />
                    </div>
                    <button onClick={() => fetchJDFromUrl(i)} disabled={fetchingIdx === i || !jd.url.trim()}
                      className="px-2 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors shrink-0">
                      {fetchingIdx === i ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Fetch'}
                    </button>
                  </div>
                  <textarea value={jd.jd} onChange={e => updateJD(jd.id, 'jd', e.target.value)}
                    rows={2} placeholder="Or paste job description text..."
                    className="w-full px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-xs outline-none focus:border-green-500 transition-all resize-none" />
                </div>
              ))}
            </div>
          </div>

          {error && <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400">{error}</div>}

          <motion.button onClick={analyze} disabled={loading || !resumeText.trim()} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing {jds.filter(j => j.jd).length} JDs...</> : <><Sparkles className="w-4 h-4" />Analyze All Jobs</>}
          </motion.button>
        </div>

        {/* Results — 3 cols */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-green-500 mb-3" />
              <p className="text-sm">Running parallel analysis across all job descriptions...</p>
              <p className="text-xs mt-1">This may take a moment</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Jobs Analyzed', value: result.totalJDs, color: 'text-green-600 dark:text-green-400' },
                  { label: 'Successful', value: successCount, color: 'text-blue-600 dark:text-blue-400' },
                  { label: 'Avg Fit Score', value: `${avgFit}%`, color: avgFit >= 70 ? 'text-green-600' : avgFit >= 50 ? 'text-amber-600' : 'text-red-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl p-3 text-center">
                    <p className={`text-2xl font-black ${color}`}>{value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Best match */}
              {successCount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl">
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Best match: <strong>{result.results.sort((a, b) => ((b.companyAnalysis as CompanyAtsResult)?.companyFitScore ?? 0) - ((a.companyAnalysis as CompanyAtsResult)?.companyFitScore ?? 0))[0]?.title ?? 'N/A'}</strong>
                  </p>
                </div>
              )}

              {/* Result Cards */}
              <div className="space-y-3">
                {result.results.map((r, i) => <ResultCard key={i} result={r} index={i} />)}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Layers className="w-12 h-12 opacity-20 mb-3" />
              <p className="text-sm">Results will appear here</p>
              <p className="text-xs mt-1">Add job descriptions and click Analyze All</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
