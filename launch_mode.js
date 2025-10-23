// launch_mode.js
// Minimal, safe launch helper — non-blocking, wrapped in try/catch
(function(){
  try {
    // --- CONFIG you can edit here ---
    // set featured token (empty string to keep disabled)
    const FEATURED_TOKEN_ADDRESS = ""; // contoh: "7tGFje81tRs99PMB7soBTZMTgVPkXiTaWKWRpkUY28J"

    // override logo/banner paths if needed (relative to repo root or /assets/)
    const BANNER_PATH = "assets/pumpwolf_banner.svg";
    const LOGO_PATH = "assets/pumpwolf_logo.png"; // optional

    // --- apply settings (non-blocking) ---
    // set global for other scripts to read
    try { window.FEATURED_TOKEN_ADDRESS = FEATURED_TOKEN_ADDRESS || ""; } catch(e){ /* ignore */ }

    // apply banner if element/meta exists
    (function setBanner(){
      try {
        // update og:image meta (useful for social)
        const og = document.querySelector('meta[property="og:image"]');
        if (og && BANNER_PATH) og.setAttribute('content', BANNER_PATH);
      } catch(e){ /* ignore */ }
    })();

    // apply header logo replacement if present on page
    (function setLogo(){
      try {
        if (!LOGO_PATH) return;
        const logoEl = document.querySelector('header .logo, #featuredLogo');
        if (logoEl) {
          // if it's an IMG
          if (logoEl.tagName && logoEl.tagName.toLowerCase() === 'img') {
            logoEl.src = LOGO_PATH;
          } else {
            // else set background image for div.logo
            logoEl.style.backgroundImage = `url("${LOGO_PATH}")`;
            logoEl.style.backgroundSize = 'cover';
            logoEl.style.backgroundPosition = 'center';
          }
        }
      } catch(e){ /* ignore */ }
    })();

    // small helper to safely run optional launch actions after DOM ready
    function onReady(fn){
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn);
      } else {
        setTimeout(fn, 1);
      }
    }

    onReady(function(){
      try {
        // show a small console hint for debugging
        console.info('[launch_mode] running safe config. featured:', window.FEATURED_TOKEN_ADDRESS || '(none)');

        // If featured token is set, attempt to update title area text
        if (window.FEATURED_TOKEN_ADDRESS) {
          try {
            const ft = document.getElementById('featuredTitle');
            if (ft) { ft.textContent = ft.textContent.replace(/\$WOLF.*/, '$WOLF — Featured'); }
          } catch(e){}
        }

        // make sure fallback probe doesn't run redirect on vercel domain
        // (the main page already probes; this is just additional safety)
        try {
          if (location.hostname && location.hostname.endsWith('.vercel.app')) {
            const fallback = document.getElementById('pwFallback');
            if (fallback) fallback.style.display = 'none';
          }
        } catch(e){}

      } catch(e){
        console.warn('[launch_mode] inner error', e && (e.message || e));
      }
    });

  } catch (err) {
    // never throw to page: log to console only
    try { console.error('[launch_mode] error', err && (err.stack || err.message || err)); } catch(e){}
  }
})();
