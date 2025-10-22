import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const { valid, payload } = await verifyAuth(request);
    if (!valid || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch all solved attempts with user info
    const attempts = await prisma.puzzleAttempt.findMany({
      where: { status: 'SOLVED', solvedAt: { not: null } },
      select: { userId: true, createdAt: true, solvedAt: true, puzzleId: true, puzzle: { select: { difficulty: true, rating: true } }, user: { select: { id: true, name: true, email: true } } },
      orderBy: { solvedAt: 'desc' },
      take: 5000,
    });

    const byUser = new Map();
    for (const a of attempts) {
      const key = a.userId;
      const entry = byUser.get(key) || { userId: key, name: a.user?.name || 'Student', email: a.user?.email || '', solved: 0, totalSeconds: 0, byDifficulty: { EASY: 0, MEDIUM: 0, HARD: 0 } };
      entry.solved += 1;
      const dur = Math.max(0, (new Date(a.solvedAt).getTime() - new Date(a.createdAt).getTime()) / 1000);
      entry.totalSeconds += dur;
      const diff = a.puzzle?.difficulty || 'EASY';
      if (entry.byDifficulty[diff] == null) entry.byDifficulty[diff] = 0;
      entry.byDifficulty[diff] += 1;
      byUser.set(key, entry);
    }

    const rows = Array.from(byUser.values()).map((r) => ({
      ...r,
      avgSolveSeconds: r.solved ? Math.round(r.totalSeconds / r.solved) : null,
    })).sort((a,b) => b.solved - a.solved).slice(0, 100);

    return NextResponse.json({ leaderboard: rows });
  } catch (e) {
    console.error('Admin puzzles analytics error:', e);
    return NextResponse.json({ error: 'Failed to compute analytics' }, { status: 500 });
  }
}
