'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Mail, Lock, User, ArrowRight, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAnalysisStore } from '@/stores/analysisStore';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const { setAuth } = useAnalysisStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const data = isRegister
        ? await api.register({ email, name, password })
        : await api.login({ email, password });
      setAuth(data.user, data.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">ATS Analyzer</span>
        </div>

        <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-center mb-2">{isRegister ? 'Create Account' : 'Welcome Back'}</h1>
          <p className="text-gray-400 text-sm text-center mb-8">{isRegister ? 'Start tracking your ATS scores' : 'Sign in to view your history'}</p>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl mb-6 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input type="text" value={name} onChange={e => setName(e.target.value)} required
                  placeholder="Full Name"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="Email address"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="Password" minLength={8}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all" />
            </div>
            <motion.button type="submit" disabled={loading} whileHover={!loading ? { scale: 1.02 } : {}} whileTap={!loading ? { scale: 0.98 } : {}}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
               : <><span>{isRegister ? 'Create Account' : 'Sign In'}</span><ArrowRight className="w-4 h-4" /></>}
            </motion.button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-4">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-indigo-500 font-semibold hover:text-indigo-600 transition-colors">
              {isRegister ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          <a href="/" className="hover:text-indigo-500 transition-colors">← Back to Home</a>
        </p>
      </motion.div>
    </div>
  );
}
