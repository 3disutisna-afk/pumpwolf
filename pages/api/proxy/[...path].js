// pages/api/proxy/[...path].js
// Catch-all Next API route that proxies any /api/proxy/... request to Moralis
// Put this file at: pages/api/proxy/[...path].js
// Do NOT place your Moralis API key here; set MORALIS_KEY in Vercel Environment Variables.

export default async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const MORALIS_KEY = process.env.MORALIS_KEY;
  if (!MORALIS_KEY) {
    res.status(500).json({ error: 'Missing MORALIS_KEY in server environment' });
    return;
  }

  try {
    // req.url includes prefix /api/proxy/... plus query string
    const rawUrl = req.url || '';
    const upstreamPath = rawUrl.replace(/^\/api\/proxy/, '') || '/';
    const upstreamUrl = `https://solana-gateway.moralis.io${upstreamPath}`;

    const upstreamHeaders = {
      'X-API-Key': MORALIS_KEY,
      'accept': 'application/json'
    };
    if (req.headers['content-type']) upstreamHeaders['content-type'] = req.headers['content-type'];

    const opts = { method: req.method, headers: upstreamHeaders };

    // forward body for non-GET/HEAD
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (typeof req.body === 'string' || req.body instanceof Buffer) {
        opts.body = req.body;
      } else if (req.body && Object.keys(req.body).length) {
        opts.body = JSON.stringify(req.body);
      }
    }

    const upstreamRes = await fetch(upstreamUrl, opts);
    const text = await upstreamRes.text();

    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.status(upstreamRes.status).send(text);
  } catch (err) {
    console.error('proxy error', err && (err.stack || err.message || err));
    res.status(500).json({ error: 'Proxy internal error' });
  }
}
