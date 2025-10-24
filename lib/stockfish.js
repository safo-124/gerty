import stockfish from 'stockfish';

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

// Create an engine instance and resolve with bestmove for given FEN.
// opts: { movetime?: number, depth?: number, skill?: number (0-20) }
export async function getBestMoveWithStockfish(fen, opts = {}) {
  const { movetime = 800, depth = undefined, skill = 10 } = opts;
  const engine = stockfish();
  let ready = false;
  let best = null;

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      try { engine.postMessage('quit'); } catch {}
      try { engine.terminate?.(); } catch {}
    };

    function handleMessage(e) {
      const line = typeof e === 'string' ? e : (e?.data ?? '');
      if (!line) return;
      // console.debug('[SF]', line);
      if (line.startsWith('uciok')) {
        ready = true;
        // Configure options
        engine.postMessage(`setoption name Threads value 1`);
        engine.postMessage(`setoption name Skill Level value ${clamp(skill, 0, 20)}`);
        engine.postMessage('ucinewgame');
        engine.postMessage(`position fen ${fen}`);
        if (movetime) engine.postMessage(`go movetime ${Math.max(100, Math.floor(movetime))}`);
        else if (depth) engine.postMessage(`go depth ${depth}`);
        else engine.postMessage(`go movetime 800`);
      } else if (line.startsWith('bestmove')) {
        // bestmove e2e4 ponder ...
        const parts = line.split(/\s+/);
        const mv = parts[1];
        best = mv || null;
        cleanup();
        resolve({ bestmove: best });
      } else if (/^info /.test(line)) {
        // ignore info lines
      } else if (line.startsWith('readyok')) {
        // ignore
      }
    }

    try {
      engine.onmessage = handleMessage;
      engine.postMessage('uci');
    } catch (err) {
      cleanup();
      reject(err);
    }

    // Safety timeout
    const timeout = setTimeout(() => {
      if (!best) {
        cleanup();
        resolve({ bestmove: null });
      }
    }, Math.max(2000, (movetime || 800) + 1500));
  });
}

// Helper: convert UCI (e2e4, e7e8q) to chess.js move object
export function uciToMove(uci) {
  if (!uci || uci.length < 4) return null;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length >= 5 ? uci[4] : undefined;
  return { from, to, promotion };
}
