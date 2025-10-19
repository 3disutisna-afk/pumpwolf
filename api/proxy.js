// api/proxy.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    // build upstream path by removing /api/proxy from request url
    const upstreamPath = req.url.replace(/^\/api\/proxy/, "");
    const MORALIS_KEY = process.env.MORALIS_KEY;
    if (!MORALIS_KEY) {
      return res.status(500).json({ error: "Missing MORALIS_KEY in server env." });
    }

    const upstreamUrl = `https://solana-gateway.moralis.io${upstreamPath}`;
    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers: {
        "X-API-Key": MORALIS_KEY,
        "accept": "application/json"
      },
      // forward body if present
      body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
    });

    const text = await upstreamRes.text();
    res.status(upstreamRes.status).set({
      "content-type": upstreamRes.headers.get("content-type") || "application/json",
      "cache-control": "no-store"
    }).send(text);
  } catch (err) {
    console.error("proxy error", err);
    res.status(500).json({ error: "Proxy error" });
  }
}
