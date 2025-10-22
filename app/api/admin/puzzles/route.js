import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  const { valid, payload } = await verifyAuth(request);
  if (!valid || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const puzzles = await prisma.puzzle.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ puzzles });
}

export async function POST(request) {
  try {
    const { valid, payload } = await verifyAuth(request);
    if (!valid || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { Chess } = await import('chess.js');
    const body = await request.json().catch(() => ({}));
    const { title, fen, moves, difficulty = 'EASY', themes, tags = [], source = null, rating = null, sideToMove = null } = body || {};
    if (!title || !fen || !Array.isArray(moves) || !moves.length) {
      return NextResponse.json({ error: 'title, fen and moves[] are required' }, { status: 400 });
    }
    // Validate SAN sequence
    try {
      const c = new Chess(fen);
      for (const san of moves) c.move(san);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid SAN sequence for provided FEN' }, { status: 400 });
    }
    const puzzle = await prisma.puzzle.create({ data: { title, fen, movesSan: moves, difficulty, themes: Array.isArray(themes) ? themes : [], tags: Array.isArray(tags) ? tags : [], source, rating: rating ? Number(rating) : null, sideToMove } });
    return NextResponse.json({ puzzle });
  } catch (e) {
    console.error('Admin create puzzle error:', e);
    return NextResponse.json({ error: 'Failed to create puzzle' }, { status: 500 });
  }
}
