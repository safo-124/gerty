import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
function inBounds(f, r) {
  return f >= 0 && f < 8 && r >= 0 && r < 8;
}

function detectTactics(chess, lastMoveVerbose) {
  // Returns { tactics: string[], matePattern?: string }
  const res = { tactics: [] };
  const isMate = (() => {
    try { return chess.isGameOver() && chess.isCheckmate(); } catch { return false; }
  })();
  if (!isMate) return res;

  // Side to move is the mated side
  const matedTurn = chess.turn(); // 'w' or 'b'
  const board = chess.board(); // 8x8, each square is { type, color } or null

  // Find mated king square
  let kFile = -1, kRank = -1;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (sq && sq.type === 'k' && sq.color === matedTurn) { kFile = f; kRank = r; break; }
    }
    if (kFile !== -1) break;
  }
  const piece = lastMoveVerbose?.piece; // 'q','r','b','n','p'
  const san = lastMoveVerbose?.san || '';

  // Helper to check if adjacent squares around king are blocked by same color pieces
  const surroundingBlockedByOwn = () => {
    let blocked = 0, own = 0, total = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let df = -1; df <= 1; df++) {
        if (dr === 0 && df === 0) continue;
        const rr = kRank + dr, ff = kFile + df; total++;
        if (inBounds(ff, rr)) {
          const sq = board[rr][ff];
          if (sq) { blocked++; if (sq.color === matedTurn) own++; }
        } else {
          // Off-board counts as blocked
          blocked++;
        }
      }
    }
    return { blocked, own, total };
  };

  // Heuristics
  // Promotion mate
  if (san.includes('=Q') || lastMoveVerbose?.promotion === 'q') {
    res.tactics.push('Promotion');
  }

  // Smothered mate: knight delivers mate and king is fully surrounded by own pieces/board edges
  if (piece === 'n') {
    const surr = surroundingBlockedByOwn();
    if (surr.own >= 5 && surr.blocked >= 7) {
      res.tactics.push('Smothered');
      res.matePattern = res.matePattern || 'Smothered mate';
    } else {
      res.tactics.push('Knight mate');
    }
  }

  // Back-rank mate: queen/rook delivers mate on back rank/file with king on back rank
  const matedBackRank = (matedTurn === 'w') ? 7 : 0; // board[rank][file], rank 7 = 1st rank (white back rank), 0 = 8th
  // Note: chess.board() returns rank 0 at 8th rank (black back rank), rank 7 at 1st rank (white back rank)
  if ((piece === 'q' || piece === 'r') && kRank === matedBackRank && /#/.test(san)) {
    // If the last move was along rank or file
    const mv = lastMoveVerbose;
    if (mv) {
      const fromFile = mv.from?.charCodeAt?.(0) - 97;
      const fromRank = mv.from ? 8 - Number(mv.from[1]) : undefined;
      const toFile = mv.to?.charCodeAt?.(0) - 97;
      const toRank = mv.to ? 8 - Number(mv.to[1]) : undefined;
      if (fromFile != null && toFile != null && fromRank != null && toRank != null) {
        if (fromFile === toFile || fromRank === toRank) {
          res.tactics.push('Back-rank');
          res.matePattern = res.matePattern || 'Back-rank mate';
        }
      }
    }
  }

  // Generic labels by mating piece if no pattern set
  if (!res.matePattern) {
    if (piece === 'q') res.matePattern = 'Queen mate';
    else if (piece === 'r') res.matePattern = 'Rook mate';
    else if (piece === 'b') res.matePattern = 'Bishop mate';
    else if (piece === 'n') res.matePattern = res.matePattern || 'Knight mate';
    else res.matePattern = 'Checkmate';
  }

  // Additional tactic heuristics (approximate): Pin/Skewer/Deflection/Decoy/Discovered
  const attackerTurn = matedTurn === 'w' ? 'b' : 'w';
  const lineDirs = [
    [1,0],[-1,0],[0,1],[0,-1],
    [1,1],[1,-1],[-1,1],[-1,-1]
  ];
  function firstInDir(fr, ff, dr, df) {
    let r = fr + dr, f = ff + df;
    while (r >= 0 && r < 8 && f >= 0 && f < 8) {
      const sq = board[r][f];
      if (sq) return { r, f, sq };
      r += dr; f += df;
    }
    return null;
  }
  // Pin: a mated-side piece lies between an attacking line-piece and the king
  for (const [dr, df] of lineDirs) {
    const first = firstInDir(kRank, kFile, dr, df);
    if (first && first.sq.color === matedTurn) {
      // look beyond for an enemy sliding piece in same line
      const second = firstInDir(first.r, first.f, dr, df);
      if (second && second.sq.color === attackerTurn && (second.sq.type === 'q' || second.sq.type === 'r' || second.sq.type === 'b')) {
        res.tactics.push('Pin');
      }
    }
  }
  // Discovered attack: last move piece is not sliding piece giving mate line; line attacker aims at king and last mover is different
  for (const [dr, df] of lineDirs) {
    const first = firstInDir(kRank, kFile, dr, df);
    if (first && first.sq.color === attackerTurn && (first.sq.type === 'q' || first.sq.type === 'r' || first.sq.type === 'b')) {
      const attackerSq = String.fromCharCode(97 + first.f) + String(8 - first.r);
      if (lastMoveVerbose?.to !== attackerSq) {
        res.tactics.push('Discovered attack');
      }
    }
  }
  // Skewer (very approximate): attacker line-piece opposite side of king along a line and valuable piece behind the king within 2 steps
  for (const [dr, df] of lineDirs) {
    const opp = firstInDir(kRank, kFile, -dr, -df);
    const fwd = firstInDir(kRank, kFile, dr, df);
    if (opp && opp.sq.color === attackerTurn && (opp.sq.type === 'q' || opp.sq.type === 'r' || opp.sq.type === 'b')) {
      if (fwd && fwd.sq.color === matedTurn && (fwd.sq.type === 'q' || fwd.sq.type === 'r')) {
        res.tactics.push('Skewer');
      }
    }
  }
  // Deflection/Decoy (rough): if last move captured and resulting piece is en prise near king, call 'Deflection'; if last move sacrificed onto king’s neighborhood, call 'Decoy'
  const kingNeighbors = [];
  for (let drr=-1; drr<=1; drr++) {
    for (let dff=-1; dff<=1; dff++) {
      if (drr===0 && dff===0) continue;
      const rr=kRank+drr, ff=kFile+dff;
      if (rr>=0 && rr<8 && ff>=0 && ff<8) kingNeighbors.push(`${String.fromCharCode(97+ff)}${8-rr}`);
    }
  }
  if (lastMoveVerbose) {
    const movedTo = lastMoveVerbose.to;
    if (lastMoveVerbose.captured) res.tactics.push('Deflection');
    if (kingNeighbors.includes(movedTo)) res.tactics.push('Decoy');
  }

  // Ensure uniqueness and compactness
  res.tactics = Array.from(new Set(res.tactics));
  return res;
}

