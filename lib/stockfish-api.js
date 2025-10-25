// Remote Stockfish API client
// Configure via env:
// - STOCKFISH_API_URL: base URL to POST for bestmove (expected to accept JSON { fen, movetime?, depth?, skill? })
// - STOCKFISH_API_KEY: optional bearer/API key
// - STOCKFISH_API_TIMEOUT_MS: optional timeout in ms (default 5000)

export async function getBestMoveViaApi(fen, opts = {}) {
  const url = process.env.STOCKFISH_API_URL || process.env.NEXT_PUBLIC_STOCKFISH_API_URL;
  if (!url) return { bestmove: null, source: 'none' };
  const { movetime, depth, skill } = opts || {};
  const payload = { fen, movetime, depth, skill };
  const headers = { 'Content-Type': 'application/json' };
  const key = process.env.STOCKFISH_API_KEY || process.env.NEXT_PUBLIC_STOCKFISH_API_KEY;
  if (key) headers['Authorization'] = `Bearer ${key}`;

  // Timeout with AbortController
  const timeoutMs = Number(process.env.STOCKFISH_API_TIMEOUT_MS || 5000);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), Math.max(1000, timeoutMs));
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: ctrl.signal,
      cache: 'no-store',
    });
    if (!res.ok) {
      return { bestmove: null, source: 'api', status: res.status };
    }
    const data = await res.json().catch(() => ({}));
    // Support common shapes: { bestmove }, { bestMove }, { move }, { uci }
    const bestmove = data.bestmove || data.bestMove || data.move || data.uci || null;
    return { bestmove, source: 'api' };
  } catch (e) {
    return { bestmove: null, source: 'api', error: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

export function isExternalApiConfigured() {
  return !!(process.env.STOCKFISH_API_URL || process.env.NEXT_PUBLIC_STOCKFISH_API_URL);
}
