import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const attempts = await prisma.puzzleAttempt.findMany({
      where: { status: 'SOLVED', solvedAt: { not: null } },
      select: { userId: true, createdAt: true, solvedAt: true, user: { select: { id: true, name: true } } },
      orderBy: { solvedAt: 'desc' },
      take: 5000,
    });

    const byUser = new Map();
    for (const a of attempts) {
      const key = a.userId;
      const entry = byUser.get(key) || { userId: key, name: a.user?.name || 'Student', solved: 0, totalSeconds: 0 };
      entry.solved += 1;
      const dur = Math.max(0, (new Date(a.solvedAt).getTime() - new Date(a.createdAt).getTime()) / 1000);
      entry.totalSeconds += dur;
      byUser.set(key, entry);
    }
    const rows = Array.from(byUser.values()).map((r) => ({
      userId: r.userId,
      name: r.name,
      solved: r.solved,
      avgSolveSeconds: r.solved ? Math.round(r.totalSeconds / r.solved) : null,
    })).sort((a,b) => b.solved - a.solved).slice(0, 50);
    return NextResponse.json({ leaderboard: rows });
  } catch (e) {
    console.error('Public puzzles leaderboard error:', e);
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
  }
}
