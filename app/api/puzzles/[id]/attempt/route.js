import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    const { valid, payload } = await verifyAuth(request);
    if (!valid || payload.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = params || {};
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const puzzle = await prisma.puzzle.findUnique({ where: { id } });
    if (!puzzle) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const attempt = await prisma.puzzleAttempt.upsert({
      where: { userId_puzzleId: { userId: payload.userId, puzzleId: id } },
      create: { userId: payload.userId, puzzleId: id },
      update: {},
      include: { puzzle: false },
    });
    return NextResponse.json({ puzzle: { id: puzzle.id, title: puzzle.title, fen: puzzle.fen, movesSan: puzzle.movesSan, difficulty: puzzle.difficulty }, attempt });
  } catch (e) {
    console.error('Attempt start error:', e);
    return NextResponse.json({ error: 'Failed to start attempt' }, { status: 500 });
  }
}
