import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid || auth.payload?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    const matches = await prisma.liveMatch.findMany({
      where: status ? { status } : undefined,
      orderBy: { lastMoveAt: 'desc' },
      select: {
        id: true,
        title: true,
        fen: true,
        pgn: true,
        status: true,
        result: true,
        turn: true,
        lastMoveAt: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ matches });
  } catch (error) {
    console.error('Admin live list error:', error);
    return NextResponse.json({ error: 'Failed to load live matches' }, { status: 500 });
  }
}
