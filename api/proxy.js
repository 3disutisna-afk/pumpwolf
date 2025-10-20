// /api/proxy.js  (place at repo root /api/proxy.js)
module.exports = async function (req, res) {
  // CORS
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
    const rawUrl = req.url || '';
    const upstreamPath = rawUrl.replace(/^\/api\/proxy/, '') || '/';
    const upstreamUrl = 'https://solana-gateway.moralis.io' + upstreamPath;

    const upstreamHeaders = {
      'X-API-Key': MORALIS_KEY,
      'accept': 'application/json'
    };
    if (req.headers['content-type']) upstreamHeaders['content-type'] = req.headers['content-type'];

    const opts = { method: req.method, headers: upstreamHeaders };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body && (typeof req.body === 'string' || Buffer.isBuffer(req.body))) {
        opts.body = req.body;
      } else if (req.body && Object.keys(req.body).length) {
        opts.body = JSON.stringify(req.body);
      } else {
        // attempt to read raw stream (fallback)
        opts.body = await new Promise((resolve) => {
          let data = '';
          req.on && req.on('data', (c) => (data += c));
          req.on && req.on('end', () => resolve(data || undefined));
          setTimeout(() => resolve(undefined), 5);
        });
      }
    }

    const upstreamRes = await fetch(upstreamUrl, opts);
    const text = await upstreamRes.text();

    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json');
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
