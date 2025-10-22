// api/proxy/proxy.js
// Debug-friendly serverless proxy for Moralis (Vercel)
// WARNING: Do NOT put your MORALIS_KEY here. Set MORALIS_KEY in Vercel env.

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
  const debug = !!(req.query && (req.query.debug === '1' || req.query.debug === 'true'));

  if (!MORALIS_KEY) {
    const body = { error: 'Missing MORALIS_KEY in server environment' };
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    res.end(JSON.stringify(body));
    return;
  }

  try {
    const rawUrl = req.url || '';
    // remove leading /api/proxy
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
      } else {
        // try collect raw stream if available
        try {
          opts.body = await new Promise((resolve) => {
            let data = '';
            if (req.on) {
              req.on('data', (c) => (data += c));
              req.on('end', () => resolve(data || undefined));
              setTimeout(() => resolve(undefined), 5);
            } else {
              resolve(undefined);
            }
          });
        } catch(e){}
      }
    }

    // forward request
    const upstreamRes = await fetch(upstreamUrl, opts);
    const text = await upstreamRes.text().catch(()=>'');

    // if upstream returns non-2xx, we forward status + body (and include debug info when requested)
    const contentType = upstreamRes.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-store');

    if (!upstreamRes.ok) {
      const out = {
        ok: false,
        status: upstreamRes.status,
        headers: (() => { const o={}; for (const k of upstreamRes.headers.keys()) o[k]=upstreamRes.headers.get(k); return o; })(),
        body: (() => {
          try {
            return JSON.parse(text);
          } catch(e){
            return text;
          }
        })()
      };
      // if debug flag set, include upstreamUrl (safe: no key included)
      if (debug) out.upstream = upstreamUrl;
      res.statusCode = 500; // normalize to 500 so client sees error, but body has upstream status
      res.end(JSON.stringify(out));
      return;
    }

    // success -> proxy through original response
    res.statusCode = upstreamRes.status;
    res.end(text);
  } catch (err) {
    const msg = (err && (err.stack || err.message || String(err))) || 'Unknown proxy error';
    console.error('proxy error', msg);
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Proxy internal error', detail: msg }));
  }
};
