'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, Loader2, Sparkles, Send, Flag, RotateCcw, Trophy, History } from 'lucide-react';
import { useAnalysisStore } from '@/stores/analysisStore';
import { api } from '@/lib/api';
import type { MockInterviewSession, MockInterviewSummary, MockTurn } from '@/lib/api';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { countFillers, countWords, speak, stopSpeaking, wordsPerMinute } from '@/lib/speech';
import LinkedInImport from '@/components/LinkedInImport';
import { useLocale, useT, type MessageKey } from '@/i18n';
import { DATE_LOCALES } from '@/i18n/config';

const DOMAINS = ['Node.js','React','Python','DevOps','Cybersecurity','Marketing','Laravel','WordPress','Data Engineering','ML Engineering','Cloud Architecture','Product Management'];
const PERSONAS = [
  { value: 'friendly', icon: '🙂', label: 'mock.friendly' },
  { value: 'neutral',  icon: '💼', label: 'mock.neutral' },
  { value: 'tough',    icon: '🔥', label: 'mock.tough' },
] as const satisfies ReadonlyArray<{ value: string; icon: string; label: MessageKey }>;
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const DIFFICULTY_LABELS: Record<string, MessageKey> = { easy: 'interview.easy', medium: 'interview.medium', hard: 'interview.hard' };
const PERSONA_LABELS: Record<string, MessageKey> = { friendly: 'mock.friendly', neutral: 'mock.neutral', tough: 'mock.tough' };
const STATUS_LABELS: Record<string, MessageKey> = { active: 'mock.statusActive', completed: 'mock.statusCompleted' };
// Score names sent by the server
const SCORE_LABELS: Record<string, MessageKey> = {
  relevance: 'mock.relevance', structure: 'mock.structure', depth: 'mock.depth', clarity: 'mock.clarity',
  confidence: 'mock.confidence', communication: 'mock.communication', technicalDepth: 'mock.technicalDepth',
};

const inputCls = 'w-full px-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all';
const labelCls = 'text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block';

function Bar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const t = useT();
  const pct = Math.round((value / max) * 100);
  const color = pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500 dark:text-gray-400 capitalize">{SCORE_LABELS[label] ? t(SCORE_LABELS[label]) : label.replace(/([A-Z])/g, ' $1')}</span>
        <span className="font-semibold">{value}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Feedback({ turn }: { turn: MockTurn }) {
  const t = useT();
  const ev = turn.evaluation;
  if (!ev) return null;
  return (
    <div className="space-y-4 pt-3">
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
        {Object.entries(ev.scores).map(([k, v]) => <Bar key={k} label={k} value={v} />)}
      </div>
      {turn.delivery && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          🎙 {turn.delivery.wordsPerMinute ? `${turn.delivery.wordsPerMinute} wpm · ` : ''}
          {t('mock.fillerWords', { n: turn.delivery.fillerCount ?? 0 })}{ev.deliveryNote ? ` — ${ev.deliveryNote}` : ''}
        </p>
      )}
      {ev.strengths.length > 0 && (
        <div>
          <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">{t('mock.whatWorked')}</p>
          <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc pl-5 space-y-0.5">{ev.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {ev.improvements.length > 0 && (
        <div>
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">{t('mock.improve')}</p>
          <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc pl-5 space-y-0.5">{ev.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {ev.betterAnswer && (
        <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-lg">
          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">{t('mock.stronger')}</p>
          <p className="text-sm text-indigo-800 dark:text-indigo-200 whitespace-pre-wrap">{ev.betterAnswer}</p>
        </div>
      )}
    </div>
  );
}

