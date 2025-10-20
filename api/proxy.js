// api/proxy.js  (replace everything inside this file)
// Debug-friendly proxy for Vercel static projects.
// Set MORALIS_KEY in Vercel Environment Variables (Project → Settings → Environment Variables).

module.exports = async function (req, res) {
  // --- Basic CORS ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // --- Load env key ---
  const MORALIS_KEY = process.env.MORALIS_KEY;
  console.log('[proxy] MORALIS_KEY present:', !!MORALIS_KEY);

  if (!MORALIS_KEY) {
    console.error('[proxy] Missing MORALIS_KEY');
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing MORALIS_KEY in Vercel Environment Variables' }));
    return;
  }

  try {
    const rawUrl = req.url || '';
    const upstreamPath = rawUrl.replace(/^\/api\/proxy/, '') || '/';
    const upstreamUrl = 'https://solana-gateway.moralis.io' + upstreamPath;
    console.log('[proxy] upstreamUrl =', upstreamUrl);

    const headers = {
      'X-API-Key': MORALIS_KEY,
      accept: 'application/json',
    };
    if (req.headers['content-type'])
      headers['content-type'] = req.headers['content-type'];

    const opts = { method: req.method, headers };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
        opts.body = req.body;
      } else if (req.body && Object.keys(req.body).length) {
        opts.body = JSON.stringify(req.body);
      }
    }

    // --- Upstream fetch ---
    const upstreamRes = await fetch(upstreamUrl, opts);
    const text = await upstreamRes.text();
    console.log('[proxy] status', upstreamRes.status, 'type', upstreamRes.headers.get('content-type'));

    // --- Debug mode (check with &debug=1) ---
    const debug = rawUrl.includes('debug=1');
    if (debug) {
      const info = {
        upstreamUrl,
        status: upstreamRes.status,
        contentType: upstreamRes.headers.get('content-type'),
        snippet: text.slice(0, 500),
      };
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify(info, null, 2));
      return;
    }

    // --- Normal forward ---
    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.statusCode = upstreamRes.status;
    res.end(text);
  } catch (err) {
    console.error('[proxy] error:', err && (err.stack || err.message || err));
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Proxy internal error', message: err.message }));
  }
};
