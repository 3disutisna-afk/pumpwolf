// api/proxy/solana/safety.js
module.exports = async function handler(req, res) {
  const { addr } = req.query;
  if (!addr) return res.status(400).json({ error: "Token address is required" });

  try {
    console.log(`[SAFETY] Request for: ${addr}`);
    const exchangeResponse = await fetch(
      `https://pumpwolf.vercel.app/api/proxy/token/mainnet/exchange/pumpfun/new?limit=100`,
      {
        headers: {
          "accept": "application/json",
          "Authorization": "Bearer YOUR_API_KEY_HERE" // Ganti dengan API key jika ada, atau hapus jika tidak diperlukan
        },
        signal: AbortSignal.timeout(5000)
      }
    );
    if (!exchangeResponse.ok) {
      console.error(`[SAFETY] Fetch failed: HTTP ${exchangeResponse.status} - ${exchangeResponse.statusText}`);
      throw new Error(`Fetch failed: ${exchangeResponse.status}`);
    }

    const exchangeData = await exchangeResponse.json();
    console.log(`[SAFETY] Exchange data:`, JSON.stringify(exchangeData, null, 2));

    const tokenData = exchangeData.result?.find(t => t.tokenAddress?.toLowerCase() === addr.toLowerCase());
    console.log(`[SAFETY] Found token:`, tokenData ? JSON.stringify(tokenData, null, 2) : "Not found");

    const responseData = tokenData ? {
      mintable: null,
      blacklisted: false,
      burned: null,
      holders: 0,
      topHolderPct: 0,
      liquidityUsd: parseFloat(tokenData.liquidity) || 0,
      priceUsd: parseFloat(tokenData.priceUsd) || 0,
      volume24h: 0
    } : {
      mintable: null,
      blacklisted: false,
      burned: null,
      holders: 0,
      topHolderPct: 0,
      liquidityUsd: 0,
      priceUsd: 0,
      volume24h: 0
    };

    res.status(200).json({ data: responseData });
  } catch (err) {
    console.error(`[SAFETY] Error:`, err.message);
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
