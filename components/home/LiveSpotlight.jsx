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
    <section className="py-10 bg-gradient-to-b from-white to-purple-50">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-purple-700">Now Playing</div>
            <h2 className="text-2xl font-bold text-gray-900">Live Spotlight</h2>
          </div>
          <Link href="/live" className="text-purple-700 hover:underline text-sm">See all</Link>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((m) => {
            const preview = previews[m.id];
            return (
              <Link key={m.id} href={m.href} className="group rounded-2xl border bg-white p-4 shadow hover:shadow-lg transition">
                <div className="grid grid-cols-5 gap-4 items-center">
                  <div className="col-span-2">
                    <div className="rounded-lg overflow-hidden border">
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
                  <div className="col-span-3 min-w-0">
                    <div className="font-medium truncate group-hover:text-purple-700">{m.title || 'Live match'}</div>
                    <div className="text-xs text-gray-500 mb-2">Last move: {new Date(m.lastMoveAt).toLocaleTimeString()}</div>
                    {preview?.isCheckmate || preview?.status === 'CHECKMATE' ? (
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 text-xs font-medium text-red-600">
                          <span className="inline-block rounded-full bg-red-50 px-2 py-0.5 border border-red-200">Checkmate</span>
                          {preview?.matePattern && <span>{preview.matePattern}</span>}
                        </div>
                        {preview?.tactics?.length ? (
                          <div className="text-xs text-gray-700 flex flex-wrap gap-1">
                            {formatTactics(preview.tactics).map((t) => (
                              <span key={t.label} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 border border-gray-200">
                                <span aria-hidden>{t.icon}</span>
                                <span>{t.label}</span>
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : preview?.moves?.length ? (
                      <div className="text-xs text-gray-700 line-clamp-2">
                        {preview.moves.join(' ')}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">Loading moves…</div>
                    )}
                    {/* Captured pieces */}
                    {(preview?.capturedByWhite?.length || preview?.capturedByBlack?.length) ? (
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <span className="font-medium">White +</span>
                          <div className="flex flex-wrap gap-1">
                            {(preview.capturedByWhite || []).map((s, i) => (
                              <span key={`wcap-${i}`} className="leading-none">{s}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <span className="font-medium">Black +</span>
                          <div className="flex flex-wrap gap-1">
                            {(preview.capturedByBlack || []).map((s, i) => (
                              <span key={`bcap-${i}`} className="leading-none">{s}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-3 text-purple-700 text-sm">{preview?.isCheckmate || preview?.status === 'CHECKMATE' ? 'Review' : 'Watch'}</div>
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
