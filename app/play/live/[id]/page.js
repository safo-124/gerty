'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import LiveBoard from '@/components/LiveBoard';

export default function LivePlayPage({ params }) {
  const { id } = use(params);
  const search = useSearchParams();
  const token = search.get('t');
  const tc = Number(search.get('tc') || '0'); // seconds
  const inc = Number(search.get('inc') || '0'); // seconds per move
  const [match, setMatch] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [legalTargets, setLegalTargets] = useState([]);
  const [clock, setClock] = useState(null);

  const fen = match?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const gameOver = match && match.status !== 'ONGOING';
  const whiteMsRef = useRef(Math.max(0, tc) * 1000);
  const blackMsRef = useRef(Math.max(0, tc) * 1000);
  const lastSeenMoveAtRef = useRef(null);
  const lastSeenTurnRef = useRef(null);

  const beep = useCallback(() => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      o.start();
      o.stop(ctx.currentTime + 0.16);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    try {
      const url = token ? `/api/live/${id}?t=${encodeURIComponent(token)}` : `/api/live/${id}`;
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
  setMatch(data.match);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    load();
    const int = setInterval(load, 1500);
    const sec = setInterval(() => setTick((t) => t + 1), 1000);
    return () => { clearInterval(int); clearInterval(sec); };
  }, [load]);

  // Clock accounting when we detect a new move (lastMoveAt changes)
  const matchLastAt = match?.lastMoveAt;
  const matchTurn = match?.turn;

  useEffect(() => {
    if (!matchLastAt || !tc) return;
    const lastAt = new Date(matchLastAt).getTime();
    if (lastSeenMoveAtRef.current == null) {
      lastSeenMoveAtRef.current = lastAt;
      lastSeenTurnRef.current = matchTurn;
      return;
    }
    if (lastSeenMoveAtRef.current !== lastAt) {
      // Someone just moved; the mover is the opposite of current turn
      const mover = matchTurn === 'w' ? 'b' : 'w';
      const elapsed = Math.max(0, lastAt - (lastSeenMoveAtRef.current || lastAt));
      if (mover === 'w') {
        whiteMsRef.current = Math.max(0, whiteMsRef.current - elapsed + inc * 1000);
      } else {
        blackMsRef.current = Math.max(0, blackMsRef.current - elapsed + inc * 1000);
      }
      lastSeenMoveAtRef.current = lastAt;
      lastSeenTurnRef.current = matchTurn;
    }
  }, [matchLastAt, matchTurn, tc, inc]);

  // Update display clocks every second while active
  useEffect(() => {
    if (!tc) return;
    const now = Date.now();
    const lastAt = matchLastAt ? new Date(matchLastAt).getTime() : now;
    const w = matchTurn === 'w' ? Math.max(0, whiteMsRef.current - (now - lastAt)) : whiteMsRef.current;
    const b = matchTurn === 'b' ? Math.max(0, blackMsRef.current - (now - lastAt)) : blackMsRef.current;
    setClock({ w, b });
  }, [tick, tc, matchLastAt, matchTurn]);

  function fmtClock(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    const ss = (s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
  }

  const onDrop = useCallback(async (sourceSquare, targetSquare) => {
    if (!token) return false; // spectator
    if (gameOver) return false;
    try {
      const res = await fetch(`/api/live/${id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, from: sourceSquare, to: targetSquare }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid move');
  setMatch(data.match);
  beep();
      return true;
    } catch (e) {
      alert(e.message);
      return false;
    }
  }, [id, token, gameOver, beep]);

  async function offerDraw() {
    if (!token || gameOver) return;
    const res = await fetch(`/api/live/${id}/offer-draw`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Failed to offer/accept draw');
    setMatch(data.match);
  }

  async function declineDraw() {
    if (!token || gameOver) return;
    const res = await fetch(`/api/live/${id}/decline-draw`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Failed to decline draw');
    setMatch(data.match);
  }

  async function resign() {
    if (!token || gameOver) return;
    if (!confirm('Are you sure you want to resign?')) return;
    const res = await fetch(`/api/live/${id}/resign`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Failed to resign');
    setMatch(data.match);
  }

  const boardOrientation = useMemo(() => {
    return match?.side === 'b' ? 'black' : 'white';
  }, [match?.side]);

  const lastMove = useMemo(() => {
    if (match?.lastMoveFrom && match?.lastMoveTo) return { from: match.lastMoveFrom, to: match.lastMoveTo };
    return null;
  }, [match?.lastMoveFrom, match?.lastMoveTo]);

  const isAIControlledSide = useMemo(() => {
    if (!match?.ai || !token) return false;
    return match?.side && match?.aiSide && match.side === match.aiSide;
  }, [match?.ai, match?.aiSide, match?.side, token]);

  function formatElapsed(dateLike) {
    if (!dateLike) return '—';
    const ms = Date.now() - new Date(dateLike).getTime();
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    const ss = (s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
  }

  

  const onSelect = useCallback(async (square) => {
    try {
      const res = await fetch(`/api/live/${id}/legal-moves?s=${encodeURIComponent(square)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setLegalTargets(data.targets || []);
    } catch {
      setLegalTargets([]);
    }
  }, [id]);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-2">Live match</h1>
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border p-3 bg-white/60 dark:bg-gray-900/60">
            <LiveBoard
              fen={fen}
              onMove={(from, to) => onDrop(from, to)}
              onSelect={onSelect}
              legalTargets={legalTargets}
              arePiecesDraggable={!!token && !gameOver && !isAIControlledSide}
              boardOrientation={boardOrientation}
              side={match?.side}
              lastMove={lastMove}
            />
          </div>
          <div className="rounded-2xl border p-4">
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">ID:</span> {id}</div>
              {match?.title && <div><span className="font-medium">Title:</span> {match.title}</div>}
              <div><span className="font-medium">Status:</span> {match.status}</div>
              {match?.result && <div><span className="font-medium">Result:</span> {match.result}</div>}
              {match?.ai && (
                <div className="text-purple-700">Playing vs AI{match.aiLevel ? ` (Level ${match.aiLevel})` : ''}.</div>
              )}
              <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border px-3 py-2">Game time: {formatElapsed(match?.createdAt)} </div>
                <div className="rounded-xl border px-3 py-2">Move time: {formatElapsed(match?.lastMoveAt)} </div>
              </div>
              {tc ? (
                <div className="pt-2 grid grid-cols-2 gap-2 text-sm">
                  <div className={`rounded-xl border px-3 py-2 ${match?.turn==='w' ? 'bg-emerald-50' : ''}`}>
                    <div className="font-medium">White</div>
                    <div className="text-lg tabular-nums">{fmtClock(clock?.w ?? 0)}</div>
                  </div>
                  <div className={`rounded-xl border px-3 py-2 ${match?.turn==='b' ? 'bg-emerald-50' : ''}`}>
                    <div className="font-medium">Black</div>
                    <div className="text-lg tabular-nums">{fmtClock(clock?.b ?? 0)}</div>
                  </div>
                </div>
              ) : null}
              {token ? (
                <>
                  {!match?.ai && match?.drawOffer && match.drawOffer !== match?.side && (
                    <div className="text-yellow-700">Opponent offered a draw.</div>
                  )}
                  {!gameOver && !match?.ai && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button onClick={offerDraw} className="rounded-xl border px-3 py-1 text-xs">{match?.drawOffer && match.drawOffer !== match?.side ? 'Accept Draw' : 'Offer Draw'}</button>
                      {match?.drawOffer && match.drawOffer !== match?.side && (
                        <button onClick={declineDraw} className="rounded-xl border px-3 py-1 text-xs">Decline Draw</button>
                      )}
                      <button onClick={resign} className="rounded-xl border px-3 py-1 text-xs text-red-700">Resign</button>
                    </div>
                  )}
                  {!gameOver && match?.ai && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button onClick={resign} className="rounded-xl border px-3 py-1 text-xs text-red-700">Resign</button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-gray-600">You are in spectator mode. Ask a player for their link to make moves.</div>
              )}
              <ShareSection id={id} token={token} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShareSection({ id, token }) {
  const [open, setOpen] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const spectatorUrl = `${origin}/play/live/${id}`;
  const playerUrl = token ? `${origin}/play/live/${id}?t=${encodeURIComponent(token)}` : '';

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); alert('Copied!'); } catch {}
  }

  return (
    <div className="pt-3">
      <button onClick={() => setOpen(true)} className="rounded-xl border px-3 py-1 text-xs">Share</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Share match</div>
              <button onClick={() => setOpen(false)} className="text-sm">✕</button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Spectator link</div>
                <div className="flex items-center gap-2 mt-1">
                  <input readOnly value={spectatorUrl} className="flex-1 rounded-xl border px-2 py-1" />
                  <button onClick={() => copy(spectatorUrl)} className="rounded-xl border px-3 py-1">Copy</button>
                </div>
              </div>
              {playerUrl && (
                <div>
                  <div className="font-medium">Your player link</div>
                  <div className="flex items-center gap-2 mt-1">
                    <input readOnly value={playerUrl} className="flex-1 rounded-xl border px-2 py-1" />
                    <button onClick={() => copy(playerUrl)} className="rounded-xl border px-3 py-1">Copy</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
