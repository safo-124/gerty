'use client';

import { useEffect, useMemo, useState } from 'react';
import LiveBoard from '@/components/LiveBoard';

export default function TournamentGameSpectator({ params }) {
  const { id, gid } = params || {};
  const [data, setData] = useState({ game: null, error: '', loading: true });
  const [tick, setTick] = useState(0);

  const fen = data.game?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const lastMove = useMemo(() => {
    // Not storing last move squares on Game; leave null for now
    return null;
  }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`/api/tournaments/${encodeURIComponent(id)}/games/${encodeURIComponent(gid)}`, { cache: 'no-store' });
        const j = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(j.error || 'Failed');
        setData({ game: j.game, error: '', loading: false });
      } catch (e) {
        if (!alive) return;
        setData((d) => ({ ...d, error: e.message, loading: false }));
      }
    }
    load();
    const poll = setInterval(load, 1500);
    const sec = setInterval(() => setTick((t) => t + 1), 1000);
    return () => { alive = false; clearInterval(poll); clearInterval(sec); };
  }, [id, gid]);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-2">Tournament Game</h1>
      {/* Players header */}
      {data.game && (
        <div className="mb-3 rounded-xl border p-3 bg-white/70">
          <PlayersHeader game={data.game} tick={tick} />
        </div>
      )}
      {data.error && <div className="text-red-600 text-sm mb-2">{data.error}</div>}
      {data.loading ? (
        <div>Loading…</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border p-3 bg-white/60 dark:bg-gray-900/60">
            <LiveBoard
              fen={fen}
              onMove={() => false}
              onSelect={() => {}}
              legalTargets={[]}
              arePiecesDraggable={false}
              boardOrientation={'white'}
              side={'w'}
              lastMove={lastMove}
            />
          </div>
          <div className="rounded-2xl border p-4 text-sm">
            <div className="font-medium">{data.game?.tournament?.name || 'Tournament'}</div>
            <div className="text-gray-600">Game ID: {gid}</div>
            {data.game?.round != null && <div>Round: {data.game.round}</div>}
            <div>Status: {data.game?.status}</div>
            {data.game?.result && <div>Result: {data.game.result}</div>}
            <div className="mt-2 text-xs text-gray-500">Last move: {data.game?.lastMoveAt ? new Date(data.game.lastMoveAt).toLocaleTimeString() : '—'}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function ratingFor(user) {
  if (!user) return undefined;
  if (user?.trainerProfile?.rating != null) return user.trainerProfile.rating;
  if (user?.studentProfile?.currentRating != null) return user.studentProfile.currentRating;
  return undefined;
}

function countryFor(user) {
  if (!user) return undefined;
  return user?.trainerProfile?.country || user?.studentProfile?.country || undefined;
}

function countryCodeToFlagEmoji(code) {
  if (!code) return '';
  // Expect ISO 3166-1 alpha-2, convert to regional indicator symbols
  const cc = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '';
  const A = 0x1F1E6; // regional indicator 'A'
  return String.fromCodePoint(A + (cc.charCodeAt(0) - 65), A + (cc.charCodeAt(1) - 65));
}

function PlayersHeader({ game, tick }) {
  const w = game?.white;
  const b = game?.black;
  const wName = w?.name || 'White';
  const bName = b?.name || 'Black';
  const wRating = ratingFor(w);
  const bRating = ratingFor(b);
  const wCountry = countryFor(w);
  const bCountry = countryFor(b);
  const turn = game?.turn === 'b' ? 'Black' : 'White';
  const lastMoveAt = game?.lastMoveAt ? new Date(game.lastMoveAt).getTime() : null;
  const since = lastMoveAt ? Math.max(0, Math.floor((Date.now() - lastMoveAt) / 1000)) : 0;
  const mm = Math.floor(since / 60);
  const ss = String(since % 60).padStart(2, '0');
  const sinceText = `${mm}:${ss}`;

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between">
        <PlayerChip name={wName} rating={wRating} color="white" avatarUrl={w?.trainerProfile?.profileImage} country={wCountry} />
        <div className="text-gray-500">vs</div>
        <PlayerChip name={bName} rating={bRating} color="black" avatarUrl={b?.trainerProfile?.profileImage} country={bCountry} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="text-gray-600">{game?.tournament?.name || 'Tournament'}{game?.round != null ? ` — Round ${game.round}` : ''}</div>
        <div className="rounded-full border px-2 py-0.5 text-gray-700">
          Turn: <span className={turn === 'White' ? 'text-gray-900' : 'text-gray-500'}>White</span> / <span className={turn === 'Black' ? 'text-gray-900' : 'text-gray-500'}>Black</span>
          <span className="mx-2 text-gray-400">•</span>
          Since last move: <span className="tabular-nums">{sinceText}</span>
        </div>
      </div>
    </div>
  );
}

function initialsOf(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function PlayerChip({ name, rating, color, avatarUrl, country }) {
  const flag = countryCodeToFlagEmoji(country);
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${color === 'white' ? 'bg-gray-900' : 'bg-gray-300'}`} />
      {avatarUrl ? (
        <div className="w-7 h-7 relative overflow-hidden rounded-full border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-semibold">
          {initialsOf(name)}
        </div>
      )}
      <div className="font-medium">
        {flag && <span className="mr-1" title={country}>{flag}</span>}
        {name}
        {rating != null && <span className="text-gray-600 font-normal"> ({rating})</span>}
      </div>
    </div>
  );
}
