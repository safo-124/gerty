'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminPuzzlesAnalyticsPage() {
  const { user, token, loading } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'ADMIN') {
      setErr('Admin only.');
      setBusy(false);
      return;
    }
    (async () => {
      setBusy(true);
      try {
        const res = await fetch('/api/admin/puzzles/analytics', { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load');
        setData(json);
      } catch (e) { setErr(e.message); } finally { setBusy(false); }
    })();
  }, [user, token, loading]);

  if (busy) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-sm text-red-600">{err}</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Puzzles • Leaderboard</h1>
      <div className="rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="text-left px-3 py-2">Student</th><th className="text-left px-3 py-2">Solved</th><th className="text-left px-3 py-2">Avg time</th><th className="text-left px-3 py-2">E/M/H</th></tr></thead>
          <tbody>
            {data.leaderboard.map((r) => (
              <tr key={r.userId} className="border-t">
                <td className="px-3 py-2">{r.name || r.email || r.userId}</td>
                <td className="px-3 py-2">{r.solved}</td>
                <td className="px-3 py-2">{r.avgSolveSeconds == null ? '—' : `${r.avgSolveSeconds}s`}</td>
                <td className="px-3 py-2">{(r.byDifficulty?.EASY||0)}/{(r.byDifficulty?.MEDIUM||0)}/{(r.byDifficulty?.HARD||0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
