'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, Target, Award, BarChart2, AlertTriangle, FileText, MessageSquare, Layers, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAnalysisStore } from '@/stores/analysisStore';
import { api } from '@/lib/api';
import type { AnalyticsData, Analysis } from '@/lib/api';
import ScoreTrendChart from '@/components/dashboard/ScoreTrendChart';
import AnalysisHistory from '@/components/dashboard/AnalysisHistory';

const QUICK_ACTIONS = [
  { href: '/dashboard/cover-letter', label: 'Cover Letter', desc: 'AI-powered', Icon: FileText, color: 'from-purple-500 to-pink-500' },
  { href: '/dashboard/interview',    label: 'Interview Prep', desc: 'Q&A Generator', Icon: MessageSquare, color: 'from-blue-500 to-indigo-500' },
  { href: '/dashboard/batch',        label: 'Batch Analyze', desc: 'Multi-JD', Icon: Layers, color: 'from-green-500 to-emerald-500' },
  { href: '/dashboard/company-ats',  label: 'Company ATS', desc: 'Targeted', Icon: Building2, color: 'from-amber-500 to-orange-500' },
];

export default function DashboardPage() {
  const { token } = useAnalysisStore();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [history, setHistory]     = useState<Analysis[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    Promise.all([
      api.getUserAnalytics(token).catch(() => null),
      api.getUserHistory(token).catch(() => ({ success: true, data: [] as Analysis[] })),
    ]).then(([analyticsRes, historyRes]) => {
      setAnalytics(analyticsRes?.data ?? null);
      setHistory(historyRes?.data ?? []);
    }).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, [token, router]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-gray-400 mt-0.5">Track your ATS score progress and resume performance.</p>
      </motion.div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error} — Make sure the backend is running.
        </div>
      )}

      {/* Stats Grid */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Analyses', value: analytics.totalAnalyses, Icon: BarChart2, color: 'from-indigo-500 to-violet-600' },
            { label: 'Avg Score',  value: `${analytics.avgScore}%`, Icon: Target, color: 'from-blue-500 to-indigo-600' },
            { label: 'Improvement', value: `${analytics.scoreImprovement > 0 ? '+' : ''}${analytics.scoreImprovement}pts`, Icon: TrendingUp, color: analytics.scoreImprovement >= 0 ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600' },
            { label: 'Best Score', value: `${analytics.bestScore.score}%`, Icon: Award, color: 'from-amber-500 to-orange-500' },
          ].map(({ label, value, Icon, color }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-gray-400 mt-1">{label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ href, label, desc, Icon, color }, i) => (
            <motion.a key={href} href={href} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex flex-col gap-2 p-4 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:shadow-lg transition-all group cursor-pointer">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                <Icon className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </motion.a>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-6">
          <h2 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-4">Score Over Time</h2>
          <ScoreTrendChart data={analytics?.scoreOverTime ?? []} />
        </div>

        {analytics && analytics.topMissingKeywords.length > 0 && (
          <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-6">
            <h2 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-4">Top Missing Keywords</h2>
            <div className="space-y-2">
              {analytics.topMissingKeywords.slice(0, 8).map((kw, i) => (
                <div key={String(kw)} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-300 w-5">{i + 1}</span>
                  <span className="px-2.5 py-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-full text-xs font-medium">
                    {typeof kw === 'string' ? kw : (kw as { keyword: string }).keyword}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">Keywords common in JDs but missing from your resumes.</p>
          </div>
        )}
      </div>

      {/* History */}
      <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-6">
        <h2 className="font-bold text-xs uppercase tracking-wider text-gray-400 mb-4">Analysis History</h2>
        <AnalysisHistory analyses={history} onSelect={(id) => router.push(`/dashboard/analysis/${id}`)} />
      </div>
    </div>
  );
}
