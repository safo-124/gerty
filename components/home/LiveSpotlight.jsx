"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

export default function LiveSpotlight() {
  const [state, setState] = useState({ enabled: false, rotationSeconds: 300, items: [] });
  const [previews, setPreviews] = useState({}); // id -> { fen, pgn, moves: string[], ai?: boolean, status?: string, isCheckmate?: boolean, matePattern?: string, tactics?: string[], capturedByWhite?: string[], capturedByBlack?: string[] }

  // Helpers: tactics formatting and captured pieces from FEN
  const tacticMeta = {
    'smothered': { label: 'Smothered Mate', icon: '😶\u200d🌫️', prio: 100 },
    'back-rank': { label: 'Back-Rank Mate', icon: '🏰', prio: 95 },
    'promotion': { label: 'Promotion', icon: '⬆️', prio: 90 },
    'discovered attack': { label: 'Discovered Attack', icon: '💡', prio: 85 },
    'pin': { label: 'Pin', icon: '📌', prio: 80 },
    'skewer': { label: 'Skewer', icon: '🍢', prio: 75 },
    'deflection': { label: 'Deflection', icon: '🔁', prio: 70 },
    'decoy': { label: 'Decoy', icon: '🎯', prio: 65 },
  };
  function formatTactics(tactics) {
    if (!Array.isArray(tactics)) return [];
    const uniq = Array.from(new Set(tactics));
    const withMeta = uniq.map((t) => {
      const key = String(t || '').toLowerCase();
      const meta = tacticMeta[key];
      if (meta) return { ...meta };
      // Fallback: Title Case and default priority
      const label = (t || '').replace(/\b\w/g, (m) => m.toUpperCase());
      return { label, icon: '♞', prio: 10 };
    });
    withMeta.sort((a, b) => b.prio - a.prio || a.label.localeCompare(b.label));
    return withMeta;
  }
  function computeCapturedFromFen(fen) {
    try {
      if (!fen) return { byWhite: [], byBlack: [] };
      const placement = String(fen).split(' ')[0] || '';
      const initWhite = { P:8, N:2, B:2, R:2, Q:1, K:1 };
      const initBlack = { p:8, n:2, b:2, r:2, q:1, k:1 };
      const curWhite = { P:0, N:0, B:0, R:0, Q:0, K:0 };
      const curBlack = { p:0, n:0, b:0, r:0, q:0, k:0 };
      for (const ch of placement) {
        if (/[PNBRQK]/.test(ch)) curWhite[ch]++;
        else if (/[pnbrqk]/.test(ch)) curBlack[ch]++;
      }
      const missingBlack = {
        p: Math.max(0, initBlack.p - curBlack.p),
        n: Math.max(0, initBlack.n - curBlack.n),
        b: Math.max(0, initBlack.b - curBlack.b),
        r: Math.max(0, initBlack.r - curBlack.r),
        q: Math.max(0, initBlack.q - curBlack.q),
      };
      const missingWhite = {
        P: Math.max(0, initWhite.P - curWhite.P),
        N: Math.max(0, initWhite.N - curWhite.N),
        B: Math.max(0, initWhite.B - curWhite.B),
        R: Math.max(0, initWhite.R - curWhite.R),
        Q: Math.max(0, initWhite.Q - curWhite.Q),
      };
      const blackSymbols = { p:'♟', n:'♞', b:'♝', r:'♜', q:'♛' };
      const whiteSymbols = { P:'♙', N:'♘', B:'♗', R:'♖', Q:'♕' };
      const orderBlack = ['q','r','b','n','p'];
      const orderWhite = ['Q','R','B','N','P'];
      const byWhite = orderBlack.flatMap((k) => Array(missingBlack[k] || 0).fill(blackSymbols[k]));
      const byBlack = orderWhite.flatMap((k) => Array(missingWhite[k] || 0).fill(whiteSymbols[k]));
      return { byWhite, byBlack };
    } catch { return { byWhite: [], byBlack: [] }; }
  }

  // Load rotating spotlight items
  useEffect(() => {
    let active = true;
    let timer;
    async function load() {
      try {
        const res = await fetch('/api/homepage/live', { cache: 'no-store' });
        const data = await res.json();
        if (!active) return;
        setState({ enabled: !!data.enabled, rotationSeconds: data.rotationSeconds || 300, items: data.items || [] });
        if (timer) clearInterval(timer);
        if (data.enabled) {
          const intervalSec = Math.min(60, Math.max(15, Number(data.rotationSeconds || 300)));
          timer = setInterval(load, intervalSec * 1000);
        }
      } catch {
        if (!active) return;
        setState({ enabled: false, rotationSeconds: 300, items: [] });
      }
    }
    load();
    return () => { active = false; if (timer) clearInterval(timer); };
  }, []);

  // Fetch FEN/PGN previews for the first two spotlight items
  useEffect(() => {
    let cancelled = false;
    async function fetchPreview(item) {
      try {
        if (!item?.href) return;
        // Tournament game
        const tMatch = item.href.match(/^\/tournaments\/(.+?)\/game\/(.+)$/);
        if (tMatch) {
          const [, tid, gid] = tMatch;
          const r = await fetch(`/api/tournaments/${tid}/games/${gid}`, { cache: 'no-store' });
          const j = await r.json();
          const fen = j?.game?.fen;
          const pgn = j?.game?.pgn || '';
          updatePreview(item.id, fen, pgn, false);
          return;
        }
        // Live match
        const lMatch = item.href.match(/^\/play\/live\/(.+)$/);
        if (lMatch) {
          const [, id] = lMatch;
          const r = await fetch(`/api/live/${id}`, { cache: 'no-store' });
          const j = await r.json();
          const fen = j?.match?.fen;
          const pgn = j?.match?.pgn || '';
          updatePreview(item.id, fen, pgn, !!j?.match?.ai, j?.match?.status, !!j?.match?.isCheckmate, j?.match?.matePattern, j?.match?.tactics || []);
        }
      } catch {}
    }
    function updatePreview(id, fen, pgn, ai, status, isCheckmate, matePattern, tactics) {
      if (cancelled) return;
      const moves = (() => {
        try {
          const c = new Chess();
          if (pgn) c.loadPgn(pgn);
          return c.history().slice(-8); // last N SAN moves
        } catch { return []; }
      })();
      const cap = computeCapturedFromFen(fen);
      setPreviews((prev) => ({ ...prev, [id]: { fen, pgn, moves, ai, status, isCheckmate, matePattern, tactics, capturedByWhite: cap.byWhite, capturedByBlack: cap.byBlack } }));
    }

    const firstTwo = state.items?.slice(0, 2) || [];
    Promise.all(firstTwo.map(fetchPreview));
    return () => { cancelled = true; };
  }, [state.items]);

  // Poll previews periodically so AI games look live
  useEffect(() => {
    if (!state.enabled) return;
    let cancelled = false;
    const poll = async () => {
      const itemsToPoll = (state.items || []).slice(0, 2);
      for (const item of itemsToPoll) {
        if (cancelled) break;
        // Only poll live matches or any item whose preview was marked as AI
        const isLiveHref = /^\/play\/live\//.test(item.href || '');
        const wasAi = previews[item.id]?.ai;
        if (!isLiveHref && !wasAi) continue;
        try {
          const m = item.href.match(/^\/play\/live\/(.+)$/);
          if (m) {
            const [, id] = m;
            const r = await fetch(`/api/live/${id}`, { cache: 'no-store' });
            const j = await r.json();
            const fen = j?.match?.fen;
            const pgn = j?.match?.pgn || '';
            const ai = !!j?.match?.ai;
            const status = j?.match?.status;
            const isCheckmate = !!j?.match?.isCheckmate;
            const matePattern = j?.match?.matePattern;
            const tactics = j?.match?.tactics || [];
            const c = new Chess();
            if (pgn) try { c.loadPgn(pgn); } catch {}
            const moves = c.history().slice(-8);
            if (!cancelled) {
              const cap = computeCapturedFromFen(fen);
              setPreviews(prev => ({ ...prev, [item.id]: { fen, pgn, moves, ai, status, isCheckmate, matePattern, tactics, capturedByWhite: cap.byWhite, capturedByBlack: cap.byBlack } }));
            }
          }
        } catch {}
      }
    };
    const int = setInterval(poll, 2000);
    poll();
    return () => { cancelled = true; clearInterval(int); };
  }, [state.enabled, state.items, previews]);

  const items = useMemo(() => state.items?.slice(0, 2) || [], [state.items]);

  if (!state.enabled || !items.length) return null;

  return (
    <section className="relative py-20 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-purple-50/50 to-pink-50/30"></div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-20 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 left-20 w-80 h-80 bg-pink-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-100 to-pink-100 border border-red-200 mb-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Live Now</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
              Live Spotlight
            </h2>
            <p className="text-gray-600 mt-2 text-lg">Watch games in real-time</p>
          </div>
          <Link href="/live" className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            See all live games
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

        {/* Live Games Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {items.map((m) => {
            const preview = previews[m.id];
            return (
              <Link key={m.id} href={m.href} className="group rounded-3xl border-2 border-purple-100 bg-white/90 backdrop-blur-md p-6 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                <div className="grid md:grid-cols-5 gap-6 items-start">
                  {/* Chessboard */}
                  <div className="md:col-span-2">
                    <div className="relative rounded-2xl overflow-hidden border-4 border-gradient-to-br from-purple-200 to-pink-200 shadow-lg">
                      <div className="absolute -top-2 -right-2 z-10">
                        <span className="relative flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
                        </span>
                      </div>
                      <Chessboard
                        id={`spot-${m.id}`}
                        position={preview?.fen || undefined}
                        arePiecesDraggable={false}
                        boardWidth={260}
                        animationDuration={150}
                        customBoardStyle={{ width: '100%', aspectRatio: '1 / 1' }}
                      />
                    </div>
                  </div>

                  {/* Game Info */}
                  <div className="md:col-span-3 flex flex-col gap-4">
                    {/* Title & Time */}
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-pink-600 group-hover:bg-clip-text group-hover:text-transparent transition-all truncate">
                        {m.title || 'Live match'}
                      </h3>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Last move: {new Date(m.lastMoveAt).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* Status/Moves */}
                    {preview?.isCheckmate || preview?.status === 'CHECKMATE' ? (
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200">
                          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="font-bold text-red-700">Checkmate</span>
                          {preview?.matePattern && <span className="text-sm text-red-600">• {preview.matePattern}</span>}
                        </div>
                        {preview?.tactics?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {formatTactics(preview.tactics).map((t) => (
                              <span key={t.label} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200 px-3 py-1 text-xs font-semibold text-purple-700">
                                <span aria-hidden className="text-sm">{t.icon}</span>
                                <span>{t.label}</span>
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : preview?.moves?.length ? (
                      <div className="rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 px-4 py-3">
                        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Recent Moves</div>
                        <div className="text-sm font-mono text-gray-800">
                          {preview.moves.join(' • ')}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-500 italic">
                        Loading moves…
                      </div>
                    )}

                    {/* Captured pieces */}
                    {(preview?.capturedByWhite?.length || preview?.capturedByBlack?.length) ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 px-3 py-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">♔</span>
                            <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">White +</span>
                          </div>
                          <div className="flex flex-wrap gap-1 text-xl">
                            {(preview.capturedByWhite || []).map((s, i) => (
                              <span key={`wcap-${i}`} className="leading-none">{s}</span>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-pink-100/50 border border-pink-200 px-3 py-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">♚</span>
                            <span className="text-xs font-bold text-pink-700 uppercase tracking-wide">Black +</span>
                          </div>
                          <div className="flex flex-wrap gap-1 text-xl">
                            {(preview.capturedByBlack || []).map((s, i) => (
                              <span key={`bcap-${i}`} className="leading-none">{s}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* CTA */}
                    <div className="inline-flex items-center gap-2 text-purple-700 font-semibold group-hover:gap-3 transition-all">
                      {preview?.isCheckmate || preview?.status === 'CHECKMATE' ? (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Review Game
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                          Watch Live
                        </>
                      )}
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
