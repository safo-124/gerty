"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function LiveListPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | ai | human

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch('/api/live', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');
        if (alive) setMatches(data.matches || []);
      } catch {
        if (alive) setMatches([]);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    const int = setInterval(load, 3000);
    return () => { alive = false; clearInterval(int); };
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Live matches</h1>
      {loading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : !matches?.length ? (
        <div className="text-sm text-gray-600">No live matches right now. Create one from <Link href="/play" className="text-purple-600">Play</Link>.</div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-3 text-sm">
            <span>Filter:</span>
            <button className={`rounded-full px-3 py-1 border ${filter==='all' ? 'bg-purple-600 text-white' : ''}`} onClick={() => setFilter('all')}>All</button>
            <button className={`rounded-full px-3 py-1 border ${filter==='ai' ? 'bg-purple-600 text-white' : ''}`} onClick={() => setFilter('ai')}>AI</button>
            <button className={`rounded-full px-3 py-1 border ${filter==='human' ? 'bg-purple-600 text-white' : ''}`} onClick={() => setFilter('human')}>Human</button>
          </div>
          <ul className="divide-y rounded-2xl border overflow-hidden">
            {matches.filter(m => filter==='all' ? true : filter==='ai' ? m.ai : !m.ai).map((m) => (
              <li key={m.id} className="p-4 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate flex items-center gap-2">
                    <span>{m.title || 'Untitled match'}</span>
                    {m.ai && (
                      <span className="text-[10px] uppercase tracking-wide inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                        AI{m.aiLevel ? ` Lv${m.aiLevel}` : ''}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">{new Date(m.lastMoveAt).toLocaleString()}</div>
                </div>
                <Link href={`/play/live/${m.id}`} className="text-purple-600 text-sm">Watch</Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
