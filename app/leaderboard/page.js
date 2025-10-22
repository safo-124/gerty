'use client';

import { useEffect, useState } from 'react';

export default function LeaderboardPage() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      setBusy(true);
      try {
        const res = await fetch('/api/puzzles/leaderboard');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load');
        setData(json);
      } catch (e) { setErr(e.message); } finally { setBusy(false); }
    })();
  }, []);

  if (busy) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-sm text-red-600">{err}</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Puzzles Leaderboard</h1>
      <div className="rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="text-left px-3 py-2">Rank</th><th className="text-left px-3 py-2">Student</th><th className="text-left px-3 py-2">Solved</th><th className="text-left px-3 py-2">Avg time</th></tr></thead>
          <tbody>
            {data.leaderboard.map((r, i) => (
              <tr key={r.userId} className="border-t">
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2">{r.name || 'Student'}</td>
                <td className="px-3 py-2">{r.solved}</td>
                <td className="px-3 py-2">{r.avgSolveSeconds == null ? '—' : `${r.avgSolveSeconds}s`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
