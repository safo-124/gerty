"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Chessboard } from 'react-chessboard';
import { useAuth } from '@/contexts/AuthContext';

export default function LiveListPage() {
  const { user, token } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | ai | human
  const [previews, setPreviews] = useState({}); // id -> { fen }

  // Derived filtered list and visible slice for previews
  const filtered = matches.filter(m => filter==='all' ? true : filter==='ai' ? m.ai : !m.ai);
  const visible = filtered.slice(0, 9);

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

  // Fetch FEN previews for visible matches and poll periodically
  useEffect(() => {
    let cancelled = false;
    async function fetchFen(id) {
      try {
        const r = await fetch(`/api/live/${id}`, { cache: 'no-store' });
        const j = await r.json();
        const fen = j?.match?.fen;
        if (!cancelled) setPreviews((p) => ({ ...p, [id]: { fen } }));
      } catch {}
    }
    // initial for visible items only
    visible.forEach((m) => fetchFen(m.id));
    // poll
    const int = setInterval(() => {
      visible.forEach((m) => fetchFen(m.id));
    }, 2000);
    return () => { cancelled = true; clearInterval(int); };
  }, [visible]);

  // Admin-only delete from public grid (finished matches only)
  async function deleteMatch(id) {
    if (!token) return alert('Not authorized');
    if (!confirm('Delete this finished match? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/live/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setMatches((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      alert(e.message || 'Delete failed');
    }
  }

  // Admin-only end controls for ongoing human matches
  async function endMatch(id, status, result) {
    if (!token) return alert('Not authorized');
    try {
      const res = await fetch(`/api/admin/live/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, ...(result ? { result } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      const updated = data.match;
      if (updated) {
        setMatches((prev) => prev.map((m) => (m.id === id ? { ...m, status: updated.status, lastMoveAt: updated.lastMoveAt } : m)));
      }
    } catch (e) {
      alert(e.message || 'Update failed');
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((m) => (
              <div key={m.id} className="group relative rounded-2xl border bg-white p-3 shadow-sm hover:shadow transition">
                {user?.role === 'ADMIN' && m.status && m.status !== 'ONGOING' && (
                  <button
                    onClick={() => deleteMatch(m.id)}
                    title="Delete finished match"
                    className="absolute right-2 top-2 z-10 rounded-full border bg-white/90 p-1.5 text-gray-700 hover:bg-red-50 hover:text-red-700"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                )}
                {user?.role === 'ADMIN' && m.status === 'ONGOING' && !m.ai && (
                  <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-1">
                    <button
                      onClick={() => endMatch(m.id, 'DRAW')}
                      title="Force draw"
                      className="rounded-full border bg-white/90 px-2 py-1 text-[10px] hover:bg-gray-100"
                    >
                      Draw
                    </button>
                    <button
                      onClick={() => endMatch(m.id, 'RESIGNATION', '1-0')}
                      title="End: White wins"
                      className="rounded-full border bg-white/90 px-2 py-1 text-[10px] hover:bg-green-50 hover:text-green-700"
                    >
                      W+
                    </button>
                    <button
                      onClick={() => endMatch(m.id, 'RESIGNATION', '0-1')}
                      title="End: Black wins"
                      className="rounded-full border bg-white/90 px-2 py-1 text-[10px] hover:bg-blue-50 hover:text-blue-700"
                    >
                      B+
                    </button>
                    <button
                      onClick={() => endMatch(m.id, 'TIMEOUT')}
                      title="Close (Timeout)"
                      className="rounded-full border bg-white/90 px-2 py-1 text-[10px] hover:bg-amber-50 hover:text-amber-700"
                    >
                      T/O
                    </button>
                  </div>
                )}
                <Link href={`/play/live/${m.id}`} className="block">
                <div className="rounded-lg overflow-hidden border bg-white mb-3">
                  <Chessboard
                    id={`live-list-${m.id}`}
                    position={previews[m.id]?.fen || undefined}
                    arePiecesDraggable={false}
                    boardWidth={320}
                    animationDuration={150}
                    customBoardStyle={{ width: '100%', aspectRatio: '1 / 1' }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate flex items-center gap-2 group-hover:text-purple-700">
                    <span>{m.title || 'Untitled match'}</span>
                    {m.ai && (
                      <span className="text-[10px] uppercase tracking-wide inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                        AI{m.aiLevel ? ` Lv${m.aiLevel}` : ''}
                      </span>
                    )}
                    {m.status && m.status !== 'ONGOING' && (
                      <span className="text-[10px] uppercase tracking-wide inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300">{m.status}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">{new Date(m.lastMoveAt).toLocaleString()}</div>
                </div>
                <div className="mt-2 text-purple-700 text-sm">Watch</div>
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
