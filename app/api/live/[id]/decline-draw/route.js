import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    if (match.drawOffer && match.drawOffer !== side) {
      const saved = await prisma.liveMatch.update({ where: { id }, data: { drawOffer: null } });
      const { whiteToken, blackToken, ...safe } = saved;
      return NextResponse.json({ match: safe });
    }
    return NextResponse.json({ error: 'No opponent draw offer to decline' }, { status: 400 });
  } catch (error) {
    console.error('Live decline-draw error:', error);
    return NextResponse.json({ error: 'Failed to decline draw' }, { status: 500 });
  }
}
