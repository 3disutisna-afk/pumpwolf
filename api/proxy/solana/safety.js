// api/proxy/solana/safety.js
let requestCount = 0;
const maxRequestsPerMinute = 3; // Turunkan lebih jauh ke 3
const requestWindow = 60000; // 1 menit

module.exports = async function handler(req, res) {
  const { addr } = req.query;
  if (!addr) return res.status(400).json({ error: "Token address is required" });

  const HELIUS_API_KEY = "4b4d10de-beb1-4794-8142-b299fffc8235";
  const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

  // Batasi request
  const now = Date.now();
  if (requestCount >= maxRequestsPerMinute) {
    const timeSinceFirst = now - (requestWindow - (now % requestWindow));
    if (timeSinceFirst < requestWindow) {
      return res.status(429).json({ error: "Rate limit exceeded, try again later" });
    }
    requestCount = 0; // Reset setelah 1 menit
  }
  requestCount++;

  try {
    console.log(`Requesting data for addr: ${addr}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // Timeout 4 detik

    const [mintResponse, holdersResponse] = await Promise.all([
      fetch(HELIUS_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getAccountInfo',
          params: [addr, { encoding: 'jsonParsed', commitment: 'finalized' }]
        }),
        signal: controller.signal
      }),
      fetch(HELIUS_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenLargestAccounts',
          params: [addr, { commitment: 'finalized' }]
        }),
        signal: controller.signal
      })
    ]);
    clearTimeout(timeoutId);

    if (!mintResponse.ok || !holdersResponse.ok) {
      const [mintError, holdersError] = await Promise.all([
        mintResponse.text().catch(() => 'Unknown error'),
        holdersResponse.text().catch(() => 'Unknown error')
      ]);
      throw new Error(`Mint: ${mintResponse.status} ${mintError}, Holders: ${holdersResponse.status} ${holdersError}`);
    }

    const [mintData, holdersData] = await Promise.all([
      mintResponse.json(),
      holdersResponse.json()
    ]);
    console.log(`Responses for ${addr}:`, { mintData, holdersData });

    if (!mintData.result || !mintData.result.value || !mintData.result.value.data?.parsed?.info) {
      throw new Error("Invalid mint data");
    }
    const mintInfo = mintData.result.value.data.parsed.info;
    const mintable = mintInfo.mintAuthority !== null;
    const burned = mintInfo.mintAuthority === null;

    let totalHolders = 0;
    let topHolderAmount = 0;
    let topHolderPct = 0;
    if (holdersData.result && holdersData.result.value && Array.isArray(holdersData.result.value) && holdersData.result.value.length > 0) {
      totalHolders = holdersData.result.value.length;
      const topHolder = holdersData.result.value[0];
      topHolderAmount = topHolder?.uiAmount || 0;
      topHolderPct = mintInfo.supply ? (topHolderAmount / mintInfo.supply * 100).toFixed(2) : 0;
    }

    const blacklisted = false;

    res.status(200).json({
      data: { mintable, blacklisted, burned, holders: totalHolders, topHolderPct }
    });
  } catch (err) {
    console.error(`Error for addr ${addr}:`, err.message, err.stack);
    res.status(200).json({
      data: { mintable: false, blacklisted: false, burned: false, holders: 0, topHolderPct: 100 }
    });
  }
};
