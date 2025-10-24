import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBestMoveWithStockfish, uciToMove } from '@/lib/stockfish';

export const runtime = 'nodejs';

function scoreMaterial(chess) {
  // Simple material evaluation
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let score = 0;
  const board = chess.board();
  for (const row of board) {
    for (const sq of row) {
      if (!sq) continue;
      const v = values[sq.type] || 0;
      score += sq.color === 'w' ? v : -v;
    }
  }
  return score;
}

// pickAIMove replaced by Stockfish integration; legacy kept only as fallback below if Stockfish fails.

export async function POST(request, { params }) {
  try {
    const { Chess } = await import('chess.js');
    const { id } = params || {};
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const token = body?.token || request.headers.get('x-token');
    const { from, to, promotion } = body || {};
    if (!from || !to) return NextResponse.json({ error: 'from and to are required' }, { status: 400 });

  const match = await prisma.liveMatch.findUnique({ where: { id } });
    if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Token/turn validation (allow only human tokens to move)
    const aiWhite = match.whiteToken?.startsWith?.('AI:');
    const aiBlack = match.blackToken?.startsWith?.('AI:');
    const isWhite = token && token === match.whiteToken && !aiWhite;
    const isBlack = token && token === match.blackToken && !aiBlack;
    if (!isWhite && !isBlack) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (match.status !== 'ONGOING') {
      return NextResponse.json({ error: 'Game is over' }, { status: 400 });
    }
    if ((match.turn === 'w' && !isWhite) || (match.turn === 'b' && !isBlack)) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
    }

    // Time control enforcement (before applying move)
    const now = Date.now();
    const timed = (match.tcSeconds || 0) > 0;
    let wTime = match.whiteTimeMs || 0;
    let bTime = match.blackTimeMs || 0;
    if (timed) {
      const lastAt = new Date(match.lastMoveAt).getTime();
      const elapsed = Math.max(0, now - lastAt);
      if (match.turn === 'w') {
        wTime = Math.max(0, wTime - elapsed);
        if (wTime <= 0) {
          const savedTimeout = await prisma.liveMatch.update({ where: { id }, data: { status: 'TIMEOUT', result: '0-1' } });
          const { whiteToken, blackToken, ...safe } = savedTimeout; return NextResponse.json({ match: safe });
        }
      } else {
        bTime = Math.max(0, bTime - elapsed);
        if (bTime <= 0) {
          const savedTimeout = await prisma.liveMatch.update({ where: { id }, data: { status: 'TIMEOUT', result: '1-0' } });
          const { whiteToken, blackToken, ...safe } = savedTimeout; return NextResponse.json({ match: safe });
        }
      }
    }

    const chess = new Chess(match.fen);
    const move = chess.move({ from, to, promotion });
    if (!move) return NextResponse.json({ error: 'Illegal move' }, { status: 400 });

    const updated = {
      fen: chess.fen(),
      pgn: chess.pgn(),
      turn: chess.turn(),
      lastMoveAt: new Date(),
      drawOffer: null, // any move clears outstanding draw offers
    };

    if (chess.isGameOver()) {
      updated.status = chess.isCheckmate() ? 'CHECKMATE' : 'DRAW';
      if (updated.status === 'CHECKMATE') {
        updated.result = chess.turn() === 'w' ? '0-1' : '1-0';
      } else {
        updated.result = '1/2-1/2';
      }
    }

    // Update clocks for mover: subtract elapsed, then add increment
    if (timed) {
      const incMs = (match.incSeconds || 0) * 1000;
      if (match.turn === 'w') {
        // White just moved
        wTime = Math.max(0, wTime + incMs);
      } else {
        // Black just moved
        bTime = Math.max(0, bTime + incMs);
      }
      updated.whiteTimeMs = wTime;
      updated.blackTimeMs = bTime;
    }

    let saved = await prisma.liveMatch.update({ where: { id }, data: updated });

    // If opponent is AI and game still ongoing and now it's AI's turn, make AI move
    const aiSide = aiWhite ? 'w' : aiBlack ? 'b' : undefined;
    if (saved.status === 'ONGOING' && aiSide && saved.turn === aiSide) {
      const level = (aiWhite ? Number(match.whiteToken.split(':')[1] || '1') : aiBlack ? Number(match.blackToken.split(':')[1] || '1') : 1) || 1;
      // Map our 1-3 levels to Stockfish Skill + movetime
      const map = {
        1: { skill: 4, mt: 400 },
        2: { skill: 10, mt: 900 },
        3: { skill: 16, mt: 1400 },
      };
      const cfg = map[Math.max(1, Math.min(3, level))];
      // Compute AI move with Stockfish; then update clocks including true think time
      if (timed) {
        let w2 = saved.whiteTimeMs || 0; let b2 = saved.blackTimeMs || 0;
        const start = Date.now();
        let aiMoveObj = null;
        try {
          const { bestmove } = await getBestMoveWithStockfish(saved.fen, { movetime: cfg.mt, skill: cfg.skill });
          if (bestmove) aiMoveObj = uciToMove(bestmove);
        } catch {}
        // Subtract elapsed since lastMoveAt including engine think time
        const lastAt2 = new Date(saved.lastMoveAt).getTime();
        const elapsed2 = Math.max(0, Date.now() - lastAt2);
        if (aiSide === 'w') {
          w2 = Math.max(0, w2 - elapsed2);
          if (w2 <= 0) {
            const tSaved = await prisma.liveMatch.update({ where: { id }, data: { status: 'TIMEOUT', result: '0-1' } });
            const { whiteToken, blackToken, ...safe } = tSaved; return NextResponse.json({ match: safe });
          }
        } else {
          b2 = Math.max(0, b2 - elapsed2);
          if (b2 <= 0) {
            const tSaved = await prisma.liveMatch.update({ where: { id }, data: { status: 'TIMEOUT', result: '1-0' } });
            const { whiteToken, blackToken, ...safe } = tSaved; return NextResponse.json({ match: safe });
          }
        }
        // Fallback to a legal move if SF fails
        if (!aiMoveObj) {
          const cTmp = new Chess(saved.fen);
          const ms = cTmp.moves({ verbose: true });
          aiMoveObj = ms && ms[0] ? { from: ms[0].from, to: ms[0].to, promotion: ms[0].promotion } : null;
        }
        if (aiMoveObj) {
          const c2 = new Chess(saved.fen);
          c2.move(aiMoveObj);
          const upd2 = {
            fen: c2.fen(),
            pgn: c2.pgn(),
            turn: c2.turn(),
            lastMoveAt: new Date(),
          };
          // Add increment for AI
          if (timed) {
            const incMs2 = (match.incSeconds || 0) * 1000;
            if (aiSide === 'w') w2 = Math.max(0, w2 + incMs2); else b2 = Math.max(0, b2 + incMs2);
            upd2.whiteTimeMs = w2; upd2.blackTimeMs = b2;
          }
          if (c2.isGameOver()) {
            upd2.status = c2.isCheckmate() ? 'CHECKMATE' : 'DRAW';
            if (upd2.status === 'CHECKMATE') {
              upd2.result = c2.turn() === 'w' ? '0-1' : '1-0';
            } else {
              upd2.result = '1/2-1/2';
            }
          }
          saved = await prisma.liveMatch.update({ where: { id }, data: upd2 });
        }
      } else {
        let aiMoveObj = null;
        try {
          const { bestmove } = await getBestMoveWithStockfish(saved.fen, { movetime: cfg.mt, skill: cfg.skill });
          if (bestmove) aiMoveObj = uciToMove(bestmove);
        } catch {}
        if (!aiMoveObj) {
          const cTmp = new Chess(saved.fen);
          const ms = cTmp.moves({ verbose: true });
          aiMoveObj = ms && ms[0] ? { from: ms[0].from, to: ms[0].to, promotion: ms[0].promotion } : null;
        }
        if (aiMoveObj) {
          const c2 = new Chess(saved.fen);
          c2.move(aiMoveObj);
          const upd2 = {
            fen: c2.fen(),
            pgn: c2.pgn(),
            turn: c2.turn(),
            lastMoveAt: new Date(),
          };
          if (c2.isGameOver()) {
            upd2.status = c2.isCheckmate() ? 'CHECKMATE' : 'DRAW';
            if (upd2.status === 'CHECKMATE') {
              upd2.result = c2.turn() === 'w' ? '0-1' : '1-0';
            } else {
              upd2.result = '1/2-1/2';
            }
          }
          saved = await prisma.liveMatch.update({ where: { id }, data: upd2 });
        }
      }
    }

    const { whiteToken, blackToken, ...safe } = saved;
    return NextResponse.json({ match: safe });
  } catch (error) {
    console.error('Live move error:', error);
    return NextResponse.json({ error: 'Failed to process move' }, { status: 500 });
  }
}
