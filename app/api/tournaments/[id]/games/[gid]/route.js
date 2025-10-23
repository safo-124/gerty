import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  try {
    const { id, gid } = params || {};
    if (!id || !gid) return NextResponse.json({ error: 'Missing ids' }, { status: 400 });

    const game = await prisma.game.findFirst({
      where: { id: gid, tournamentId: id },
      select: {
        id: true,
        tournamentId: true,
        round: true,
        fen: true,
        pgn: true,
        status: true,
        result: true,
        turn: true,
        lastMoveAt: true,
        createdAt: true,
        tournament: { select: { name: true } },
        white: {
          select: {
            name: true,
            trainerProfile: { select: { rating: true, profileImage: true, country: true } },
            studentProfile: { select: { currentRating: true, country: true } },
          },
        },
        black: {
          select: {
            name: true,
            trainerProfile: { select: { rating: true, profileImage: true, country: true } },
            studentProfile: { select: { currentRating: true, country: true } },
          },
        },
      },
    });
    if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ game });
  } catch (e) {
    console.error('Tournament game GET error', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
