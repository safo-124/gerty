import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function PATCH(request, { params }) {
  try {
    const { valid, payload } = await verifyAuth(request);
    if (!valid || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = params || {};
    const { Chess } = await import('chess.js');
    const body = await request.json().catch(() => ({}));
    const data = {};
    if (body.title != null) data.title = body.title;
    if (body.fen != null) data.fen = body.fen;
    if (body.difficulty != null) data.difficulty = body.difficulty;
    if (Array.isArray(body.moves)) data.movesSan = body.moves;
    if (Array.isArray(body.themes)) data.themes = body.themes;
    if (Array.isArray(body.tags)) data.tags = body.tags;
    if (body.source != null) data.source = body.source;
    if (body.rating != null) data.rating = body.rating === '' ? null : Number(body.rating);
    if (body.sideToMove != null) data.sideToMove = body.sideToMove;
    // Validate if fen or moves are changing
    const current = await prisma.puzzle.findUnique({ where: { id } });
    const fen = data.fen ?? current?.fen;
    const moves = data.movesSan ?? current?.movesSan ?? [];
    try {
      const c = new Chess(fen);
      for (const san of moves) c.move(san);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid SAN sequence for provided FEN' }, { status: 400 });
    }
    const puzzle = await prisma.puzzle.update({ where: { id }, data });
    return NextResponse.json({ puzzle });
  } catch (e) {
    console.error('Admin update puzzle error:', e);
    return NextResponse.json({ error: 'Failed to update puzzle' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { valid, payload } = await verifyAuth(request);
    if (!valid || payload.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = params || {};
    await prisma.puzzle.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Admin delete puzzle error:', e);
    return NextResponse.json({ error: 'Failed to delete puzzle' }, { status: 500 });
  }
}
