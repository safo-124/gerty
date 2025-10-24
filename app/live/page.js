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
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 relative overflow-hidden">
      {/* Animated background patterns */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-20 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 left-20 w-80 h-80 bg-pink-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="relative container max-w-7xl mx-auto px-4 py-12">
        {/* Hero Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-xs font-medium text-purple-700 uppercase tracking-wider">Live Now</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Live Matches
          </h1>
          <p className="text-gray-600 text-lg">Watch chess games unfold in real-time</p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-purple-100 shadow-lg">
              <div className="w-5 h-5 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-700 font-medium">Loading matches...</span>
            </div>
          </div>
        ) : !matches?.length ? (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto rounded-3xl bg-white/80 backdrop-blur-sm border border-purple-100 p-8 shadow-xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Live Matches</h3>
              <p className="text-gray-600 mb-6">Be the first to start a match! Create one from the Play page.</p>
              <Link 
                href="/play" 
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <span>Start Playing</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              <span className="text-sm font-medium text-gray-700">Filter:</span>
              <div className="inline-flex gap-2 p-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-purple-100 shadow-lg">
                <button 
                  className={`px-6 py-2 rounded-full font-medium text-sm transition-all duration-300 ${
                    filter==='all' 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' 
                      : 'text-gray-700 hover:bg-purple-50'
                  }`} 
                  onClick={() => setFilter('all')}
                >
                  All Matches
                </button>
                <button 
                  className={`px-6 py-2 rounded-full font-medium text-sm transition-all duration-300 ${
                    filter==='ai' 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' 
                      : 'text-gray-700 hover:bg-purple-50'
                  }`} 
                  onClick={() => setFilter('ai')}
                >
                  AI Games
                </button>
                <button 
                  className={`px-6 py-2 rounded-full font-medium text-sm transition-all duration-300 ${
                    filter==='human' 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' 
                      : 'text-gray-700 hover:bg-purple-50'
                  }`} 
                  onClick={() => setFilter('human')}
                >
                  Human vs Human
                </button>
              </div>
            </div>

            {/* Matches Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((m) => (
              <div key={m.id} className="group relative rounded-3xl bg-white/80 backdrop-blur-sm border border-purple-100 p-4 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
                {/* Admin Delete Button (Finished matches) */}
                {user?.role === 'ADMIN' && m.status && m.status !== 'ONGOING' && (
                  <button
                    onClick={() => deleteMatch(m.id)}
                    title="Delete finished match"
                    className="absolute right-3 top-3 z-10 rounded-full bg-white/90 backdrop-blur-sm border border-red-200 p-2 text-red-600 hover:bg-red-50 hover:border-red-300 shadow-md transition-all duration-300"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6"/>
                      <path d="M14 11v6"/>
                      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                )}
                
                {/* Admin End Controls (Ongoing human matches) */}
                {user?.role === 'ADMIN' && m.status === 'ONGOING' && !m.ai && (
                  <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
                    <button
                      onClick={() => endMatch(m.id, 'DRAW')}
                      title="Force draw"
                      className="rounded-full bg-white/95 backdrop-blur-sm border border-gray-300 px-2.5 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-100 hover:border-gray-400 shadow-sm transition-all duration-200"
                    >
                      Draw
                    </button>
                    <button
                      onClick={() => endMatch(m.id, 'RESIGNATION', '1-0')}
                      title="End: White wins"
                      className="rounded-full bg-white/95 backdrop-blur-sm border border-green-300 px-2.5 py-1 text-[10px] font-medium text-green-700 hover:bg-green-50 hover:border-green-400 shadow-sm transition-all duration-200"
                    >
                      W+
                    </button>
                    <button
                      onClick={() => endMatch(m.id, 'RESIGNATION', '0-1')}
                      title="End: Black wins"
                      className="rounded-full bg-white/95 backdrop-blur-sm border border-blue-300 px-2.5 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-50 hover:border-blue-400 shadow-sm transition-all duration-200"
                    >
                      B+
                    </button>
                    <button
                      onClick={() => endMatch(m.id, 'TIMEOUT')}
                      title="Close (Timeout)"
                      className="rounded-full bg-white/95 backdrop-blur-sm border border-amber-300 px-2.5 py-1 text-[10px] font-medium text-amber-700 hover:bg-amber-50 hover:border-amber-400 shadow-sm transition-all duration-200"
                    >
                      T/O
                    </button>
                  </div>
                )}

                <Link href={`/play/live/${m.id}`} className="block">
                  {/* Chessboard Preview with gradient border */}
                  <div className="relative rounded-2xl overflow-hidden mb-4 group-hover:shadow-xl transition-shadow duration-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none"></div>
                    <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-[3px] rounded-2xl">
                      <div className="bg-white rounded-[14px] overflow-hidden">
                        <Chessboard
                          id={`live-list-${m.id}`}
                          position={previews[m.id]?.fen || undefined}
                          arePiecesDraggable={false}
                          boardWidth={320}
                          animationDuration={150}
                          customBoardStyle={{ width: '100%', aspectRatio: '1 / 1' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Match Info */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-gray-900 truncate flex-1 group-hover:text-purple-700 transition-colors">
                        {m.title || 'Untitled match'}
                      </h3>
                      {m.status === 'ONGOING' && (
                        <span className="flex-shrink-0 relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      {m.ai && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border border-amber-300 text-[11px] font-semibold uppercase tracking-wide shadow-sm">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 3v2H5v2h1v7a4 4 0 003.595 3.98C9.212 19.2 9 20.57 9 22h2c0-1.5.5-3 2-4 1.5 1 2 2.5 2 4h2c0-1.43-.212-2.8-.595-4.02A4 4 0 0019 14V7h1V5h-4V3h-2v2h-2V3H9zm2 4h2v7c0 1.11-.89 2-2 2s-2-.89-2-2V7h2z"/>
                          </svg>
                          AI{m.aiLevel ? ` Lv${m.aiLevel}` : ''}
                        </span>
                      )}
                      {m.status && m.status !== 'ONGOING' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300 text-[11px] font-semibold uppercase tracking-wide shadow-sm">
                          {m.status}
                        </span>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{new Date(m.lastMoveAt).toLocaleString()}</span>
                    </div>

                    {/* Watch CTA */}
                    <div className="flex items-center gap-2 pt-2 text-sm font-semibold text-purple-700 group-hover:text-pink-600 transition-colors">
                      <span>Watch Live</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </main>
  );
}
