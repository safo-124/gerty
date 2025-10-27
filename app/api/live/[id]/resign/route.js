import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    const result = isWhite ? '0-1' : '1-0';
    const saved = await prisma.liveMatch.update({
      where: { id },
      data: { status: 'RESIGNATION', result },
    });
    const { whiteToken, blackToken, ...safe } = saved;
    return NextResponse.json({ match: safe });
  } catch (error) {
    console.error('Live resign error:', error);
    return NextResponse.json({ error: 'Failed to resign' }, { status: 500 });
  }
}