// Simple heuristic selector for AI moves with style variants
function centerBonus(file, rank) {
  const dx = Math.abs(file - 3.5);
  const dy = Math.abs(rank - 3.5);
  return Math.max(0, 0.6 - (dx + dy) * 0.3);
}
function squareToFR(sq) {
  if (!sq) return [null, null];
  const f = sq.charCodeAt(0) - 97;
  const r = 8 - Number(sq[1]);
  return [f, r];
}
// Simple heuristic selector for AI moves: prefer captures/checks, style-aware
function pickHeuristicMove(moves, chess, style = 'agg') {
  if (!moves?.length) return undefined;
  const val = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let best = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    let s = Math.random() * 0.2; // jitter
    if (m.promotion === 'q') s += 8; // prefer promote to queen
    if (m.san?.includes('#')) s += 100; // checkmate
    else if (m.san?.includes('+')) s += 1.5; // check
    const [toF, toR] = squareToFR(m.to);
    const isCapture = !!m.captured;
    if (style === 'agg') {
      if (isCapture) s += (val[m.captured?.toLowerCase?.()] || 0) + 0.8;
      if (m.piece === 'n' || m.piece === 'b') s += 0.2;
      if (m.piece === 'q') s += 0.1;
      if (toF != null) s += centerBonus(toF, toR) * 0.8;
    } else if (style === 'pos') {
      if (toF != null) s += centerBonus(toF, toR) * 1.2;
      if (m.piece === 'n' || m.piece === 'b') s += 0.4;
      if (m.piece === 'r' && (toF === 0 || toF === 7)) s += 0.2;
      if (isCapture) s += (val[m.captured?.toLowerCase?.()] || 0) + 0.2;
    } else {
      if (isCapture) s += (val[m.captured?.toLowerCase?.()] || 0) + 0.4;
      if (toF != null) s += centerBonus(toF, toR) * 0.6;
    }
    if (s > bestScore) { bestScore = s; best = m; }
  }
  return best;
}

