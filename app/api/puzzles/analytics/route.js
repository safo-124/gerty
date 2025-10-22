import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const { valid, payload } = await verifyAuth(request);
    if (!valid || payload.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const userId = payload.userId;
    // Fetch attempts for this user
    const attempts = await prisma.puzzleAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { puzzle: { select: { id: true, title: true, difficulty: true, rating: true } } },
    });

    const solved = attempts.filter(a => a.status === 'SOLVED' && a.solvedAt);
    const attempting = attempts.filter(a => a.status === 'ATTEMPTING');

    let avgSolveSeconds = null;
    if (solved.length > 0) {
      const total = solved.reduce((acc, a) => acc + Math.max(0, (new Date(a.solvedAt).getTime() - new Date(a.createdAt).getTime()) / 1000), 0);
      avgSolveSeconds = Math.round(total / solved.length);
    }

    // Breakdown by difficulty
    const byDifficulty = ['EASY','MEDIUM','HARD'].map((d) => {
      const subset = solved.filter(a => a.puzzle?.difficulty === d);
      const count = subset.length;
      const avg = count ? Math.round(subset.reduce((acc, a) => acc + Math.max(0, (new Date(a.solvedAt).getTime() - new Date(a.createdAt).getTime()) / 1000), 0) / count) : null;
      return { difficulty: d, solved: count, avgSolveSeconds: avg };
    });

    const recent = solved.slice(0, 10).map(a => ({
      id: a.id,
      puzzleId: a.puzzleId,
      title: a.puzzle?.title || 'Puzzle',
      difficulty: a.puzzle?.difficulty || 'EASY',
      seconds: Math.max(0, Math.round((new Date(a.solvedAt).getTime() - new Date(a.createdAt).getTime()) / 1000)),
      solvedAt: a.solvedAt,
    }));

    return NextResponse.json({
      solvedCount: solved.length,
      attemptingCount: attempting.length,
      avgSolveSeconds,
      byDifficulty,
      recent,
    });
  } catch (e) {
    console.error('Student puzzle analytics error:', e);
    return NextResponse.json({ error: 'Failed to compute analytics' }, { status: 500 });
  }
}
