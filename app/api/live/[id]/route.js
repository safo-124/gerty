import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { id } = params || {};
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const match = await prisma.liveMatch.findUnique({ where: { id } });
    if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Optional token to reveal side
    const url = new URL(request.url);
    const t = url.searchParams.get('t');
    let side = undefined;
    if (t) {
      if (t === match.whiteToken) side = 'w';
      else if (t === match.blackToken) side = 'b';
    }
    const ai = (match.whiteToken?.startsWith?.('AI:') || match.blackToken?.startsWith?.('AI:')) || false;
    const aiLevel = match.whiteToken?.startsWith?.('AI:') ? Number(match.whiteToken.split(':')[1] || '1')
      : match.blackToken?.startsWith?.('AI:') ? Number(match.blackToken.split(':')[1] || '1') : undefined;
    const aiSide = match.whiteToken?.startsWith?.('AI:') ? 'w' : match.blackToken?.startsWith?.('AI:') ? 'b' : undefined;
    // Compute last move from PGN
    let lastMoveFrom = undefined;
    let lastMoveTo = undefined;
    try {
      const { Chess } = await import('chess.js');
      const c = new Chess();
      if (match.pgn) c.loadPgn(match.pgn);
      const hist = c.history({ verbose: true });
      const lm = hist[hist.length - 1];
      if (lm) { lastMoveFrom = lm.from; lastMoveTo = lm.to; }
    } catch {}
    // Do not leak tokens
    const { whiteToken, blackToken, ...safe } = match;
    return NextResponse.json({ match: { ...safe, side, lastMoveFrom, lastMoveTo, ai, aiLevel, aiSide } });
  } catch (error) {
    console.error('Live get error:', error);
    return NextResponse.json({ error: 'Failed to fetch match' }, { status: 500 });
  }
}
