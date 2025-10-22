import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

async function seedIfEmpty() {
  const count = await prisma.puzzle.count();
  if (count > 0) return;
  await prisma.puzzle.createMany({ data: [
    {
      title: 'Mate in 1',
      fen: '6k1/5ppp/8/8/8/8/5PPP/6K1 w - - 0 1',
      movesSan: ['g2-g3#'],
      difficulty: 'EASY',
      themes: ['mate', 'basic']
    },
    {
      title: 'Tactic: Fork',
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 2',
      movesSan: ['... exd4', 'Qxd4'],
      difficulty: 'EASY',
      themes: ['tactic', 'fork']
    },
  ]});
}

export async function GET(request) {
  try {
    const { valid, payload } = await verifyAuth(request);
    if (!valid || payload.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await seedIfEmpty();
    const puzzles = await prisma.puzzle.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, difficulty: true, themes: true, createdAt: true },
    });
    return NextResponse.json({ puzzles });
  } catch (e) {
    console.error('Puzzles list error:', e);
    return NextResponse.json({ error: 'Failed to list puzzles' }, { status: 500 });
  }
}
