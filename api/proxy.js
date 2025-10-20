// api/proxy.js
// Serverless proxy for Moralis — CommonJS, compatible with Vercel static projects.
// Save to repo root: /api/proxy.js
// IMPORTANT: do NOT hardcode MORALIS_KEY. Set it in Vercel > Project > Settings > Environment Variables.

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
  if (!MORALIS_KEY) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing MORALIS_KEY in server environment' }));
    console.error('Missing MORALIS_KEY');
    return;
  }

  try {
    // preserve full path & query after /api/proxy
    const rawUrl = req.url || '';
    const upstreamPath = rawUrl.replace(/^\/api\/proxy/, '') || '/';
    const upstreamUrl = 'https://solana-gateway.moralis.io' + upstreamPath;

    // build headers for upstream
    const upstreamHeaders = {
      'X-API-Key': MORALIS_KEY,
      'accept': 'application/json'
    };
    if (req.headers['content-type']) upstreamHeaders['content-type'] = req.headers['content-type'];

    const opts = { method: req.method, headers: upstreamHeaders };

    // forward body for non-GET/HEAD
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body && (typeof req.body === 'string' || Buffer.isBuffer(req.body))) {
        opts.body = req.body;
      } else if (req.body && Object.keys(req.body).length) {
        opts.body = JSON.stringify(req.body);
      }
    }

    // optional debug mode: ?debug=1 will return upstream status & body for inspection
    const debug = (req.query && req.query.debug === '1') || false;

    const upstreamRes = await fetch(upstreamUrl, opts);
    const text = await upstreamRes.text();

    // forward content-type and status
    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.statusCode = upstreamRes.status;

    // If debug requested, return object with upstream meta (no secret leak)
    if (debug) {
      const meta = {
        upstreamUrl,
        status: upstreamRes.status,
        contentType: upstreamRes.headers.get('content-type'),
        bodyPreview: (typeof text === 'string') ? text.slice(0, 4000) : String(text)
      };
      res.end(JSON.stringify(meta, null, 2));
      console.log('PROXY debug:', meta);
      return;
    }

    res.end(text);
  } catch (err) {
    // log full error to Vercel logs (do not expose secret in response)
    console.error('proxy internal error', err && (err.stack || err.message || err));
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Proxy internal error' }));
  }
};
