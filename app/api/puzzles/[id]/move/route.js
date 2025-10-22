import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    const { Chess } = await import('chess.js');
    const { valid, payload } = await verifyAuth(request);
    if (!valid || payload.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = params || {};
    const body = await request.json().catch(() => ({}));
    const { attemptId, from, to, promotion } = body || {};
    if (!id || !attemptId || !from || !to) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const attempt = await prisma.puzzleAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.userId !== payload.userId || attempt.puzzleId !== id) return NextResponse.json({ error: 'Invalid attempt' }, { status: 400 });

    const puzzle = await prisma.puzzle.findUnique({ where: { id } });
    if (!puzzle) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Reconstruct current board state by applying solution moves up to progress
    const c = new Chess(puzzle.fen);
    for (let i = 0; i < attempt.progress; i++) {
      const san = puzzle.movesSan[i];
      try { c.move(san); } catch { return NextResponse.json({ error: 'Puzzle data error' }, { status: 500 }); }
    }
    if (c.isGameOver()) {
      return NextResponse.json({ solved: true, progress: attempt.progress, fen: c.fen() });
    }
    // Compute SAN of the player's move and compare to expected
    const move = c.move({ from, to, promotion });
    if (!move) return NextResponse.json({ correct: false, message: 'Illegal move' }, { status: 200 });
    const expected = puzzle.movesSan[attempt.progress];
    if (!expected) {
      return NextResponse.json({ correct: false, message: 'No further moves' }, { status: 200 });
    }
    if (move.san !== expected && `${move.from}-${move.to}${move.san.endsWith('#') ? '#' : ''}` !== expected) {
      // Some seeds may use long notation like g2-g3#, allow simple fallback match
      return NextResponse.json({ correct: false, message: 'Incorrect move', expected }, { status: 200 });
    }

    let progress = attempt.progress + 1;
    const autoMoves = [{ from: move.from, to: move.to, san: move.san }];

    // Auto-play opponent replies from solution until it's user's turn again (i.e., we add 1 move for reply)
    while (progress < puzzle.movesSan.length) {
      const san = puzzle.movesSan[progress];
      try {
        const m = c.move(san);
        autoMoves.push({ from: m.from, to: m.to, san: m.san });
      } catch {
        break;
      }
      progress++;
      // Stop after playing one opponent reply so the user plays next
      break;
    }

    const solved = progress >= puzzle.movesSan.length;
    const newStatus = solved ? 'SOLVED' : 'ATTEMPTING';
    const saved = await prisma.puzzleAttempt.update({ where: { id: attempt.id }, data: { progress, status: newStatus } });

    return NextResponse.json({ correct: true, solved, progress, autoMoves, fen: c.fen() });
  } catch (e) {
    console.error('Puzzle move error:', e);
    return NextResponse.json({ error: 'Failed to validate move' }, { status: 500 });
  }
}
