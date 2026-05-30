'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Sparkles, Loader2, CheckCircle2, XCircle, Lightbulb, MessageSquare, Link } from 'lucide-react';
import { useAnalysisStore } from '@/stores/analysisStore';
import { api } from '@/lib/api';
import type { CompanyAtsResult } from '@/lib/api';

const TOP_COMPANIES = ['Google','Amazon','Microsoft','Meta','Apple','Netflix','Infosys','TCS','Wipro','Accenture','Deloitte','IBM','Salesforce','Adobe','Uber'];

export default function CompanyAtsPage() {
  const { token } = useAnalysisStore();
  const [resumeText, setResumeText] = useState('');
  const [company, setCompany]       = useState('');
  const [role, setRole]             = useState('');
  const [jobUrl, setJobUrl]         = useState('');
  const [loading, setLoading]       = useState(false);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [error, setError]           = useState('');
  const [result, setResult]         = useState<CompanyAtsResult | null>(null);

  const fetchFromUrl = async () => {
    if (!jobUrl.trim()) return;
    setFetchingUrl(true); setError('');
    try {
      const r = await api.fetchJobFromUrl(jobUrl.trim(), token ?? undefined);
      if (r.company) setCompany(r.company);
      if (r.title)   setRole(r.title);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to fetch'); }
    finally { setFetchingUrl(false); }
  };

  const analyze = async () => {
    if (!resumeText.trim() || !company.trim() || !role.trim()) { setError('Resume text, company, and role are required.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await api.companyAtsAnalysis({ resumeText, company, role }, token ?? undefined);
      setResult(r.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Analysis failed'); }
    finally { setLoading(false); }
  };

  const score = result?.companyFitScore ?? 0;
  const scoreColor = score >= 70 ? 'from-green-500 to-emerald-600' : score >= 50 ? 'from-amber-500 to-orange-500' : 'from-red-500 to-rose-600';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6 text-amber-500" />Company ATS Analysis
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">Optimize your resume for specific companies and their ATS systems</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">Resume Text *</label>
            <textarea value={resumeText} onChange={e => setResumeText(e.target.value)} rows={7}
              placeholder="Paste your resume content here..."
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all resize-none" />
          </div>

          {/* Quick Company Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">Quick Select Company</label>
            <div className="flex flex-wrap gap-1.5">
              {TOP_COMPANIES.map(c => (
                <button key={c} onClick={() => setCompany(c)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    company === c
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* URL Fetch */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input value={jobUrl} onChange={e => setJobUrl(e.target.value)} placeholder="Job URL to auto-fill company & role"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all" />
            </div>
            <button onClick={fetchFromUrl} disabled={fetchingUrl || !jobUrl.trim()}
              className="px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors shrink-0">
              {fetchingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Fetch'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Company *</label>
              <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Google"
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">Role *</label>
              <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Senior Engineer"
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all" />
            </div>
          </div>

          {error && <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400">{error}</div>}

          <motion.button onClick={analyze} disabled={loading || !resumeText.trim() || !company.trim() || !role.trim()}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</> : <><Sparkles className="w-4 h-4" />Analyze for {company || 'Company'}</>}
          </motion.button>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
              <p className="text-sm">Analyzing for {company}...</p>
            </div>
          ) : result ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Fit Score */}
              <div className={`bg-gradient-to-br ${scoreColor} rounded-2xl p-6 text-white text-center`}>
                <p className="text-5xl font-black">{result.companyFitScore}</p>
                <p className="text-white/80 text-sm mt-1">Company Fit Score for {company}</p>
                <p className="text-xs text-white/60 mt-1">{role}</p>
              </div>

              {/* Culture Keywords */}
              {result.cultureFitKeywords?.length > 0 && (
                <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Culture Match Keywords</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {result.cultureFitKeywords.map(k => (
                      <span key={k} className="px-2.5 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">{k}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Present vs Missing */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-green-700 dark:text-green-400 flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />Present
                  </h4>
                  <div className="space-y-1">
                    {result.presentForCompany.slice(0, 5).map(k => (
                      <p key={k} className="text-xs text-green-700 dark:text-green-300">• {k}</p>
                    ))}
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5 mb-2">
                    <XCircle className="w-3.5 h-3.5" />Missing
                  </h4>
                  <div className="space-y-1">
                    {result.missingForCompany.slice(0, 5).map(k => (
                      <p key={k} className="text-xs text-red-700 dark:text-red-300">• {k}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {result.recommendations?.length > 0 && (
                <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {result.recommendations.map((r, i) => (
                      <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5 shrink-0">→</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Interview Tips */}
              {result.interviewTips?.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-5">
                  <h3 className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />Interview Tips for {company}
                  </h3>
                  <ul className="space-y-2">
                    {result.interviewTips.map((t, i) => (
                      <li key={i} className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                        <span className="mt-0.5 shrink-0">💡</span>{t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl">
              <Building2 className="w-12 h-12 opacity-20 mb-3" />
              <p className="text-sm">Company analysis will appear here</p>
              <p className="text-xs mt-1">Select a company and fill your resume</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
