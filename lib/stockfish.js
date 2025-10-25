function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

// Create an engine instance and resolve with bestmove for given FEN.
// opts: { movetime?: number, depth?: number, skill?: number (0-20) }
export async function getBestMoveWithStockfish(fen, opts = {}) {
  const { movetime = 800, depth = undefined, skill = 10 } = opts;
  // First, prefer external Stockfish API if configured
  try {
    const { isExternalApiConfigured, getBestMoveViaApi } = await import('./stockfish-api.js');
    if (isExternalApiConfigured()) {
      const apiRes = await getBestMoveViaApi(fen, { movetime, depth, skill });
      if (apiRes?.bestmove) return { bestmove: apiRes.bestmove };
      // Fall through to local engine if API misses/errs
    }
  } catch {}
  // Resolve stockfish at runtime without forcing Turbopack to statically bundle it
  const moduleName = 'stockfish';
  let stockfishFactory;
  try {
    const mod = await import(moduleName);
    stockfishFactory = mod?.default ?? mod;
  } catch {
    // Fallback for Node: use createRequire
    const { createRequire } = await import('node:module');
    const req = createRequire(import.meta.url);
    try {
      const mod = req(moduleName);
      stockfishFactory = mod?.default ?? mod;
    } catch (e) {
      // Some stockfish builds don't provide a stable main; resolve a concrete engine file from src/
      try {
        const path = await import('node:path');
        const fs = await import('node:fs');
        const pkgPath = req.resolve('stockfish/package.json');
        const pkgDir = path.default.dirname(pkgPath);
        const srcDir = path.default.join(pkgDir, 'src');
        const entries = fs.default.readdirSync(srcDir).filter((f) => f.endsWith('.js'));
        // Prefer single-file builds for Node
        const prefer = [
          /stockfish-.*single.*\.js$/i,
          /stockfish-.*lite-single.*\.js$/i,
          /stockfish-.*lite.*\.js$/i,
          /stockfish-.*asm.*\.js$/i,
          /stockfish-.*\.js$/i,
        ];
        let picked = null;
        for (const rx of prefer) {
          picked = entries.find((f) => rx.test(f));
          if (picked) break;
        }
        if (!picked && entries.length) picked = entries[0];
        if (!picked) throw new Error('No stockfish engine file found');
        const enginePath = path.default.join(srcDir, picked);
        const engMod = req(enginePath);
        stockfishFactory = engMod?.default ?? engMod;
      } catch (inner) {
        throw e;
      }
    }
  }
  let best = null;
  const isNode = typeof process !== 'undefined' && !!(process.versions?.node);

  // In Node, prefer the in-process Emscripten module to avoid worker locateFile issues
  if (isNode) {
    try {
      return await new Promise(async (resolve, reject) => {
        try {
          const { createRequire } = await import('node:module');
          const req = createRequire(import.meta.url);
          const path = await import('node:path');
          const fs = await import('node:fs');

          // Resolve a concrete engine file under stockfish/src
          const pkgPath = req.resolve('stockfish/package.json');
          const pkgDir = path.default.dirname(pkgPath);
          const srcDir = path.default.join(pkgDir, 'src');
          const entries = fs.default.readdirSync(srcDir).filter((f) => f.endsWith('.js'));
          const prefer = [ /stockfish-.*single.*\.js$/i, /stockfish-.*lite-single.*\.js$/i, /stockfish-.*lite.*\.js$/i, /stockfish-.*asm.*\.js$/i, /stockfish-.*\.js$/i ];
          let picked = null; for (const rx of prefer) { picked = entries.find((f) => rx.test(f)); if (picked) break; }
          if (!picked) throw new Error('No stockfish engine file found');
          const enginePath = path.default.join(srcDir, picked);
          const INIT_ENGINE = req(enginePath);

          const engine = {};
          // Route stdout/err to listener
          engine.print = (line) => { try { engine.listener?.(String(line)); } catch {} };
          engine.printErr = (line) => { try { engine.listener?.(String(line)); } catch {} };
          // Provide locateFile to resolve wasm and wasm.map
          engine.locateFile = function (p) {
            if (p.includes('.wasm')) {
              const ext = path.default.extname(enginePath);
              const base = enginePath.slice(0, -ext.length);
              if (p.endsWith('.wasm.map')) return base + '.wasm.map';
              return base + '.wasm';
            }
            return enginePath;
          };

          // If engine was split into parts, assemble wasmBinary
          const ext = path.default.extname(enginePath);
          const base = enginePath.slice(0, -ext.length);
          const dir = path.default.dirname(enginePath);
          const baseName = path.default.basename(base);
          const partFiles = fs.default.readdirSync(dir).filter((p) => p.startsWith(baseName + '-part-') && p.endsWith('.wasm')).sort();
          if (partFiles.length) {
            const buffers = partFiles.map((p) => fs.default.readFileSync(path.default.join(dir, p)));
            engine.wasmBinary = Buffer.concat(buffers);
          } else {
            const wasmFiles = fs.default.readdirSync(dir).filter((p) => p.endsWith('.wasm'));
            let chosen = wasmFiles.find((p) => p.startsWith(baseName + '.wasm')) || wasmFiles.find((p) => p === 'stockfish.wasm') || wasmFiles[0];
            if (chosen) {
              try { engine.wasmBinary = fs.default.readFileSync(path.default.join(dir, chosen)); } catch {}
            }
          }

          const Stockfish = typeof INIT_ENGINE === 'function' ? INIT_ENGINE() : INIT_ENGINE;
          await Stockfish(engine);

          if (typeof engine._isReady === 'function') {
            while (!engine._isReady()) await new Promise((r) => setTimeout(r, 10));
          }

          engine.listener = (line) => {
            if (typeof line !== 'string') return;
            if (line.startsWith('bestmove')) {
              const parts = line.split(/\s+/);
              best = parts[1] || null;
              try { engine.terminate?.(); } catch {}
              resolve({ bestmove: best });
            }
          };

          function send(cmd) {
            const isAsync = /^go\b/.test(cmd);
            // Prefer module-provided processCommand if available
            if (typeof engine.processCommand === 'function') engine.processCommand(cmd);
            else engine.ccall('command', null, ['string'], [cmd], { async: isAsync });
          }

          // Kick off sequence (do not wait for uciok to avoid missed events)
          send('uci');
          send(`setoption name Threads value 1`);
          send(`setoption name Skill Level value ${clamp(skill, 0, 20)}`);
          send('ucinewgame');
          send(`position fen ${fen}`);
          if (movetime) send(`go movetime ${Math.max(100, Math.floor(movetime))}`);
          else if (depth) send(`go depth ${depth}`);
          else send(`go movetime 800`);
          setTimeout(() => { if (!best) { try { engine.terminate?.(); } catch {}; resolve({ bestmove: null }); } }, Math.max(2500, (movetime || 800) + 2000));
        } catch (err) {
          resolve({ bestmove: null });
        }
      });
    } catch {}
  }

  // Try Worker-like interface first (works in both browser and Node via worker_threads)
  try {
    const engine = stockfishFactory && stockfishFactory();
    if (engine && typeof engine.postMessage === 'function') {
      return new Promise((resolve) => {
        const cleanup = () => { try { engine.postMessage('quit'); } catch {}; try { engine.terminate?.(); } catch {}; };
        const handleMessage = (e) => {
          const line = typeof e === 'string' ? e : (e?.data ?? '');
          if (!line) return;
          if (line.startsWith('bestmove')) {
            const parts = line.split(/\s+/);
            best = parts[1] || null;
            cleanup();
            resolve({ bestmove: best });
          }
        };
        // Support both property and event listener styles
        if (typeof engine.addEventListener === 'function') engine.addEventListener('message', handleMessage);
        engine.onmessage = handleMessage;
        // Kick off sequence
        engine.postMessage('uci');
        engine.postMessage(`setoption name Threads value 1`);
        engine.postMessage(`setoption name Skill Level value ${clamp(skill, 0, 20)}`);
        engine.postMessage('ucinewgame');
        engine.postMessage(`position fen ${fen}`);
        if (movetime) engine.postMessage(`go movetime ${Math.max(100, Math.floor(movetime))}`);
        else if (depth) engine.postMessage(`go depth ${depth}`);
        else engine.postMessage(`go movetime 800`);
        setTimeout(() => { if (!best) { cleanup(); resolve({ bestmove: null }); } }, Math.max(2000, (movetime || 800) + 1500));
      });
    }
  } catch {}

  // Node in-process fallback using Emscripten module (no Worker)
  return new Promise(async (resolve, reject) => {
    try {
      const { createRequire } = await import('node:module');
      const req = createRequire(import.meta.url);
      const path = await import('node:path');
      const fs = await import('node:fs');

      // Resolve a concrete engine file under stockfish/src
      const pkgPath = req.resolve('stockfish/package.json');
      const pkgDir = path.default.dirname(pkgPath);
      const srcDir = path.default.join(pkgDir, 'src');
      const entries = fs.default.readdirSync(srcDir).filter((f) => f.endsWith('.js'));
      const prefer = [ /stockfish-.*single.*\.js$/i, /stockfish-.*lite-single.*\.js$/i, /stockfish-.*lite.*\.js$/i, /stockfish-.*asm.*\.js$/i, /stockfish-.*\.js$/i ];
      let picked = null; for (const rx of prefer) { picked = entries.find((f) => rx.test(f)); if (picked) break; }
      if (!picked) throw new Error('No stockfish engine file found');
      const enginePath = path.default.join(srcDir, picked);
      const INIT_ENGINE = req(enginePath);

      const engine = {};
      // Provide locateFile to resolve wasm and wasm.map
      engine.locateFile = function (p) {
        if (p.includes('.wasm')) {
          const ext = path.default.extname(enginePath);
          const base = enginePath.slice(0, -ext.length);
          if (p.endsWith('.wasm.map')) return base + '.wasm.map';
          return base + '.wasm';
        }
        return enginePath;
      };

      // If engine was split into parts, assemble wasmBinary
      const ext = path.default.extname(enginePath);
      const base = enginePath.slice(0, -ext.length);
      const dir = path.default.dirname(enginePath);
      const baseName = path.default.basename(base);
      const partFiles = fs.default.readdirSync(dir).filter((p) => p.startsWith(baseName + '-part-') && p.endsWith('.wasm')).sort();
      if (partFiles.length) {
        const buffers = partFiles.map((p) => fs.default.readFileSync(path.default.join(dir, p)));
        engine.wasmBinary = Buffer.concat(buffers);
      } else {
        // Try to find a single .wasm
        const wasmFiles = fs.default.readdirSync(dir).filter((p) => p.endsWith('.wasm'));
        let chosen = null;
        // Prefer matching baseName, else a file literally named stockfish.wasm, else the first
        chosen = wasmFiles.find((p) => p.startsWith(baseName + '.wasm')) || wasmFiles.find((p) => p === 'stockfish.wasm') || wasmFiles[0];
        if (chosen) {
          try { engine.wasmBinary = fs.default.readFileSync(path.default.join(dir, chosen)); } catch {}
        }
      }

      const Stockfish = typeof INIT_ENGINE === 'function' ? INIT_ENGINE() : INIT_ENGINE;
      await Stockfish(engine);

      // Wait until ready if _isReady exists
      if (typeof engine._isReady === 'function') {
        while (!engine._isReady()) await new Promise((r) => setTimeout(r, 10));
      }

      // Wire listener for output lines
      engine.listener = (line) => {
        if (typeof line !== 'string') return;
        if (line.startsWith('uciok')) {
          // Send options and go
          send(`setoption name Threads value 1`);
          send(`setoption name Skill Level value ${clamp(skill, 0, 20)}`);
          send('ucinewgame');
          send(`position fen ${fen}`);
          if (movetime) send(`go movetime ${Math.max(100, Math.floor(movetime))}`);
          else if (depth) send(`go depth ${depth}`);
          else send(`go movetime 800`);
        } else if (line.startsWith('bestmove')) {
          const parts = line.split(/\s+/);
          best = parts[1] || null;
          try { engine.terminate?.(); } catch {}
          resolve({ bestmove: best });
        }
      };

      function send(cmd) {
        // async for go commands
        const isAsync = /^go\b/.test(cmd);
        engine.ccall('command', null, ['string'], [cmd], { async: isAsync });
      }

      // Kick off
      send('uci');

      setTimeout(() => { if (!best) { try { engine.terminate?.(); } catch {}; resolve({ bestmove: null }); } }, Math.max(2500, (movetime || 800) + 2000));
    } catch (err) {
      resolve({ bestmove: null });
    }
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
