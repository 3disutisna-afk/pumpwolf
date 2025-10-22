// api/proxy/solana/safety.js
module.exports = async function handler(req, res) {
  const { addr } = req.query;
  if (!addr) return res.status(400).json({ error: "Token address is required" });

  try {
    console.log(`Fetching data for ${addr}`);
    const response = await fetch(`https://pumpwolf.vercel.app/api/proxy/token/${addr}?chain=solana`, {
      method: 'GET',
      headers: { 'accept': 'application/json' }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error for ${addr}: ${response.status} ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`Fetched data for ${addr}:`, data);

    if (!data || !data.result || !data.result.length || !data.result[0]) {
      throw new Error("Invalid token data");
    }

    const tokenData = data.result[0];
    const mintable = tokenData.mint_authority !== null;
    const burned = tokenData.mint_authority === null;

    res.status(200).json({
      data: { mintable, blacklisted: false, burned, holders: 0, topHolderPct: 0 }
    });
  } catch (err) {
    console.error(`Error for ${addr}:`, err.message);
    res.status(200).json({
      data: { mintable: false, blacklisted: false, burned: false, holders: 0, topHolderPct: 0 }
    });
  }
};
