import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!body?.confirm) {
      return NextResponse.json({ error: 'Confirmation required' }, { status: 400 });
    }
    const now = new Date();

    // Reset all anonymous LiveMatch games to starting position
    const live = await prisma.liveMatch.updateMany({
      data: {
        fen: START_FEN,
        pgn: null,
        status: 'ONGOING',
        result: null,
        turn: 'w',
        drawOffer: null,
        lastMoveAt: now,
      },
    });

    // Reset tournament games to starting position
    const games = await prisma.game.updateMany({
      data: {
        fen: START_FEN,
        pgn: null,
        status: 'ONGOING',
        result: null,
        turn: 'w',
        lastMoveAt: now,
      },
    });

    return NextResponse.json({ ok: true, counts: { live: live.count, games: games.count } });
  } catch (error) {
    console.error('Admin reset error:', error);
    return NextResponse.json({ error: 'Failed to reset' }, { status: 500 });
  }
}
