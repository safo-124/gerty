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

    const where = (() => {
      if (!status) return undefined;
      if (status === 'DONE') return { NOT: { status: 'ONGOING' } };
      return { status };
    })();

    const matches = await prisma.liveMatch.findMany({
      where,
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

export async function DELETE(request) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid || auth.payload?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = new URL(request.url);
    const scope = url.searchParams.get('scope') || 'FINISHED';
    if (scope !== 'FINISHED') {
      return NextResponse.json({ error: 'Unsupported scope' }, { status: 400 });
    }
    const result = await prisma.liveMatch.deleteMany({ where: { NOT: { status: 'ONGOING' } } });
    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error('Admin live bulk delete error:', error);
    return NextResponse.json({ error: 'Failed to bulk delete' }, { status: 500 });
  }
}
