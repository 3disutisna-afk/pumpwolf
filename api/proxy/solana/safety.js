// api/proxy/solana/safety.js
module.exports = async function handler(req, res) {
  const { addr } = req.query;
  if (!addr) return res.status(400).json({ error: "Token address is required" });

  try {
    // Log untuk debugging
    console.log(`Processing request for address: ${addr}`);

    // Fetch data exchange dengan timeout dan retry
    const fetchWithRetry = async (url, retries = 3, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          const response = await fetch(url, {
            signal: controller.signal,
            headers: { "accept": "application/json" }
          });
          clearTimeout(timeoutId);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return await response.json();
        } catch (err) {
          console.warn(`Retry ${i + 1}/${retries} failed for ${url}: ${err.message}`);
          if (i === retries - 1) throw err;
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    };

    const exchangeResponse = await fetchWithRetry(
      `https://pumpwolf.vercel.app/api/proxy/token/mainnet/exchange/pumpfun/new?limit=100`
    );
    console.log(`Exchange data fetched:`, exchangeResponse);

    const tokenData = exchangeResponse.result.find(t => t.tokenAddress === addr);
    if (!tokenData) {
      console.warn(`Token ${addr} not found in exchange data, using fallback`);
      return res.status(200).json({
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

    // Ambil data safety dengan fallback
    const safetyData = {
      mintable: null,
      blacklisted: false,
      burned: null,
      holders: 0,
      topHolderPct: 0,
      liquidityUsd: parseFloat(tokenData.liquidity) || 0,
      priceUsd: parseFloat(tokenData.priceUsd) || 0,
      volume24h: 0
    };

    res.status(200).json({ data: safetyData });
  } catch (err) {
    console.error(`Error processing ${addr}:`, err.message);
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
