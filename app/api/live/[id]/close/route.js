import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { deleteIfFinishedHumanMatch } from '@/lib/live';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  try {
    const { id } = params || {};
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const match = await prisma.liveMatch.findUnique({ where: { id } });
    if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (match.status !== 'ONGOING') return NextResponse.json({ error: 'Match already finished' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const token = body?.token || request.headers.get('x-token');
    const action = (body?.action || 'draw').toLowerCase();

    // Admins can force-close without a token
    const auth = await verifyAuth(request);
    const isAdmin = auth.valid && auth.payload?.role === 'ADMIN';

    if (!isAdmin) {
      const isWhite = token && token === match.whiteToken;
      const isBlack = token && token === match.blackToken;
      if (!isWhite && !isBlack) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      if (action !== 'draw') return NextResponse.json({ error: 'Only draw close is allowed for players' }, { status: 400 });
    }

    let status, result;
    if (isAdmin) {
      if (action === 'draw') { status = 'DRAW'; result = '1/2-1/2'; }
      else if (action === 'timeout') { status = 'TIMEOUT'; result = match.turn === 'w' ? '0-1' : '1-0'; }
      else if (action === 'resignation') { status = 'RESIGNATION'; result = body?.result || '0-1'; }
      else { status = 'DRAW'; result = '1/2-1/2'; }
    } else {
      status = 'DRAW'; result = '1/2-1/2';
    }

  const saved = await prisma.liveMatch.update({ where: { id }, data: { status, result } });
  const { whiteToken, blackToken, ...safe } = saved;
  await deleteIfFinishedHumanMatch(saved);
    return NextResponse.json({ match: safe });
  } catch (error) {
    console.error('Live close error:', error);
    return NextResponse.json({ error: 'Failed to close match' }, { status: 500 });
  }
}
