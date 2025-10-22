import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

function makeToken() {
  try {
    return crypto.randomBytes(24).toString('base64url');
  } catch {
    return crypto.randomBytes(24).toString('hex');
  }
}

export async function GET() {
  try {
    const rows = await prisma.liveMatch.findMany({
      where: { status: 'ONGOING' },
      orderBy: { lastMoveAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        lastMoveAt: true,
        whiteToken: true,
        blackToken: true,
      },
    });
    const matches = rows.map((m) => {
      const aiWhite = m.whiteToken?.startsWith?.('AI:');
      const aiBlack = m.blackToken?.startsWith?.('AI:');
      const aiLevel = aiWhite ? Number(m.whiteToken.split(':')[1] || '1') : aiBlack ? Number(m.blackToken.split(':')[1] || '1') : undefined;
      return { id: m.id, title: m.title, createdAt: m.createdAt, lastMoveAt: m.lastMoveAt, ai: !!(aiWhite || aiBlack), aiLevel };
    });
    return NextResponse.json({ matches });
  } catch (error) {
    console.error('Live list error:', error);
    return NextResponse.json({ error: 'Failed to list live matches' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { title, ai = false, aiLevel = 1, humanSide = 'white', tc = 0, inc = 0 } = body || {};

    let whiteToken = makeToken();
    let blackToken = makeToken();
    if (ai) {
      const level = Math.max(1, Math.min(3, Number(aiLevel) || 1));
      if ((humanSide || 'white').toLowerCase() === 'white') {
        // AI plays black
        blackToken = `AI:${level}`;
      } else {
        // AI plays white
        whiteToken = `AI:${level}`;
      }
    }

    const baseSeconds = Math.max(0, Number(tc) || 0);
    const incSeconds = Math.max(0, Number(inc) || 0);
    const match = await prisma.liveMatch.create({
      data: {
        title: title?.slice(0, 80) || null,
        whiteToken,
        blackToken,
        tcSeconds: baseSeconds,
        incSeconds,
        whiteTimeMs: baseSeconds * 1000,
        blackTimeMs: baseSeconds * 1000,
      },
    });

    const base = new URL(request.url);
    const whiteUrl = `${base.origin}/play/live/${match.id}?t=${whiteToken}`;
    const blackUrl = `${base.origin}/play/live/${match.id}?t=${blackToken}`;
    const spectatorUrl = `${base.origin}/play/live/${match.id}`;

    return NextResponse.json({
      match: {
        id: match.id,
        title: match.title,
      },
      links: { whiteUrl, blackUrl, spectatorUrl },
      tokens: { whiteToken, blackToken },
      ai: ai ? { level: Math.max(1, Math.min(3, Number(aiLevel) || 1)), humanSide: (humanSide || 'white').toLowerCase() } : null,
    });
  } catch (error) {
    console.error('Live create error:', error);
    return NextResponse.json({ error: 'Failed to create live match' }, { status: 500 });
  }
}
