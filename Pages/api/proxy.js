// pages/api/proxy.js
// Next.js API route that proxies requests to Moralis Solana gateway
// Put this file at: pages/api/proxy.js
// Do NOT add your MORALIS key here. Set MORALIS_KEY in Vercel Environment Variables.

export default async function handler(req, res) {
  // handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    // Preflight
    res.status(204).end();
    return;
  }

  const MORALIS_KEY = process.env.MORALIS_KEY;
  if (!MORALIS_KEY) {
    res.status(500).json({ error: 'Missing MORALIS_KEY in server environment' });
    return;
  }

  try {
    // Build upstream path preserving querystring
    // Incoming: /api/proxy/token/mainnet/exchange/pumpfun/new?limit=2
    const rawUrl = req.url || '';
    const upstreamPath = rawUrl.replace(/^\/api\/proxy/, '') || '/';
    const upstreamUrl = `https://solana-gateway.moralis.io${upstreamPath}`;

    // Build headers for upstream call
    const upstreamHeaders = {
      'X-API-Key': MORALIS_KEY,
      'accept': 'application/json'
    };
    if (req.headers['content-type']) upstreamHeaders['content-type'] = req.headers['content-type'];

    // Build fetch options
    const opts = {
      method: req.method,
      headers: upstreamHeaders
    };

    // Forward body for non-GET/HEAD requests (Next auto-parses JSON body into req.body)
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // If req.body already a string, send as-is; otherwise JSON.stringify
      if (typeof req.body === 'string' || req.body instanceof Buffer) {
        opts.body = req.body;
      } else {
        // only add body when it's not empty
        const bodyStr = Object.keys(req.body || {}).length ? JSON.stringify(req.body) : undefined;
        if (bodyStr) opts.body = bodyStr;
      }
    }

    // Use global fetch (Node 18+ on Vercel). This will work in modern Vercel Node runtime.
    const upstreamRes = await fetch(upstreamUrl, opts);
    const text = await upstreamRes.text();

    // Forward important headers & status
    const contentType = upstreamRes.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);
    // no caching by default
    res.setHeader('Cache-Control', 'no-store');

    res.status(upstreamRes.status).send(text);
  } catch (err) {
    console.error('proxy error', err && (err.stack || err.message || err));
    res.status(500).json({ error: 'Proxy internal error' });
  }
}
