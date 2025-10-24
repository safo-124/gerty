import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function PATCH(request, { params }) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid || auth.payload?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params || {};
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const { status, result } = body || {};
    const allowed = new Set(['DRAW', 'RESIGNATION', 'TIMEOUT']);
    if (!allowed.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const match = await prisma.liveMatch.findUnique({ where: { id } });
    if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (match.status !== 'ONGOING') {
      return NextResponse.json({ error: 'Match already finished' }, { status: 400 });
    }

    const data = { status };
    if (status === 'DRAW') data.result = '1/2-1/2';
    if (status === 'RESIGNATION') data.result = result || '0-1';
    if (status === 'TIMEOUT') data.result = result || (match.turn === 'w' ? '0-1' : '1-0');

    const saved = await prisma.liveMatch.update({ where: { id }, data });
    return NextResponse.json({ match: saved });
  } catch (error) {
    console.error('Admin live patch error:', error);
    return NextResponse.json({ error: 'Failed to update match' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.valid || auth.payload?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = params || {};
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const match = await prisma.liveMatch.findUnique({ where: { id } });
    if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Allow admin to delete any match (ongoing or finished)
    await prisma.liveMatch.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin live delete error:', error);
    return NextResponse.json({ error: 'Failed to delete match' }, { status: 500 });
  }
}
