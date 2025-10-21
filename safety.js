// api/proxy/solana/safety.js
export default async function handler(req, res) {
  const { addr } = req.query;
  if (!addr) return res.status(400).json({ error: "Token address is required" });

  const HELIUS_API_KEY = "4b4d10de-beb1-4794-8142-b299fffc8235"; // Ganti dengan API key Helius kakak
  const SOLSCAN_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3NDQ0MjI5NTIxMzMsImVtYWlsIjoiM2Rpc3V0aXNuYUBnbWFpbC5jb20iLCJhY3Rpb24iOiJ0b2tlbi1hcGkiLCJhcGlWZXJzaW9uIjoidjIiLCJpYXQiOjE3NDQ0MjI5NTJ9.VKZ6LR6RBiHvFwEjxpCpkmxbz_vxWcl_14NxEGRhxRA"; // Ganti dengan API key Solscan kakak (jika ada)
  const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

  try {
    // Fetch mint info via Helius RPC
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
    if (!mintData.result || !mintData.result.value) throw new Error("Invalid mint data");

    const mintInfo = mintData.result.value.data.parsed.info;
    const mintable = mintInfo.mintAuthority !== null;
    const burned = mintInfo.mintAuthority === null;

    // Fetch holder info via Helius (getTokenLargestAccounts)
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
    const totalHolders = holdersData.result.value.length || 0;
    const topHolderAmount = holdersData.result.value[0]?.uiAmount || 0;
    const totalSupply = mintInfo.supply;
    const topHolderPct = totalSupply ? (topHolderAmount / totalSupply * 100).toFixed(2) : 0;

    // Simplified blacklist check (can be enhanced with transaction history)
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
    console.error("Error fetching token safety:", err);
    res.status(500).json({ error: "Failed to fetch token safety data" });
  }
}
