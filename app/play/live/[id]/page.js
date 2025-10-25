'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { useSearchParams } from 'next/navigation';
import LiveBoard from '@/components/LiveBoard';

export default function LivePlayPage({ params }) {
  const { id } = use(params);
  const search = useSearchParams();
  const token = search.get('t');
  // Prefer server-provided time controls over URL hints
  const urlTc = Number(search.get('tc') || '0'); // optional hint
  const urlInc = Number(search.get('inc') || '0'); // optional hint
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
  const timed = (match?.tcSeconds ?? urlTc ?? 0) > 0;
  const incSeconds = match?.incSeconds ?? urlInc ?? 0;
  const whiteMsRef = useRef(0);
  const blackMsRef = useRef(0);
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

  // Sync local clock refs when we first load or when server clock values change
  useEffect(() => {
    if (!match) return;
    if (!timed) { setClock(null); return; }
    const w = Number(match.whiteTimeMs) || Math.max(0, (match.tcSeconds || urlTc || 0) * 1000);
    const b = Number(match.blackTimeMs) || Math.max(0, (match.tcSeconds || urlTc || 0) * 1000);
    whiteMsRef.current = Math.max(0, w);
    blackMsRef.current = Math.max(0, b);
    try {
      const lastAt = match.lastMoveAt ? new Date(match.lastMoveAt).getTime() : Date.now();
      lastSeenMoveAtRef.current = lastAt;
      lastSeenTurnRef.current = match.turn;
    } catch {}
  }, [match, urlTc, urlInc, timed]);

  useEffect(() => {
    if (!matchLastAt || !timed) return;
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
        whiteMsRef.current = Math.max(0, whiteMsRef.current - elapsed + incSeconds * 1000);
      } else {
        blackMsRef.current = Math.max(0, blackMsRef.current - elapsed + incSeconds * 1000);
      }
      lastSeenMoveAtRef.current = lastAt;
      lastSeenTurnRef.current = matchTurn;
    }
  }, [matchLastAt, matchTurn, timed, incSeconds]);

  // Update display clocks every second while active
  useEffect(() => {
    if (!timed) return;
    const now = Date.now();
    const lastAt = matchLastAt ? new Date(matchLastAt).getTime() : now;
    const w = matchTurn === 'w' ? Math.max(0, whiteMsRef.current - (now - lastAt)) : whiteMsRef.current;
    const b = matchTurn === 'b' ? Math.max(0, blackMsRef.current - (now - lastAt)) : blackMsRef.current;
    setClock({ w, b });
  }, [tick, timed, matchLastAt, matchTurn]);

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
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 relative overflow-hidden">
      {/* Animated background patterns */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-pink-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="relative container max-w-7xl mx-auto px-4 py-8">
        {/* Hero Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-xs font-medium text-purple-700 uppercase tracking-wider">Live Match</span>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
            {match?.title || 'Live Chess Game'}
          </h1>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-red-50/80 backdrop-blur-sm border border-red-200 p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-700 font-medium">{error}</span>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-purple-100 shadow-xl">
              <div className="w-5 h-5 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-700 font-medium">Loading match...</span>
            </div>
          </div>
        ) : (
  <div className="grid md:grid-cols-2 lg:grid-cols-[1.6fr_1fr] xl:grid-cols-[1.75fr_1fr] gap-6">
          <div className="rounded-3xl border border-purple-100 p-4 md:p-5 bg-white/80 backdrop-blur-md shadow-xl hover:shadow-2xl transition-shadow duration-500">
            {/* Board container with gradient accents */}
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative flex items-stretch">
              {/* Left gutter: pieces captured by White (i.e., Black pieces) */}
              <div className="w-10 mr-2 hidden sm:flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-gradient-to-b from-purple-50 to-pink-50" aria-label="White captured pieces">
                {(captures.byWhite || []).map((s, i) => (
                  <span key={`wside-${i}`} className="text-lg leading-none drop-shadow-sm">{s}</span>
                ))}
              </div>
              <div className="flex-1 rounded-2xl overflow-hidden shadow-2xl border-2 border-purple-100">
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
              <div className="w-10 ml-2 hidden sm:flex flex-col items-center justify-center gap-1.5 p-2 rounded-2xl bg-gradient-to-b from-purple-50 to-pink-50" aria-label="Black captured pieces">
                {(captures.byBlack || []).map((s, i) => (
                  <span key={`bside-${i}`} className="text-lg leading-none drop-shadow-sm">{s}</span>
                ))}
              </div>
            </div>
            </div>
          </div>
          <div className="rounded-3xl border border-purple-100 p-4 lg:p-4 xl:p-5 bg-white/85 backdrop-blur-md shadow-xl hover:shadow-2xl transition-shadow duration-500">
            <div className="space-y-4 text-sm">
              {/* Match Title and Status */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 truncate">
                  {match?.title ? (
                    <div className="font-bold text-lg text-gray-900">{match.title}</div>
                  ) : (
                    <div className="text-gray-600">
                      <span className="text-xs uppercase tracking-wide">Match ID</span>
                      <div className="font-mono text-xs mt-0.5 text-gray-500">{id}</div>
                    </div>
                  )}
                </div>
                <div>
                  {(() => {
                    const st = match?.status || '—';
                    const configs = {
                      'ONGOING': 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 border-emerald-300 shadow-sm',
                      'CHECKMATE': 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border-red-300 shadow-sm',
                      'DRAW': 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border-indigo-300 shadow-sm',
                      'default': 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-300'
                    };
                    const color = configs[st] || configs['default'];
                    return (
                      <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide border-2 ${color}`}>
                        {st === 'ONGOING' && (
                          <span className="relative flex h-2 w-2 mr-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </span>
                        )}
                        {st}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Result */}
              {match?.result && (
                <div className="rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-purple-700 font-semibold mb-1">Result</div>
                  <div className="text-lg font-bold text-gray-900">{match.result}</div>
                </div>
              )}

              {/* AI Info */}
              {match?.ai && (
                <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-amber-700" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 3v2H5v2h1v7a4 4 0 003.595 3.98C9.212 19.2 9 20.57 9 22h2c0-1.5.5-3 2-4 1.5 1 2 2.5 2 4h2c0-1.43-.212-2.8-.595-4.02A4 4 0 0019 14V7h1V5h-4V3h-2v2h-2V3H9zm2 4h2v7c0 1.11-.89 2-2 2s-2-.89-2-2V7h2z"/>
                    </svg>
                    <span className="text-sm font-bold text-amber-800">Playing vs AI{match.aiLevel ? ` Level ${match.aiLevel}` : ''}</span>
                  </div>
                  <div className="text-xs text-amber-700 space-y-1">
                    {match.aiStyleWhite && <div><span className="font-semibold">White AI:</span> {match.aiStyleWhite}</div>}
                    {match.aiStyleBlack && <div><span className="font-semibold">Black AI:</span> {match.aiStyleBlack}</div>}
                  </div>
                </div>
              )}

              {/* Checkmate Details */}
              {match?.status === 'CHECKMATE' && (
                <div className="rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 px-4 py-3 shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div className="font-bold text-red-700">Checkmate!</div>
                  </div>
                  <div className="space-y-2 text-xs">
                    {match?.result && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/60">
                        <span className="text-gray-600 font-medium">Winner:</span>
                        <span className="font-bold text-gray-900">
                          {match.result === '1-0' ? 'White' : match.result === '0-1' ? 'Black' : '—'}
                          {match?.ai && (
                            <span className="text-xs text-gray-600">
                              {' '}({match.result === '1-0' ? (match.aiStyleWhite || '—') : (match.aiStyleBlack || '—')})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    {match?.matePattern && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/60">
                        <span className="text-gray-600 font-medium">Pattern:</span>
                        <span className="font-bold text-gray-900">{match.matePattern}</span>
                      </div>
                    )}
                    {Array.isArray(match?.tactics) && match.tactics.length > 0 && (
                      <div className="p-2 rounded-lg bg-white/60">
                        <div className="text-gray-600 font-medium mb-1">Tactics:</div>
                        <div className="flex flex-wrap gap-1">
                          {match.tactics.map((t, i) => (
                            <span key={i} className="inline-flex px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold uppercase tracking-wide">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Time Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-white to-purple-50/30 px-4 py-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-semibold text-purple-700">Game Time</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900 tabular-nums">{formatElapsed(match?.createdAt)}</div>
                </div>
                <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-white to-pink-50/30 px-4 py-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-xs font-semibold text-pink-700">Move Time</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900 tabular-nums">{formatElapsed(match?.lastMoveAt)}</div>
                </div>
              </div>

              {/* Player Clocks */}
              {timed ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-2xl border-2 px-4 py-3 transition-all duration-300 ${
                    match?.turn==='w' 
                      ? 'bg-gradient-to-br from-emerald-100 to-green-100 border-emerald-400 shadow-lg ring-2 ring-emerald-300 animate-pulse' 
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">♔</span>
                      <span className="font-bold text-gray-900">White</span>
                    </div>
                    <div className="text-2xl font-bold tabular-nums text-gray-900">{fmtClock(clock?.w ?? (match?.whiteTimeMs || 0))}</div>
                  </div>
                  <div className={`rounded-2xl border-2 px-4 py-3 transition-all duration-300 ${
                    match?.turn==='b' 
                      ? 'bg-gradient-to-br from-emerald-100 to-green-100 border-emerald-400 shadow-lg ring-2 ring-emerald-300 animate-pulse' 
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">♚</span>
                      <span className="font-bold text-gray-900">Black</span>
                    </div>
                    <div className="text-2xl font-bold tabular-nums text-gray-900">{fmtClock(clock?.b ?? (match?.blackTimeMs || 0))}</div>
                  </div>
                </div>
              ) : null}

              {/* Admin Controls */}
              {admin && (
                <div className="pt-2">
                  <button onClick={resetAll} className="rounded-full bg-red-50 border-2 border-red-200 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 hover:border-red-300 transition-all shadow-sm">
                    🔄 Reset ALL matches/games
                  </button>
                </div>
              )}

              {/* Moves list + PGN/FEN actions and view toggles */}
              <div className="pt-2" id="moves">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="font-bold text-gray-900 shrink-0">📋 Moves</div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <div className="hidden sm:flex rounded-full border-2 border-purple-200 p-1 text-xs bg-white/90 shadow-sm">
                      <button className={`px-3 py-1.5 rounded-full font-medium transition-all ${movesView==='table' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' : 'hover:bg-purple-50'}`} onClick={() => setMovesView('table')} aria-pressed={movesView==='table'}>Table</button>
                      <button className={`px-3 py-1.5 rounded-full font-medium transition-all ${movesView==='cards' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' : 'hover:bg-purple-50'}`} onClick={() => setMovesView('cards')} aria-pressed={movesView==='cards'}>Cards</button>
                      <button className={`px-3 py-1.5 rounded-full font-medium transition-all ${movesView==='grid' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' : 'hover:bg-purple-50'}`} onClick={() => setMovesView('grid')} aria-pressed={movesView==='grid'}>Grid</button>
                      <button className={`px-3 py-1.5 rounded-full font-medium transition-all ${movesView==='split' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' : 'hover:bg-purple-50'}`} onClick={() => setMovesView('split')} aria-pressed={movesView==='split'}>Split</button>
                      <button className={`px-3 py-1.5 rounded-full font-medium transition-all ${movesView==='condensed' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' : 'hover:bg-purple-50'}`} onClick={() => setMovesView('condensed')} aria-pressed={movesView==='condensed'}>Compact</button>
                    </div>
                    <div className="sm:hidden">
                      <select aria-label="Select moves view" value={movesView} onChange={(e) => setMovesView(e.target.value)} className="rounded-full border-2 border-purple-200 px-3 py-1.5 text-xs bg-white font-medium shadow-sm">
                        <option value="table">Table</option>
                        <option value="cards">Cards</option>
                        <option value="grid">Grid</option>
                        <option value="split">Split</option>
                        <option value="condensed">Compact</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setShowAllMoves((v) => !v)} className={`rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition-all shadow-sm ${showAllMoves ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-400' : 'border-purple-200 hover:bg-purple-50'}`} title={showAllMoves ? 'Collapse moves' : 'Show all moves'}>
                        {showAllMoves ? '📖 All' : '📄 Few'}
                      </button>
                      <button onClick={copyPgn} aria-label="Copy PGN" title="Copy PGN" className="rounded-full border-2 border-purple-200 p-2 hover:bg-purple-50 transition-all shadow-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-700"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      </button>
                      <button onClick={downloadPgn} aria-label="Download PGN" title="Download PGN" className="rounded-full border-2 border-purple-200 p-2 hover:bg-purple-50 transition-all shadow-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-700"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </button>
                      <button onClick={copyFen} aria-label="Copy FEN" title="Copy FEN" className="rounded-full border-2 border-pink-200 p-2 hover:bg-pink-50 transition-all shadow-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-700"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      </button>
                      <button onClick={downloadFen} aria-label="Download FEN" title="Download FEN" className="rounded-full border-2 border-pink-200 p-2 hover:bg-pink-50 transition-all shadow-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-700"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </button>
                      <button onClick={() => {
                        try {
                          const origin = window.location.origin;
                          const base = `${origin}/play/live/${id}`;
                          const url = `${base}?view=condensed&showMoves=all#moves`;
                          navigator.clipboard.writeText(url);
                          alert('Link copied');
                        } catch {}
                      }} aria-label="Copy PGN link" title="Copy PGN link with moves" className="rounded-full border-2 border-purple-200 p-2 hover:bg-purple-50 transition-all shadow-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-700"><path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1"/><path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 1 1-7-7l1-1"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div ref={movesRef} className={`${showAllMoves ? 'max-h-none overflow-visible' : 'max-h-64 overflow-auto'} rounded-2xl border-2 border-purple-100 bg-white/90 backdrop-blur-sm shadow-inner`}>
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
                    <div className="rounded-2xl bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 px-4 py-3 shadow-lg">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="font-bold text-yellow-800">Opponent offered a draw</span>
                      </div>
                    </div>
                  )}
                  {!gameOver && !match?.ai && (
                    <div className="flex flex-wrap gap-3 pt-3">
                      <button onClick={offerDraw} className="rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2.5 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        {match?.drawOffer && match.drawOffer !== match?.side ? 'Accept Draw' : 'Offer Draw'}
                      </button>
                      {match?.drawOffer && match.drawOffer !== match?.side && (
                        <button onClick={declineDraw} className="rounded-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-2.5 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                          Decline Draw
                        </button>
                      )}
                      <button onClick={resign} className="rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white px-6 py-2.5 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Resign
                      </button>
                    </div>
                  )}
                  {!gameOver && match?.ai && (
                    <div className="flex flex-wrap gap-3 pt-3">
                      <button onClick={resign} className="rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white px-6 py-2.5 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Resign
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 px-4 py-3 shadow-md">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-700 font-medium">You are in spectator mode. Ask a player for their link to make moves.</span>
                  </div>
                </div>
              )}
              <ShareSection id={id} token={token} />
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
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
    <div className="pt-4">
      <button onClick={() => setOpen(true)} className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2.5 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Share Match
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md mx-4 rounded-3xl bg-white/95 backdrop-blur-md p-6 shadow-2xl border border-purple-100 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Share Match</span>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full hover:bg-gray-100 p-2 transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                  </svg>
                  <span className="font-bold text-blue-900">Spectator Link</span>
                </div>
                <div className="flex items-center gap-2">
                  <input readOnly value={spectatorUrl} className="flex-1 rounded-xl border-2 border-blue-200 px-3 py-2 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <button onClick={() => copy(spectatorUrl)} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </button>
                </div>
                <p className="text-xs text-blue-700 mt-2">Anyone with this link can watch the game</p>
              </div>
              {playerUrl && (
                <div className="rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="font-bold text-purple-900">Your Player Link</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input readOnly value={playerUrl} className="flex-1 rounded-xl border-2 border-purple-200 px-3 py-2 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                    <button onClick={() => copy(playerUrl)} className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-purple-700 mt-2">🔒 Keep this private - allows playing moves</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
