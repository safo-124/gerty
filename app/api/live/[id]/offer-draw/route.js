import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteIfFinishedHumanMatch } from '@/lib/live';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  try {
    const { id } = params || {};
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const match = await prisma.liveMatch.findUnique({ where: { id } });
    if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (match.status !== 'ONGOING') return NextResponse.json({ error: 'Game is over' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const token = body?.token || request.headers.get('x-token');
    const isWhite = token && token === match.whiteToken;
    const isBlack = token && token === match.blackToken;
    if (!isWhite && !isBlack) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const side = isWhite ? 'w' : 'b';
    if (!match.drawOffer) {
      const saved = await prisma.liveMatch.update({ where: { id }, data: { drawOffer: side } });
      const { whiteToken, blackToken, ...safe } = saved; 
      return NextResponse.json({ match: safe });
    }
    // If opponent has already offered, accept and draw the game
    if (match.drawOffer && match.drawOffer !== side) {
      const saved = await prisma.liveMatch.update({ where: { id }, data: { status: 'DRAW', result: '1/2-1/2', drawOffer: null } });
      const { whiteToken, blackToken, ...safe } = saved; 
      await deleteIfFinishedHumanMatch(saved);
      return NextResponse.json({ match: safe });
    }
    return NextResponse.json({ error: 'You already offered a draw' }, { status: 400 });
  } catch (error) {
    console.error('Live offer-draw error:', error);
    return NextResponse.json({ error: 'Failed to offer/accept draw' }, { status: 500 });
  }
}
