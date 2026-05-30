'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Plus, Eye, GitCompare, Clock, Tag, TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react';
import { useAnalysisStore } from '@/stores/analysisStore';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

interface ResumeVersion { id: string; versionNum: number; label: string | null; score: number | null; domain: string | null; createdAt: string; extractedText?: string }
interface Resume { id: string; originalName: string; createdAt: string; versions: ResumeVersion[] }

async function apiFetch<T>(path: string, token?: string | null): Promise<T> {
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? 'API error');
  return data;
}

async function apiPost<T>(path: string, body: unknown, token?: string | null): Promise<T> {
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message ?? 'API error');
  return data;
}

export default function VersionsPage() {
  const { token } = useAnalysisStore();
  const [resumes, setResumes]         = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [versions, setVersions]       = useState<ResumeVersion[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [newLabel, setNewLabel]       = useState('');
  const [creatingSnap, setCreatingSnap] = useState(false);
  const [compareIds, setCompareIds]   = useState<string[]>([]);
  const [compareResult, setCompareResult] = useState<ResumeVersion[]>([]);
  const [comparing, setComparing]     = useState(false);
  const [expandedVer, setExpandedVer] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    // Fetch user resumes from history
    apiFetch<{ success: boolean; data: { resume: Resume }[] }>('/analyses/history', token)
      .then(r => {
        const seen = new Set<string>();
        const uniqueResumes: Resume[] = [];
        r.data.forEach(a => {
          if (!seen.has(a.resume.id)) { seen.add(a.resume.id); uniqueResumes.push(a.resume); }
        });
        setResumes(uniqueResumes);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const loadVersions = async (resume: Resume) => {
    setSelectedResume(resume); setCompareIds([]); setCompareResult([]);
    try {
      const r = await apiFetch<{ success: boolean; data: ResumeVersion[] }>(`/versions/resume/${resume.id}`, token);
      setVersions(r.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load versions'); }
  };

  const createSnapshot = async () => {
    if (!selectedResume) return;
    setCreatingSnap(true); setError('');
    try {
      await apiPost(`/versions/resume/${selectedResume.id}/snapshot`, { label: newLabel || undefined }, token);
      setNewLabel('');
      const r = await apiFetch<{ success: boolean; data: ResumeVersion[] }>(`/versions/resume/${selectedResume.id}`, token);
      setVersions(r.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to create snapshot'); }
    finally { setCreatingSnap(false); }
  };

  const toggleCompare = (id: string) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  const runCompare = async () => {
    if (compareIds.length < 2) return;
    setComparing(true); setError('');
    try {
      const r = await apiFetch<{ success: boolean; data: ResumeVersion[] }>(`/versions/compare?ids=${compareIds.join(',')}`, token);
      setCompareResult(r.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Comparison failed'); }
    finally { setComparing(false); }
  };

  const ScoreDiff = ({ curr, prev }: { curr: number | null; prev: number | null }) => {
    if (!curr || !prev) return null;
    const diff = curr - prev;
    if (diff === 0) return <span className="text-xs text-gray-400 flex items-center gap-0.5"><Minus className="w-3 h-3" />0</span>;
    return diff > 0
      ? <span className="text-xs text-green-500 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />+{diff}</span>
      : <span className="text-xs text-red-500 flex items-center gap-0.5"><TrendingDown className="w-3 h-3" />{diff}</span>;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GitBranch className="w-6 h-6 text-violet-500" />Resume Versions
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">Track your resume evolution with Git-like version control</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Resume List */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Your Resumes</h2>
          {loading ? (
            <div className="flex items-center justify-center h-24"><div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : resumes.length === 0 ? (
            <div className="text-center py-8 text-gray-400 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl">
              <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No resumes found</p>
              <p className="text-xs mt-1">Upload a resume first</p>
            </div>
          ) : (
            resumes.map(r => (
              <button key={r.id} onClick={() => loadVersions(r)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedResume?.id === r.id
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10'
                    : 'border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 hover:border-violet-300 dark:hover:border-violet-500/30'
                }`}>
                <p className="text-sm font-semibold truncate">{r.originalName}</p>
                <p className="text-xs text-gray-400 mt-0.5">{new Date(r.createdAt).toLocaleDateString()}</p>
              </button>
            ))
          )}
        </div>

        {/* Version History */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedResume ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl">
              <GitBranch className="w-12 h-12 opacity-20 mb-3" />
              <p className="text-sm">Select a resume to view versions</p>
            </div>
          ) : (
            <>
              {/* Create Snapshot */}
              <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-4">
                <h3 className="text-sm font-semibold mb-3">Create Snapshot</h3>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                    <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                      placeholder="Label (e.g. After adding projects)"
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-violet-500 transition-all" />
                  </div>
                  <button onClick={createSnapshot} disabled={creatingSnap}
                    className="flex items-center gap-1.5 px-4 py-2 bg-violet-500 text-white rounded-xl text-sm font-semibold hover:bg-violet-600 disabled:opacity-50 transition-colors">
                    <Plus className="w-3.5 h-3.5" />{creatingSnap ? 'Saving...' : 'Snapshot'}
                  </button>
                </div>
              </div>

              {/* Compare Bar */}
              {versions.length >= 2 && (
                <div className="flex items-center gap-3 p-3 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-xl">
                  <GitCompare className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                  <p className="text-xs text-violet-700 dark:text-violet-300 flex-1">
                    {compareIds.length === 0 ? 'Select 2-3 versions to compare' : `${compareIds.length} selected`}
                  </p>
                  <button onClick={runCompare} disabled={compareIds.length < 2 || comparing}
                    className="px-3 py-1.5 bg-violet-500 text-white rounded-lg text-xs font-semibold hover:bg-violet-600 disabled:opacity-40 transition-colors">
                    {comparing ? 'Comparing...' : 'Compare'}
                  </button>
                </div>
              )}

              {error && <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400">{error}</div>}

              {/* Compare Result */}
              <AnimatePresence>
                {compareResult.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-5">
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                      <GitCompare className="w-4 h-4 text-violet-500" />Version Comparison
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-white/10">
                            <th className="text-left py-2 pr-4 text-xs font-bold uppercase tracking-wider text-gray-400">Version</th>
                            <th className="text-left py-2 pr-4 text-xs font-bold uppercase tracking-wider text-gray-400">Label</th>
                            <th className="text-left py-2 pr-4 text-xs font-bold uppercase tracking-wider text-gray-400">Score</th>
                            <th className="text-left py-2 text-xs font-bold uppercase tracking-wider text-gray-400">Domain</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                          {compareResult.map(v => (
                            <tr key={v.id}>
                              <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">v{v.versionNum}</td>
                              <td className="py-2.5 pr-4 text-sm">{v.label ?? '—'}</td>
                              <td className="py-2.5 pr-4">
                                {v.score != null ? (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${v.score >= 70 ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300' : v.score >= 50 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'}`}>
                                    {v.score}%
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="py-2.5 text-xs text-gray-500">{v.domain ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Version Timeline */}
              {versions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No versions yet — create a snapshot to start tracking</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Version Timeline ({versions.length})</h3>
                  {versions.map((v, i) => (
                    <motion.div key={v.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className={`border rounded-xl overflow-hidden transition-all ${
                        compareIds.includes(v.id) ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10' : 'border-gray-100 dark:border-white/10 bg-white dark:bg-white/5'
                      }`}>
                      <div className="flex items-center gap-3 p-3">
                        <input type="checkbox" checked={compareIds.includes(v.id)} onChange={() => toggleCompare(v.id)}
                          className="w-4 h-4 rounded accent-violet-500 cursor-pointer" />
                        <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center shrink-0">
                          <span className="text-xs font-black text-violet-600 dark:text-violet-400">v{v.versionNum}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{v.label ?? `Version ${v.versionNum}`}</p>
                            {i > 0 && <ScoreDiff curr={v.score} prev={versions[i - 1].score} />}
                          </div>
                          <p className="text-xs text-gray-400">{new Date(v.createdAt).toLocaleDateString()} · {v.domain ?? 'No domain'}</p>
                        </div>
                        {v.score != null && (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${v.score >= 70 ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300' : v.score >= 50 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'}`}>
                            {v.score}%
                          </span>
                        )}
                        {v.extractedText && (
                          <button onClick={() => setExpandedVer(expandedVer === v.id ? null : v.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
                            {expandedVer === v.id ? <Eye className="w-4 h-4 text-violet-500" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                      <AnimatePresence>
                        {expandedVer === v.id && v.extractedText && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="border-t border-gray-100 dark:border-white/10 p-3">
                            <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
                              {v.extractedText.slice(0, 1000)}{v.extractedText.length > 1000 ? '...' : ''}
                            </pre>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
