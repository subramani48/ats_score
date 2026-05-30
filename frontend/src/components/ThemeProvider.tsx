'use client';
import { useEffect } from 'react';
import { useAnalysisStore } from '@/stores/analysisStore';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAnalysisStore(s => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [theme]);

  return <>{children}</>;
}
