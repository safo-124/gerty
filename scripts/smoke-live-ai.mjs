#!/usr/bin/env node
/*
Functional smoke test for live move + AI reply without hitting the DB.
- Simulates LiveMatch fields in-memory
- Applies a human move
- Invokes Stockfish via getBestMoveWithStockfish
- Updates clocks (tc+inc) and result status like the API would
*/

import { Chess } from 'chess.js';
import { getBestMoveWithStockfish, uciToMove } from '../lib/stockfish.js';

function fmtMs(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

async function main() {
  // Simulated match: human vs AI, human is White, timed 10+1
  const match = {
    id: 'test',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    pgn: null,
    status: 'ONGOING',
    result: null,
    turn: 'w',
    whiteToken: 'H:W',
    blackToken: 'AI:2',
    tcSeconds: 10,
    incSeconds: 1,
    whiteTimeMs: 10_000,
    blackTimeMs: 10_000,
    lastMoveAt: new Date(),
  };

  console.log('Initial:', { turn: match.turn, white: fmtMs(match.whiteTimeMs), black: fmtMs(match.blackTimeMs) });

  // Human plays e2e4
  const humanToken = match.whiteToken;
  const isWhite = true;
  const chess = new Chess(match.fen);
  const move = chess.move({ from: 'e2', to: 'e4' });
  if (!move) throw new Error('Illegal human move in smoke');

  // Time accounting for human
  const now = Date.now();
  const elapsed = Math.max(0, now - match.lastMoveAt.getTime());
  let wTime = Math.max(0, match.whiteTimeMs - elapsed) + match.incSeconds * 1000;
  let bTime = match.blackTimeMs;

  // Save after human move
  Object.assign(match, {
    fen: chess.fen(),
    pgn: chess.pgn(),
    turn: chess.turn(),
    lastMoveAt: new Date(),
    whiteTimeMs: wTime,
    blackTimeMs: bTime,
  });

  console.log('After human move:', { san: move.san, turn: match.turn, white: fmtMs(match.whiteTimeMs), black: fmtMs(match.blackTimeMs) });

  if (chess.isGameOver()) {
    console.log('Game over after human move:', { checkmate: chess.isCheckmate(), draw: chess.isDraw() });
    return;
  }

  // AI reply if it's AI's turn
  const aiSide = match.blackToken.startsWith('AI:') ? 'b' : match.whiteToken.startsWith('AI:') ? 'w' : undefined;
  if (match.status === 'ONGOING' && aiSide && match.turn === aiSide) {
    const level = Number(match.blackToken.split(':')[1] || '2') || 2;
    const map = {
      1: { skill: 4, mt: 400 },
      2: { skill: 10, mt: 900 },
      3: { skill: 16, mt: 1400 },
    };
    const cfg = map[Math.max(1, Math.min(3, level))];

    // Think and track true elapsed for clocks
    const startThink = Date.now();
    let aiMoveObj = null;
    try {
      const { bestmove } = await getBestMoveWithStockfish(match.fen, { movetime: cfg.mt, skill: cfg.skill });
      if (bestmove) aiMoveObj = uciToMove(bestmove);
    } catch (e) {
      console.warn('Stockfish error (smoke):', e?.message || e);
    }

    const elapsed2 = Math.max(0, Date.now() - match.lastMoveAt.getTime());
    if (aiSide === 'w') {
      wTime = Math.max(0, match.whiteTimeMs - elapsed2);
    } else {
      bTime = Math.max(0, match.blackTimeMs - elapsed2);
    }

    // Fallback any legal move
    if (!aiMoveObj) {
      const tmp = new Chess(match.fen);
      const ms = tmp.moves({ verbose: true });
      if (ms && ms[0]) aiMoveObj = { from: ms[0].from, to: ms[0].to, promotion: ms[0].promotion };
    }
    if (!aiMoveObj) throw new Error('AI produced no move in smoke');

    const c2 = new Chess(match.fen);
    const mv2 = c2.move(aiMoveObj);

    // Add increment for AI
    if (aiSide === 'w') wTime = Math.max(0, wTime + match.incSeconds * 1000); else bTime = Math.max(0, bTime + match.incSeconds * 1000);

    Object.assign(match, {
      fen: c2.fen(),
      pgn: c2.pgn(),
      turn: c2.turn(),
      lastMoveAt: new Date(),
      whiteTimeMs: wTime,
      blackTimeMs: bTime,
    });

    console.log('After AI move:', { san: mv2.san, turn: match.turn, white: fmtMs(match.whiteTimeMs), black: fmtMs(match.blackTimeMs) });

    if (c2.isGameOver()) {
      console.log('Game over after AI move:', { checkmate: c2.isCheckmate(), draw: c2.isDraw() });
    }
  } else {
    console.log('Not AI turn; skipping AI move.');
  }
}

main().catch((e) => {
  console.error('Smoke live AI failed:', e);
  process.exit(1);
});
