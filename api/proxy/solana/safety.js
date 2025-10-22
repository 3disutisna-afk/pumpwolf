// api/proxy/solana/safety.js
module.exports = async function handler(req, res) {
  const { addr } = req.query;
  if (!addr) return res.status(400).json({ error: "Token address is required" });

  try {
    console.log(`Fetching holders data for ${addr}`);
    const response = await fetch(`https://pumpwolf.vercel.app/api/proxy/token/mainnet/holders/${addr}`, {
      method: 'GET',
      headers: { 'accept': 'application/json' }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error for ${addr}: ${response.status} ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`Fetched holders data for ${addr}:`, data);

    if (!data || !data.totalHolders) {
      throw new Error("Invalid holders data");
    }

    const holders = data.totalHolders;

    res.status(200).json({
      data: {
        mintable: null, // Tidak ada data, kosongkan
        blacklisted: false,
        burned: null,  // Tidak ada data, kosongkan
        holders: holders,
        topHolderPct: 0,
        // Placeholder untuk data lain (nanti tambah dari DexScreener)
        liquidityUsd: 0,
        priceUsd: 0,
        volume24h: 0
      }
    });
  } catch (err) {
    console.error(`Error for ${addr}:`, err.message);
    res.status(200).json({
      data: {
        mintable: null,
        blacklisted: false,
        burned: null,
        holders: 0,
        topHolderPct: 0,
        liquidityUsd: 0,
        priceUsd: 0,
        volume24h: 0
      }
    });
  }
};
