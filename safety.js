// api/proxy/solana/safety.js
export default async function handler(req, res) {
  const { addr } = req.query;
  if (!addr) return res.status(400).json({ error: "Token address is required" });

  const HELIUS_API_KEY = "4b4d10de-beb1-4794-8142-b299fffc8235"; // Ganti dengan API key Helius yang benar
  const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

  try {
    // Fetch mint info
    const mintResponse = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo',
        params: [addr, { encoding: 'jsonParsed' }]
      })
    });
    const mintData = await mintResponse.json();
    if (!mintData.result || !mintData.result.value) {
      console.error("Invalid mint data for addr:", addr, mintData);
      throw new Error("Invalid mint data");
    }
    const mintInfo = mintData.result.value.data.parsed.info;
    const mintable = mintInfo.mintAuthority !== null;
    const burned = mintInfo.mintAuthority === null;

    // Fetch holder info
    const holdersResponse = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenLargestAccounts',
        params: [addr]
      })
    });
    const holdersData = await holdersResponse.json();
    let totalHolders = 0;
    let topHolderAmount = 0;
    let topHolderPct = 0;
    if (holdersData.result && holdersData.result.value && Array.isArray(holdersData.result.value) && holdersData.result.value.length > 0) {
      totalHolders = holdersData.result.value.length;
      const topHolder = holdersData.result.value[0];
      topHolderAmount = topHolder?.uiAmount || 0;
      topHolderPct = mintInfo.supply ? (topHolderAmount / mintInfo.supply * 100).toFixed(2) : 0;
    } else {
      console.warn("No holder data for addr:", addr, holdersData);
    }

    const blacklisted = false; // Placeholder, bisa ditambah logika rug check

    res.status(200).json({
      data: {
        mintable,
        blacklisted,
        burned,
        holders: totalHolders,
        topHolderPct
      }
    });
  } catch (err) {
    console.error("Error fetching token safety for addr:", addr, err.message);
    res.status(500).json({ error: "Failed to fetch token safety data" });
  }
}
