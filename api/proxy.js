// api/proxy/proxy.js
module.exports = function handler(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments[0] === 'proxy' && pathSegments.length > 1) {
    const targetPath = pathSegments.slice(1).join('/');
    const targetUrl = `/api/${targetPath}`;
    res.writeHead(302, { Location: targetUrl });
    res.end();
  } else {
    res.status(404).json({ error: "Not found" });
  }
};
