// api/proxy/solana/safety.js
module.exports = async function handler(req, res) {
  const { addr } = req.query;
  if (!addr) return res.status(400).json({ error: "Token address is required" });

  try {
    console.log(`Fetching safety data for ${addr}`);
    const exchangeResponse = await fetch(
      `https://pumpwolf.vercel.app/api/proxy/token/mainnet/exchange/pumpfun/new?limit=100`,
      { headers: { "accept": "application/json" }, signal: AbortSignal.timeout(10000) }
    );
    if (!exchangeResponse.ok) throw new Error(`Exchange fetch failed: ${exchangeResponse.status}`);

    const exchangeData = await exchangeResponse.json();
    const tokenData = exchangeData.result.find(t => t.tokenAddress === addr);

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
      console.warn(`Token ${addr} not found, using default`);
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
