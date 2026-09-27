'use client';
import { useState, useEffect } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import type { AppNotification } from '@/lib/api';
import { useAnalysisStore } from '@/stores/analysisStore';

export default function NotificationBell({ token: tokenProp }: { token?: string }) {
  const { token: storeToken } = useAnalysisStore();
  const token = tokenProp ?? storeToken ?? '';
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!token) return;
    api.getNotifications(token)
      .then(r => {
        setNotifications(r.data.notifications);
        setUnread(r.data.unreadCount);
      })
      .catch(() => {});
  }, [token]);

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open && unread > 0) {
      api.markAllRead(token).catch(() => {});
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    }
  };

  const typeColors: Record<string, string> = {
    success: 'bg-green-400',
    error: 'bg-red-400',
    warning: 'bg-amber-400',
    info: 'bg-indigo-400',
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.16 }}
              className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10">
                <span className="font-bold text-sm">Notifications</span>
                <div className="flex items-center gap-2">
                  {notifications.some(n => !n.read) && (
                    <button
                      onClick={() => {
                        api.markAllRead(token).catch(() => {});
                        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                        setUnread(0);
                      }}
                      className="text-xs text-indigo-500 hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="w-3 h-3" />Mark all read
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-gray-400">
                    <Bell className="w-7 h-7 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">No notifications yet</p>
                    <p className="text-xs mt-1">You&apos;re all caught up!</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-gray-50 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                        !n.read ? 'bg-indigo-50/60 dark:bg-indigo-500/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${typeColors[n.type] ?? 'bg-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{n.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
