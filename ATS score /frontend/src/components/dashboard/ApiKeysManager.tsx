'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Plus, Trash2, Copy, Check, Eye, EyeOff, Code2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { ApiKeyEntry } from '@/lib/api';

export default function ApiKeysManager({ token: tokenProp }: { token?: string }) {
  const token = tokenProp ?? '';
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [showNewKey, setShowNewKey] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.listApiKeys(token).then(r => setKeys(r.data)).catch(() => {});
  }, [token]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setLoading(true);
    try {
      const res = await api.createApiKey(newKeyName.trim(), token);
      setNewKey(res.data.key);
      setShowNewKey(true);
      setNewKeyName('');
      const updated = await api.listApiKeys(token);
      setKeys(updated.data);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    await api.revokeApiKey(id, token).catch(() => {});
    setKeys(prev => prev.filter(k => k.id !== id));
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Key className="w-4 h-4 text-indigo-500" />
          <h2 className="font-bold">API Keys</h2>
        </div>
        <p className="text-sm text-gray-400 mb-5">
          Use these keys to integrate ATS analysis into your own applications.
        </p>

        {/* Create */}
        <div className="flex gap-3 mb-5">
          <input
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Key label (e.g. my-portfolio-app)"
            className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm outline-none focus:border-indigo-500 transition-colors"
          />
          <motion.button
            onClick={handleCreate}
            disabled={loading || !newKeyName.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 shadow-lg shadow-indigo-500/20"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Create Key
          </motion.button>
        </div>

        {/* New key reveal */}
        <AnimatePresence>
          {newKey && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-5 p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl"
            >
              <p className="text-xs font-bold text-green-600 dark:text-green-400 mb-2">
                ⚠️ Copy this key now — it will never be shown again:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-white dark:bg-black/20 px-3 py-2 rounded-lg break-all">
                  {showNewKey ? newKey : `ats_${'●'.repeat(20)}${newKey.slice(-8)}`}
                </code>
                <button
                  onClick={() => setShowNewKey(s => !s)}
                  className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                >
                  {showNewKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => copyKey(newKey)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  {copied ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy</>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keys list */}
        {keys.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Key className="w-8 h-8 mx-auto mb-2 opacity-25" />
            <p className="text-sm">No API keys yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map(k => (
              <div
                key={k.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10"
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${k.isActive ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{k.name}</p>
                  <p className="text-xs text-gray-400 font-mono truncate">{k.key}</p>
                </div>
                <div className="text-right hidden sm:block shrink-0">
                  <p className="text-xs text-gray-400">{k.usageCount} uses</p>
                  {k.lastUsed && (
                    <p className="text-xs text-gray-300 dark:text-gray-600">
                      {new Date(k.lastUsed).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleRevoke(k.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage example */}
      <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Code2 className="w-4 h-4 text-indigo-500" />
          <h3 className="font-bold text-sm">API Usage Example</h3>
        </div>
        <pre className="bg-gray-50 dark:bg-black/30 rounded-xl p-4 text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto">
{`# Generate a cover letter
curl -X POST https://api.atsanalyzer.com/api/v1/cover-letters/generate \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "resumeText": "Your resume text...",
    "jobDescription": "Job description...",
    "companyName": "Google",
    "tone": "professional"
  }'

# Generate interview questions
curl -X POST .../api/v1/interview/generate \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"resumeText":"...","jobDescription":"...","domain":"React"}'`}
        </pre>
      </div>
    </div>
  );
}
