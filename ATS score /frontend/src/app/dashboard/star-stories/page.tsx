'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Loader2, Sparkles, Search, Trash2, Pencil, Check, X, Lightbulb } from 'lucide-react';
import { useAnalysisStore } from '@/stores/analysisStore';
import { api } from '@/lib/api';
import type { StarStory, StarMatchResult } from '@/lib/api';

const inputCls = 'w-full px-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all';
const labelCls = 'text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block';

const PARTS = [
  ['situation', 'Situation'],
  ['task', 'Task'],
  ['action', 'Action'],
  ['result', 'Result'],
] as const;
type Part = (typeof PARTS)[number][0];

function StoryCard({
  story, onSave, onDelete,
}: {
  story: StarStory;
  onSave: (id: string, patch: Partial<Record<Part | 'title', string>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<Part | 'title', string>>({
    title: story.title, situation: story.situation, task: story.task, action: story.action, result: story.result,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try { await onSave(story.id, draft); setEditing(false); }
    catch { /* the page shows the error banner */ }
    finally { setSaving(false); }
  };

  return (
    <div className="border border-gray-100 dark:border-white/10 rounded-2xl bg-white dark:bg-white/5 overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <button onClick={() => setOpen(o => !o)} className="text-left flex-1 min-w-0">
          <p className="font-semibold text-sm">{story.title}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {story.competencies.map(c => (
              <span key={c} className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 text-[11px] font-medium">{c}</span>
            ))}
          </div>
        </button>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => { setOpen(true); setEditing(e => !e); }} className="p-1.5 text-gray-400 hover:text-indigo-500" aria-label="Edit story"><Pencil className="w-4 h-4" /></button>
          <button onClick={() => onDelete(story.id)} className="p-1.5 text-gray-400 hover:text-red-500" aria-label="Delete story"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-100 dark:border-white/10">
          {editing && (
            <input className={inputCls} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
          )}
          {PARTS.map(([key, label]) => (
            <div key={key}>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
              {editing ? (
                <textarea rows={3} className={`${inputCls} resize-none`} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} />
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{story[key]}</p>
              )}
            </div>
          ))}
          {editing && (
            <div className="flex gap-2">
              <button onClick={save} disabled={saving || !draft.title.trim()} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}Save
              </button>
              <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"><X className="w-3.5 h-3.5" />Cancel</button>
            </div>
          )}
          {!editing && story.metrics.length > 0 && (
            <p className="text-xs text-green-600 dark:text-green-400">📊 {story.metrics.join(' · ')}</p>
          )}
          {!editing && story.followUps.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Expect these follow-ups</p>
              <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc pl-5">{story.followUps.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default function StarStoriesPage() {
  const { token } = useAnalysisStore();
  const [stories, setStories] = useState<StarStory[]>([]);
  const [resumeText, setResumeText] = useState('');
  const [count, setCount] = useState(6);
  const [question, setQuestion] = useState('');
  const [match, setMatch] = useState<StarMatchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try { setStories((await api.listStarStories(token)).data); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load stories'); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    if (!token) return;
    setGenerating(true); setError('');
    try {
      const r = await api.generateStarStories({ resumeText, count }, token);
      setStories(s => [...r.data, ...s]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Generation failed'); }
    finally { setGenerating(false); }
  };

  const findMatch = async () => {
    if (!token || !question.trim()) return;
    setMatching(true); setError(''); setMatch(null);
    try { setMatch((await api.matchStarStory(question.trim(), token)).data); }
    catch (e) { setError(e instanceof Error ? e.message : 'Matching failed'); }
    finally { setMatching(false); }
  };

  const save = async (id: string, patch: Partial<Record<Part | 'title', string>>) => {
    if (!token) return;
    try {
      const r = await api.updateStarStory(id, patch, token);
      setStories(s => s.map(x => (x.id === id ? r.data : x)));
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); throw e; }
  };

  const remove = async (id: string) => {
    if (!token || !window.confirm('Delete this story?')) return;
    try { await api.deleteStarStory(id, token); setStories(s => s.filter(x => x.id !== id)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Delete failed'); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6 text-indigo-500" />STAR Story Bank</h1>
        <p className="text-sm text-gray-400 mt-0.5">Prepare your best stories once, then reuse them for any behavioral question.</p>
      </div>

      {error && <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400">{error}</div>}

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <label className={labelCls}>Build stories from your resume</label>
            <textarea rows={6} className={`${inputCls} resize-none`} value={resumeText} onChange={e => setResumeText(e.target.value)} placeholder="Paste your resume..." />
            <div className="flex gap-2">
              <select className={`${inputCls} !w-28`} value={count} onChange={e => setCount(Number(e.target.value))}>
                {[4, 6, 8, 10].map(n => <option key={n} value={n}>{n} stories</option>)}
              </select>
              <button onClick={generate} disabled={generating || !resumeText.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">
                {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Writing...</> : <><Sparkles className="w-4 h-4" />Generate</>}
              </button>
            </div>
            <p className="text-xs text-gray-400">Stories only use facts from your resume. Anything in [brackets] is a number you should fill in yourself.</p>
          </div>

          <div className="space-y-3">
            <label className={labelCls}>Which story should I tell?</label>
            <textarea rows={2} className={`${inputCls} resize-none`} value={question} onChange={e => setQuestion(e.target.value)} placeholder="e.g. Tell me about a time you disagreed with your manager" />
            <button onClick={findMatch} disabled={matching || !question.trim() || stories.length === 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-indigo-300 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-300 rounded-xl font-semibold text-sm hover:bg-indigo-50 dark:hover:bg-indigo-500/10 disabled:opacity-50">
              {matching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}Find best story
            </button>
            {match && (
              <div className="space-y-3">
                {match.matches.map(m => (
                  <div key={m.story.id} className="p-3 rounded-xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/60 dark:bg-indigo-500/10 space-y-1.5">
                    <div className="flex justify-between gap-2"><p className="text-sm font-semibold">{m.story.title}</p><span className="text-xs font-bold text-indigo-500">{m.fitScore}%</span></div>
                    <p className="text-xs text-gray-600 dark:text-gray-300">{m.whyItFits}</p>
                    <p className="text-xs"><span className="font-semibold">Angle it:</span> {m.howToAdapt}</p>
                    <p className="text-xs italic">“{m.openingLine}”</p>
                  </div>
                ))}
                {match.gap && (
                  <p className="text-xs flex gap-1.5 text-amber-600 dark:text-amber-400"><Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />Missing story type: {match.gap}</p>
                )}
                {match.matches.length === 0 && !match.gap && <p className="text-xs text-gray-400">No strong match found.</p>}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-3">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
          ) : stories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <BookOpen className="w-12 h-12 opacity-20 mb-3" /><p className="text-sm">Your stories will appear here</p>
            </div>
          ) : stories.map(s => <StoryCard key={s.id} story={s} onSave={save} onDelete={remove} />)}
        </div>
      </div>
    </div>
  );
}
