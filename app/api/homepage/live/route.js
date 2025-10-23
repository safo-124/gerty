import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function getWindowIndex(seconds) {
  const s = Math.max(1, Number(seconds) || 300);
  return Math.floor(Date.now() / 1000 / s);
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
        aiMatch = await prisma.liveMatch.create({
          data: {
            title: 'AI Self-Play',
            whiteToken: 'AI:2',
            blackToken: 'AI:2',
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
        if (Date.now() - lastAt > 2000 && aiMatch.status === 'ONGOING') {
          const c = new Chess(aiMatch.fen);
          const moves = c.moves({ verbose: true });
          if (moves.length) {
            // simple random for self-play
            const m = moves[Math.floor(Math.random() * moves.length)];
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
