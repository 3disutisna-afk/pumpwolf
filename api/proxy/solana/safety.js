// api/proxy/solana/safety.js
module.exports = async function handler(req, res) {
  const { addr } = req.query;
  if (!addr) return res.status(400).json({ error: "Token address is required" });

  try {
    console.log(`[SAFETY] Request for address: ${addr}`);
    const exchangeResponse = await fetch(
      `https://pumpwolf.vercel.app/api/proxy/token/mainnet/exchange/pumpfun/new?limit=20`,
      { headers: { "accept": "application/json" }, signal: AbortSignal.timeout(10000) }
    );
    if (!exchangeResponse.ok) {
      console.error(`[SAFETY] Exchange fetch failed: HTTP ${exchangeResponse.status}`);
      throw new Error(`Exchange fetch failed: ${exchangeResponse.status}`);
    }

    const exchangeData = await exchangeResponse.json();
    console.log(`[SAFETY] Exchange data received:`, JSON.stringify(exchangeData, null, 2));

    if (!exchangeData.result || !Array.isArray(exchangeData.result)) {
      console.warn(`[SAFETY] No result array in exchange data`);
      throw new Error("Invalid exchange data structure");
    }

    const tokenData = exchangeData.result.find(t => t.tokenAddress === addr.toLowerCase() || t.tokenAddress === addr);
    console.log(`[SAFETY] Token data for ${addr}:`, tokenData ? JSON.stringify(tokenData, null, 2) : "Not found");

    if (tokenData) {
      res.status(200).json({
        data: {
          mintable: null,
          blacklisted: false,
          burned: null,
          holders: 0,
          topHolderPct: 0,
          liquidityUsd: parseFloat(tokenData.liquidity) || 0,
          priceUsd: parseFloat(tokenData.priceUsd) || 0,
          volume24h: 0
        }
      });
    } else {
      console.warn(`[SAFETY] Token ${addr} not found in exchange data, using default`);
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
  } catch (err) {
    console.error(`[SAFETY] Error processing ${addr}:`, err.message);
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
