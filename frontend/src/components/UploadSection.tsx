'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server, Globe, Flame, Layers, Code2, TrendingUp, GitBranch, ShieldCheck,
  ChevronLeft, ChevronDown, ChevronUp, UploadCloud, FileText, CheckCircle,
  AlertTriangle, Zap, RotateCcw, Star, Target, Award, Lightbulb, Sparkles,
  BarChart2, Mail, Database, Cpu, Activity, XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAnalysisStore } from '@/stores/analysisStore';
import type { Analysis, KeywordGapResult } from '@/lib/api';

const DOMAINS = [
  { name: 'Node.js',         icon: Server,      color: 'from-green-500 to-emerald-600' },
  { name: 'React',           icon: Layers,      color: 'from-cyan-500 to-blue-600' },
  { name: 'Python',          icon: Code2,       color: 'from-yellow-500 to-amber-500' },
  { name: 'DevOps',          icon: GitBranch,   color: 'from-violet-500 to-indigo-600' },
  { name: 'Cybersecurity',   icon: ShieldCheck, color: 'from-indigo-500 to-violet-600' },
  { name: 'Marketing',       icon: TrendingUp,  color: 'from-pink-500 to-rose-500' },
  { name: 'Laravel',         icon: Flame,       color: 'from-red-500 to-orange-500' },
  { name: 'WordPress',       icon: Globe,       color: 'from-blue-500 to-cyan-600' },
  { name: 'Data Engineering', icon: Database,   color: 'from-emerald-500 to-teal-600' },
  { name: 'ML Engineering',  icon: Cpu,         color: 'from-purple-500 to-pink-600' },
  { name: 'Cloud Architecture', icon: Activity, color: 'from-orange-500 to-amber-600' },
  { name: 'Product Management', icon: Star,     color: 'from-teal-500 to-cyan-600' },
];

type Mode = 'analyze' | 'rewrite';
type Status = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

function safeParseJSON(raw: string): unknown {
  try { return JSON.parse(raw); } catch { return null; }
}

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {[1, 2, 3].map(s => (
        <div key={s} className={`h-1.5 rounded-full transition-all duration-400 ${
          s === step ? 'w-8 bg-gradient-to-r from-indigo-500 to-violet-600'
          : s < step ? 'w-5 bg-indigo-400/70' : 'w-5 bg-gray-200 dark:bg-white/10'}`} />
      ))}
    </div>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-2xl w-fit mx-auto mb-8">
      {([
        { id: 'analyze' as Mode, label: 'Analyze Score',   Icon: BarChart2, grad: 'from-indigo-500 to-violet-600' },
        { id: 'rewrite' as Mode, label: 'AI Rewrite',      Icon: Sparkles,  grad: 'from-violet-500 to-purple-600' },
      ] as const).map(({ id, label, Icon, grad }) => (
        <motion.button key={id} type="button" onClick={() => onChange(id)} whileTap={{ scale: 0.97 }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
            mode === id ? `bg-gradient-to-r ${grad} text-white shadow-lg` : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
          <Icon className="w-4 h-4" />{label}
        </motion.button>
      ))}
    </div>
  );
}

function FloatingInput({ label, type, value, onChange, required, placeholder }: {
  label: string; type: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;
  return (
    <div className="relative">
      <input type={type} required={required} value={value} onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholder={floated ? placeholder : ''}
        className={`w-full px-4 pt-6 pb-3 rounded-xl bg-gray-50 dark:bg-white/5 border transition-all duration-200 text-base outline-none ${
          focused ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-transparent hover:border-indigo-500/20'}`} />
      <label className={`absolute left-4 pointer-events-none transition-all duration-200 ${
        floated ? 'top-2 text-xs font-semibold text-indigo-500' : 'top-[1.05rem] text-sm text-gray-400'}`}>{label}</label>
    </div>
  );
}

function FloatingTextarea({ label, value, onChange, required, placeholder, rows = 5 }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string; rows?: number;
}) {
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;
  return (
    <div className="relative">
      <textarea required={required} value={value} rows={rows} onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholder={floated ? placeholder : ''}
        className={`w-full px-4 pt-6 pb-3 rounded-xl bg-gray-50 dark:bg-white/5 border transition-all duration-200 text-sm outline-none resize-none ${
          focused ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-transparent hover:border-violet-500/20'}`} />
      <label className={`absolute left-4 pointer-events-none transition-all duration-200 ${
        floated ? 'top-2 text-xs font-semibold text-violet-500' : 'top-[1.05rem] text-sm text-gray-400'}`}>{label}</label>
    </div>
  );
}

