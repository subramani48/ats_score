'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, BarChart2, FileText, MessageSquare, Layers,
  Building2, GitBranch, Key, Shield, LogOut, Plus, Menu, X,
  Bell, ChevronRight, Home,
} from 'lucide-react';
import { useAnalysisStore } from '@/stores/analysisStore';
import { api } from '@/lib/api';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import SubscriptionBadge from '@/components/dashboard/SubscriptionBadge';

const NAV = [
  { href: '/dashboard',            label: 'Overview',       Icon: BarChart2,     exact: true },
  { href: '/dashboard/cover-letter', label: 'Cover Letter',  Icon: FileText },
  { href: '/dashboard/interview',  label: 'Interview Prep', Icon: MessageSquare },
  { href: '/dashboard/batch',      label: 'Batch Analyze',  Icon: Layers },
  { href: '/dashboard/company-ats',label: 'Company ATS',    Icon: Building2 },
  { href: '/dashboard/versions',   label: 'Resume Versions',Icon: GitBranch },
  { href: '/dashboard/api-keys',   label: 'API Keys',       Icon: Key },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token, clearAuth } = useAnalysisStore();
  const router   = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    // Check if admin
    api.getMe(token).then(res => {
      if ((res.data as { role?: string }).role === 'admin') setIsAdmin(true);
    }).catch(() => {});
  }, [token, router]);

  const handleLogout = () => { clearAuth(); router.push('/'); };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100 dark:border-white/10">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Activity className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-base tracking-tight">ATS Analyzer</span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <Link href="/#upload" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-semibold mb-4 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all">
          <Plus className="w-4 h-4" />New Analysis
        </Link>

        {NAV.map(({ href, label, Icon, exact }) => (
          <Link key={href} href={href}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
              isActive(href, exact)
                ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
            }`}>
            <div className="flex items-center gap-3">
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </div>
            {isActive(href, exact) && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
          </Link>
        ))}

        {isAdmin && (
          <Link href="/dashboard/admin"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mt-2 ${
              isActive('/dashboard/admin')
                ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
            }`}>
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 shrink-0" />
              Admin
            </div>
            {isActive('/dashboard/admin') && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
          </Link>
        )}
      </nav>

      {/* User Footer */}
      <div className="px-3 py-4 border-t border-gray-100 dark:border-white/10 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {(user?.name ?? user?.email ?? 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{user?.name ?? 'User'}</p>
              <SubscriptionBadge />
            </div>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
          <LogOut className="w-4 h-4" />Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-white/10 fixed top-0 left-0 h-screen z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)} />
            <motion.aside initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 left-0 h-screen w-60 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-white/10 z-50 lg:hidden">
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-white/10 px-4 lg:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1 text-sm text-gray-500">
              <Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                <Home className="w-4 h-4" />
              </Link>
              {pathname !== '/dashboard' && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-gray-900 dark:text-white font-medium capitalize">
                    {pathname.split('/').pop()?.replace(/-/g, ' ')}
                  </span>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
