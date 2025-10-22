import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Chess } from 'chess.js';
import { verifyAuth } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params || {};
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const { from, to, promotion } = body || {};
    if (!from || !to) return NextResponse.json({ error: 'from and to are required' }, { status: 400 });

    const game = await prisma.game.findUnique({ where: { id } });
    if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Enforce turn-by-player constraint
    const userId = auth.payload?.userId;
    const isWhitesTurn = game.turn === 'w';
    if (isWhitesTurn && userId !== game.whiteUserId) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
    }
    if (!isWhitesTurn && userId !== game.blackUserId) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
    }

    const chess = new Chess(game.fen);
    const move = chess.move({ from, to, promotion });
    if (!move) return NextResponse.json({ error: 'Illegal move' }, { status: 400 });

    const updated = {
      fen: chess.fen(),
      pgn: chess.pgn(),
      turn: chess.turn(),
      lastMoveAt: new Date(),
    };

    if (chess.isGameOver()) {
      updated.status = chess.isCheckmate() ? 'CHECKMATE' : 'DRAW';
      if (updated.status === 'CHECKMATE') {
        updated.result = chess.turn() === 'w' ? '0-1' : '1-0'; // turn() is next to move
      } else {
        updated.result = '1/2-1/2';
      }
    }

    const saved = await prisma.game.update({ where: { id }, data: updated });
    return NextResponse.json({ game: saved });
  } catch (error) {
    console.error('Move error:', error);
    return NextResponse.json({ error: 'Failed to process move' }, { status: 500 });
  }
}
