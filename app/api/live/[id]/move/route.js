import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

function pickAIMove(ChessCtor, fen, aiColor, level = 1) {
  const chess = new ChessCtor(fen);
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return null;
  // Level 1: random
  if (level <= 1) return moves[Math.floor(Math.random() * moves.length)];
  // Level 2: one-ply material greedy
  if (level === 2) {
    let best = null; let bestScore = -Infinity;
    for (const m of moves) {
      chess.move({ from: m.from, to: m.to, promotion: m.promotion });
      const s = scoreMaterial(chess) * (aiColor === 'w' ? 1 : -1);
      if (s > bestScore) { bestScore = s; best = m; }
      chess.undo();
    }
    return best || moves[0];
  }
  // Level 3: shallow minimax (depth 2)
  function minimax(ch, depth, maximizing, aiC) {
    if (depth === 0 || ch.isGameOver()) return scoreMaterial(ch) * (aiC === 'w' ? 1 : -1);
    const ms = ch.moves({ verbose: true });
    if (!ms.length) return scoreMaterial(ch) * (aiC === 'w' ? 1 : -1);
    if (maximizing) {
      let val = -Infinity;
      for (const m of ms) { ch.move(m); val = Math.max(val, minimax(ch, depth - 1, false, aiC)); ch.undo(); }
      return val;
    } else {
      let val = Infinity;
      for (const m of ms) { ch.move(m); val = Math.min(val, minimax(ch, depth - 1, true, aiC)); ch.undo(); }
      return val;
    }
  }
  let best = null; let bestScore = -Infinity;
  for (const m of moves) {
    chess.move(m);
    const val = minimax(chess, 1, false, aiColor); // depth 2 total
    if (val > bestScore) { bestScore = val; best = m; }
    chess.undo();
  }
  return best || moves[0];
}

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
      // Optional thinking delay for realism based on level
      const delays = { 1: [200, 400], 2: [600, 900], 3: [1000, 1600] };
      const [minD, maxD] = delays[Math.max(1, Math.min(3, level))];
      const delay = Math.floor(minD + Math.random() * (maxD - minD));
      await new Promise((r) => setTimeout(r, delay));
      // Time enforcement for AI side prior to moving
      if (timed) {
        const lastAt2 = new Date(saved.lastMoveAt).getTime();
        const elapsed2 = Math.max(0, Date.now() - lastAt2);
        let w2 = saved.whiteTimeMs || 0; let b2 = saved.blackTimeMs || 0;
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
        // Apply AI move
        const aiMove = pickAIMove(Chess, saved.fen, aiSide, Math.max(1, Math.min(3, level)));
        if (aiMove) {
          const c2 = new Chess(saved.fen);
          c2.move(aiMove);
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
        const aiMove = pickAIMove(Chess, saved.fen, aiSide, Math.max(1, Math.min(3, level)));
        if (aiMove) {
          const c2 = new Chess(saved.fen);
          c2.move(aiMove);
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
