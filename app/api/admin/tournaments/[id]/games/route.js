import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.payload?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id: tournamentId } = params || {};
    if (!tournamentId) return NextResponse.json({ error: 'Missing tournament id' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const { whiteUserId, blackUserId, round } = body || {};
    if (!whiteUserId || !blackUserId)
      return NextResponse.json({ error: 'whiteUserId and blackUserId are required' }, { status: 400 });

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    if (tournament.mode !== 'ONLINE') {
      return NextResponse.json({ error: 'Tournament is not ONLINE' }, { status: 400 });
    }

    const [white, black] = await Promise.all([
      prisma.user.findUnique({ where: { id: whiteUserId } }),
      prisma.user.findUnique({ where: { id: blackUserId } }),
    ]);
    if (!white || !black) return NextResponse.json({ error: 'Player(s) not found' }, { status: 404 });

    const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    const game = await prisma.game.create({
      data: {
        tournamentId,
        round: typeof round === 'number' ? round : null,
        whiteUserId,
        blackUserId,
        fen: initialFen,
        pgn: '',
        status: 'ONGOING',
        result: null,
        turn: 'w',
      },
    });

    return NextResponse.json({ game }, { status: 201 });
  } catch (error) {
    console.error('Create game error:', error);
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
}
