import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function getWindowIndex(seconds) {
  const s = Math.max(1, Number(seconds) || 300);
  return Math.floor(Date.now() / 1000 / s);
}

function randId() {
  return Math.random().toString(36).slice(2, 10);
}

// Simple heuristic selector for AI moves: prefer captures/checks, slight randomness
function centerBonus(file, rank) {
  // center squares (d4, e4, d5, e5) are (3,4)x(3,4) in 0-based file a=0..h=7, rank 0=8th to 7=1st
  const dx = Math.abs(file - 3.5);
  const dy = Math.abs(rank - 3.5);
  // closer to center -> higher bonus (max ~0.6)
  return Math.max(0, 0.6 - (dx + dy) * 0.3);
}

function squareToFR(sq) {
  if (!sq) return [null, null];
  const f = sq.charCodeAt(0) - 97; // a->0
  const r = 8 - Number(sq[1]); // '8'->0 ... '1'->7
  return [f, r];
}

function pickHeuristicMove(moves, chess, style = 'agg') {
  if (!moves?.length) return undefined;
  const val = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let best = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    let s = Math.random() * 0.2; // jitter
    // universal preferences
    if (m.promotion === 'q') s += 8; // strong
    if (m.san?.includes('#')) s += 100; // mate
    else if (m.san?.includes('+')) s += 1.5; // check

    // style-specific weights
    const [toF, toR] = squareToFR(m.to);
    const isCapture = !!m.captured;
    if (style === 'agg') {
      if (isCapture) s += (val[m.captured?.toLowerCase?.()] || 0) + 0.8;
      if (m.piece === 'n' || m.piece === 'b') s += 0.2;
      if (m.piece === 'q') s += 0.1;
      // bonus for centralization
      if (toF != null) s += centerBonus(toF, toR) * 0.8;
    } else if (style === 'pos') {
      // prefer central squares and development-like moves
      if (toF != null) s += centerBonus(toF, toR) * 1.2;
      if (m.piece === 'n' || m.piece === 'b') s += 0.4;
      if (m.piece === 'r' && (toF === 0 || toF === 7)) s += 0.2; // rooks to files
      if (isCapture) s += (val[m.captured?.toLowerCase?.()] || 0) + 0.2; // still value captures
    } else {
      if (isCapture) s += (val[m.captured?.toLowerCase?.()] || 0) + 0.4;
      if (toF != null) s += centerBonus(toF, toR) * 0.6;
    }
    if (s > bestScore) { bestScore = s; best = m; }
  }
  return best;
}

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'site' } });
    if (!settings || !settings.homepageLiveEnabled) {
      return NextResponse.json({ enabled: false, rotationSeconds: settings?.homepageLiveRotationSeconds || 300, items: [] });
    }

    // Check if any tournaments are ongoing; if none and tournaments-only is set,
    // we'll skip tournament games and fall back to AI self-play (do NOT disable spotlight).
    let tournamentsOnline = true;
    if (settings.homepageLiveTournamentOnly) {
      const ongoingCount = await prisma.tournament.count({ where: { status: 'ONGOING' } });
      tournamentsOnline = ongoingCount > 0;
    }

    const limitIds = Array.isArray(settings.homepageLiveTournamentIds) ? settings.homepageLiveTournamentIds : [];
    const rotationSeconds = Math.max(30, Number(settings.homepageLiveRotationSeconds) || 300);
    const count = Math.max(1, Math.min(6, Number(settings.homepageLiveCount) || 2));

    // 1) Prefer ongoing tournament games
    const gameWhere = {
      status: 'ONGOING',
      ...(limitIds.length ? { tournamentId: { in: limitIds } } : {}),
    };
    const games = tournamentsOnline
      ? await prisma.game.findMany({
          where: gameWhere,
          orderBy: [
            { round: 'desc' },
            { lastMoveAt: 'desc' },
          ],
          select: {
            id: true,
            tournamentId: true,
            round: true,
            lastMoveAt: true,
            createdAt: true,
            tournament: { select: { name: true } },
          },
          take: 50,
        })
      : [];
    if (games.length) {
      const idx = getWindowIndex(rotationSeconds);
      const start = (idx * count) % games.length;
      const items = [];
      for (let i = 0; i < Math.min(count, games.length); i++) {
        const g = games[(start + i) % games.length];
        items.push({
          id: g.id,
          title: `${g.tournament?.name || 'Tournament'}${g.round ? ` — Round ${g.round}` : ''}`,
          lastMoveAt: g.lastMoveAt,
          createdAt: g.createdAt,
          href: `/tournaments/${g.tournamentId}/game/${g.id}`,
        });
      }
      return NextResponse.json({ enabled: true, rotationSeconds, items });
    }

    // 2) Fallback: ensure at least one AI vs AI LiveMatch exists and is advancing
    async function ensureAISelfPlay() {
      let aiMatch = await prisma.liveMatch.findFirst({
        where: {
          status: 'ONGOING',
          AND: [
            { whiteToken: { startsWith: 'AI:' } },
            { blackToken: { startsWith: 'AI:' } },
          ],
        },
        orderBy: { lastMoveAt: 'desc' },
      });
      if (!aiMatch) {
        const styles = ['agg', 'pos'];
        const style = styles[Math.floor(Math.random() * styles.length)];
        aiMatch = await prisma.liveMatch.create({
          data: {
            title: 'AI Self-Play',
            // Use unique tokens to satisfy DB unique constraints; encode level and style
            whiteToken: `AI:2:${style}:${randId()}`,
            blackToken: `AI:2:${style}:${randId()}`,
            tcSeconds: 0,
            incSeconds: 0,
            whiteTimeMs: 0,
            blackTimeMs: 0,
          },
        });
      }
      // Hard reset every 30 minutes: finish current game and start a new one
  const THIRTY_MIN = 30 * 60 * 1000;
      const createdAtMs = new Date(aiMatch.createdAt).getTime();
      if (Date.now() - createdAtMs > THIRTY_MIN && aiMatch.status === 'ONGOING') {
        try {
          const { Chess } = await import('chess.js');
          const c = new Chess(aiMatch.fen);
          const isMate = c.isCheckmate();
          await prisma.liveMatch.update({
            where: { id: aiMatch.id },
            data: {
              status: isMate ? 'CHECKMATE' : 'DRAW',
              result: isMate ? (c.turn() === 'w' ? '0-1' : '1-0') : '1/2-1/2',
              lastMoveAt: new Date(),
            },
          });
        } catch {}
        const styles2 = ['agg', 'pos'];
        const style2 = styles2[Math.floor(Math.random() * styles2.length)];
        aiMatch = await prisma.liveMatch.create({
          data: {
            title: 'AI Self-Play',
            whiteToken: `AI:2:${style2}:${randId()}`,
            blackToken: `AI:2:${style2}:${randId()}`,
            tcSeconds: 0,
            incSeconds: 0,
            whiteTimeMs: 0,
            blackTimeMs: 0,
          },
        });
      }
      // Try to advance one AI move if at least 2s passed since last move
      try {
        const { Chess } = await import('chess.js');
        const lastAt = new Date(aiMatch.lastMoveAt).getTime();
        // Make it fast: ~0.5s cadence
        if (Date.now() - lastAt > 500 && aiMatch.status === 'ONGOING') {
          const c = new Chess(aiMatch.fen);
          const moves = c.moves({ verbose: true });
          if (moves.length) {
            // heuristic picker per-side style
            const style = (c.turn() === 'w' ? aiMatch.whiteToken : aiMatch.blackToken)?.split(':')[2] || 'agg';
            const m = pickHeuristicMove(moves, c, style) || moves[0];
            c.move(m);
            let upd = {
              fen: c.fen(),
              pgn: c.pgn(),
              turn: c.turn(),
              lastMoveAt: new Date(),
            };
            if (c.isGameOver()) {
              upd.status = c.isCheckmate() ? 'CHECKMATE' : 'DRAW';
              if (upd.status === 'CHECKMATE') {
                upd.result = c.turn() === 'w' ? '0-1' : '1-0';
              } else {
                upd.result = '1/2-1/2';
              }
            }
            aiMatch = await prisma.liveMatch.update({ where: { id: aiMatch.id }, data: upd });
          }
        }
      } catch {}
      return aiMatch;
    }

    const aiMatches = await prisma.liveMatch.findMany({
      where: { status: 'ONGOING', AND: [{ whiteToken: { startsWith: 'AI:' } }, { blackToken: { startsWith: 'AI:' } }] },
      orderBy: { lastMoveAt: 'desc' },
      take: count,
    });
    let ensuredMatches = aiMatches;
    if (!aiMatches.length) {
      const m = await ensureAISelfPlay();
      ensuredMatches = m ? [m] : [];
    } else {
      // Try to advance the most recent one slightly
      await ensureAISelfPlay();
    }
    if (!ensuredMatches.length) {
      return NextResponse.json({ enabled: false, rotationSeconds, items: [] });
    }
    const items = ensuredMatches.slice(0, count).map((m) => ({
      id: m.id,
      title: m.title || 'AI Self-Play',
      lastMoveAt: m.lastMoveAt,
      createdAt: m.createdAt,
      href: `/play/live/${m.id}`,
    }));
    return NextResponse.json({ enabled: true, rotationSeconds, items });
  } catch (e) {
    console.error('Homepage live API error', e);
    return NextResponse.json({ enabled: false, items: [], error: 'Failed' }, { status: 500 });
  }
}
