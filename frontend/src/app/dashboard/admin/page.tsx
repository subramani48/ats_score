'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, BarChart2, FileText, MessageSquare, TrendingUp, Target, Calendar, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAnalysisStore } from '@/stores/analysisStore';
import { api } from '@/lib/api';
import type { AdminStats } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function AdminPage() {
  const { token } = useAnalysisStore();
  const router    = useRouter();
  const [stats, setStats]   = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    api.getAdminStats(token)
      .then(r => setStats(r.data))
      .catch(e => {
        if (e.message?.includes('403') || e.message?.includes('Forbidden') || e.message?.includes('Unauthorized')) {
          setError('You do not have admin access.');
        } else {
          setError(e.message ?? 'Failed to load stats');
        }
      })
      .finally(() => setLoading(false));
  }, [token, router]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="max-w-lg mx-auto mt-20 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-bold mb-2">Access Denied</h2>
      <p className="text-gray-400 text-sm">{error}</p>
    </div>
  );

  if (!stats) return null;

  const PLATFORM_STATS = [
    { label: 'Total Users',       value: stats.totalUsers,       Icon: Users,       color: 'from-blue-500 to-indigo-600' },
    { label: 'Total Analyses',    value: stats.totalAnalyses,    Icon: BarChart2,    color: 'from-indigo-500 to-violet-600' },
    { label: 'Cover Letters',     value: stats.totalCoverLetters, Icon: FileText,    color: 'from-purple-500 to-pink-500' },
    { label: 'Interview Sessions', value: stats.totalInterviews,  Icon: MessageSquare, color: 'from-green-500 to-emerald-600' },
    { label: 'Avg Platform Score', value: `${stats.avgScore}%`,   Icon: Target,      color: 'from-amber-500 to-orange-500' },
  ];

  const DOMAIN_COLORS = ['#6366f1','#8b5cf6','#ec4899','#06b6d4','#10b981','#f59e0b','#ef4444','#84cc16'];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-gray-400">Platform-wide analytics and statistics</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {PLATFORM_STATS.map(({ label, value, Icon, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-5">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-4.5 h-4.5 text-white" />
            </div>
            <p className="text-2xl font-black">{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Analyses Per Day Chart */}
        {stats.analysesPerDay.length > 0 && (
          <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />Analyses Per Day (Last 30 Days)
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.analysesPerDay.slice(-30)}>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: 'rgba(99,102,241,0.1)' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Domains */}
        {stats.topDomains.length > 0 && (
          <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />Top Domains
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.topDomains} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis dataKey="domain" type="category" tick={{ fontSize: 10 }} width={100} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: 'rgba(99,102,241,0.1)' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {stats.topDomains.map((_, i) => <Cell key={i} fill={DOMAIN_COLORS[i % DOMAIN_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent Analyses */}
      <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Recent Analyses (Platform-wide)</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-white/10">
          {stats.recentAnalyses.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                <BarChart2 className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.resume.originalName}</p>
                <p className="text-xs text-gray-400">{a.domain} · {a.mode}</p>
              </div>
              <div className="text-right shrink-0">
                {a.score != null && (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${a.score >= 70 ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300' : a.score >= 50 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'}`}>
                    {a.score}%
                  </span>
                )}
                <p className="text-xs text-gray-400 mt-0.5">{new Date(a.createdAt).toLocaleDateString()}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
