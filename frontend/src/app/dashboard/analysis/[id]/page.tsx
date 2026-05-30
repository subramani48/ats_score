'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CheckCircle2, XCircle, AlertTriangle, ChevronLeft, Download,
  Share2, TrendingUp, Target, Zap, Eye, MessageSquare, BarChart2,
  Send, Bot, User as UserIcon, Network,
} from 'lucide-react';
import dynamic from 'next/dynamic';
const SkillGraph = dynamic(() => import('@/components/dashboard/SkillGraph'), { ssr: false, loading: () => <div className="h-96 flex items-center justify-center text-gray-400 text-sm">Loading graph...</div> });
import { useAnalysisStore } from '@/stores/analysisStore';
import { api } from '@/lib/api';
import type { Analysis, KeywordGapResult } from '@/lib/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

interface ChatMsg { role: 'user' | 'ai'; text: string }

export default function AnalysisDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const { token } = useAnalysisStore();
  const router    = useRouter();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<'overview' | 'keywords' | 'graph' | 'chat'>('overview');
  const [chat, setChat]         = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [benchmark, setBenchmark] = useState<{ percentile: number | null; message: string } | null>(null);
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    api.getAnalysis(id, token)
      .then(res => {
        setAnalysis(res.data);
        if (res.data.score && res.data.domain) {
          api.getPeerBenchmark(res.data.domain, res.data.score).then(b => setBenchmark(b.data)).catch(() => {});
        }
      })
      .catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false));
  }, [id, token, router]);

  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || chatLoading || !id) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/analyses/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg }),
      });
      if (!res.ok) throw new Error('Chat failed');
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let aiText = '';
      setChat(prev => [...prev, { role: 'ai', text: '' }]);
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        aiText += decoder.decode(value, { stream: true });
        setChat(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, text: aiText } : m));
      }
    } catch {
      setChat(prev => [...prev, { role: 'ai', text: 'Sorry, I could not process that. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, id, token]);

  const exportTxt = async () => {
    if (!analysis) return;
    if (analysis.mode === 'analyze') {
      // Export as styled PDF
      const { exportAnalysisPdf } = await import('@/lib/exportPdf');
      await exportAnalysisPdf({
        id,
        domain: analysis.domain,
        score: analysis.score,
        breakdown: analysis.breakdown as Record<string, number> | null,
        keywordsMatched: analysis.keywordsMatched,
        keywordsMissed: analysis.keywordsMissed,
        suggestions: analysis.suggestions,
        warnings: analysis.warnings,
        resume: analysis.resume,
        createdAt: analysis.createdAt,
      });
    } else {
      // Rewrite mode — export as text
      const content = analysis.rewrittenText ?? '';
      const blob = new Blob([content], { type: 'text/plain' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `rewritten-resume-${id}.txt`; a.click();
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!analysis) return null;

  const kgap = analysis.keywordGap as KeywordGapResult | null;
  const score = analysis.score ?? 0;
  const scoreColor = score >= 70 ? 'text-green-500' : score >= 50 ? 'text-amber-500' : 'text-red-500';
  const scoreBg   = score >= 70 ? 'from-green-500 to-emerald-600' : score >= 50 ? 'from-amber-500 to-orange-500' : 'from-red-500 to-rose-600';

  const TABS = [
    { key: 'overview',  label: 'Overview',      Icon: BarChart2 },
    { key: 'keywords',  label: 'Keyword Gap',   Icon: Target },
    { key: 'graph',     label: 'Skill Graph',   Icon: Network },
    { key: 'chat',      label: 'AI Coach',      Icon: MessageSquare },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">{analysis.resume.originalName}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {analysis.domain} · {analysis.mode === 'rewrite' ? 'AI Rewrite' : 'ATS Analysis'} ·{' '}
              {new Date(analysis.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyLink}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
            <Share2 className="w-3.5 h-3.5" />{copied ? 'Copied!' : 'Share'}
          </button>
          <button onClick={exportTxt}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
            <Download className="w-3.5 h-3.5" />Export
          </button>
        </div>
      </div>

      {/* Score + Benchmark Card */}
      <div className="grid sm:grid-cols-3 gap-4">
        {/* Big Score */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className={`bg-gradient-to-br ${scoreBg} rounded-2xl p-6 text-white text-center`}>
          <p className="text-5xl font-black">{score}</p>
          <p className="text-white/80 text-sm mt-1">ATS Score / 100</p>
          {benchmark?.percentile != null && (
            <p className="mt-3 text-xs bg-white/20 rounded-full px-3 py-1 inline-block">
              Top {100 - benchmark.percentile}% in {analysis.domain}
            </p>
          )}
        </motion.div>

        {/* Breakdown */}
        {analysis.breakdown && (
          <div className="sm:col-span-2 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Score Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(analysis.breakdown).map(([k, v]) => {
                const label = k.replace(/([A-Z])/g, ' $1').replace('Score', '').trim();
                const pct   = Number(v);
                return (
                  <div key={k}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="capitalize text-gray-600 dark:text-gray-300">{label}</span>
                      <span className="font-bold">{pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.2, duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-xl w-fit">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-white dark:bg-white/10 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatedTab show={tab === 'overview'}>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Warnings */}
          {analysis.warnings.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-5">
              <h3 className="font-bold text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" />Warnings ({analysis.warnings.length})
              </h3>
              <ul className="space-y-2">
                {analysis.warnings.map((w, i) => (
                  <li key={i} className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">⚠️</span>{w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {analysis.suggestions.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-5">
              <h3 className="font-bold text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4" />Suggestions ({analysis.suggestions.length})
              </h3>
              <ul className="space-y-2">
                {analysis.suggestions.map((s, i) => (
                  <li key={i} className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-blue-500">→</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Matched Keywords */}
          <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-2xl p-5">
            <h3 className="font-bold text-sm text-green-700 dark:text-green-400 flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4" />Matched Keywords ({analysis.keywordsMatched.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {analysis.keywordsMatched.map(k => (
                <span key={k} className="px-2.5 py-1 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">{k}</span>
              ))}
            </div>
          </div>

          {/* Missing Keywords */}
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-5">
            <h3 className="font-bold text-sm text-red-700 dark:text-red-400 flex items-center gap-2 mb-3">
              <XCircle className="w-4 h-4" />Missing Keywords ({analysis.keywordsMissed.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {analysis.keywordsMissed.map(k => (
                <span key={k} className="px-2.5 py-1 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">{k}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Rewritten Resume */}
        {analysis.rewrittenText && (
          <div className="mt-4 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <Eye className="w-4 h-4" />Rewritten Resume
              </h3>
              <button onClick={() => { navigator.clipboard.writeText(analysis.rewrittenText!); }}
                className="text-xs text-indigo-500 hover:text-indigo-600 font-medium">Copy text</button>
            </div>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono text-gray-700 dark:text-gray-300 max-h-96 overflow-y-auto">
              {analysis.rewrittenText}
            </pre>
          </div>
        )}
      </AnimatedTab>

      <AnimatedTab show={tab === 'keywords'}>
        {kgap ? (
          <div className="space-y-4">
            {/* Critical Missing */}
            {kgap.criticalMissing?.length > 0 && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-5">
                <h3 className="font-bold text-sm text-red-700 dark:text-red-400 mb-3">🚨 Critical Missing Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {kgap.criticalMissing.map(k => (
                    <span key={k} className="px-3 py-1.5 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 rounded-full text-xs font-semibold">{k}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Nice-to-have */}
            {kgap.nicetohaveMissing?.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-5">
                <h3 className="font-bold text-sm text-amber-700 dark:text-amber-400 mb-3">💡 Nice-to-Have Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {kgap.nicetohaveMissing.map(k => (
                    <span key={k} className="px-3 py-1.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">{k}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Additions */}
            {kgap.recommendedAdditions?.length > 0 && (
              <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-5">
                <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />Recommended Additions
                </h3>
                <div className="space-y-3">
                  {kgap.recommendedAdditions.map((rec, i) => (
                    <div key={i} className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-indigo-700 dark:text-indigo-300">{rec.keyword}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full">{rec.where}</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 italic">"{rec.example}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overused Phrases */}
            {kgap.overusedPhrases?.length > 0 && (
              <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-2xl p-5">
                <h3 className="font-bold text-sm text-purple-700 dark:text-purple-400 mb-3">⚠️ Overused Phrases to Avoid</h3>
                <div className="flex flex-wrap gap-2">
                  {kgap.overusedPhrases.map(p => (
                    <span key={p} className="px-3 py-1.5 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium line-through">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No keyword gap data available for this analysis.</p>
            <p className="text-xs mt-1">Upload a resume with a job description to get keyword gap analysis.</p>
          </div>
        )}
      </AnimatedTab>

      <AnimatedTab show={tab === 'graph'}>
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Visual map of your skill keywords. <span className="text-green-600 dark:text-green-400 font-medium">Green = matched</span>, <span className="text-red-500 font-medium">Red = missing</span>. Drag nodes to explore.
          </p>
          <div className="relative">
            <SkillGraph
              domain={analysis.domain}
              matchedKeywords={analysis.keywordsMatched}
              missingKeywords={analysis.keywordsMissed}
            />
          </div>
        </div>
      </AnimatedTab>

      <AnimatedTab show={tab === 'chat'}>
        <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden">
          <div className="border-b border-gray-100 dark:border-white/10 px-5 py-3 flex items-center gap-2">
            <Bot className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold">AI Resume Coach</span>
            <span className="text-xs text-gray-400 ml-auto">Ask anything about your resume & score</span>
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-3">
            {chat.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Ask me anything about your resume!</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {['How can I improve my score?', 'Which keywords should I add?', 'Rewrite my summary section'].map(q => (
                    <button key={q} onClick={() => setChatInput(q)}
                      className="text-xs px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chat.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-white/10'}`}>
                  {msg.role === 'user' ? <UserIcon className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                }`}>
                  {msg.text || <span className="opacity-50">Thinking...</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 dark:border-white/10 p-3 flex gap-2">
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
              placeholder="Ask your AI coach..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" />
            <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
              className="p-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </AnimatedTab>
    </div>
  );
}

function AnimatedTab({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      {children}
    </motion.div>
  );
}
