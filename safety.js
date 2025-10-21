// api/proxy/solana/safety.js
export default async function handler(req, res) {
  const { addr } = req.query;
  if (!addr) return res.status(400).json({ error: "Token address is required" });

  const HELIUS_API_KEY = "4b4d10de-beb1-4794-8142-b299fffc8235"; // API key yang sudah dites
  const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

  try {
    console.log(`Requesting mint info for addr: ${addr}`);
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
    if (!mintResponse.ok) throw new Error(`HTTP ${mintResponse.status}: ${await mintResponse.text()}`);
    const mintData = await mintResponse.json();
    console.log(`Mint response for ${addr}:`, mintData);
    if (!mintData.result || !mintData.result.value || !mintData.result.value.data?.parsed?.info) {
      throw new Error("Invalid mint data: " + JSON.stringify(mintData));
    }
    const mintInfo = mintData.result.value.data.parsed.info;
    const mintable = mintInfo.mintAuthority !== null;
    const burned = mintInfo.mintAuthority === null;

    // Tambah delay untuk menghindari rate limit
    await new Promise(resolve => setTimeout(resolve, 200));

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
    if (!holdersResponse.ok) throw new Error(`HTTP ${holdersResponse.status}: ${await holdersResponse.text()}`);
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

    const blacklisted = false; // Placeholder

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
    console.error(`Error for addr ${addr}:`, err.message, err.stack);
    res.status(500).json({ error: "Failed to fetch token safety data", details: err.message });
  }
}
