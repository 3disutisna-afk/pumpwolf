// api/proxy.js  (replace existing)
// Robust debug-friendly proxy for Vercel static projects.
// DO NOT put your MORALIS key here. Set MORALIS_KEY in Vercel Environment Variables.

module.exports = async function (req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const MORALIS_KEY = process.env.MORALIS_KEY;
  // Log presence of key (do not log the key value)
  console.log('[proxy] MORALIS_KEY present:', !!MORALIS_KEY);

  if (!MORALIS_KEY) {
    console.error('[proxy] Missing MORALIS_KEY -> abort');
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing MORALIS_KEY in server environment' }));
    return;
  }

  try {
    const rawUrl = req.url || '';
    const upstreamPath = rawUrl.replace(/^\/api\/proxy/, '') || '/';
    const upstreamUrl = 'https://solana-gateway.moralis.io' + upstreamPath;

    // log what we'll call (safe — no secret)
    console.log('[proxy] upstreamUrl=', upstreamUrl, 'method=', req.method);

    const upstreamHeaders = {
      'X-API-Key': MORALIS_KEY,
      'accept': 'application/json'
    };
    if (req.headers['content-type']) upstreamHeaders['content-type'] = req.headers['content-type'];

    const opts = {
      method: req.method,
      headers: upstreamHeaders
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body && (typeof req.body === 'string' || Buffer.isBuffer(req.body))) {
        opts.body = req.body;
      } else if (req.body && Object.keys(req.body).length) {
        opts.body = JSON.stringify(req.body);
      } else {
        // try to gather raw body (best-effort)
        try {
          opts.body = await new Promise((resolve) => {
            let data = '';
            req.on && req.on('data', (c) => (data += c));
            req.on && req.on('end', () => resolve(data || undefined));
            setTimeout(() => resolve(undefined), 5);
          });
        } catch(e) { /* ignore */ }
      }
    }

    // fetch upstream
    const upstreamRes = await fetch(upstreamUrl, opts);
    const text = await upstreamRes.text();

    console.log('[proxy] upstreamStatus=', upstreamRes.status, 'content-type=', upstreamRes.headers.get('content-type'));

    // return debug meta if ?debug=1
    const debug = req.query && req.query.debug === '1';
    if (debug) {
      const meta = {
        upstreamUrl,
        status: upstreamRes.status,
        contentType: upstreamRes.headers.get('content-type'),
        bodyPreview: typeof text === 'string' ? text.slice(0, 4000) : String(text)
      };
      console.log('[proxy debug] ', meta);
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify(meta, null, 2));
      return;
    }

    // forward response
    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.statusCode = upstreamRes.status;
    res.end(text);
  } catch (err) {
    console.error('[proxy] internal error:', err && (err.stack || err.message || err));
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Proxy internal error' }));
  }
};
