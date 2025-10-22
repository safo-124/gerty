'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function PuzzlesPage() {
  const { user, token, loading } = useAuth();
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'STUDENT') {
      setErr('Please sign in as a student to access puzzles.');
      setBusy(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/puzzles', { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setItems(data.puzzles || []);
      } catch (e) {
        setErr(e.message);
      } finally {
        setBusy(false);
      }
    })();
  }, [loading, user, token]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Puzzles</h1>
      {busy ? <div>Loading…</div> : err ? <div className="text-red-600 text-sm">{err}</div> : (
        <ul className="grid sm:grid-cols-2 gap-4">
          {items.map(p => (
            <li key={p.id} className="rounded-2xl border p-4">
              <div className="font-medium mb-1">{p.title}</div>
              <div className="text-xs text-gray-600 mb-2">Difficulty: {p.difficulty}</div>
              <a className="text-purple-600 text-sm" href={`/puzzles/${p.id}`}>Solve</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
