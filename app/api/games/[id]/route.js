import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  try {
    const { id } = params || {};
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        white: { select: { id: true, name: true } },
        black: { select: { id: true, name: true } },
        tournament: { select: { id: true, name: true, mode: true } },
      },
    });

    if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ game });
  } catch (error) {
    console.error('Game GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 });
  }
}