export default function MockInterviewPage() {
  const { token } = useAnalysisStore();

  // setup form
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [domain, setDomain] = useState('React');
  const [resumeText, setResumeText] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('medium');
  const [persona, setPersona] = useState<(typeof PERSONAS)[number]['value']>('neutral');
  const [total, setTotal] = useState(5);

  // session
  const [session, setSession] = useState<MockInterviewSession | null>(null);
  const [history, setHistory] = useState<MockInterviewSummary[]>([]);
  const [answer, setAnswer] = useState('');
  const [voiceOn, setVoiceOn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const t = useT();
  const { locale } = useLocale();

  const appendText = useCallback((text: string) => setAnswer(a => (a ? `${a} ` : '') + text), []);
  const mic = useSpeechRecognition(appendText);

  const loadHistory = useCallback(() => {
    if (!token) return;
    api.listMockInterviews(token).then(r => setHistory(r.data)).catch(() => {});
  }, [token]);
  useEffect(loadHistory, [loadHistory]);

  const pending = useMemo(() => session?.turns.find(turn => turn.answer === undefined), [session]);
  const answeredCount = session?.turns.filter(turn => turn.answer !== undefined).length ?? 0;
  const lastAnsweredIdx = session ? session.turns.map(turn => turn.answer !== undefined).lastIndexOf(true) : -1;

  // Read each new question aloud.
  const pendingQuestion = pending?.question;
  useEffect(() => {
    if (voiceOn && pendingQuestion) speak(pendingQuestion);
    return () => stopSpeaking();
  }, [pendingQuestion, voiceOn]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await fn(); }
    catch (e) { setError(e instanceof Error ? e.message : t('common.error')); }
    finally { setBusy(false); }
  };

  const start = () => run(async () => {
    if (!token) return;
    const r = await api.startMockInterview({
      role, company: company || undefined, domain, resumeText,
      jobDescription: jobDesc || undefined, difficulty, persona, totalQuestions: total,
    }, token);
    setSession(r.data); setAnswer(''); mic.resetTimer();
  });

  const submit = () => run(async () => {
    if (!token || !session || !answer.trim()) return;
    const text = answer.trim();
    const spoken = mic.speakingSeconds > 0;
    const r = await api.submitMockAnswer(session.id, {
      answer: text,
      delivery: spoken
        ? { durationSec: Math.round(mic.speakingSeconds), wordsPerMinute: wordsPerMinute(text, mic.speakingSeconds), fillerCount: countFillers(text) }
        : undefined,
    }, token);
    setSession(r.data); setAnswer(''); mic.resetTimer();
  });

  const finish = () => run(async () => {
    if (!token || !session) return;
    const r = await api.finishMockInterview(session.id, token);
    setSession(r.data); loadHistory();
  });

  const open = (id: string) => run(async () => {
    if (!token) return;
    const r = await api.getMockInterview(id, token);
    setSession(r.data); setAnswer('');
  });

  const reset = () => { setSession(null); setAnswer(''); mic.stop(); mic.resetTimer(); stopSpeaking(); loadHistory(); };

  const errorBox = error && (
    <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400">{error}</div>
  );

  // ── Setup screen ───────────────────────────────────────────
  if (!session) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Mic className="w-6 h-6 text-indigo-500" />{t('mock.title')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{t('mock.subtitle')}</p>
        </div>
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>{t('mock.role')} *</label><input className={inputCls} value={role} onChange={e => setRole(e.target.value)} placeholder={t('mock.rolePlaceholder')} /></div>
              <div><label className={labelCls}>{t('common.company')}</label><input className={inputCls} value={company} onChange={e => setCompany(e.target.value)} placeholder={t('common.optional')} /></div>
            </div>
            <div>
              <label className={labelCls}>{t('common.resumeText')} *</label>
              <textarea className={`${inputCls} resize-none`} rows={5} value={resumeText} onChange={e => setResumeText(e.target.value)} placeholder={t('common.resumePlaceholder')} />
              <LinkedInImport token={token} onImport={setResumeText} />
            </div>
            <div>
              <label className={labelCls}>{t('common.jobDescription')}</label>
              <textarea className={`${inputCls} resize-none`} rows={3} value={jobDesc} onChange={e => setJobDesc(e.target.value)} placeholder={t('mock.jdPlaceholder')} />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>{t('common.domain')}</label>
                <select className={inputCls} value={domain} onChange={e => setDomain(e.target.value)}>{DOMAINS.map(d => <option key={d}>{d}</option>)}</select>
              </div>
              <div>
                <label className={labelCls}>{t('interview.difficulty')}</label>
                <select className={inputCls} value={difficulty} onChange={e => setDifficulty(e.target.value as typeof difficulty)}>{DIFFICULTIES.map(d => <option key={d} value={d}>{t(DIFFICULTY_LABELS[d])}</option>)}</select>
              </div>
              <div>
                <label className={labelCls}>{t('mock.questions')}</label>
                <select className={inputCls} value={total} onChange={e => setTotal(Number(e.target.value))}>{[3, 5, 7, 10].map(n => <option key={n} value={n}>{n}</option>)}</select>
              </div>
            </div>
            <div>
              <label className={labelCls}>{t('mock.style')}</label>
              <div className="grid grid-cols-3 gap-2">
                {PERSONAS.map(p => (
                  <button key={p.value} onClick={() => setPersona(p.value)}
                    className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${persona === p.value ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 dark:border-white/10 hover:border-indigo-300'}`}>
                    {p.icon} {t(p.label)}
                  </button>
                ))}
              </div>
            </div>
            {errorBox}
            <motion.button onClick={start} disabled={busy || !role.trim() || !resumeText.trim()} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" />{t('mock.preparing')}</> : <><Sparkles className="w-4 h-4" />{t('mock.start')}</>}
            </motion.button>
          </div>

          <div className="lg:col-span-2">
            <p className={labelCls}><History className="w-3.5 h-3.5 inline mr-1" />{t('mock.past')}</p>
            {history.length === 0 ? (
              <p className="text-sm text-gray-400">{t('mock.pastEmpty')}</p>
            ) : (
              <div className="space-y-2">
                {history.map(h => (
                  <button key={h.id} onClick={() => open(h.id)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-left transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{h.role}{h.company ? ` · ${h.company}` : ''}</p>
                      <p className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleDateString(DATE_LOCALES[locale])} · {STATUS_LABELS[h.status] ? t(STATUS_LABELS[h.status]) : h.status}</p>
                    </div>
                    {h.readinessScore !== null && <span className="text-sm font-bold text-indigo-500 shrink-0">{h.readinessScore}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Interview / report screen ──────────────────────────────
  const report = session.report;
  const words = countWords(answer);
  const fillers = countFillers(answer);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{session.role}{session.company ? ` · ${session.company}` : ''}</h1>
          <p className="text-xs text-gray-400">{t('mock.sessionMeta', { domain: session.domain, difficulty: DIFFICULTY_LABELS[session.difficulty] ? t(DIFFICULTY_LABELS[session.difficulty]) : session.difficulty, persona: PERSONA_LABELS[session.persona] ? t(PERSONA_LABELS[session.persona]) : session.persona })}</p>
        </div>
        <button onClick={reset} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-500"><RotateCcw className="w-4 h-4" />{t('mock.new')}</button>
      </div>

      {report && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/5 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex flex-col items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 opacity-80" /><span className="text-2xl font-bold leading-none">{report.readinessScore}</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('mock.readiness')}</p>
              <p className="text-sm font-medium mt-1">{report.verdict}</p>
              <p className="text-xs text-gray-400 mt-1">{t('mock.readinessHint')}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {Object.entries(report.categoryScores).map(([k, v]) => <Bar key={k} label={k} value={v} />)}
          </div>
          {report.strengths.length > 0 && (
            <div>
              <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">{t('mock.strengths')}</p>
              <ul className="text-sm list-disc pl-5 space-y-0.5">{report.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">{t('mock.topFixes')}</p>
            <div className="space-y-2">{report.topFixes.map((f, i) => (
              <div key={i} className="text-sm"><span className="font-semibold">{f.issue}</span> — <span className="text-gray-600 dark:text-gray-300">{f.fix}</span></div>
            ))}</div>
          </div>
          <div>
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">{t('mock.plan')}</p>
            <div className="space-y-1.5">{report.practicePlan.map(p => (
              <div key={p.day} className="text-sm flex gap-3"><span className="font-bold text-indigo-500 shrink-0">{t('mock.day', { n: p.day })}</span><span><span className="font-semibold">{p.focus}:</span> {p.task}</span></div>
            ))}</div>
          </div>
        </motion.div>
      )}

      {/* Answered questions */}
      <div className="space-y-2">
        {session.turns.map((turn, i) => turn.answer !== undefined && (
          <details key={i} open={!report && i === lastAnsweredIdx} className="border border-gray-100 dark:border-white/10 rounded-xl px-4 py-3">
            <summary className="cursor-pointer flex items-center justify-between gap-3 text-sm font-medium list-none">
              <span>{t('mock.q', { n: i + 1 })} {turn.question}</span>
              {turn.evaluation && <span className="text-xs font-bold text-indigo-500 shrink-0">{turn.evaluation.overall}/10</span>}
            </summary>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 whitespace-pre-wrap"><span className="font-semibold">{t('mock.you')}</span> {turn.answer}</p>
            <Feedback turn={turn} />
          </details>
        ))}
      </div>

      {/* Current question */}
      {session.status === 'active' && pending && (
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="uppercase tracking-wider font-bold">{t('mock.questionOf', { n: answeredCount + 1, total: session.totalQuestions })} · {pending.category}</span>
            <button onClick={() => { if (voiceOn) stopSpeaking(); setVoiceOn(v => !v); }} className="flex items-center gap-1 hover:text-indigo-500" title={t('mock.readAloud')}>
              {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}{voiceOn ? t('mock.voiceOn') : t('mock.voiceOff')}
            </button>
          </div>
          <p className="text-lg font-semibold">{pending.question}</p>
          <textarea className={`${inputCls} resize-none`} rows={6} value={answer} onChange={e => setAnswer(e.target.value)}
            placeholder={mic.supported ? t('mock.answerPlaceholderMic') : t('mock.answerPlaceholder')} aria-label={t('mock.answerPlaceholder')} />
          {mic.interim && <p className="text-xs italic text-gray-400">{mic.interim}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {mic.supported ? (
                <button onClick={mic.listening ? mic.stop : mic.start}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${mic.listening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15'}`}>
                  {mic.listening ? <><MicOff className="w-4 h-4" />{t('mock.stop')}</> : <><Mic className="w-4 h-4" />{t('mock.speak')}</>}
                </button>
              ) : <span>{t('mock.noVoice')}</span>}
              <span>{t('mock.wordCount', { words, fillers })}</span>
            </div>
            <button onClick={submit} disabled={busy || mic.listening || !answer.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" />{t('mock.scoring')}</> : <><Send className="w-4 h-4" />{t('mock.submit')}</>}
            </button>
          </div>
          {mic.error && <p className="text-xs text-red-500">{mic.error}</p>}
        </div>
      )}

      {errorBox}

      {session.status === 'active' && (
        <div className="flex justify-end">
          <button onClick={finish} disabled={busy || answeredCount === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-300 text-sm font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-500/10 disabled:opacity-50">
            {busy && !pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
            {pending ? t('mock.endEarly') : t('mock.getReport')}
          </button>
        </div>
      )}
    </div>
  );
}
