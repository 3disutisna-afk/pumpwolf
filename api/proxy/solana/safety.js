// api/proxy/solana/safety.js
let requestCount = 0;
const maxRequestsPerMinute = 10;
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

  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}/${maxRetries + 1} - Requesting mint info for addr: ${addr}`);
      const mintResponse = await fetch(HELIUS_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getAccountInfo',
          params: [addr, { encoding: 'jsonParsed', commitment: 'finalized' }]
        })
      });
      if (!mintResponse.ok) {
        const errorText = await mintResponse.text();
        throw new Error(`HTTP ${mintResponse.status}: ${errorText}`);
      }
      const mintData = await mintResponse.json();
      console.log(`Mint response for ${addr}:`, mintData);
      if (!mintData.result || !mintData.result.value || !mintData.result.value.data?.parsed?.info) {
        throw new Error("Invalid mint data: " + JSON.stringify(mintData));
      }
      const mintInfo = mintData.result.value.data.parsed.info;
      const mintable = mintInfo.mintAuthority !== null;
      const burned = mintInfo.mintAuthority === null;

      await new Promise(resolve => setTimeout(resolve, 600));

      console.log(`Requesting holder info for addr: ${addr}`);
      const holdersResponse = await fetch(HELIUS_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenLargestAccounts',
          params: [addr, { commitment: 'finalized' }]
        })
      });
      if (!holdersResponse.ok) {
        const errorText = await holdersResponse.text();
        throw new Error(`HTTP ${holdersResponse.status}: ${errorText}`);
      }
      const holdersData = await holdersResponse.json();
      console.log(`Holder response for ${addr}:`, holdersData);
      let totalHolders = 0;
      let topHolderAmount = 0;
      let topHolderPct = 0;
      if (holdersData.result && holdersData.result.value && Array.isArray(holdersData.result.value) && holdersData.result.value.length > 0) {
        totalHolders = holdersData.result.value.length;
        const topHolder = holdersData.result.value[0];
        topHolderAmount = topHolder?.uiAmount || 0;
        topHolderPct = mintInfo.supply ? (topHolderAmount / mintInfo.supply * 100).toFixed(2) : 0;
      } else {
        console.warn(`No holder data for ${addr}:`, holdersData);
      }

      const blacklisted = false;

      res.status(200).json({
        data: { mintable, blacklisted, burned, holders: totalHolders, topHolderPct }
      });
      return;
    } catch (err) {
      console.error(`Attempt ${attempt + 1}/${maxRetries + 1} - Error for addr ${addr}:`, err.message, err.stack);
      if (attempt === maxRetries) {
        res.status(200).json({
          data: { mintable: false, blacklisted: false, burned: false, holders: 0, topHolderPct: 100 }
        });
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
};
