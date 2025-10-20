// api/proxy.js
// Serverless proxy for Moralis (works for static projects on Vercel)
// Save this file to repo root at: /api/proxy.js
// DO NOT hardcode your MORALIS key here. Set MORALIS_KEY in Vercel Environment Variables.

module.exports = async function (req, res) {
  // Basic CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const MORALIS_KEY = process.env.MORALIS_KEY;
  if (!MORALIS_KEY) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing MORALIS_KEY in server environment' }));
    return;
  }

  try {
    // req.url includes entire path and query, e.g. /api/proxy/token/mainnet/...?limit=2
    const rawUrl = req.url || '';
    const upstreamPath = rawUrl.replace(/^\/api\/proxy/, '') || '/';
    const upstreamUrl = 'https://solana-gateway.moralis.io' + upstreamPath;

    // build headers for upstream
    const upstreamHeaders = {
      'X-API-Key': MORALIS_KEY,
      'accept': 'application/json'
    };
    if (req.headers['content-type']) upstreamHeaders['content-type'] = req.headers['content-type'];

    const opts = {
      method: req.method,
      headers: upstreamHeaders
    };

    // forward body for non-GET/HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // Node's req may have body already parsed by Vercel; try to read raw if present
      if (req.body && (typeof req.body === 'string' || Buffer.isBuffer(req.body))) {
        opts.body = req.body;
      } else if (req.body && Object.keys(req.body).length) {
        opts.body = JSON.stringify(req.body);
      } else {
        // fallback: try to collect raw stream (rare)
        try {
          opts.body = await new Promise((resolve) => {
            let data = '';
            req.on && req.on('data', (c) => (data += c));
            req.on && req.on('end', () => resolve(data || undefined));
            // in case events not available, resolve quickly
            setTimeout(() => resolve(undefined), 5);
          });
        } catch (e) { /* ignore */ }
      }
    }

    // use global fetch (available on Vercel Node 18+)
    const upstreamRes = await fetch(upstreamUrl, opts);
    const text = await upstreamRes.text();

    // propagate content-type and status
    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json');
    // avoid caching (adjust if you want caching)
    res.setHeader('Cache-Control', 'no-store');
    res.statusCode = upstreamRes.status;
    res.end(text);
  } catch (err) {
    console.error('proxy error', err && (err.stack || err.message || err));
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Proxy internal error' }));
  }
};
