// api/proxy/solana/safety.js
module.exports = async function handler(req, res) {
  const { addr } = req.query;
  if (!addr) return res.status(400).json({ error: "Token address is required" });

  try {
    const response = await fetch(`https://pumpwolf.vercel.app/api/proxy/token/mainnet/account/${addr}`, {
      method: 'GET',
      headers: { 'accept': 'application/json' }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`Fetched data for ${addr}:`, data);

    if (!data || !data.result || !data.result.value || !data.result.value.data?.parsed?.info) {
      throw new Error("Invalid token data");
    }

    const mintInfo = data.result.value.data.parsed.info;
    const mintable = mintInfo.mintAuthority !== null;
    const burned = mintInfo.mintAuthority === null;

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