function RadialGauge({ score }: { score: number }) {
  const r = 60, circ = 2 * Math.PI * r;
  const label = score >= 70 ? 'Great' : score >= 50 ? 'Average' : 'Needs Work';
  return (
    <div className="relative w-36 h-36">
      <svg className="w-36 h-36 -rotate-90" viewBox="0 0 144 144">
        <defs><linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient></defs>
        <circle cx="72" cy="72" r={r} fill="none" stroke="rgba(99,102,241,0.1)" strokeWidth="12" />
        <motion.circle cx="72" cy="72" r={r} fill="none" stroke="url(#gaugeGrad)" strokeWidth="12"
          strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (score / 100) * circ }}
          transition={{ duration: 1.6, ease: 'easeOut', delay: 0.2 }} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent leading-none">
          {score}%
        </motion.span>
        <span className="text-xs text-gray-400 font-medium mt-0.5">{label}</span>
      </div>
    </div>
  );
}

function KeywordGapPanel({ gap }: { gap: KeywordGapResult }) {
  return (
    <div className="space-y-4">
      {gap.criticalMissing.length > 0 && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mb-2">
            Critical Missing ({gap.criticalMissing.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {gap.criticalMissing.map(kw => (
              <span key={kw} className="px-2 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">{kw}</span>
            ))}
          </div>
        </div>
      )}
      {gap.nicetohaveMissing.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
            Nice-to-Have Missing ({gap.nicetohaveMissing.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {gap.nicetohaveMissing.slice(0, 12).map(kw => (
              <span key={kw} className="px-2 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">{kw}</span>
            ))}
          </div>
        </div>
      )}
      {gap.presentKeywords.length > 0 && (
        <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-2">
            Present Keywords ({gap.presentKeywords.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {gap.presentKeywords.slice(0, 15).map(kw => (
              <span key={kw} className="px-2 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">{kw}</span>
            ))}
          </div>
        </div>
      )}
      {gap.recommendedAdditions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">How to Add Top Keywords</p>
          {gap.recommendedAdditions.slice(0, 3).map((rec, i) => (
            <div key={i} className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-3">
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{rec.keyword} → {rec.where}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">"{rec.example}"</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ percent, message }: { percent: number; message: string }) {
  return (
    <div className="w-full space-y-3">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600 dark:text-gray-300 font-medium">{message}</span>
        <span className="text-indigo-500 font-bold">{percent}%</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full"
          initial={{ width: 0 }} animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }} />
      </div>
    </div>
  );
}

export default function UploadSection() {
  const [mode, setMode]           = useState<Mode>('analyze');
  const [file, setFile]           = useState<File | null>(null);
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [domain, setDomain]       = useState('');
  const [jd, setJD]               = useState('');
  const [step, setStep]           = useState(1);
  const [isDragging, setDragging] = useState(false);
  const [status, setStatus]       = useState<Status>('idle');
  const [progress, setProgress]   = useState<{ percent: number; message: string } | null>(null);
  const [result, setResult]       = useState<Analysis | null>(null);
  const [activeTab, setActiveTab] = useState<'score' | 'keywords' | 'gap'>('score');
  const [errorMsg, setErrorMsg]   = useState('');
  const fileRef                   = useRef<HTMLInputElement>(null);
  const { token } = useAnalysisStore();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && /\.(pdf|docx?)$/i.test(f.name)) setFile(f);
  };

  const reset = () => {
    setStatus('idle'); setFile(null); setResult(null); setStep(1);
    setName(''); setEmail(''); setDomain(''); setJD(''); setErrorMsg(''); setProgress(null);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name || !email || !domain) return;
    if (mode === 'rewrite' && !jd.trim()) return;

    setStatus('uploading');
    setProgress({ percent: 0, message: 'Uploading resume…' });

    const form = new FormData();
    form.append('resume', file);
    form.append('name', name);
    form.append('email', email);
    form.append('domain', domain);
    form.append('mode', mode);
    if (mode === 'rewrite') form.append('jobDescription', jd);
    if (mode === 'analyze' && jd.trim()) form.append('jobDescription', jd);

    try {
      const { jobId } = await api.uploadResume(form, token ?? undefined);
      setStatus('processing');

      // ── SSE stream ────────────────────────────────────────────────────────
      const es = new EventSource(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'}/api/v1/resumes/jobs/${jobId}/stream`);
      let done = false;

      const finish = (r: Analysis) => {
        if (done) return;
        done = true;
        es.close();
        clearInterval(pollTimer);
        setResult(r);
        setStatus('success');
      };

      const fail = (msg: string) => {
        if (done) return;
        done = true;
        es.close();
        clearInterval(pollTimer);
        setErrorMsg(msg);
        setStatus('error');
      };

      es.addEventListener('progress', (e) => {
        try {
          const d = JSON.parse(e.data);
          setProgress({ percent: d.percent, message: d.message });
        } catch { /* ignore */ }
      });

      es.addEventListener('completed', (e) => {
        try { finish(JSON.parse(e.data) as Analysis); }
        catch { fail('Failed to parse result'); }
      });

      es.addEventListener('error', (e: Event) => {
        const raw = (e as MessageEvent).data;
        let msg = 'Processing failed — please try again';
        if (typeof raw === 'string' && raw) {
          // data may be JSON {"message":"..."} or a plain string — never throw
          const parsed = safeParseJSON(raw);
          msg = (parsed as { message?: string } | null)?.message ?? raw;
        }
        fail(msg);
      });

      es.onerror = () => { /* SSE will auto-reconnect; polling handles timeout */ };

      // ── Polling fallback — kicks in if SSE events never arrive ────────────
      const pollTimer = setInterval(async () => {
        if (done) { clearInterval(pollTimer); return; }
        try {
          const s = await api.getJobStatus(jobId);
          if (s.state === 'completed' && s.result) {
            finish(s.result as Analysis);
          } else if (s.state === 'failed') {
            fail((s as unknown as { failedReason?: string }).failedReason ?? 'Processing failed');
          } else if (s.progress && typeof s.progress === 'object') {
            const p = s.progress as { percent?: number; message?: string };
            if (p.percent != null) setProgress({ percent: p.percent, message: p.message ?? '' });
          }
        } catch { /* ignore poll errors */ }
      }, 3000);

    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not reach the server');
      setStatus('error');
    }
  }, [file, name, email, domain, mode, jd, token]);

  const rewrite = mode === 'rewrite';
  const canStep2 = name && email && (mode === 'analyze' || jd.trim().length > 0);
  const canSubmit = !!file && !!name && !!email && !!domain && (mode === 'analyze' || !!jd.trim());
  const currentDomain = DOMAINS.find(d => d.name === domain);

  return (
    <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden min-h-[420px]">
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <AnimatePresence mode="wait">

        {/* STEP 1 — Domain */}
        {status === 'idle' && step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }}>
            <StepDots step={1} />
            <ModeToggle mode={mode} onChange={setMode} />
            <AnimatePresence mode="wait">
              <motion.div key={mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}
                className={`text-center mb-8 px-4 py-3 rounded-xl text-sm border ${rewrite ? 'bg-violet-500/8 border-violet-500/15 text-violet-600 dark:text-violet-400' : 'bg-indigo-500/6 border-indigo-500/12 text-indigo-600 dark:text-indigo-400'}`}>
                {rewrite ? 'Paste a Job Description — Gemini AI will rewrite your resume to match it and email you the result.'
                         : 'Get an instant ATS compatibility score with keyword gap analysis and improvement suggestions.'}
              </motion.div>
            </AnimatePresence>
            <div className="text-center mb-8">
              <h3 className="text-2xl md:text-3xl font-bold mb-2">Choose Your Domain</h3>
              <p className="text-gray-400 text-sm max-w-sm mx-auto">Select your target role for a tailored analysis.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DOMAINS.map((d, idx) => (
                <motion.button key={d.name} initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                  whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }}
                  onClick={() => { setDomain(d.name); setStep(2); }}
                  className="group p-4 rounded-2xl border border-transparent bg-gray-50 dark:bg-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all duration-300 flex flex-col items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${d.color} flex items-center justify-center shadow-sm`}>
                    <d.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-center leading-tight">{d.name}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* STEP 2 — Details */}
        {status === 'idle' && step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.35 }}>
            <StepDots step={2} />
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" />Back
              </button>
              {currentDomain && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/50 dark:bg-white/5 rounded-full text-xs font-semibold text-indigo-500 border border-indigo-500/20">
                  <currentDomain.icon className="w-3.5 h-3.5" />{domain}
                </div>
              )}
            </div>
            <div className="text-center mb-8">
              <h3 className="text-2xl md:text-3xl font-bold mb-2">{rewrite ? 'Details & Job Description' : 'Your Details'}</h3>
              <p className="text-gray-400 text-sm">{rewrite ? 'We need your info and the JD to rewrite your resume.' : 'Where should we send your results?'}</p>
            </div>
            <form onSubmit={e => { e.preventDefault(); setStep(3); }} className="space-y-4 max-w-lg mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FloatingInput label="Full Name"     type="text"  value={name}  onChange={setName}  required placeholder="John Doe" />
                <FloatingInput label="Email Address" type="email" value={email} onChange={setEmail} required placeholder="john@example.com" />
              </div>
              <div>
                <FloatingTextarea label={rewrite ? 'Job Description (required for AI rewrite)' : 'Job Description (optional — enables keyword gap analysis)'}
                  value={jd} onChange={setJD} required={rewrite} rows={rewrite ? 7 : 5}
                  placeholder="Paste the complete job description here…" />
                <p className="text-xs text-gray-400 mt-1.5 pl-1">
                  {rewrite ? 'The more detailed the JD, the better the AI rewrite.' : 'Add a JD to get AI-powered keyword gap analysis alongside your score.'}
                </p>
              </div>
              <motion.button type="submit" disabled={!canStep2} whileHover={canStep2 ? { scale: 1.02 } : {}} whileTap={canStep2 ? { scale: 0.98 } : {}}
                className={`w-full py-4 text-white rounded-xl font-bold text-base shadow-lg transition-all duration-300 disabled:opacity-50 bg-gradient-to-r ${rewrite ? 'from-violet-500 to-purple-600' : 'from-indigo-500 to-violet-600'}`}>
                Continue to Upload →
              </motion.button>
            </form>
          </motion.div>
        )}

        {/* STEP 3 — Upload */}
        {status === 'idle' && step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.35 }}>
            <StepDots step={3} />
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setStep(2)} className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" />Back
              </button>
              <span className="text-xs font-medium text-gray-400 truncate max-w-[200px]">{name} · {email}</span>
            </div>
            <div className="text-center mb-8">
              <h3 className="text-2xl md:text-3xl font-bold mb-2">Upload Your Resume</h3>
              <p className="text-gray-400 text-sm">PDF or DOCX · max 5 MB</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div onClick={() => fileRef.current?.click()} onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)} onDrop={handleDrop}
                className={`relative rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-300 overflow-hidden ${
                  isDragging ? 'border-indigo-500 bg-indigo-500/8' : file ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-gray-200 dark:border-white/10 hover:border-indigo-500/40 hover:bg-indigo-500/5'}`}>
                <div className="flex flex-col items-center justify-center p-12 gap-4 min-h-[200px]">
                  {file ? (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
                        <FileText className="w-8 h-8 text-white" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-base text-indigo-500 truncate max-w-[260px]">{file.name}</p>
                        <p className="text-sm text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-green-500 font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" />File selected — click to change
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/15 flex items-center justify-center">
                        <UploadCloud className="w-8 h-8 text-gray-400" />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-base"><span className="text-indigo-500">Click to upload</span> or drag & drop</p>
                        <p className="text-sm text-gray-400 mt-1">PDF or DOCX (Max 5 MB)</p>
                      </div>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
              </div>
              <motion.button type="submit" disabled={!canSubmit} whileHover={canSubmit ? { scale: 1.02 } : {}} whileTap={canSubmit ? { scale: 0.98 } : {}}
                className={`w-full py-4 text-white rounded-xl font-bold text-base shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 bg-gradient-to-r ${rewrite ? 'from-violet-500 to-purple-600' : 'from-indigo-500 to-violet-600'}`}>
                {rewrite ? <><Sparkles className="w-4 h-4" />Rewrite & Email Me</> : <><Zap className="w-4 h-4" />Analyse My Resume</>}
              </motion.button>
            </form>
          </motion.div>
        )}

        {/* PROCESSING — SSE progress */}
        {(status === 'uploading' || status === 'processing') && (
          <motion.div key="processing" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
            className="flex flex-col items-center justify-center py-16 gap-8">
            <div className="relative w-28 h-28 flex items-center justify-center">
              {[0, 1, 2].map(i => (
                <motion.div key={i} className={`absolute inset-0 rounded-full border-2 ${rewrite ? 'border-violet-500/25' : 'border-indigo-500/25'}`}
                  animate={{ scale: [1, 1.6 + i * 0.25], opacity: [0.55, 0] }}
                  transition={{ duration: 2, delay: i * 0.38, repeat: Infinity, ease: 'easeOut' }} />
              ))}
              <div className={`absolute inset-3 rounded-full border-4 border-transparent animate-spin ${rewrite ? 'border-t-violet-500 border-r-purple-500' : 'border-t-indigo-500 border-r-violet-500'}`} />
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl bg-gradient-to-br ${rewrite ? 'from-violet-500 to-purple-600' : 'from-indigo-500 to-violet-600'}`}>
                {rewrite ? <Sparkles className="w-7 h-7 text-white" /> : <FileText className="w-7 h-7 text-white" />}
              </div>
            </div>
            <div className="text-center w-full max-w-sm space-y-4">
              {progress ? (
                <ProgressBar percent={progress.percent} message={progress.message} />
              ) : (
                <p className="text-gray-400 text-sm">Connecting to server…</p>
              )}
            </div>
          </motion.div>
        )}

        {/* SUCCESS — Analyze results */}
        {status === 'success' && result && result.mode === 'analyze' && result.score != null && (
          <motion.div key="success-analyze" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-500/10 rounded-full text-sm font-semibold text-green-600 dark:text-green-400 mb-3 border border-green-200 dark:border-green-500/20">
                <CheckCircle className="w-4 h-4" />Analysis Complete
              </div>
              <h3 className="text-2xl font-bold">Your ATS Report</h3>
              <p className="text-gray-400 text-sm mt-1">Report sent to <span className="font-semibold text-gray-700 dark:text-white">{email}</span></p>
            </div>

            {/* Tab navigation */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-xl w-fit mx-auto">
              {([
                { id: 'score', label: 'Score', Icon: BarChart2 },
                { id: 'keywords', label: 'Keywords', Icon: Target },
                ...(result.keywordGap ? [{ id: 'gap', label: 'Gap Analysis', Icon: Lightbulb }] : []),
              ] as const).map(({ id, label, Icon }) => (
                <button key={id} onClick={() => setActiveTab(id as typeof activeTab)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === id ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-400 hover:text-gray-700 dark:hover:text-white'}`}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>

            {/* Score tab */}
            {activeTab === 'score' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white/50 dark:bg-white/5 rounded-2xl p-6 flex flex-col items-center gap-4 border border-gray-100 dark:border-white/10">
                    <RadialGauge score={result.score} />
                    <div className="text-center">
                      <p className="font-bold">ATS Compatibility</p>
                      <p className="text-sm text-gray-400 mt-0.5">for <span className="font-semibold text-gray-700 dark:text-white">{domain}</span></p>
                    </div>
                  </div>
                  {result.breakdown && (
                    <div className="bg-white/50 dark:bg-white/5 rounded-2xl p-6 space-y-4 border border-gray-100 dark:border-white/10">
                      <h4 className="font-bold text-xs uppercase tracking-widest text-gray-400">Score Breakdown</h4>
                      {[
                        { label: 'Keywords', value: result.breakdown.keywordScore, max: 40, Icon: Target },
                        { label: 'Achievements', value: result.breakdown.achievementScore, max: 25, Icon: Award },
                        { label: 'Formatting', value: result.breakdown.formattingScore, max: 20, Icon: FileText },
                        { label: 'Readability', value: result.breakdown.readabilityScore, max: 15, Icon: Star },
                      ].map(({ label, value, max, Icon }, idx) => (
                        <motion.div key={label} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + idx * 0.1 }} className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-indigo-500 shrink-0" />
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium">{label}</span>
                              <span className="text-xs text-gray-400">{value}/{max}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${(value / max) * 100}%` }}
                                transition={{ duration: 1, delay: 0.4 + idx * 0.1 }}
                                className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full" />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
                {result.warnings.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />ATS Warnings
                    </p>
                    {result.warnings.map((w, i) => (
                      <p key={i} className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                        <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{w}
                      </p>
                    ))}
                  </div>
                )}
                {result.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs uppercase tracking-widest text-gray-400 flex items-center gap-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-amber-500" />Suggestions to Improve
                    </h4>
                    {result.suggestions.map((s, i) => (
                      <div key={i} className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 flex items-start gap-3 border border-gray-100 dark:border-white/10">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Lightbulb className="w-3 h-3 text-white" />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{s}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Keywords tab */}
            {activeTab === 'keywords' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {result.keywordsMatched.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-2">Matched Keywords ({result.keywordsMatched.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.keywordsMatched.map(kw => (
                        <span key={kw} className="px-2 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
                {result.keywordsMissed.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mb-2">Missing Keywords ({result.keywordsMissed.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.keywordsMissed.map(kw => (
                        <span key={kw} className="px-2 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Gap analysis tab */}
            {activeTab === 'gap' && result.keywordGap && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <KeywordGapPanel gap={result.keywordGap} />
              </motion.div>
            )}

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={reset}
              className="w-full py-4 bg-gray-50 dark:bg-white/5 hover:bg-indigo-500/5 border border-gray-100 dark:border-white/10 hover:border-indigo-500/30 rounded-xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-2 group">
              <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />Scan Another Resume
            </motion.button>
          </motion.div>
        )}

        {/* SUCCESS — Rewrite */}
        {status === 'success' && result && result.mode === 'rewrite' && (
          <motion.div key="success-rewrite" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-10 gap-7 text-center">
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }} className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-2xl">
                <Mail className="w-11 h-11 text-white" />
              </div>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-400 flex items-center justify-center border-2 border-white dark:border-gray-900">
                <CheckCircle className="w-4 h-4 text-white" />
              </motion.div>
            </motion.div>
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-50 dark:bg-violet-500/10 rounded-full text-sm font-semibold text-violet-600 dark:text-violet-400 mb-4 border border-violet-200 dark:border-violet-500/20">
                <Sparkles className="w-4 h-4" />AI Rewrite Complete
              </div>
              <h3 className="text-2xl font-bold mb-2">Resume Rewritten & Sent!</h3>
              <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
                Your AI-optimised, ATS-ready resume has been emailed to{' '}
                <span className="font-semibold text-gray-700 dark:text-white">{email}</span>.
              </p>
            </div>
            {result.keywordGap && (
              <div className="w-full max-w-sm text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Keyword Gap Analysis</p>
                <KeywordGapPanel gap={result.keywordGap} />
              </div>
            )}
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={reset}
              className="px-8 py-3.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-full font-bold shadow-lg flex items-center gap-2 group">
              <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />Rewrite Another Resume
            </motion.button>
          </motion.div>
        )}

        {/* ERROR */}
        {status === 'error' && (
          <motion.div key="error" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 gap-5">
            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center border border-red-200 dark:border-red-500/20">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">Something went wrong</h3>
              <p className="text-gray-400 text-sm max-w-xs mx-auto">{errorMsg}</p>
            </div>
            <button onClick={() => { setStatus('idle'); setErrorMsg(''); setProgress(null); }}
              className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-full font-bold shadow-lg">
              Try Again
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
