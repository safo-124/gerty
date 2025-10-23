'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useMemo, useState } from 'react';

function Bar({ value, max, label, className='' }) {
  const height = max ? Math.max(2, Math.round((value / max) * 80)) : 2; // px
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-6 rounded-t-md bg-gradient-to-t from-purple-600 to-pink-500 ${className}`} style={{ height }} />
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}

export default function SiteAnalyticsPage() {
  const { user, token, loading } = useAuth();
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/admin/analytics/site?days=${days}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, [token, days]);

  const maxSubs = useMemo(() => data ? Math.max(...data.days.map((d) => d.subscribers), 0) : 0, [data]);
  const maxClicks = useMemo(() => data ? Math.max(...data.days.map((d) => Object.values(d.clicks).reduce((a, v) => a + v, 0)), 0) : 0, [data]);

  if (loading) return null;
  if (!user || user.role !== 'ADMIN') return <div className="p-8 text-center text-red-600">Admins only.</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Site Analytics</h1>
        <select value={days} onChange={(e) => setDays(parseInt(e.target.value))} className="rounded-lg border px-3 py-1 text-sm">
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
        </select>
      </div>

      {/* KPI cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border p-4 bg-white/70">
          <div className="text-sm text-gray-500">Total Subscribers</div>
          <div className="text-3xl font-bold">{data?.totalSubscribers ?? '—'}</div>
        </div>
        <div className="rounded-2xl border p-4 bg-white/70">
          <div className="text-sm text-gray-500">New Subs (last 7d)</div>
          <div className="text-3xl font-bold">{data?.last7Subs ?? '—'}</div>
        </div>
        <div className="rounded-2xl border p-4 bg-white/70">
          <div className="text-sm text-gray-500">Social Clicks (last 7d)</div>
          <div className="text-3xl font-bold">{data?.last7Clicks ?? '—'}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-8">
        <div className="rounded-2xl border p-4">
          <div className="mb-3 font-semibold">Daily Subscribers</div>
          <div className="flex items-end gap-2 h-28">
            {data?.days?.map((d) => (
              <Bar key={d.date} value={d.subscribers} max={maxSubs} label={d.date.slice(5)} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="mb-3 font-semibold">Daily Social Clicks</div>
          <div className="flex items-end gap-2 h-28">
            {data?.days?.map((d) => (
              <Bar key={d.date} value={Object.values(d.clicks).reduce((a, v) => a + v, 0)} max={maxClicks} label={d.date.slice(5)} className="from-blue-600 to-cyan-500" />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border p-4">
        <div className="mb-3 font-semibold">Top Social Platforms</div>
        <div className="grid md:grid-cols-2 gap-3">
          {data?.socialTotals?.map((s) => (
            <div key={s.key} className="flex items-center justify-between rounded-xl border p-3 bg-white/60">
              <div className="font-medium">{s.key}</div>
              <div className="text-sm text-gray-600">{s.count}</div>
            </div>
          ))}
          {!data?.socialTotals?.length && <div className="text-gray-500">No social clicks recorded yet.</div>}
        </div>
      </div>
    </div>
  );
}
