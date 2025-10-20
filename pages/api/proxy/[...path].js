// pages/api/proxy/[...path].js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const MORALIS_KEY = process.env.MORALIS_KEY;
  if (!MORALIS_KEY) {
    res.status(500).json({ error: 'Missing MORALIS_KEY in server environment' });
    console.error('Missing MORALIS_KEY');
    return;
  }

  try {
    const rawUrl = req.url || '';
    const upstreamPath = rawUrl.replace(/^\/api\/proxy/, '') || '/';
    const upstreamUrl = `https://solana-gateway.moralis.io${upstreamPath}`;

    const upstreamHeaders = {
      'X-API-Key': MORALIS_KEY,
      'accept': 'application/json'
    };
    if (req.headers['content-type']) upstreamHeaders['content-type'] = req.headers['content-type'];

    const opts = { method: req.method, headers: upstreamHeaders };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (typeof req.body === 'string' || req.body instanceof Buffer) {
        opts.body = req.body;
      } else if (req.body && Object.keys(req.body).length) {
        opts.body = JSON.stringify(req.body);
      }
    }

    const debug = req.query && req.query.debug === '1';
    const upstreamRes = await fetch(upstreamUrl, opts);
    const text = await upstreamRes.text();

    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 'no-store');

    if (debug) {
      const meta = {
        upstreamUrl,
        status: upstreamRes.status,
        contentType: upstreamRes.headers.get('content-type'),
        bodyPreview: (typeof text === 'string') ? text.slice(0, 4000) : String(text)
      };
      console.log('PROXY debug:', meta);
      res.status(200).json(meta);
      return;
    }

    res.status(upstreamRes.status).send(text);
  } catch (err) {
    console.error('proxy internal error', err && (err.stack || err.message || err));
    res.status(500).json({ error: 'Proxy internal error' });
  }
}
