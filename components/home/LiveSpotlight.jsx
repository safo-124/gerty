"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

export default function LiveSpotlight() {
  const [state, setState] = useState({ enabled: false, rotationSeconds: 300, items: [] });
  const [previews, setPreviews] = useState({}); // id -> { fen, pgn, moves: string[] }

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
          timer = setInterval(load, Math.max(15, Number(data.rotationSeconds || 300)) * 1000);
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
          updatePreview(item.id, fen, pgn);
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
          updatePreview(item.id, fen, pgn);
        }
      } catch {}
    }
    function updatePreview(id, fen, pgn) {
      if (cancelled) return;
      const moves = (() => {
        try {
          const c = new Chess();
          if (pgn) c.loadPgn(pgn);
          return c.history().slice(-8); // last N SAN moves
        } catch { return []; }
      })();
      setPreviews((prev) => ({ ...prev, [id]: { fen, pgn, moves } }));
    }

    const firstTwo = state.items?.slice(0, 2) || [];
    Promise.all(firstTwo.map(fetchPreview));
    return () => { cancelled = true; };
  }, [state.items]);

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
                    {preview?.moves?.length ? (
                      <div className="text-xs text-gray-700 line-clamp-2">
                        {preview.moves.join(' ')}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">Loading moves…</div>
                    )}
                    <div className="mt-3 text-purple-700 text-sm">Watch</div>
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
