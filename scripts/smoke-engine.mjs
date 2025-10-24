import { getBestMoveWithStockfish } from '../lib/stockfish.js';

const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

(async () => {
  const { bestmove } = await getBestMoveWithStockfish(startFen, { movetime: 300, skill: 10 });
  console.log('Stockfish bestmove from start:', bestmove);
  if (!bestmove) {
    console.error('Engine did not return a move.');
    process.exit(1);
  }
})();
