'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function StudentPuzzlesAnalyticsPage() {
  const { user, token, loading } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'STUDENT') {
      setErr('Student only.');
      setBusy(false);
      return;
    }
    (async () => {
      setBusy(true);
      try {
        const res = await fetch('/api/puzzles/analytics', { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load');
        setData(json);
      } catch (e) { setErr(e.message); } finally { setBusy(false); }
    })();
  }, [user, token, loading]);

  if (busy) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-sm text-red-600">{err}</div>;

  const fmt = (s) => s == null ? '—' : `${s}s`;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Puzzle analytics</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl border p-4"><div className="text-xs text-gray-500">Solved</div><div className="text-2xl font-semibold">{data.solvedCount}</div></div>
        <div className="rounded-2xl border p-4"><div className="text-xs text-gray-500">In progress</div><div className="text-2xl font-semibold">{data.attemptingCount}</div></div>
        <div className="rounded-2xl border p-4"><div className="text-xs text-gray-500">Avg solve time</div><div className="text-2xl font-semibold">{fmt(data.avgSolveSeconds)}</div></div>
      </div>

      <h2 className="font-semibold mb-2">By difficulty</h2>
      <div className="rounded-2xl border overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="text-left px-3 py-2">Difficulty</th><th className="text-left px-3 py-2">Solved</th><th className="text-left px-3 py-2">Avg time</th></tr></thead>
          <tbody>
            {data.byDifficulty.map((r) => (
              <tr key={r.difficulty} className="border-t"><td className="px-3 py-2">{r.difficulty}</td><td className="px-3 py-2">{r.solved}</td><td className="px-3 py-2">{fmt(r.avgSolveSeconds)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="font-semibold mb-2">Recent solved</h2>
      <div className="rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="text-left px-3 py-2">Puzzle</th><th className="text-left px-3 py-2">Difficulty</th><th className="text-left px-3 py-2">Time</th><th className="text-left px-3 py-2">Solved</th></tr></thead>
          <tbody>
            {data.recent.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2"><a className="text-purple-600" href={`/puzzles/${r.puzzleId}`}>{r.title}</a></td>
                <td className="px-3 py-2">{r.difficulty}</td>
                <td className="px-3 py-2">{fmt(r.seconds)}</td>
                <td className="px-3 py-2">{new Date(r.solvedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
