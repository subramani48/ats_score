'use client';
import { Moon, Sun } from 'lucide-react';
import { useAnalysisStore } from '@/stores/analysisStore';
import { motion } from 'framer-motion';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useAnalysisStore();

  return (
    <motion.button
      onClick={toggleTheme}
      whileTap={{ scale: 0.88 }}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`p-2 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors ${className}`}
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.22 }}
      >
        {theme === 'dark' ? (
          <Sun className="w-4 h-4 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-600" />
        )}
      </motion.div>
    </motion.button>
  );
}
