'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
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
  const [admin, setAdmin] = useState(false);

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
    try {
      const a = search.get('admin');
      if (a === '1' || a === 'true') setAdmin(true);
    } catch {}
    return () => { clearInterval(int); clearInterval(sec); };
  }, [load, search]);

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

  const captures = useMemo(() => computeCapturedFromFen(fen), [fen]);

  // Build move list from PGN
  const movePairs = useMemo(() => {
    try {
      if (!match?.pgn) return [];
      const c = new Chess();
      c.loadPgn(match.pgn);
      const san = c.history();
      const pairs = [];
      for (let i = 0; i < san.length; i += 2) {
        const num = i / 2 + 1;
        const white = san[i] || '';
        const black = san[i + 1] || '';
        pairs.push({ num, white, black });
      }
      return pairs;
    } catch { return []; }
  }, [match?.pgn]);

  // Auto-scroll moves panel to bottom when new moves arrive
  const movesRef = useRef(null);
  useEffect(() => {
    const el = movesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [movePairs.length]);

  // Moves view style state

  const copyPgn = useCallback(async () => {
    try {
      if (!match?.pgn) return alert('No PGN available.');
      await navigator.clipboard.writeText(match.pgn);
      alert('PGN copied to clipboard');
    } catch {
      alert('Copy failed');
    }
  }, [match?.pgn]);

  const downloadPgn = useCallback(() => {
    try {
      if (!match?.pgn) return alert('No PGN available.');
      const blob = new Blob([match.pgn], { type: 'application/x-chess-pgn' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const name = `live-${id}-${new Date().toISOString().replace(/[:.]/g, '-')}.pgn`;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert('Download failed');
    }
  }, [match?.pgn, id]);

  const copyFen = useCallback(async () => {
    try {
      if (!fen) return alert('No FEN available.');
      await navigator.clipboard.writeText(fen);
      alert('FEN copied to clipboard');
    } catch {
      alert('Copy failed');
    }
  }, [fen]);

  const downloadFen = useCallback(() => {
    try {
      if (!fen) return alert('No FEN available.');
      const blob = new Blob([fen], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const name = `live-${id}-${new Date().toISOString().replace(/[:.]/g, '-')}.fen`;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert('Download failed');
    }
  }, [fen, id]);

  // Helpers: SAN -> piece type and icon
  function pieceFromSan(san) {
    if (!san) return 'P';
    if (san.startsWith('O-O')) return 'K'; // castles by king
    const ch = san[0];
    if ('KQRBN'.includes(ch)) return ch;
    return 'P';
  }

  function pieceIcon(piece, color) {
    // Minimal vector sprite: circle with letter for unified styling
    const letter = piece || 'P';
    const fill = color === 'black' ? '#111827' : '#FFFFFF';
    const stroke = color === 'black' ? '#111827' : '#111827';
    const text = color === 'black' ? '#FFFFFF' : '#111827';
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill={fill} stroke={stroke} strokeWidth="1.5" />
        <text x="12" y="16" textAnchor="middle" fontSize="12" fontFamily="ui-sans-serif, system-ui" fill={text}>{letter}</text>
      </svg>
    );
  }

  function describeSan(san) {
    try {
      if (!san) return 'No move';
      if (san.startsWith('O-O-O')) return 'Castle long';
      if (san.startsWith('O-O')) return 'Castle short';
      const map = { K:'King', Q:'Queen', R:'Rook', B:'Bishop', N:'Knight' };
      let piece = 'Pawn';
      let i = 0;
      if ('KQRBN'.includes(san[0])) { piece = map[san[0]]; i = 1; }
      const isCapture = san.includes('x');
      const promoMatch = san.match(/=([QRBN])/);
      const toSqMatch = san.match(/([a-h][1-8])/g);
      const toSq = toSqMatch ? toSqMatch[toSqMatch.length - 1] : '';
      const suffix = san.endsWith('#') ? ' checkmate' : san.endsWith('+') ? ' check' : '';
      const promo = promoMatch ? ` promoting to ${map[promoMatch[1]]}` : '';
      const action = isCapture ? 'takes on' : 'to';
      return `${piece} ${action} ${toSq}${promo}${suffix}`.trim();
    } catch { return san; }
  }

  function MoveCell({ san, color }) {
    const p = pieceFromSan(san);
    const icon = pieceIcon(p, color);
    return (
      <span className="inline-flex items-center gap-1" title={describeSan(san)} aria-label={describeSan(san)}>
        {icon ? <span aria-hidden="true" className="leading-none">{icon}</span> : null}
        <span>{san || '—'}</span>
      </span>
    );
  }
  const [movesView, setMovesView] = useState('table'); // 'table' | 'cards' | 'grid' | 'split' | 'condensed'
  const [showAllMoves, setShowAllMoves] = useState(false);

  // Initialize from URL params for sharing
  useEffect(() => {
    try {
      const v = search.get('view');
      if (v && ['table','cards','grid','split','condensed'].includes(v)) setMovesView(v);
      const s = search.get('showMoves');
      if (s === 'all') setShowAllMoves(true);
    } catch {}
  }, [search]);

  async function resetAll() {
    if (!admin) return;
    if (!confirm('Reset ALL live matches and tournament games to starting position?')) return;
    try {
      const res = await fetch('/api/admin/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset');
      alert(`Reset done. Live matches: ${data.counts?.live ?? 0}, tournament games: ${data.counts?.games ?? 0}`);
      load();
    } catch (e) {
      alert(e.message || 'Reset failed');
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-3">Live match</h1>
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      {loading ? (
        <div>Loading…</div>
      ) : (
  <div className="grid md:grid-cols-2 lg:grid-cols-[1.6fr_1fr] xl:grid-cols-[1.75fr_1fr] gap-6">
          <div className="rounded-2xl border p-3 bg-white/50 dark:bg-gray-900/40 backdrop-blur-md shadow-lg">
            <div className="flex items-stretch">
              {/* Left gutter: pieces captured by White (i.e., Black pieces) */}
              <div className="w-10 mr-2 hidden sm:flex flex-col items-center justify-center gap-1" aria-label="White captured pieces">
                {(captures.byWhite || []).map((s, i) => (
                  <span key={`wside-${i}`} className="text-base leading-none">{s}</span>
                ))}
              </div>
              <div className="flex-1">
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
              {/* Right gutter: pieces captured by Black (i.e., White pieces) */}
              <div className="w-10 ml-2 hidden sm:flex flex-col items-center justify-center gap-1" aria-label="Black captured pieces">
                {(captures.byBlack || []).map((s, i) => (
                  <span key={`bside-${i}`} className="text-base leading-none">{s}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border p-3 lg:p-3 xl:p-4 bg-white/55 dark:bg-gray-900/50 backdrop-blur-md shadow-lg">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="truncate">
                  {match?.title ? (
                    <div className="font-medium">{match.title}</div>
                  ) : (
                    <div className="text-gray-700">Match ID: <span className="font-mono text-xs">{id}</span></div>
                  )}
                </div>
                <div>
                  {(() => {
                    const st = match?.status || '—';
                    const color = st === 'ONGOING' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : st === 'CHECKMATE' ? 'bg-red-50 text-red-700 border-red-200' : st === 'DRAW' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-700 border-gray-200';
                    return (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${color}`}>
                        {st}
                      </span>
                    );
                  })()}
                </div>
              </div>
              {match?.result && <div className="text-sm"><span className="font-medium">Result:</span> {match.result}</div>}
              {match?.ai && (
                <div className="text-purple-700 space-y-1">
                  <div>Playing vs AI{match.aiLevel ? ` (Level ${match.aiLevel})` : ''}.</div>
                  <div className="text-xs text-gray-600">
                    {match.aiStyleWhite && <span className="mr-3">White AI style: {match.aiStyleWhite}</span>}
                    {match.aiStyleBlack && <span>Black AI style: {match.aiStyleBlack}</span>}
                  </div>
                </div>
              )}
              {match?.status === 'CHECKMATE' && (
                <div className="rounded-xl border bg-red-50 text-red-700 px-3 py-2 text-xs shadow-inner">
                  <div className="font-medium">Checkmate</div>
                  <div className="mt-1 space-y-1">
                    {match?.result && (
                      <div>
                        Winner: {match.result === '1-0' ? 'White' : match.result === '0-1' ? 'Black' : '—'}
                        {match?.ai && (
                          <>
                            {' '}(
                            style: {match.result === '1-0' ? (match.aiStyleWhite || '—') : (match.aiStyleBlack || '—')}
                            )
                          </>
                        )}
                      </div>
                    )}
                    {match?.matePattern && <div>Technique: {match.matePattern}</div>}
                    {Array.isArray(match?.tactics) && match.tactics.length > 0 && (
                      <div>Tactics: {match.tactics.join(', ')}</div>
                    )}
                  </div>
                </div>
              )}
              <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border px-3 py-2">Game time: {formatElapsed(match?.createdAt)} </div>
                <div className="rounded-xl border px-3 py-2">Move time: {formatElapsed(match?.lastMoveAt)} </div>
              </div>
              {tc ? (
                <div className="pt-2 grid grid-cols-2 gap-2 text-sm">
                  <div className={`rounded-xl border px-3 py-2 ${match?.turn==='w' ? 'bg-emerald-50 ring-2 ring-emerald-200 shadow-sm animate-pulse' : ''}`}>
                    <div className="font-medium">White</div>
                    <div className="text-lg tabular-nums">{fmtClock(clock?.w ?? 0)}</div>
                  </div>
                  <div className={`rounded-xl border px-3 py-2 ${match?.turn==='b' ? 'bg-emerald-50 ring-2 ring-emerald-200 shadow-sm animate-pulse' : ''}`}>
                    <div className="font-medium">Black</div>
                    <div className="text-lg tabular-nums">{fmtClock(clock?.b ?? 0)}</div>
                  </div>
                </div>
              ) : null}
              {admin && (
                <div className="pt-2">
                  <button onClick={resetAll} className="rounded-full border px-3 py-1 text-xs text-red-700 hover:bg-red-50">Reset ALL matches/games</button>
                </div>
              )}
              {/* Moves list + PGN/FEN actions and view toggles */}
              <div className="pt-2" id="moves">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <div className="font-medium shrink-0">Moves</div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <div className="hidden sm:flex rounded-full border p-0.5 text-xs bg-white">
                      <button className={`px-2 py-1 rounded-full ${movesView==='table' ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`} onClick={() => setMovesView('table')} aria-pressed={movesView==='table'}>Table</button>
                      <button className={`px-2 py-1 rounded-full ${movesView==='cards' ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`} onClick={() => setMovesView('cards')} aria-pressed={movesView==='cards'}>Cards</button>
                      <button className={`px-2 py-1 rounded-full ${movesView==='grid' ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`} onClick={() => setMovesView('grid')} aria-pressed={movesView==='grid'}>Grid</button>
                      <button className={`px-2 py-1 rounded-full ${movesView==='split' ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`} onClick={() => setMovesView('split')} aria-pressed={movesView==='split'}>Split</button>
                      <button className={`px-2 py-1 rounded-full ${movesView==='condensed' ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`} onClick={() => setMovesView('condensed')} aria-pressed={movesView==='condensed'}>Condensed</button>
                    </div>
                    <div className="sm:hidden">
                      <select aria-label="Select moves view" value={movesView} onChange={(e) => setMovesView(e.target.value)} className="rounded-full border px-2 py-1 text-xs bg-white">
                        <option value="table">Table</option>
                        <option value="cards">Cards</option>
                        <option value="grid">Grid</option>
                        <option value="split">Split</option>
                        <option value="condensed">Condensed</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowAllMoves((v) => !v)} className={`rounded-full border px-2 py-1 text-xs ${showAllMoves ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`} title={showAllMoves ? 'Collapse moves' : 'Show all moves'}>
                        {showAllMoves ? 'All On' : 'All Off'}
                      </button>
                      <button onClick={copyPgn} aria-label="Copy PGN" title="Copy PGN" className="rounded-full border p-1.5 hover:bg-gray-50">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      </button>
                      <button onClick={downloadPgn} aria-label="Download PGN" title="Download PGN" className="rounded-full border p-1.5 hover:bg-gray-50">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </button>
                      <button onClick={copyFen} aria-label="Copy FEN" title="Copy FEN" className="rounded-full border p-1.5 hover:bg-gray-50">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      </button>
                      <button onClick={downloadFen} aria-label="Download FEN" title="Download FEN" className="rounded-full border p-1.5 hover:bg-gray-50">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </button>
                      <button onClick={() => {
                        try {
                          const origin = window.location.origin;
                          const base = `${origin}/play/live/${id}`;
                          const url = `${base}?view=condensed&showMoves=all#moves`;
                          navigator.clipboard.writeText(url);
                          alert('Link copied');
                        } catch {}
                      }} aria-label="Copy PGN link" title="Copy PGN link with moves" className="rounded-full border p-1.5 hover:bg-gray-50">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700"><path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1"/><path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 1 1-7-7l1-1"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div ref={movesRef} className={`${showAllMoves ? 'max-h-none overflow-visible' : 'max-h-56 overflow-auto'} rounded-xl border bg-white/70 backdrop-blur-sm`}
                >
                  {movePairs.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-500">No moves yet.</div>
                  ) : movesView === 'table' ? (
                    <table className="w-full text-xs">
                      <tbody>
                        {movePairs.map((p, idx) => {
                          const isLast = idx === movePairs.length - 1;
                          return (
                            <tr key={p.num} className={`${isLast ? 'bg-emerald-50/40' : 'odd:bg-gray-50'}`}>
                              <td className="px-2 py-1 text-gray-500 tabular-nums w-10">{p.num}.</td>
                              <td className="px-2 py-1"><MoveCell san={p.white} color="white" /></td>
                              <td className="px-2 py-1"><MoveCell san={p.black} color="black" /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : movesView === 'cards' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
                      {movePairs.map((p, idx) => (
                        <div key={p.num} className={`rounded-lg border px-3 py-2 text-xs bg-white ${idx===movePairs.length-1 ? 'ring-1 ring-emerald-200' : ''}`}>
                          <div className="text-gray-500 font-medium mb-1">{p.num}.</div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1"><span className="text-gray-500 mr-1">W:</span><MoveCell san={p.white} color="white" /></div>
                            <div className="flex items-center gap-1"><span className="text-gray-500 mr-1">B:</span><MoveCell san={p.black} color="black" /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : movesView === 'grid' ? (
                    <div className="px-2 py-2 text-xs leading-6">
                      {movePairs.map((p, idx) => (
                        <span key={p.num} className={`inline-flex items-center rounded-full border px-2 py-0.5 mr-2 mb-2 bg-white ${idx===movePairs.length-1 ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200'}`}>
                          <span className="text-gray-500 mr-1 tabular-nums">{p.num}.</span>
                          <span className="mr-1 inline-flex items-center gap-1"><MoveCell san={p.white} color="white" /></span>
                          <span className="text-gray-300">•</span>
                          <span className="ml-1 inline-flex items-center gap-1"><MoveCell san={p.black} color="black" /></span>
                        </span>
                      ))}
                    </div>
                  ) : movesView === 'condensed' ? (
                    <table className="w-full text-[11px]">
                      <tbody>
                        {movePairs.map((p, idx) => {
                          const isLast = idx === movePairs.length - 1;
                          return (
                            <tr key={p.num} className={`${isLast ? 'bg-emerald-50/40' : idx % 4 === 0 ? 'bg-gray-50/60' : ''}`}>
                              <td className="px-1 py-0.5 text-gray-500 tabular-nums w-8">{p.num}.</td>
                              <td className="px-1 py-0.5"><MoveCell san={p.white} color="white" /></td>
                              <td className="px-1 py-0.5"><MoveCell san={p.black} color="black" /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="grid grid-cols-2 gap-0">
                      <div>
                        <div className="sticky top-0 bg-white border-b px-3 py-1 text-[11px] font-medium text-gray-600">White</div>
                        <ul className="divide-y text-xs">
                          {movePairs.map((p, idx) => (
                            <li key={`w-${p.num}`} className={`px-3 py-1 ${idx===movePairs.length-1 && (p.white && !p.black) ? 'bg-emerald-50/40' : ''}`}>
                              <span className="text-gray-500 mr-1 tabular-nums">{p.num}.</span>
                              <MoveCell san={p.white} color="white" />
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="border-l">
                        <div className="sticky top-0 bg-white border-b px-3 py-1 text-[11px] font-medium text-gray-600">Black</div>
                        <ul className="divide-y text-xs">
                          {movePairs.map((p, idx) => (
                            <li key={`b-${p.num}`} className={`px-3 py-1 ${idx===movePairs.length-1 ? 'bg-emerald-50/40' : ''}`}>
                              <span className="text-gray-500 mr-1 tabular-nums">{p.num}.</span>
                              <MoveCell san={p.black} color="black" />
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {token ? (
                <>
                  {!match?.ai && match?.drawOffer && match.drawOffer !== match?.side && (
                    <div className="text-yellow-700">Opponent offered a draw.</div>
                  )}
                  {!gameOver && !match?.ai && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button onClick={offerDraw} className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50">{match?.drawOffer && match.drawOffer !== match?.side ? 'Accept Draw' : 'Offer Draw'}</button>
                      {match?.drawOffer && match.drawOffer !== match?.side && (
                        <button onClick={declineDraw} className="rounded-full border px-3 py-1 text-xs hover:bg-gray-50">Decline Draw</button>
                      )}
                      <button onClick={resign} className="rounded-full border px-3 py-1 text-xs text-red-700 hover:bg-red-50">Resign</button>
                    </div>
                  )}
                  {!gameOver && match?.ai && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button onClick={resign} className="rounded-full border px-3 py-1 text-xs text-red-700 hover:bg-red-50">Resign</button>
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