export async function GET(request, { params }) {
  try {
    const { id } = params || {};
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const match = await prisma.liveMatch.findUnique({ where: { id } });
    if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // If this is an AI vs AI match, auto-advance quickly and enforce 30-min resets on reads too
    const isAiWhite = match.whiteToken?.startsWith?.('AI:');
    const isAiBlack = match.blackToken?.startsWith?.('AI:');
    const aiBoth = !!(isAiWhite && isAiBlack);
    if (aiBoth) {
      try {
  const { Chess } = await import('chess.js');
  const FIFTEEN_MIN = 15 * 60 * 1000;
        let updated = null;
        // Hard reset if older than 30 minutes
        const createdAtMs = new Date(match.createdAt).getTime();
  if (Date.now() - createdAtMs > FIFTEEN_MIN && match.status === 'ONGOING') {
          try {
            const c = new Chess(match.fen);
            const isMate = c.isCheckmate();
            await prisma.liveMatch.update({
              where: { id: match.id },
              data: {
                status: isMate ? 'CHECKMATE' : 'DRAW',
                result: isMate ? (c.turn() === 'w' ? '0-1' : '1-0') : '1/2-1/2',
                lastMoveAt: new Date(),
              },
            });
          } catch {}
        } else {
          // Move quickly: advance roughly every 0.5s if ongoing
          const lastAt = new Date(match.lastMoveAt).getTime();
          if (Date.now() - lastAt > 500 && match.status === 'ONGOING') {
            const c = new Chess(match.fen);
            const moves = c.moves({ verbose: true });
            if (moves.length) {
              const style = (c.turn() === 'w' ? match.whiteToken : match.blackToken)?.split(':')[2] || 'agg';
              const m = pickHeuristicMove(moves, c, style) || moves[0];
              c.move(m);
              let upd = {
                fen: c.fen(),
                pgn: c.pgn(),
                turn: c.turn(),
                lastMoveAt: new Date(),
              };
              if (c.isGameOver()) {
                upd.status = c.isCheckmate() ? 'CHECKMATE' : 'DRAW';
                upd.result = upd.status === 'CHECKMATE' ? (c.turn() === 'w' ? '0-1' : '1-0') : '1/2-1/2';
              }
              updated = await prisma.liveMatch.update({ where: { id: match.id }, data: upd });
            }
          }
        }
        if (updated) Object.assign(match, updated);
      } catch {}
    }

    // Optional token to reveal side
    const url = new URL(request.url);
    const t = url.searchParams.get('t');
    let side = undefined;
    if (t) {
      if (t === match.whiteToken) side = 'w';
      else if (t === match.blackToken) side = 'b';
    }
    const ai = (match.whiteToken?.startsWith?.('AI:') || match.blackToken?.startsWith?.('AI:')) || false;
    const aiLevel = match.whiteToken?.startsWith?.('AI:') ? Number(match.whiteToken.split(':')[1] || '1')
      : match.blackToken?.startsWith?.('AI:') ? Number(match.blackToken.split(':')[1] || '1') : undefined;
    const aiSide = match.whiteToken?.startsWith?.('AI:') ? 'w' : match.blackToken?.startsWith?.('AI:') ? 'b' : undefined;
    const aiStyleWhite = match.whiteToken?.startsWith?.('AI:') ? (match.whiteToken.split(':')[2] || 'agg') : undefined;
    const aiStyleBlack = match.blackToken?.startsWith?.('AI:') ? (match.blackToken.split(':')[2] || 'agg') : undefined;
    // Compute last move from PGN
    let lastMoveFrom = undefined;
    let lastMoveTo = undefined;
    let matePattern = undefined;
    let tactics = [];
    try {
      const { Chess } = await import('chess.js');
      const c = new Chess();
      if (match.pgn) c.loadPgn(match.pgn);
      const hist = c.history({ verbose: true });
      const lm = hist[hist.length - 1];
      if (lm) { lastMoveFrom = lm.from; lastMoveTo = lm.to; }
      const det = detectTactics(c, lm);
      matePattern = det.matePattern;
      tactics = det.tactics;
    } catch {}
    // Do not leak tokens
    const { whiteToken, blackToken, ...safe } = match;
  const isCheckmate = match.status === 'CHECKMATE';
  // Auto-delete matches that have finished (AI or human) with a 2-minute grace window.
  // We delete only if the last move was > 2 minutes ago, so viewers can still see the final state briefly.
  (async () => {
    try {
      const GRACE_MS = 2 * 60 * 1000; // 2 minutes
      if (match.status && match.status !== 'ONGOING') {
        const lastAtMs = new Date(match.lastMoveAt).getTime();
        const age = Date.now() - lastAtMs;
        if (Number.isFinite(age) && age > GRACE_MS) {
          await prisma.liveMatch.delete({ where: { id: match.id } });
        }
      }
    } catch {}
  })();
  return NextResponse.json({ match: { ...safe, side, lastMoveFrom, lastMoveTo, ai, aiLevel, aiSide, aiStyleWhite, aiStyleBlack, isCheckmate, matePattern, tactics } });
  } catch (error) {
    console.error('Live get error:', error);
    return NextResponse.json({ error: 'Failed to fetch match' }, { status: 500 });
  }
}
