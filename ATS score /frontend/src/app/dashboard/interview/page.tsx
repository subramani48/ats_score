'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Sparkles, ChevronDown, ChevronUp, Loader2, Lightbulb, HelpCircle, Star, Users, Briefcase, Building2, Link } from 'lucide-react';
import { useAnalysisStore } from '@/stores/analysisStore';
import { api } from '@/lib/api';
import type { InterviewResult, InterviewQuestion } from '@/lib/api';

const DOMAINS = ['Node.js','React','Python','DevOps','Cybersecurity','Marketing','Laravel','WordPress','Data Engineering','ML Engineering','Cloud Architecture','Product Management'];
const DIFFICULTIES = [
  { value: 'easy',   label: '🟢 Easy',   desc: 'Junior level' },
  { value: 'medium', label: '🟡 Medium', desc: 'Mid level' },
  { value: 'hard',   label: '🔴 Hard',   desc: 'Senior level' },
] as const;

const SECTION_ICONS: Record<string, React.ElementType> = {
  behavioral: Users, technical: Star, situational: Lightbulb, aboutYou: HelpCircle, companySpecific: Building2,
};
const SECTION_COLORS: Record<string, string> = {
  behavioral: 'blue', technical: 'purple', situational: 'green', aboutYou: 'amber', companySpecific: 'rose',
};

function QuestionCard({ q, index }: { q: InterviewQuestion; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      className="border border-gray-100 dark:border-white/10 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
        <div className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
            {index + 1}
          </span>
          <p className="text-sm font-medium">{q.question}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-white/10">
            {q.why && (
              <div className="mt-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Why They Ask This</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{q.why}</p>
              </div>
            )}
            {q.hint && (
              <div>
                <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">💡 Hint</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{q.hint}</p>
              </div>
            )}
            {q.expectedAnswer && (
              <div className="p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg">
                <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">✅ Sample Answer</p>
                <p className="text-sm text-green-700 dark:text-green-300">{q.expectedAnswer}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function InterviewPage() {
  const { token } = useAnalysisStore();
  const [resumeText, setResumeText]   = useState('');
  const [jobDesc, setJobDesc]         = useState('');
  const [domain, setDomain]           = useState('React');
  const [difficulty, setDifficulty]   = useState<'easy' | 'medium' | 'hard'>('medium');
  const [jobUrl, setJobUrl]           = useState('');
  const [loading, setLoading]         = useState(false);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [error, setError]             = useState('');
  const [result, setResult]           = useState<InterviewResult | null>(null);
  const [activeSection, setActiveSection] = useState<string>('technical');

  const fetchFromUrl = async () => {
    if (!jobUrl.trim()) return;
    setFetchingUrl(true); setError('');
    try {
      const r = await api.fetchJobFromUrl(jobUrl.trim(), token ?? undefined);
      setJobDesc(r.description);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to fetch job'); }
    finally { setFetchingUrl(false); }
  };

  const generate = async () => {
    if (!resumeText.trim()) { setError('Resume text is required.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await api.generateInterviewQuestions({ resumeText, jobDescription: jobDesc, domain, difficulty }, token ?? undefined);
      setResult(r.data);
      const sections = Object.keys(r.data.questions);
      if (sections.length) setActiveSection(sections[0]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Generation failed'); }
    finally { setLoading(false); }
  };

  const allSections = result ? Object.entries(result.questions) : [];
  const totalQuestions = allSections.reduce((acc, [, qs]) => acc + (Array.isArray(qs) ? qs.length : 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-blue-500" />Interview Prep
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">AI-generated interview questions tailored to your resume & job</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left Inputs — 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">Resume Text *</label>
            <textarea value={resumeText} onChange={e => setResumeText(e.target.value)} rows={5}
              placeholder="Paste your resume..."
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none" />
          </div>

          {/* URL Fetch */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input value={jobUrl} onChange={e => setJobUrl(e.target.value)} placeholder="Job URL (optional)"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
            </div>
            <button onClick={fetchFromUrl} disabled={fetchingUrl || !jobUrl.trim()}
              className="px-3 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors shrink-0">
              {fetchingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Fetch'}
            </button>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">Job Description</label>
            <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)} rows={4}
              placeholder="Paste job description (optional but improves results)..."
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none" />
          </div>

          {/* Domain */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">Domain</label>
            <select value={domain} onChange={e => setDomain(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer">
              {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">Difficulty</label>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map(d => (
                <button key={d.value} onClick={() => setDifficulty(d.value)}
                  className={`flex flex-col items-center gap-0.5 py-2.5 rounded-xl border text-center transition-all ${
                    difficulty === d.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-white/10 hover:border-blue-300'
                  }`}>
                  <span className="text-sm font-semibold">{d.label}</span>
                  <span className="text-xs text-gray-400">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400">{error}</div>}

          <motion.button onClick={generate} disabled={loading || !resumeText.trim()}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4" />Generate Questions</>}
          </motion.button>
        </div>

        {/* Right Results — 3 cols */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
              <p className="text-sm">Generating personalized interview questions...</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Stats */}
              <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl">
                <Briefcase className="w-8 h-8 text-blue-500 shrink-0" />
                <div>
                  <p className="font-bold text-blue-700 dark:text-blue-300">{totalQuestions} Questions Generated</p>
                  <p className="text-xs text-blue-500 dark:text-blue-400">{result.domain} · {result.difficulty} difficulty · {allSections.length} categories</p>
                </div>
              </div>

              {/* Section Tabs */}
              <div className="flex flex-wrap gap-2">
                {allSections.map(([key, qs]) => {
                  const Icon = SECTION_ICONS[key] ?? HelpCircle;
                  const color = SECTION_COLORS[key] ?? 'gray';
                  const count = Array.isArray(qs) ? qs.length : 0;
                  return (
                    <button key={key} onClick={() => setActiveSection(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeSection === key
                          ? `bg-${color}-100 dark:bg-${color}-500/20 text-${color}-700 dark:text-${color}-300 border border-${color}-300 dark:border-${color}-500/40`
                          : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-transparent'
                      }`}>
                      <Icon className="w-3.5 h-3.5" />
                      {key.replace(/([A-Z])/g, ' $1').replace('about You', 'About You').trim()} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Questions */}
              <div className="space-y-2">
                {(result.questions[activeSection as keyof typeof result.questions] as InterviewQuestion[] ?? []).map((q, i) => (
                  <QuestionCard key={i} q={q} index={i} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <MessageSquare className="w-12 h-12 opacity-20 mb-3" />
              <p className="text-sm">Interview questions will appear here</p>
              <p className="text-xs mt-1">Fill in the form and click Generate</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
