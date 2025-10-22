import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

async function seedIfEmpty() {
  const count = await prisma.resource.count();
  if (count > 0) return;
  await prisma.resource.createMany({ data: [
    { title: 'How to checkmate with King and Queen', url: 'https://www.chess.com/lessons/king-and-queen-checkmate', type: 'ARTICLE', description: 'Basic mating pattern', studentOnly: true },
    { title: 'Tactics Trainer', url: 'https://lichess.org/practice', type: 'VIDEO', description: 'Practice tactics by theme', studentOnly: true },
  ]});
}

export async function GET(request) {
  try {
    const { valid, payload } = await verifyAuth(request);
    if (!valid || payload.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await seedIfEmpty();
    const resources = await prisma.resource.findMany({ where: { studentOnly: true }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ resources });
  } catch (e) {
    console.error('Resources list error:', e);
    return NextResponse.json({ error: 'Failed to list resources' }, { status: 500 });
  }
}
