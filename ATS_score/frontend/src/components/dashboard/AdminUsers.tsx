'use client';

import { useCallback, useEffect, useState } from 'react';
import { Users, Search, ChevronLeft, ChevronRight, Loader2, Check } from 'lucide-react';
import { api } from '@/lib/api';
import type { AdminUser, PlanTier } from '@/lib/api';

const PLANS: Array<{ value: PlanTier; label: string }> = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
];

/** Admin list of users with a plan picker. Plans change only here while there are no online payments. */
export default function AdminUsers({ token }: { token: string }) {
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [query, setQuery]     = useState('');
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState<string | null>(null);
  const [saved, setSaved]     = useState<string | null>(null);
  const limit = 20;

  const load = useCallback(() => {
    setLoading(true);
    api.getAdminUsers(token, page, search)
      .then(r => { setUsers(r.data.users); setTotal(r.data.total); setError(''); })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load users'))
      .finally(() => setLoading(false));
  }, [token, page, search]);

  useEffect(() => { load(); }, [load]);

  // Search after the admin stops typing, starting again from page 1.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(query); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const changeTier = async (user: AdminUser, tier: PlanTier) => {
    if (tier === user.tier) return;
    setSaving(user.id); setError('');
    try {
      const res = await api.setUserTier(user.id, tier, token);
      setUsers(list => list.map(u => (u.id === user.id ? { ...u, tier: res.data.tier } : u)));
      setSaved(user.id);
      setTimeout(() => setSaved(s => (s === user.id ? null : s)), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change the plan');
    } finally {
      setSaving(null);
    }
  };

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Users className="w-4 h-4" />Users ({total})
          </h2>
          <p className="text-xs text-gray-400 mt-1">Change a plan here after the user has paid you. The user gets a notification.</p>
        </div>
        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search email or name"
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-amber-500" />
        </div>
      </div>

      {error && <p className="px-6 py-2 text-xs text-red-500 bg-red-50 dark:bg-red-500/10">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-100 dark:border-white/10">
              <th className="px-6 py-2 font-semibold">User</th>
              <th className="px-3 py-2 font-semibold hidden md:table-cell">Joined</th>
              <th className="px-3 py-2 font-semibold hidden sm:table-cell">Analyses</th>
              <th className="px-6 py-2 font-semibold">Plan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/10">
            {loading && users.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400 text-sm">No users found.</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                <td className="px-6 py-3 min-w-0">
                  <p className="font-medium truncate max-w-[16rem]">{u.email}</p>
                  <p className="text-xs text-gray-400 truncate max-w-[16rem]">
                    {u.name || '—'}{u.role === 'admin' && <span className="ml-1.5 text-amber-500 font-semibold">admin</span>}
                  </p>
                </td>
                <td className="px-3 py-3 text-xs text-gray-400 hidden md:table-cell">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}
                </td>
                <td className="px-3 py-3 text-xs text-gray-400 hidden sm:table-cell">{u._count?.analyses ?? 0}</td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <select value={u.tier} disabled={saving === u.id}
                      onChange={e => changeTier(u, e.target.value as PlanTier)}
                      aria-label={`Plan for ${u.email}`}
                      className="px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-semibold outline-none focus:border-amber-500 disabled:opacity-50">
                      {PLANS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    {saving === u.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                    {saved === u.id && <Check className="w-3.5 h-3.5 text-green-500" />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="px-6 py-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-xs text-gray-400">
          <span>Page {page} of {pages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading} aria-label="Previous page"
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages || loading} aria-label="Next page"
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
