'use client';

import { motion } from 'framer-motion';
import { FileText, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import type { Analysis } from '@/lib/api';

interface Props {
  analyses: Analysis[];
  onSelect?: (id: string) => void;
}

const scoreBadge = (score: number) => {
  if (score >= 70) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20';
  if (score >= 50) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20';
  return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';
};

export default function AnalysisHistory({ analyses, onSelect }: Props) {
  if (!analyses.length) {
    return (
      <div className="text-center py-12 text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No analyses yet — upload your first resume to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {analyses.map((a, idx) => {
        const prev = analyses[idx + 1];
        const delta = a.score != null && prev?.score != null ? a.score - prev.score : null;

        return (
          <motion.button key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }} onClick={() => onSelect?.(a.id)}
            className="w-full text-left bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl p-4 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all duration-200 group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/20 dark:to-violet-500/20 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{a.resume?.originalName ?? 'Resume'}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {a.domain} · {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {a.score != null && (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${scoreBadge(a.score)}`}>
                    {a.score}%
                  </span>
                )}
                {a.mode === 'rewrite' && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20">
                    Rewrite
                  </span>
                )}
                {delta != null && delta !== 0 && (
                  <span className={`flex items-center gap-0.5 text-xs font-semibold ${delta > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {delta > 0 ? '+' : ''}{delta}
                  </span>
                )}
                {delta === 0 && <Minus className="w-3 h-3 text-gray-300" />}
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
