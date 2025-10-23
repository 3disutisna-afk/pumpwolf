/* launch_mode.js - PumpWolf
   Fast polling + visual badge for launch day.
   Usage: place this file next to index.html and add:
     <script src="./launch_mode.js"></script>
   before </body>.
*/

(function(){
  const FAST_INTERVAL = 10 * 1000;     // 10s
  const NORMAL_INTERVAL = 60 * 1000;   // 60s
  const LAUNCH_MODE_TIME = 60 * 60 * 1000; // 1 hour

  // Try to use window.fetchTokens if page exposes it; otherwise create a minimal poll function
  function safeFetchTokens() {
    if (typeof window.fetchTokens === 'function') {
      try { window.fetchTokens(); return; } catch(e){ console.warn('fetchTokens threw', e); }
    }
    // fallback: ping proxy endpoint (no keys here)
    const ENDPOINT = (window.ENDPOINT || '/api/proxy/token/mainnet/exchange/pumpfun/new?limit=100');
    fetch(ENDPOINT, { method: 'GET', cache: 'no-store' })
      .then(r => {
        // no-op; this warms the endpoint so main script sees updates faster
        // optionally you can log to debugPanel if present
        const dbg = document.getElementById('debugPanel');
        if (dbg) dbg.textContent = '[launch_mode] probe ' + (r.ok ? 'OK' : r.status);
      }).catch(()=>{ /* ignore */ });
  }

  // start fast polling
  let handle = setInterval(safeFetchTokens, FAST_INTERVAL);

  // after LAUNCH_MODE_TIME, revert to normal interval
  setTimeout(() => {
    clearInterval(handle);
    setInterval(safeFetchTokens, NORMAL_INTERVAL);
    console.info('[launch_mode] ended — polling back to normal');
  }, LAUNCH_MODE_TIME);

  // visual badge
  const badge = document.createElement('div');
  badge.id = 'pw-launch-badge';
  badge.textContent = '🚀 Launch Mode Active';
  Object.assign(badge.style, {
    position: 'fixed',
    right: '12px',
    bottom: '12px',
    zIndex: 99999,
    padding: '8px 12px',
    borderRadius: '10px',
    fontWeight: '800',
    fontFamily: 'Inter, system-ui, sans-serif',
    boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
    background: 'linear-gradient(90deg,#00f0ff,#8a2be2)',
    color: '#001'
  });
  document.body.appendChild(badge);

  // small pulse animation via CSS (insert once)
  const styleId = 'pw-launch-mode-style';
  if (!document.getElementById(styleId)) {
    const st = document.createElement('style');
    st.id = styleId;
    st.textContent = `
      @keyframes pwPulse { 0% { transform: translateY(0); } 50%{ transform: translateY(-4px);} 100%{ transform: translateY(0); } }
      #pw-launch-badge { animation: pwPulse 2.4s ease-in-out infinite; }
    `;
    document.head.appendChild(st);
  }

})();
