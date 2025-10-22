// api/proxy/solana/safety.js
module.exports = async function handler(req, res) {
  const { addr } = req.query;
  if (!addr) return res.status(400).json({ error: "Token address is required" });

  try {
    console.log(`Fetching safety data for ${addr}`);
    const exchangeResponse = await fetch(`https://pumpwolf.vercel.app/api/proxy/token/mainnet/exchange/pumpfun/new?limit=100`, {
      method: 'GET',
      headers: { 'accept': 'application/json' }
    });

    if (!exchangeResponse.ok) {
      const errorText = await exchangeResponse.text();
      console.error(`Error fetching exchange data: ${exchangeResponse.status} ${errorText}`);
      throw new Error(`HTTP ${exchangeResponse.status}: ${errorText}`);
    }

    const exchangeData = await exchangeResponse.json();
    console.log(`Fetched exchange data:`, exchangeData);

    if (!exchangeData || !exchangeData.result || !Array.isArray(exchangeData.result)) {
      throw new Error("Invalid exchange data");
    }

    const tokenData = exchangeData.result.find(token => token.tokenAddress === addr);
    if (!tokenData) {
      throw new Error("Token not found in exchange data");
    }

    res.status(200).json({
      data: {
        mintable: null, // Tidak ada data, kosongkan
        blacklisted: false,
        burned: null,  // Tidak ada data, kosongkan
        holders: tokenData.holders || 0, // Placeholder, tambah logika jika ada
        topHolderPct: 0,
        liquidityUsd: parseFloat(tokenData.liquidity) || 0,
        priceUsd: parseFloat(tokenData.priceUsd) || 0,
        volume24h: 0 // Tambah logika DexScreener nanti
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
