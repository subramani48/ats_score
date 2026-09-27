'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Analysis, UserProfile } from '@/lib/api';

interface JobProgress {
  step: string;
  percent: number;
  message: string;
}

interface AnalysisState {
  currentJobId: string | null;
  currentProgress: JobProgress | null;
  currentResult: Analysis | null;
  user: UserProfile | null;
  token: string | null;
  theme: 'light' | 'dark';

  setJobId: (id: string | null) => void;
  setProgress: (p: JobProgress | null) => void;
  setResult: (r: Analysis | null) => void;
  setAuth: (user: UserProfile, token: string) => void;
  clearAuth: () => void;
  reset: () => void;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set, get) => ({
      currentJobId: null,
      currentProgress: null,
      currentResult: null,
      user: null,
      token: null,
      theme: 'dark',

      setJobId: (id) => set({ currentJobId: id }),
      setProgress: (p) => set({ currentProgress: p }),
      setResult: (r) => set({ currentResult: r }),
      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null }),
      reset: () => set({ currentJobId: null, currentProgress: null, currentResult: null }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'ats-store',
      partialize: (s) => ({ user: s.user, token: s.token, theme: s.theme }),
    },
  ),
);
