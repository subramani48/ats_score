'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface DataPoint {
  date: string;
  score: number;
  domain?: string;
}

interface Props {
  data: DataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/10 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">{payload[0].value}%</p>
      <p className="text-gray-400">{payload[0].payload.domain}</p>
    </div>
  );
};

export default function ScoreTrendChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No analysis history yet. Run your first analysis to see trends.
      </div>
    );
  }

  const formatted = data.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={70} stroke="#22c55e" strokeDasharray="4 4" label={{ value: 'ATS Pass', fill: '#22c55e', fontSize: 10 }} />
        <Line type="monotone" dataKey="score" stroke="url(#lineGrad)" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} />
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </LineChart>
    </ResponsiveContainer>
  );
}
