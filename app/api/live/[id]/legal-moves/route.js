import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Chess } from 'chess.js';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  try {
    const { id } = params || {};
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const url = new URL(request.url);
    const square = url.searchParams.get('s');
    if (!square) return NextResponse.json({ error: 'Missing square' }, { status: 400 });

    const match = await prisma.liveMatch.findUnique({ where: { id } });
    if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const chess = new Chess(match.fen);
    const moves = chess.moves({ square, verbose: true }) || [];
    const targets = moves.map((m) => m.to);
    return NextResponse.json({ targets });
  } catch (error) {
    console.error('Live legal-moves error:', error);
    return NextResponse.json({ error: 'Failed to compute legal moves' }, { status: 500 });
  }
}
