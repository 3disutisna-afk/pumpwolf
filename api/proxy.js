// api/proxy.js // Vercel Serverless function: forward requests to Moralis Solana gateway // - Save this file as api/proxy.js in your repo // - DO NOT put your MORALIS_KEY here. Set it in Vercel Project > Settings > Environment Variables

// Compatibility: Vercel Node 18+. If node-fetch import fails, the fallback below will lazy-load it. let _fetch; async function getFetch() { if (_fetch) return _fetch; try { // preferred: native fetch (Node 18+ on Vercel) if (typeof fetch !== 'undefined') { _fetch = fetch; return _fetch; } // fallback to node-fetch dynamic import const mod = await import('node-fetch'); _fetch = mod.default || mod; return _fetch; } catch (err) { throw new Error('Fetch not available: ' + err.message); } }

export default async function handler(req, res) { try { const MORALIS_KEY = process.env.MORALIS_KEY; if (!MORALIS_KEY) { res.status(500).json({ error: 'Missing MORALIS_KEY in server environment' }); return; }

// build upstream URL: take the path after /api/proxy
// example: client calls /api/proxy/token/mainnet/exchange/pumpfun/new?limit=5
const rawUrl = req.url || '';
const upstreamPath = rawUrl.replace(/^\/api\/proxy/, '');
const upstreamUrl = `https://solana-gateway.moralis.io${upstreamPath}`;

const fetchImpl = await getFetch();

const options = {
  method: req.method,
  headers: {
    'X-API-Key': MORALIS_KEY,
    'accept': 'application/json'
  }
};

// forward body for POST/PUT if present
if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
  // Vercel sends raw body as string/Buffer depending on config; pass through
  options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  // ensure content-type forwarded if client provided
  if (req.headers['content-type']) options.headers['content-type'] = req.headers['content-type'];
}

const upstreamRes = await fetchImpl(upstreamUrl, options);
const text = await upstreamRes.text();

// forward response status & headers (content-type) and body
const ct = upstreamRes.headers.get('content-type') || 'application/json';
res.status(upstreamRes.status).setHeader('content-type', ct);
// disable caching by default (you can change if you want caching)
res.setHeader('cache-control', 'no-store');
res.send(text);

} catch (err) { console.error('proxy error', err); res.status(500).json({ error: 'Proxy internal error' }); } }

