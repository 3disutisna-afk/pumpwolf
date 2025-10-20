// api/proxy.js (robust version)
// Vercel Node 18+ compatible. Does safe forwarding, passes query string, sets CORS headers.

let _fetchImpl;
async function getFetch() {
  if (_fetchImpl) return _fetchImpl;
  if (typeof fetch !== 'undefined') { _fetchImpl = fetch; return _fetchImpl; }
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

    // Build upstream path from original request URL (preserve query string)
    // Example incoming: /api/proxy/token/mainnet/exchange/pumpfun/new?limit=2
    const rawUrl = req.url || '';
    const upstreamPath = rawUrl.replace(/^\/api\/proxy/, '') || '/';
    const upstreamUrl = `https://solana-gateway.moralis.io${upstreamPath}`;

    const fetchImpl = await getFetch();

    const opts = {
      method: req.method,
      headers: {
        'X-API-Key': MORALIS_KEY,
        'accept': 'application/json'
      },
      // do not set body for GET/HEAD
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      // Forward the raw body if present
      opts.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      if (req.headers['content-type']) opts.headers['content-type'] = req.headers['content-type'];
    }

    const upstreamRes = await fetchImpl(upstreamUrl, opts);
    const text = await upstreamRes.text();

    // set CORS + content-type
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const ct = upstreamRes.headers.get('content-type') || 'application/json';
    res.status(upstreamRes.status).setHeader('content-type', ct);
    res.setHeader('cache-control', 'no-store');
    res.send(text);
  } catch (err) {
    console.error('proxy error', err && (err.stack || err.message || err));
    res.status(500).json({ error: 'Proxy internal error' });
  }
}
