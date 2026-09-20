'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Loader2, Sparkles, Trash2, Copy, Check, AlertTriangle, DollarSign, CalendarCheck } from 'lucide-react';
import { useAnalysisStore } from '@/stores/analysisStore';
import { api } from '@/lib/api';
import type { BattleCard } from '@/lib/api';

const inputCls = 'w-full px-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all';
const labelCls = 'text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="p-5 rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-500">{title}</h3>
      {children}
    </section>
  );
}

const List = ({ items }: { items: string[] }) => (
  <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc pl-5 space-y-1">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
);

function Script({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { /* clipboard unavailable */ }
  };
  return (
    <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">{label}</p>
        <button onClick={copy} className="text-indigo-500 hover:text-indigo-700" aria-label={`Copy ${label}`}>{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button>
      </div>
      <p className="text-sm whitespace-pre-wrap">{text}</p>
    </div>
  );
}

export default function BattleCardPage() {
  const { token } = useAnalysisStore();
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [years, setYears] = useState('');
  const [location, setLocation] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [card, setCard] = useState<BattleCard | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; company: string; role: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadHistory = useCallback(() => {
    if (!token) return;
    api.listBattleCards(token).then(r => setHistory(r.data)).catch(() => {});
  }, [token]);
  useEffect(loadHistory, [loadHistory]);

  const generate = async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const r = await api.generateBattleCard({
        company: company.trim(), role: role.trim(),
        jobDescription: jobDesc || undefined, resumeText: resumeText || undefined,
        experienceYears: years ? Number(years) : undefined, location: location || undefined,
      }, token);
      setCard(r.data); loadHistory();
    } catch (e) { setError(e instanceof Error ? e.message : 'Generation failed'); }
    finally { setLoading(false); }
  };

  const openCard = async (id: string) => {
    if (!token) return;
    setError('');
    try { setCard((await api.getBattleCard(id, token)).data); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to open'); }
  };

  const remove = async (id: string) => {
    if (!token || !window.confirm('Delete this battle card?')) return;
    try {
      await api.deleteBattleCard(id, token);
      setHistory(h => h.filter(x => x.id !== id));
      if (card?.id === id) setCard(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Delete failed'); }
  };

  const c = card?.content;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="w-6 h-6 text-indigo-500" />Company Battle Card</h1>
        <p className="text-sm text-gray-400 mt-0.5">One-page prep for a specific interview, including salary negotiation scripts.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Company *</label><input className={inputCls} value={company} onChange={e => setCompany(e.target.value)} /></div>
            <div><label className={labelCls}>Role *</label><input className={inputCls} value={role} onChange={e => setRole(e.target.value)} /></div>
            <div><label className={labelCls}>Years of experience</label><input type="number" min={0} max={50} className={inputCls} value={years} onChange={e => setYears(e.target.value)} /></div>
            <div><label className={labelCls}>Location</label><input className={inputCls} value={location} onChange={e => setLocation(e.target.value)} placeholder="Chennai, remote..." /></div>
          </div>
          <div><label className={labelCls}>Job description</label><textarea rows={4} className={`${inputCls} resize-none`} value={jobDesc} onChange={e => setJobDesc(e.target.value)} placeholder="Optional" /></div>
          <div><label className={labelCls}>Resume text</label><textarea rows={4} className={`${inputCls} resize-none`} value={resumeText} onChange={e => setResumeText(e.target.value)} placeholder="Optional. Personalises your talking points" /></div>
          {error && <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400">{error}</div>}
          <button onClick={generate} disabled={loading || !company.trim() || !role.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-50">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Building card...</> : <><Sparkles className="w-4 h-4" />Generate battle card</>}
          </button>

          {history.length > 0 && (
            <div>
              <p className={labelCls}>Saved cards</p>
              <div className="space-y-1.5">
                {history.map(h => (
                  <div key={h.id} className="flex items-center gap-2">
                    <button onClick={() => openCard(h.id)} className="flex-1 min-w-0 text-left px-3 py-2 rounded-xl border border-gray-100 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5">
                      <p className="text-sm font-medium truncate">{h.company} · {h.role}</p>
                      <p className="text-xs text-gray-400">{new Date(h.createdAt).toLocaleDateString()}</p>
                    </button>
                    <button onClick={() => remove(h.id)} className="p-2 text-gray-400 hover:text-red-500" aria-label="Delete card"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 space-y-4">
          {!c ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Target className="w-12 h-12 opacity-20 mb-3" /><p className="text-sm">Your battle card will appear here</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0" /><span>{c.disclaimer || 'AI-generated without live data. Verify company facts and pay figures yourself.'}</span>
              </div>

              <Section title={`${card.company} · ${card.role}`}><p className="text-sm text-gray-600 dark:text-gray-300">{c.companySnapshot}</p></Section>

              <Section title="Likely interview rounds">
                <div className="space-y-3">{c.likelyRounds.map((r, i) => (
                  <div key={i}>
                    <p className="text-sm font-semibold">{i + 1}. {r.name} <span className="font-normal text-gray-400">· {r.format}</span></p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Tests: {r.whatTheyTest}</p>
                    <List items={r.prepTips} />
                  </div>
                ))}</div>
              </Section>

              <Section title="Questions to prepare for">
                <div className="space-y-2">{c.topQuestions.map((q, i) => (
                  <div key={i}><p className="text-sm font-medium">{q.question}</p><p className="text-xs text-gray-500 dark:text-gray-400">{q.angle}</p></div>
                ))}</div>
              </Section>

              <div className="grid sm:grid-cols-2 gap-4">
                <Section title="Ask them"><List items={c.questionsToAsk} /></Section>
                <Section title="Probe gently"><List items={c.redFlagsToProbe} /></Section>
              </div>

              <Section title="Your talking points"><List items={c.talkingPoints} /></Section>

              <Section title="Salary negotiation">
                <div className="flex items-center gap-1.5 text-xs text-gray-400"><DollarSign className="w-3.5 h-3.5" />Fill the [placeholders] with numbers from your own market research.</div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Research</p>
                <List items={c.salaryNegotiation.researchSteps} />
                <Script label="When asked your expectation" text={c.salaryNegotiation.anchoringScript} />
                <Script label="Responding to the first offer" text={c.salaryNegotiation.counterOfferScript} />
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Beyond base salary</p>
                <List items={c.salaryNegotiation.beyondBaseSalary} />
                <p className="text-xs font-bold uppercase tracking-wider text-red-400">Avoid saying</p>
                <List items={c.salaryNegotiation.avoid} />
              </Section>

              <Section title="Your first 90 days">
                <div className="space-y-2">{c.first90Days.map((p, i) => (
                  <div key={i}><p className="text-sm font-semibold flex items-center gap-1.5"><CalendarCheck className="w-3.5 h-3.5 text-indigo-500" />{p.phase}</p><List items={p.goals} /></div>
                ))}</div>
              </Section>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
