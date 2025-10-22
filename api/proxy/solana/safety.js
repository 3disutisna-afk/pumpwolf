// api/proxy/solana/safety.js
let requestCount = 0;
const maxRequestsPerMinute = 5;
const requestWindow = 60000;

module.exports = async function handler(req, res) {
  const { addr } = req.query;
  if (!addr) return res.status(400).json({ error: "Token address is required" });

  const HELIUS_API_KEY = "4b4d10de-beb1-4794-8142-b299fffc8235";
  const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

  const now = Date.now();
  if (requestCount >= maxRequestsPerMinute) {
    const timeSinceFirst = now - (requestWindow - (now % requestWindow));
    if (timeSinceFirst < requestWindow) {
      console.log(`Rate limit exceeded for ${addr}`);
      return res.status(429).json({ error: "Rate limit exceeded, try again later" });
    }
    requestCount = 0;
  }
  requestCount++;

  try {
    console.log(`Requesting mint info for ${addr}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const mintResponse = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo',
        params: [addr, { encoding: 'jsonParsed', commitment: 'finalized' }]
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!mintResponse.ok) {
      const errorText = await mintResponse.text();
      throw new Error(`HTTP ${mintResponse.status}: ${errorText}`);
    }

    const mintData = await mintResponse.json();
    console.log(`Mint response for ${addr}:`, mintData);

    if (!mintData.result || !mintData.result.value || !mintData.result.value.data?.parsed?.info) {
      throw new Error("Invalid mint data");
    }

    const mintInfo = mintData.result.value.data.parsed.info;
    const mintable = mintInfo.mintAuthority !== null;
    const burned = mintInfo.mintAuthority === null;

    const blacklisted = false;
    res.status(200).json({
      data: { mintable, blacklisted, burned, holders: 0, topHolderPct: 0 }
    });
  } catch (err) {
    console.error(`Error for ${addr}:`, err.message);
    res.status(200).json({
      data: { mintable: false, blacklisted: false, burned: false, holders: 0, topHolderPct: 0 }
    });
  }
};
