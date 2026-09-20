'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Briefcase, Loader2, Plus, Trash2, Mail, Copy, Check, X, CalendarClock, ExternalLink } from 'lucide-react';
import { useAnalysisStore } from '@/stores/analysisStore';
import { api } from '@/lib/api';
import type { ApplicationStats, ApplicationStatus, FollowUpType, JobApplication } from '@/lib/api';

const STATUSES: Array<{ value: ApplicationStatus; label: string; color: string }> = [
  { value: 'wishlist',  label: 'Wishlist',  color: 'bg-gray-400' },
  { value: 'applied',   label: 'Applied',   color: 'bg-blue-500' },
  { value: 'screening', label: 'Screening', color: 'bg-cyan-500' },
  { value: 'interview', label: 'Interview', color: 'bg-violet-500' },
  { value: 'offer',     label: 'Offer',     color: 'bg-green-500' },
  { value: 'accepted',  label: 'Accepted',  color: 'bg-emerald-600' },
  { value: 'rejected',  label: 'Rejected',  color: 'bg-red-400' },
];
const FOLLOW_UPS: Array<{ value: FollowUpType; label: string }> = [
  { value: 'thank-you',   label: 'Thank-you after interview' },
  { value: 'follow-up',   label: 'Follow-up (no reply yet)' },
  { value: 'negotiation', label: 'Negotiate an offer' },
  { value: 'decline',     label: 'Decline an offer' },
];

const inputCls = 'w-full px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4 rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function FollowUpModal({ app, token, onClose }: { app: JobApplication; token: string; onClose: () => void }) {
  const [type, setType] = useState<FollowUpType>('thank-you');
  const [interviewer, setInterviewer] = useState('');
  const [context, setContext] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState<{ subject: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const draft = async () => {
    setBusy(true); setError('');
    try {
      const r = await api.draftFollowUp(app.id, {
        type, interviewerName: interviewer || undefined, context: context || undefined,
      }, token);
      setEmail(r.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Drafting failed'); }
    finally { setBusy(false); }
  };

  const copy = async () => {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl p-5 space-y-3 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Draft email · {app.company}</h2>
          <button onClick={onClose} aria-label="Close"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <select className={inputCls} value={type} onChange={e => setType(e.target.value as FollowUpType)}>
          {FOLLOW_UPS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <input className={inputCls} value={interviewer} onChange={e => setInterviewer(e.target.value)} placeholder="Interviewer's name (optional)" />
        <textarea rows={3} className={`${inputCls} resize-none`} value={context} onChange={e => setContext(e.target.value)}
          placeholder="Something specific to mention, e.g. we discussed migrating their API to GraphQL" />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button onClick={draft} disabled={busy} className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}Draft email
        </button>
        {email && (
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-2">
            <div className="flex justify-between items-start gap-2">
              <p className="text-sm font-semibold">{email.subject}</p>
              <button onClick={copy} className="text-indigo-500 shrink-0" aria-label="Copy email">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button>
            </div>
            <p className="text-sm whitespace-pre-wrap">{email.body}</p>
            <p className="text-xs text-gray-400">Review before sending and replace any [brackets].</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  const { token } = useAnalysisStore();
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [emailFor, setEmailFor] = useState<JobApplication | null>(null);

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>('applied');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [a, s] = await Promise.all([api.listApplications(token), api.getApplicationStats(token)]);
      setApps(a.data); setStats(s.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const guard = async (fn: () => Promise<void>) => {
    setError('');
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); }
  };

  const add = () => guard(async () => {
    if (!token) return;
    setAdding(true);
    try {
      await api.createApplication({ company: company.trim(), role: role.trim(), jobUrl: jobUrl.trim() || undefined, status }, token);
      setCompany(''); setRole(''); setJobUrl('');
      await load();
    } finally { setAdding(false); }
  });

  const move = (id: string, next: ApplicationStatus) => guard(async () => {
    if (!token) return;
    await api.updateApplication(id, { status: next }, token);
    await load();
  });

  const setNextStep = (id: string, date: string) => guard(async () => {
    if (!token || !date) return;
    await api.updateApplication(id, { nextStepAt: new Date(date).toISOString() }, token);
    await load();
  });

  const remove = (id: string) => guard(async () => {
    if (!token || !window.confirm('Delete this application?')) return;
    await api.deleteApplication(id, token);
    await load();
  });

  const columns = useMemo(
    () => STATUSES.map(s => ({ ...s, items: apps.filter(a => a.status === s.value) })),
    [apps],
  );

  return (
    <div className="max-w-full mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="w-6 h-6 text-indigo-500" />Application Tracker</h1>
        <p className="text-sm text-gray-400 mt-0.5">Track every application, see what converts, and draft follow-ups in seconds.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Applied" value={stats.applied} />
          <Stat label="Response rate" value={`${stats.responseRate}%`} />
          <Stat label="Interview rate" value={`${stats.interviewRate}%`} />
          <Stat label="Offer rate" value={`${stats.offerRate}%`} />
          <Stat label="Offers" value={stats.counts.offer + stats.counts.accepted} />
        </div>
      )}

      {stats && stats.upcoming.length > 0 && (
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" />Coming up</p>
          {stats.upcoming.map(u => (
            <p key={u.id} className="text-sm">{new Date(u.nextStepAt).toLocaleDateString()} — <span className="font-medium">{u.company}</span> · {u.role} <span className="text-gray-400">({u.status})</span></p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <input className={`${inputCls} !w-44`} value={company} onChange={e => setCompany(e.target.value)} placeholder="Company" />
        <input className={`${inputCls} !w-44`} value={role} onChange={e => setRole(e.target.value)} placeholder="Role" />
        <input className={`${inputCls} !w-56`} value={jobUrl} onChange={e => setJobUrl(e.target.value)} placeholder="Job link (https://…)" />
        <select className={`${inputCls} !w-36`} value={status} onChange={e => setStatus(e.target.value as ApplicationStatus)}>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={add} disabled={adding || !company.trim() || !role.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Add
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {columns.map(col => (
            <div key={col.value} className="w-64 shrink-0 space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className={`w-2 h-2 rounded-full ${col.color}`} />
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{col.label}</p>
                <span className="text-xs text-gray-400">{col.items.length}</span>
              </div>
              {col.items.map(a => (
                <div key={a.id} className="p-3 rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{a.company}</p>
                      <p className="text-xs text-gray-500 truncate">{a.role}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {a.jobUrl && <a href={a.jobUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-500" aria-label="Open job link"><ExternalLink className="w-3.5 h-3.5" /></a>}
                      <button onClick={() => remove(a.id)} className="text-gray-400 hover:text-red-500" aria-label="Delete application"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <select className={`${inputCls} !py-1 !text-xs`} value={a.status} onChange={e => move(a.id, e.target.value as ApplicationStatus)} aria-label="Status">
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <input type="date" className={`${inputCls} !py-1 !text-xs`} aria-label="Next step date"
                    value={a.nextStepAt ? a.nextStepAt.slice(0, 10) : ''} onChange={e => setNextStep(a.id, e.target.value)} />
                  <button onClick={() => setEmailFor(a)} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20">
                    <Mail className="w-3.5 h-3.5" />Draft email
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {emailFor && token && <FollowUpModal app={emailFor} token={token} onClose={() => setEmailFor(null)} />}
    </div>
  );
}
