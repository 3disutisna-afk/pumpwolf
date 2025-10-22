// api/proxy.js
// Vercel serverless proxy for Moralis Solana gateway
// - Save this file to /api/proxy.js in your repository (exact path & filename)
// - Do NOT put your MORALIS key here; set MORALIS_KEY in Vercel Environment Variables

let _fetchImpl;
async function getFetch() {
  if (_fetchImpl) return _fetchImpl;
  if (typeof fetch !== 'undefined') { _fetchImpl = fetch; return _fetchImpl; }
  // dynamic import fallback for node-fetch if native fetch not available
  const mod = await import('node-fetch');
  _fetchImpl = mod.default || mod;
  return _fetchImpl;
}

export default async function handler(req, res) {
  try {
    const MORALIS_KEY = process.env.MORALIS_KEY;
    if (!MORALIS_KEY) {
      res.status(500).json({ error: 'Missing MORALIS_KEY in server environment' });
      return;
    }

    // Build upstream path and URL (preserve query string)
    // Incoming example: /api/proxy/token/mainnet/exchange/pumpfun/new?limit=2
    const rawUrl = req.url || '';
    const upstreamPath = rawUrl.replace(/^\/api\/proxy/, '') || '/';
    const upstreamUrl = `https://solana-gateway.moralis.io${upstreamPath}`;

    const fetchImpl = await getFetch();

    const opts = {
      method: req.method,
      headers: {
        'X-API-Key': MORALIS_KEY,
        'accept': 'application/json'
      }
    };

    // forward body for non-GET/HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      opts.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      if (req.headers['content-type']) opts.headers['content-type'] = req.headers['content-type'];
    }

    const upstreamRes = await fetchImpl(upstreamUrl, opts);
    const text = await upstreamRes.text();

    // set CORS + content-type headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const ct = upstreamRes.headers.get('content-type') || 'application/json';
    res.status(upstreamRes.status).setHeader('content-type', ct);
    // default: no caching to avoid stale data (adjust if you want caching)
    res.setHeader('cache-control', 'no-store');
    res.send(text);
  } catch (err) {
    console.error('proxy error', err && (err.stack || err.message || err));
    res.status(500).json({ error: 'Proxy internal error' });
  }
}
