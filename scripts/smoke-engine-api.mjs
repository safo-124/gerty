#!/usr/bin/env node
// Smoke test for external Stockfish API if configured
// Expects env STOCKFISH_API_URL (and optional STOCKFISH_API_KEY)

import { getBestMoveViaApi } from '../lib/stockfish-api.js';

const startFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

async function main() {
  const url = process.env.STOCKFISH_API_URL || process.env.NEXT_PUBLIC_STOCKFISH_API_URL;
  if (!url) {
    console.log('SKIP: STOCKFISH_API_URL not set.');
    process.exit(0);
  }
  const { bestmove, source, status, error } = await getBestMoveViaApi(startFEN, { movetime: 300, skill: 10 });
  console.log('API URL:', url);
  console.log('API bestmove from start:', bestmove, 'status:', status || 'ok', 'err:', error || '');
  if (!bestmove) process.exit(2);
}

main().catch((e) => { console.error('smoke-engine-api failed:', e); process.exit(1); });
