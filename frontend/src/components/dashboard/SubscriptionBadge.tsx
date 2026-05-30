'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Zap, Building2, ChevronRight, X } from 'lucide-react';
import { useAnalysisStore } from '@/stores/analysisStore';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

interface TierData {
  tier: 'free' | 'pro' | 'enterprise';
  limits: { analysesPerMonth: number; coverLettersPerMonth: number; interviewsPerMonth: number };
  usage: { analyses: number; coverLetters: number; interviews: number };
  remaining: { analyses: number; coverLetters: number; interviews: number };
}

const TIER_CONFIG = {
  free:       { label: 'Free',       Icon: Zap,       color: 'from-gray-400 to-gray-500',    badge: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' },
  pro:        { label: 'Pro',        Icon: Crown,      color: 'from-indigo-500 to-violet-600', badge: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' },
  enterprise: { label: 'Enterprise', Icon: Building2,  color: 'from-amber-500 to-orange-500',  badge: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' },
};

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit === Infinity ? 0 : Math.min(100, (used / limit) * 100);
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-indigo-500';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className="font-medium">{used} / {limit === Infinity ? '∞' : limit}</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full">
        <motion.div animate={{ width: `${pct}%` }} className={`h-full rounded-full ${color}`} />
      </div>
    </div>
  );
}

export default function SubscriptionBadge() {
  const { token } = useAnalysisStore();
  const [tierData, setTierData] = useState<TierData | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${BASE_URL}/api/v1/subscription/tier`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setTierData(d.data))
      .catch(() => {});
  }, [token]);

  if (!tierData) return null;

  const cfg = TIER_CONFIG[tierData.tier];
  const Icon = cfg.Icon;

  return (
    <>
      {/* Badge */}
      <button onClick={() => setShowUpgrade(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.badge} transition-all hover:opacity-80`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
        {tierData.tier === 'free' && <ChevronRight className="w-3 h-3 opacity-60" />}
      </button>

      {/* Upgrade Modal */}
      <AnimatePresence>
        {showUpgrade && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowUpgrade(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/10 rounded-2xl w-full max-w-md p-6">

              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold">Your Plan</h2>
                <button onClick={() => setShowUpgrade(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Current tier header */}
              <div className={`bg-gradient-to-r ${cfg.color} rounded-xl p-4 text-white mb-5`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-5 h-5" />
                  <span className="font-bold text-lg">{cfg.label} Plan</span>
                </div>
                <p className="text-white/80 text-sm">Your current plan</p>
              </div>

              {/* Usage */}
              <div className="space-y-3 mb-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">This Month's Usage</h3>
                <UsageBar label="Analyses" used={tierData.usage.analyses} limit={tierData.limits.analysesPerMonth} />
                <UsageBar label="Cover Letters" used={tierData.usage.coverLetters} limit={tierData.limits.coverLettersPerMonth} />
                <UsageBar label="Interview Sessions" used={tierData.usage.interviews} limit={tierData.limits.interviewsPerMonth} />
              </div>

              {/* Upgrade CTA for free users */}
              {tierData.tier === 'free' && (
                <div className="border border-indigo-200 dark:border-indigo-500/30 rounded-xl p-4 bg-indigo-50 dark:bg-indigo-500/10">
                  <h3 className="font-bold text-sm text-indigo-700 dark:text-indigo-300 mb-2">
                    🚀 Upgrade to Pro
                  </h3>
                  <ul className="space-y-1.5 text-xs text-indigo-600 dark:text-indigo-400 mb-3">
                    <li>✓ 50 analyses per month</li>
                    <li>✓ 20 cover letters & interviews</li>
                    <li>✓ 10 JDs per batch analysis</li>
                    <li>✓ Priority queue processing</li>
                    <li>✓ Advanced analytics & insights</li>
                  </ul>
                  <button className="w-full py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
                    Upgrade to Pro — $9/mo
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
