// api/proxy/solana/safety.js
module.exports = async function handler(req, res) {
  const { addr } = req.query;
  if (!addr) return res.status(400).json({ error: "Token address is required" });

  try {
    console.log(`[SAFETY] Request for: ${addr}`);
    const response = await fetch(
      `https://solana-gateway.moralis.io/token/mainnet/exchange/pumpfun/new?limit=10/${addr}`,
      {
        headers: {
          'X-API-Key': process.env.MORALIS_KEY,
          'accept': 'application/json'
        },
        signal: AbortSignal.timeout(5000)
      }
    );
    if (!response.ok) {
      console.error(`[SAFETY] Fetch failed: HTTP ${response.status}`);
      throw new Error(`Fetch failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[SAFETY] Moralis data:`, JSON.stringify(data, null, 2));

    const responseData = {
      mintable: data.result?.mintAuthority !== null || null,
      blacklisted: false,
      burned: data.result?.mintAuthority === null || null,
      holders: data.result?.holders || 0,
      topHolderPct: 0,
      liquidityUsd: data.result?.liquidity || 0,
      priceUsd: data.result?.priceUsd || 0,
      volume24h: data.result?.volume24h || 0
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
