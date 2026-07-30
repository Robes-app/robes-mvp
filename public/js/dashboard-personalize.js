    window.__robes_personalize = function() {
      // Build marker — verify which version is live from the browser console.
      console.log('[robes] personalize build: window.App bridge + share reconstruct (2026-07-09a)');
      // The dashboard bundle declares `const App = (...)` — a global LEXICAL
      // binding, not a window property (unlike `window.KP` / `window.WA`). So
      // every `if (window.App && App.xxx)` guard below was silently skipping,
      // leaving the wardrobe, moodboard Share / Pack / Rename / +New and
      // wordmark-home patches un-applied (wardrobe only survived via the grid
      // MutationObserver). Bridge the lexical binding onto window so all those
      // guards resolve and the patches take effect as designed.
      try { if (typeof App !== 'undefined' && App && !window.App) window.App = App; } catch (e) {}
      // P0 simplification (beta branch): all moodboard surfaces are hidden —
      // rows, avatar item, deep links, intent routing. Code stays in place so
      // flipping this to false restores everything. Declared at the very top
      // so every early code path (deep links) reads the real value.
      var _RB_MB_HIDDEN = true;
      const _rbStyleIcons = () => {
        const ic = (window.__robes_profile || {}).style_icons;
        return Array.isArray(ic) && ic.length ? ic : [];
      };
      const _rbStyleDna = () => {
        const dna = (window.__robes_profile || {}).style_dna;
        return dna && typeof dna === 'object' && (dna.color_harmony || dna.silhouette_proportions) ? dna : null;
      };
      // profiles.gender_identity (migration 13) — 'woman' is the default for
      // every signup AND the normalisation fallback, so a pre-migration
      // profile (column absent) behaves exactly as before.
      const _rbGender = () => {
        const g = (window.__robes_profile || {}).gender_identity;
        return (g === 'man' || g === 'unspecified') ? g : 'woman';
      };
      // Kill the bundle's mock "Today / Cream on cream" section instantly —
      // _rbApplyLayout removes it at 900ms, but on slow loads the mock look
      // flashes (or lingers) before that. Hide it before first paint.
      if (!document.getElementById('rb-instant-style')) {
        const ris = document.createElement('style');
        ris.id = 'rb-instant-style';
        ris.textContent = '#dual{display:none !important}' +
          '@keyframes kpPhPulse{0%,100%{opacity:1}50%{opacity:.55}}' +
          '@keyframes rbSpin{to{transform:rotate(360deg)}}' +
          '.rb-tile-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}' +
          '.rb-tile-loading .rb-spin{width:18px;height:18px;border:1.5px solid rgba(32,32,33,0.14);border-top-color:rgba(32,32,33,0.55);border-radius:50%;animation:rbSpin 0.9s linear infinite}' +
          '.rb-tile-loading .rb-cap{font-family:var(--font-serif,Georgia,serif);font-style:italic;font-size:12px;color:rgba(32,32,33,0.4);text-align:center;padding:0 12px}';
        document.head.appendChild(ris);
      }
      // Personalise name
      const name = (window.__robes_profile && window.__robes_profile.first_name) || 'Annie';
      if (name !== 'Annie') {
        const walk = (node) => {
          if (node.nodeType === 3) {
            node.textContent = node.textContent.replace(/\bAnnie\b/g, name);
          } else { for (const c of node.childNodes) walk(c); }
        };
        walk(document.body);
      }

      // Avatar dropdown — remove "Founding Stylist", add Account Details
      const avSubtitle = document.querySelector('#av-menu .av-name span');
      if (avSubtitle) avSubtitle.remove();

      // Populate av-name with real name
      const avNameEl = document.getElementById('av-name');
      if (avNameEl) avNameEl.textContent = name;

      // Insert Account Details button before My wardrobe
      const avMenu = document.getElementById('av-menu');
      if (avMenu) {
        const firstBtn = avMenu.querySelector('.av-item');
        const acctBtn = document.createElement('button');
        acctBtn.className = 'av-item';
        acctBtn.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"></circle><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"></path></svg>Account details';
        acctBtn.onclick = () => { document.getElementById('av-menu').classList.remove('open'); document.getElementById('acct-modal').style.display = 'flex'; };
        avMenu.insertBefore(acctBtn, firstBtn);
      }

      // Build Account Details modal
      const acctModal = document.createElement('div');
      acctModal.id = 'acct-modal';
      acctModal.style.cssText = 'display:none;position:fixed;inset:0;z-index:9000;background:rgba(32,32,33,0.32);align-items:center;justify-content:center;backdrop-filter:blur(4px)';
      const userEmail = (window.__robes_session && window.__robes_session.user && window.__robes_session.user.email) || '';
      const prof = window.__robes_profile || {};
      const _acctEsc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      acctModal.innerHTML = `
        <div style="background:#FAF8F5;border-radius:16px;padding:36px 32px;width:100%;max-width:420px;position:relative;box-shadow:0 8px 40px rgba(32,32,33,0.14)">
          <button onclick="document.getElementById('acct-modal').style.display='none'" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:18px;color:var(--ink-faint);cursor:pointer;padding:4px">✕</button>
          <h2 style="font-family:'Cormorant',Georgia,serif;font-weight:300;font-size:26px;margin:0 0 4px;color:#202021">Account details</h2>
          <p style="font-size:12px;color:var(--ink-faint);margin:0 0 28px;letter-spacing:.04em">${_acctEsc(userEmail)}</p>
          <div id="acct-msg" style="font-size:13px;margin-bottom:16px;min-height:18px"></div>
          <label style="display:block;margin-bottom:16px">
            <span style="display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#6E6A64;margin-bottom:6px">First name</span>
            <input id="acct-first" value="${_acctEsc(prof.first_name)}" style="width:100%;height:46px;border:1px solid rgba(32,32,33,0.12);border-radius:var(--rad-sm);padding:0 14px;font-size:14px;color:#202021;background:#fff;outline:none;box-sizing:border-box">
          </label>
          <label style="display:block;margin-bottom:16px">
            <span style="display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#6E6A64;margin-bottom:6px">Last name</span>
            <input id="acct-last" value="${_acctEsc(prof.last_name)}" style="width:100%;height:46px;border:1px solid rgba(32,32,33,0.12);border-radius:var(--rad-sm);padding:0 14px;font-size:14px;color:#202021;background:#fff;outline:none;box-sizing:border-box">
          </label>
          <label style="display:block;margin-bottom:16px">
            <span style="display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#6E6A64;margin-bottom:6px">Mobile number</span>
            <input id="acct-mobile" type="tel" value="${_acctEsc(prof.mobile)}" placeholder="+353..." style="width:100%;height:46px;border:1px solid rgba(32,32,33,0.12);border-radius:var(--rad-sm);padding:0 14px;font-size:14px;color:#202021;background:#fff;outline:none;box-sizing:border-box">
          </label>
          <div style="margin-bottom:28px;border:1px solid rgba(32,32,33,0.12);border-radius:var(--rad-sm);background:#fff;overflow:hidden">
            <button type="button" onclick="window.__acctGenderToggle()" style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;background:none;border:none;padding:13px 14px;cursor:pointer;font-family:inherit">
              <span style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#6E6A64">How do you identify?</span>
              <span style="display:flex;align-items:center;gap:8px"><span id="acct-gender-cur" style="font-size:13px;color:#202021"></span><span id="acct-gender-chev" style="font-size:10px;color:#6E6A64">▾</span></span>
            </button>
            <div id="acct-gender-body" style="display:none;padding:0 14px 14px">
              <p style="font-size:12px;color:#6E6A64;margin:0 0 10px;line-height:1.5">Set once — every recommendation Robes makes follows it.</p>
              <div id="acct-gender-opts" style="display:flex;gap:8px;flex-wrap:wrap"></div>
            </div>
          </div>
          <button onclick="window.__saveAcctDetails()" style="width:100%;height:48px;background:#202021;color:#fff;border:none;border-radius:var(--rad-sm);font-size:10px;letter-spacing:.16em;text-transform:uppercase;cursor:pointer;font-weight:500">Save changes</button>
        </div>`;
      document.body.appendChild(acctModal);
      acctModal.addEventListener('click', (e) => { if (e.target === acctModal) acctModal.style.display = 'none'; });

      // "How do you identify?" — collapsible because it's set once, then
      // rarely revisited. 'woman' is the signup default (migration 13);
      // 'unspecified' renders as "Prefer not to say".
      const _acctGenderOpts = [['woman', 'Woman'], ['man', 'Man'], ['unspecified', 'Prefer not to say']];
      const _acctGenderLabel = (v) => (( _acctGenderOpts.find(o => o[0] === v) || _acctGenderOpts[0])[1]);
      window.__acctGender = _rbGender();
      const _acctGenderPaint = () => {
        const cur = document.getElementById('acct-gender-cur');
        if (cur) cur.textContent = _acctGenderLabel(window.__acctGender);
        const wrap = document.getElementById('acct-gender-opts');
        if (!wrap) return;
        wrap.innerHTML = _acctGenderOpts.map(([v, label]) => {
          const on = v === window.__acctGender;
          return '<button type="button" onclick="window.__acctGenderPick(\'' + v + '\')" style="border-radius:100px;padding:9px 16px;font-size:12.5px;cursor:pointer;font-family:inherit;color:#202021;border:1px solid ' + (on ? '#C9BCA6' : 'rgba(32,32,33,0.14)') + ';background:' + (on ? '#F3EFE6' : '#fff') + '">' + (on ? '<span style="margin-right:6px;color:#202021">✓</span>' : '') + label + '</button>';
        }).join('');
      };
      window.__acctGenderToggle = () => {
        const body = document.getElementById('acct-gender-body');
        const chev = document.getElementById('acct-gender-chev');
        if (!body) return;
        const open = body.style.display !== 'none';
        body.style.display = open ? 'none' : 'block';
        if (chev) chev.textContent = open ? '▾' : '▴';
      };
      window.__acctGenderPick = (v) => { window.__acctGender = v; _acctGenderPaint(); };
      _acctGenderPaint();

      // Save handler — updates Supabase profiles
      window.__saveAcctDetails = async () => {
        const msgEl = document.getElementById('acct-msg');
        msgEl.style.color = '#6E6A64';
        msgEl.textContent = 'Saving…';
        const SUPA_URL = 'https://ayowpaknssulsqqvwpqx.supabase.co';
        const SUPA_KEY = 'sb_publishable_D_iIPtp_R6kjN_711jfyTg_sFmRdpwJ';
        const token = window.__robes_session && window.__robes_session.access_token;
        const userId = window.__robes_session && window.__robes_session.user && window.__robes_session.user.id;
        try {
          const patch = (body) => fetch(SUPA_URL + '/rest/v1/profiles?id=eq.' + userId, {
            method: 'PATCH',
            headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + token,
              'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify(body)
          });
          const fields = {
            first_name: document.getElementById('acct-first').value.trim(),
            last_name: document.getElementById('acct-last').value.trim(),
            mobile: document.getElementById('acct-mobile').value.trim()
          };
          let res = await patch({ ...fields, gender_identity: window.__acctGender || 'woman' });
          if (!res.ok) {
            // gender_identity_migration.sql not run yet (PGRST204 unknown
            // column) — save the rest rather than failing the whole form.
            const errText = await res.text().catch(() => '');
            if (errText.indexOf('gender_identity') !== -1) res = await patch(fields);
          }
          if (res.ok) {
            msgEl.style.color = '#7E7C5A';
            msgEl.textContent = 'Saved.';
            setTimeout(() => { msgEl.textContent = ''; acctModal.style.display = 'none'; }, 900);
            // Keep the in-memory profile + visible name in sync
            const newFirst = document.getElementById('acct-first').value.trim();
            if (window.__robes_profile) {
              window.__robes_profile.first_name = newFirst;
              window.__robes_profile.last_name = document.getElementById('acct-last').value.trim();
              window.__robes_profile.mobile = document.getElementById('acct-mobile').value.trim();
              window.__robes_profile.gender_identity = window.__acctGender || 'woman';
            }
            if (newFirst) {
              const avN = document.getElementById('av-name');
              if (avN) avN.textContent = newFirst;
              const hr = new Date().getHours();
              const t = hr < 12 ? 'morning' : hr < 18 ? 'afternoon' : 'evening';
              const g1 = document.getElementById('greeting');
              const g2 = document.getElementById('dash-greet');
              if (g1) g1.innerHTML = 'Good ' + t + ',<br>' + newFirst + '.';
              if (g2) g2.textContent = 'Good ' + t + ', ' + newFirst + '.';
            }
          } else {
            msgEl.style.color = '#A4453A';
            msgEl.textContent = 'Error saving — please try again.';
          }
        } catch(e) {
          msgEl.style.color = '#A4453A';
          msgEl.textContent = 'Error saving — please try again.';
        }
      };

      // Time-based greeting
      const hour = new Date().getHours();
      const tod = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      const greetingEl = document.getElementById('greeting');
      const dashGreetEl = document.getElementById('dash-greet');
      if (greetingEl) greetingEl.innerHTML = 'Good ' + tod + ',<br>' + name + '.';
      if (dashGreetEl) dashGreetEl.textContent = 'Good ' + tod + ', ' + name + '.';

      // Live weather — request geolocation then fetch Open-Meteo.
      // Scoped IIFE: its early exits must NEVER abort the rest of
      // personalize (a missing weather strip used to silently kill the
      // wardrobe/lookbook/moodboard wiring below).
      (function _rbWeather() {
      // Shared real-time context — the Daily Look track (PRD: Dynamic Contextual
      // Metadata Header) reads this when submitting a dress-me prompt
      window.__rbCtx = window.__rbCtx || {};
      const weatherEl = document.getElementById('nav-weather');
      if (!weatherEl) return;
      const spans = weatherEl.querySelectorAll('span:not(.dot):not(.wx)');
      const daySpan  = spans[0];  // Thursday
      const citySpan = spans[1];  // Dublin
      const tempSpan = spans[2];  // 12°C
      const wxIcon   = weatherEl.querySelector('.wx');

      const WX_ICONS = {0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',48:'🌫',51:'🌦',53:'🌦',55:'🌧',
        61:'🌧',63:'🌧',65:'🌧',71:'❄️',73:'❄️',75:'❄️',80:'🌦',81:'🌧',82:'🌧',
        95:'⛈',96:'⛈',99:'⛈'};
      const WX_TEXT = {0:'Clear skies',1:'Mostly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Fog',
        51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',
        71:'Light snow',73:'Snow',75:'Heavy snow',80:'Showers',81:'Showers',82:'Heavy showers',
        95:'Thunderstorms',96:'Thunderstorms',99:'Thunderstorms'};
      const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

      if (daySpan) daySpan.textContent = DAYS[new Date().getDay()];

      // Mobile-only ambient strip under the greeting — the nav pill hides
      // <768px, so this carries the "Monday · Dublin · 20°C" context there.
      // Built from window.__rbCtx once geolocation + forecast land; stays
      // hidden until at least day + one of city/temp is known.
      const mWxEl = document.getElementById('dash-wx-m');
      function _rbSyncMobileWx(code) {
        if (!mWxEl) return;
        const day = DAYS[new Date().getDay()];
        const city = window.__rbCtx.city || '';
        const temp = (window.__rbCtx.tempC != null && !isNaN(window.__rbCtx.tempC)) ? window.__rbCtx.tempC + '°C' : '';
        const parts = [day, city, temp].filter(Boolean);
        if (parts.length < 2) { mWxEl.classList.remove('on'); return; }
        mWxEl.textContent = '';
        const icon = (code !== undefined && WX_ICONS[code]) || '';
        if (icon) { const s = document.createElement('span'); s.className = 'wx'; s.textContent = icon; mWxEl.appendChild(s); }
        parts.forEach((p, i) => {
          if (i > 0 || icon) { const d = document.createElement('span'); d.className = 'dot'; mWxEl.appendChild(d); }
          const s = document.createElement('span'); s.textContent = p; mWxEl.appendChild(s);
        });
        mWxEl.classList.add('on');
      }

      function layerHint(tmin, tmax, code) {
        if (code >= 51 && code <= 99) return 'Bring a shell for the rain';
        if (!isNaN(tmax) && tmax < 10) return 'Wrap up warm';
        if (!isNaN(tmax) && tmax >= 25) return 'Keep it breathable';
        if (!isNaN(tmin) && tmin < 14) return 'Bring a light layer';
        return 'Light layers work today';
      }

      if (!navigator.geolocation) { weatherEl.style.visibility = 'hidden'; return; }
      let _wxPromise = null;
      function _wxRun() {
        if (_wxPromise) return _wxPromise;
        _wxPromise = new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude: lat, longitude: lon } = pos.coords;
            // Remember that location was granted — iOS Safari can't report
            // geolocation permission via the Permissions API, so this flag is
            // how we know it's safe to auto-fill (no re-prompt) on later loads.
            try { localStorage.setItem('rb_geo_ok', '1'); } catch (e) {}
            try {
              // Reverse geocode with Open-Meteo geocoding
              const geoRes = await fetch(
                'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lon,
                { headers: { 'Accept-Language': 'en' } }
              );
              const geoData = await geoRes.json();
              const city = geoData.address?.city || geoData.address?.town ||
                           geoData.address?.village || geoData.address?.county || '';
              if (city && citySpan) citySpan.textContent = city;
              if (city) { window.__rbCtx.city = city; _rbSyncMobileWx(); }

              // Weather from Open-Meteo (free, no API key)
              const wxRes = await fetch(
                'https://api.open-meteo.com/v1/forecast?latitude=' + lat +
                '&longitude=' + lon + '&current=temperature_2m,weather_code&daily=temperature_2m_min,temperature_2m_max&forecast_days=1&temperature_unit=celsius'
              );
              const wxData = await wxRes.json();
              const temp = Math.round(wxData.current?.temperature_2m);
              const code = wxData.current?.weather_code;
              if (!isNaN(temp) && tempSpan) tempSpan.textContent = temp + '°C';
              if (code !== undefined && wxIcon) wxIcon.textContent = WX_ICONS[code] || '🌤';
              const tmin = Math.round(wxData.daily?.temperature_2m_min?.[0]);
              const tmax = Math.round(wxData.daily?.temperature_2m_max?.[0]);
              if (!isNaN(temp)) window.__rbCtx.tempC = temp;
              if (!isNaN(tmin) && !isNaN(tmax)) window.__rbCtx.tempRange = tmin + '°C – ' + tmax + '°C';
              if (code !== undefined && WX_TEXT[code]) window.__rbCtx.condition = WX_TEXT[code];
              window.__rbCtx.hint = layerHint(tmin, tmax, code);
              if (window.__rbCtx.city || window.__rbCtx.tempC != null) weatherEl.style.visibility = '';
              _rbSyncMobileWx(code);
            } catch (e) { /* keep the strip hidden on error */ }
            resolve();
          }, () => resolve() /* permission denied — strip stays hidden */);
        });
        return _wxPromise;
      }
      // The location dialog must never be the dashboard's opening move — the
      // strip hides its placeholder values, auto-fills only when permission
      // was already granted, and otherwise waits for the first dress-me
      // submit to call window.__rbWeatherAsk.
      window.__rbWeatherAsk = _wxRun;
      weatherEl.style.visibility = 'hidden';
      let _geoGranted = false;
      try { _geoGranted = localStorage.getItem('rb_geo_ok') === '1'; } catch (e) {}
      if (_geoGranted) {
        // Permission was granted on a previous visit — getCurrentPosition
        // resolves silently (no dialog), so the nav pill + mobile strip can
        // auto-fill on load. This is the ONLY reliable path on iOS Safari,
        // where navigator.permissions.query({name:'geolocation'}) is
        // unsupported and the branch below never fires.
        _wxRun();
      } else if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' })
          .then(p => { if (p.state === 'granted') _wxRun(); })
          .catch(() => {});
      }
      })();

      // ── Wardrobe wiring ──────────────────────────────────────────
      const _SUPA_URL = 'https://ayowpaknssulsqqvwpqx.supabase.co';
      const _SUPA_KEY = 'sb_publishable_D_iIPtp_R6kjN_711jfyTg_sFmRdpwJ';
      // Read session lazily so we always have a fresh token (session loads async)
      function _waUid()   { return window.__robes_session && window.__robes_session.user && window.__robes_session.user.id; }
      function _waToken() { return window.__robes_session && window.__robes_session.access_token; }

      const WA_CATS = ['All','Outerwear','Tops','Bottoms','Shoes','Accessories','Dresses','Bags','Swimwear','Other'];

      // Shared garment palette — used by the add/edit modal swatch rows AND
      // the Refine drawer's colour filter (lifted out of the autotag closure).
      const _ALL_SWATCHES = [
        { name: 'White',      hex: '#FFFFFF', tier: 'Foundations' },
        { name: 'Cream',      hex: '#F5F5DC', tier: 'Foundations' },
        { name: 'Navy',       hex: '#2C3E50', tier: 'Foundations' },
        { name: 'Charcoal',   hex: '#4A4A4A', tier: 'Foundations' },
        { name: 'Black',      hex: '#000000', tier: 'Foundations' },
        { name: 'Espresso',   hex: '#2B1E18', tier: 'Foundations' },
        { name: 'Camel',      hex: '#D2B48C', tier: 'Dimension Builders' },
        { name: 'Taupe',      hex: '#8B8589', tier: 'Dimension Builders' },
        { name: 'Olive',      hex: '#556B2F', tier: 'Dimension Builders' },
        { name: 'Aubergine',  hex: '#4B0082', tier: 'Dimension Builders' },
        { name: 'Forest',     hex: '#123524', tier: 'Dimension Builders' },
        { name: 'Bordeaux',   hex: '#4A0E17', tier: 'Dimension Builders' },
        { name: 'Blush',      hex: '#E6C2B6', tier: 'Dimension Builders' },
        { name: 'Ochre',      hex: '#D4AF37', tier: 'Exclamation Points' },
        { name: 'Magenta',    hex: '#FF1493', tier: 'Exclamation Points' },
        { name: 'Cobalt',     hex: '#0047AB', tier: 'Exclamation Points' },
        { name: 'Emerald',    hex: '#00A86B', tier: 'Exclamation Points' },
        { name: 'Vermillion', hex: '#FF4500', tier: 'Exclamation Points' },
        { name: 'Acid',       hex: '#E1FD2E', tier: 'Exclamation Points' },
        { name: 'Multi',      hex: null,      tier: 'Exclamation Points' },
        { name: 'Print',      hex: null,      tier: 'Exclamation Points' },
      ];

      let _waItems = [], _waCat = 'All', _waEditId = null;
      // One-shot callback fired after a NEW wardrobe piece is added + reloaded,
      // with the new row's id. Lets "Snap mine" (daily look / moodboard swap)
      // apply the just-added piece into the look it was launched from.
      let _waAfterAdd = null;
      // Batch add: extra photos queued from a multi-select in step 1. Each
      // saved piece pulls the next photo straight into step 2 (the modal
      // never closes between pieces). `var` on purpose — early readers must
      // see undefined/empty, never throw (see the TDZ gotcha in CLAUDE.md).
      var _waBatchQueue = [], _waBatchTotal = 0, _waBatchDone = 0, _waBatchAdvance = null;

      function _waEsc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

      // Downscale + transcode to JPEG (max 1600px) so photo payloads stay
      // small on cellular and HEIC previews render. Falls back to the raw
      // data URL when the browser can't decode the source.
      function _rbDownscale(file) {
        return createImageBitmap(file).then(function(bmp) {
          const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(bmp.width * scale);
          canvas.height = Math.round(bmp.height * scale);
          canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
          bmp.close();
          return canvas.toDataURL('image/jpeg', 0.85);
        }).catch(function() {
          return new Promise(function(resolve, reject) {
            const reader = new FileReader();
            reader.onload = function(e) { resolve(e.target.result); };
            reader.onerror = function() { reject(new Error('unreadable')); };
            reader.readAsDataURL(file);
          });
        });
      }

      // Hosted wardrobe photo → prompt-attachment dataURL. Goes through
      // _rbDownscale so a full-resolution Cloudinary original never lands
      // base64 inside a styling request body (20mb server limit).
      function _rbUrlToDataUrl(url) {
        return fetch(url).then(r => r.blob()).then(_rbDownscale);
      }

      function _waShowToast(msg) {
        const t = document.getElementById('toast-msg') || document.getElementById('toast');
        if (!t) return;
        const wrap = t.id === 'toast-msg' ? t.parentElement : t;
        if (t.id === 'toast-msg') t.textContent = msg; else t.textContent = msg;
        wrap.classList.add('show');
        setTimeout(() => wrap.classList.remove('show'), 2800);
      }

      // Affiliate shopping isn't live — every "Shop via Affiliate" CTA opens
      // the bundle's Coming Soon dialog (closing the swap modal it sits in,
      // which stacks above the dialog).
      window.__rbAffiliateSoon = function(modalId) {
        if (modalId) document.getElementById(modalId)?.remove();
        if (window.KP && KP.comingSoon) {
          KP.comingSoon('Shopping links,<br><em>coming soon.</em>', 'Robes will soon take you straight to this piece at its retailer.');
        } else {
          _waShowToast('Affiliate links coming soon');
        }
      };

      async function _waFetch(method, path, body) {
        const r = await fetch(_SUPA_URL + '/rest/v1/' + path, {
          method,
          headers: {
            'apikey': _SUPA_KEY, 'Authorization': 'Bearer ' + _waToken(),
            'Content-Type': 'application/json', 'Prefer': 'return=representation'
          },
          body: body !== undefined ? JSON.stringify(body) : undefined
        });
        if (!r.ok) throw new Error(await r.text());
        return r.status === 204 ? null : r.json();
      }

      // ── Admin capture (migration 11) — action events + output feedback ──
      // Fire-and-forget inserts with the user's own JWT (RLS own-insert
      // policies). Both degrade silently until the migration runs — a
      // failed insert must never surface to the user or block a flow.
      var _RB_ENV = (location.hostname === 'www.byrobes.com' || location.hostname === 'byrobes.com') ? 'production' : 'beta';
      // Capture inserts MUST use Prefer: return=minimal — the events/feedback
      // tables are insert-only for ordinary users (select is admin-only), and
      // return=representation makes PostgREST run INSERT…RETURNING, whose
      // returned row is checked against SELECT policies → the whole insert
      // fails 42501 for every non-admin. _waFetch (return=representation) is
      // therefore the wrong door for these two tables.
      function _rbCapturePost(table, row) {
        fetch(_SUPA_URL + '/rest/v1/' + table, {
          method: 'POST',
          headers: {
            'apikey': _SUPA_KEY, 'Authorization': 'Bearer ' + _waToken(),
            'Content-Type': 'application/json', 'Prefer': 'return=minimal'
          },
          body: JSON.stringify(row)
        }).then(r => { if (!r.ok) r.text().then(t => console.warn('[robes] capture ' + table + ' failed:', r.status, String(t).slice(0, 160))); })
          .catch(() => {});
      }
      // Per-generation correlation id: sent as `genId` in the generation
      // POST (→ generation_log.detail.gen_id on every LLM call) AND stored
      // inside the saved lookbook entry's data, so the admin panel can walk
      // prompt → calls → artifact for one generation.
      function _rbGenId() { return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
      function _rbTrack(type, meta) {
        try {
          const uid = _waUid();
          if (!uid || !_waToken()) return;
          _rbCapturePost('events', { user_id: uid, event_type: type, metadata: meta || {}, environment: _RB_ENV });
        } catch (_) {}
      }
      window._rbTrack = _rbTrack;
      function _rbFbCloud(track, itemId, rating, note) {
        try {
          const uid = _waUid();
          if (!uid || !_waToken()) return;
          _rbCapturePost('feedback', {
            user_id: uid,
            lookbook_item_id: itemId != null ? Number(itemId) : null,
            track: track || null,
            rating: rating === 0 || rating === 1 ? rating : null,
            note: note || null,
          });
          _rbTrack('feedback_given', { track: track || '', rating: rating === 0 || rating === 1 ? rating : null });
        } catch (_) {}
      }

      let _waLoadRetries = 0;
      async function _waLoad() {
        try {
          const data = await _waFetch('GET', 'wardrobe_items?user_id=eq.' + _waUid() + '&order=created_at.desc&select=*');
          _waItems = data || [];
          _waLoaded = true;
          _waLoadRetries = 0;
        } catch(e) {
          console.error('wardrobe load:', e);
          // Transient failure (token refresh, network) — retry so the UI
          // never sits on the bundle's mock counts indefinitely
          if (_waLoadRetries < 3) { _waLoadRetries++; setTimeout(_waLoad, 1500 * _waLoadRetries); }
        }
        _waBuildFilters();
        _waRender();
        _waSyncCounts();
        // Wishlist refresh rides along (fire-and-forget; degrades silently
        // until the wardrobe_v2 migration has run)
        _wlLoad();
      }

      let _waLoaded = false;
      let _waRendering = false; // guard against observer re-entrancy

      // Watch the grid for any external writes (bundle's renderWardrobe) and
      // immediately restore our content whenever they happen.
      const _waObserver = new MutationObserver(() => {
        if (_waRendering) return;
        _waRender();
      });

      function _waObserveGrid() {
        const grid = document.getElementById('wg-grid');
        if (grid) _waObserver.observe(grid, { childList: true });
      }

      function _waRender() {
        const grid = document.getElementById('wg-grid');
        if (!grid) return;
        _waRendering = true;
        _waObserver.disconnect();
        // A full innerHTML swap resets window scroll — starring a piece at
        // the bottom of a 60-item grid used to throw her back to the top.
        const _waScrollY = window.scrollY;
        if (!_waLoaded) {
          grid.innerHTML = '<div style="padding:56px 24px;text-align:center"><div style="font-family:\'Cormorant\',Georgia,serif;font-style:italic;font-weight:300;font-size:18px;color:var(--ink-faint)">Opening your wardrobe…</div></div>';
        } else {
          // Category (primary) + Refine drawer (secondary) filters.
          // In-season hero pieces lead the grid in rack order (integration
          // pass 2026-07-21: no separate rail — heroes live IN the grid);
          // off-season heroes and everything else keep newest-first order.
          const filtered = _waFilteredItems().sort((a, b) => {
            const ah = a.hero_position != null && _waInSeasonNow(a);
            const bh = b.hero_position != null && _waInSeasonNow(b);
            if (ah !== bh) return ah ? -1 : 1;
            return ah ? (a.hero_position || 0) - (b.hero_position || 0) : 0;
          });
          const frag = document.createDocumentFragment();
          if (!_waItems.length) {
            // True cold start — the module the whole product depends on gets
            // an invitation, not a lone dashed tile in an empty grid. The
            // prose that used to sit here is gone (FTUE 2026-07-28: too text
            // heavy on the emptiest screen); what the pieces actually buy her
            // is shown, not described, by the SAME milestone bar home uses —
            // identical thresholds and wording, so the promise reads the same
            // in both places.
            const invite = document.createElement('div');
            invite.style.cssText = 'grid-column:1/-1;padding:44px 28px;border:0.5px solid var(--rule-mid);border-radius:var(--rad-lg);background:#fff;text-align:center';
            invite.innerHTML =
              '<div style="font-size:10px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:14px">Your wardrobe</div>' +
              '<div style="font-family:\'Cormorant\',Georgia,serif;font-weight:300;font-size:clamp(24px,3vw,32px);color:var(--ink);line-height:1.15;margin-bottom:22px">Every look starts with<em style="font-style:italic"> a photograph.</em></div>' +
              '<button onclick="window.WA&&WA.open&&WA.open()" style="border:none;background:var(--ink);color:#fff;border-radius:100px;padding:14px 28px;font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;font-family:inherit">Catalogue your wardrobe</button>' +
              '<div style="margin-top:16px"><button onclick="window.WA&&WA.open&&WA.open()" style="border:none;background:none;padding:0;font-size:12.5px;color:var(--ink-soft);border-bottom:0.5px solid var(--rule-mid);cursor:pointer;font-family:inherit">Or photograph what you&rsquo;re wearing now</button></div>';
            frag.appendChild(invite);

            const unlocks = document.createElement('div');
            unlocks.style.cssText = 'grid-column:1/-1;padding:18px 22px;border-radius:var(--rad-card);background:var(--sage-bg)';
            unlocks.innerHTML =
              '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:14px">' +
                '<div style="font-size:10px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint)">What more pieces bring</div>' +
                '<div style="font-family:\'Cormorant\',Georgia,serif;font-size:19px;color:var(--ink)">0<span style="font-family:var(--font-sans,\'Inter\',sans-serif);font-size:9px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-faint);margin-left:7px">Pieces filed</span></div>' +
              '</div>' + _msBarHtml(0);
            frag.appendChild(unlocks);
          } else if (!filtered.length) {
            // Filter miss is NOT the empty wardrobe — say so, offer the way back.
            const miss = document.createElement('div');
            miss.style.cssText = 'grid-column:1/-1;padding:40px 24px;text-align:center';
            miss.innerHTML =
              '<div style="font-family:\'Cormorant\',Georgia,serif;font-style:italic;font-weight:300;font-size:19px;color:var(--ink-soft);margin-bottom:12px">Nothing matches those filters.</div>' +
              '<button onclick="window.__waFiltersClear&&__waFiltersClear()" style="border:0.5px solid var(--rule-mid);background:#fff;color:var(--ink);border-radius:100px;padding:9px 20px;font-size:11.5px;cursor:pointer;font-family:inherit">Show all ' + _waItems.length + ' pieces</button>';
            frag.appendChild(miss);
          }
          filtered.forEach(it => frag.appendChild(_waCard(it)));
          frag.appendChild(_waAddCard());
          if (!_waItems.length) {
            // Ghost tiles behind the live add card — they show the shape the
            // filled grid takes. Decorative only, at a lighter dash.
            for (let g = 0; g < 2; g++) {
              const ghost = document.createElement('div');
              ghost.className = 'wg-item rb-ghost-card';
              ghost.setAttribute('aria-hidden', 'true');
              frag.appendChild(ghost);
            }
          }
          grid.innerHTML = '';
          grid.appendChild(frag);
          _waSyncCounts();
        }
        _waObserver.observe(grid, { childList: true });
        if (_waLoaded && window.scrollY !== _waScrollY) window.scrollTo(0, _waScrollY);
        _waRendering = false;
        // Keep the v2 sections (hero rail, sub-tabs, wishlist) in step
        _waV2Sync();
      }

      const _WA_TARGET = 15;

      // ── Milestone capabilities — the learning meter (Homescreen FTUE;
      // reframed 2026-07-29 after the Clodagh test) ─────────────────────
      // Thresholds are config, never literals in the view — re-tune here and
      // the progress card, the wardrobe empty state and the concierge gate
      // all follow. `at` is the piece count that earns the milestone;
      // `label` stays the feature's name (headlines, gating copy); `cap` is
      // what Robes can DO from that count — the bar columns render `cap`,
      // never `label` (capability, not a feature to unlock); `pos` is the
      // tick's % position on the endless track (see _msBarHtml).
      const _MS_UNLOCKS = [
        { at: 3,  key: 'daily',      label: 'Daily look',     cap: 'Dresses today',    pos: 15 },
        { at: 5,  key: 'weekly',     label: 'Weekly planner', cap: 'Plans your week',  pos: 25 },
        { at: 10, key: 'travel',     label: 'Travel edit',    cap: 'Packs your trips', pos: 50 },
        { at: 15, key: 'styleNotes', label: 'Style notes',    cap: 'Knows your taste', pos: 78 },
      ];
      function _msUnlocked(key, n) {
        const u = _MS_UNLOCKS.find(x => x.key === key);
        return !!u && (n == null ? _waItems.length : n) >= u.at;
      }
      function _msNext(n) { return _MS_UNLOCKS.find(u => u.at > n) || null; }

      // "Just unlocked" is a one-session label. _msPrevCount seeds from the
      // last count this browser saw, so a threshold crossed between sessions
      // still reads as earned on the first render back — and crossings made
      // live in-session accumulate on top. var, not let: _waSyncCounts can
      // reach this before execution passes the assignment (TDZ trap).
      var _msPrevCount = null;
      var _msCrossed = {};
      function _msCrossKey() { const u = _waUid(); return u ? 'rb_ms_last__' + u : null; }
      function _msTrack(n) {
        const k = _msCrossKey();
        if (!k) return;
        if (_msPrevCount == null) {
          const raw = parseInt(localStorage.getItem(k), 10);
          _msPrevCount = isNaN(raw) ? n : raw;
        }
        if (n > _msPrevCount) {
          _MS_UNLOCKS.forEach(u => { if (u.at > _msPrevCount && u.at <= n) _msCrossed[u.key] = true; });
        }
        if (n >= _msPrevCount) { _msPrevCount = n; try { localStorage.setItem(k, String(n)); } catch (e) {} }
      }

      const _MS_WORDS = ['no', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
        'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen'];
      function _msWord(n) { return _MS_WORDS[n] || String(n); }

      // Derived, never authored: names the next unlock and the distance to it,
      // or what was just earned at a boundary.
      function _msHeadline(n) {
        const next = _msNext(n);
        if (!next) return 'Your wardrobe is there —<br>every look is built from it.';
        const left = next.at - n;
        const pieces = left === 1 ? 'more piece' : 'more pieces';
        const reach = next.key === 'daily'
          ? _msWord(left) + ' ' + pieces + ' and Robes<br>dresses you every morning.'
          : _msWord(left) + ' ' + pieces + ' and the<br>' + next.label.toLowerCase() + ' opens.';
        if (n === 0) return 'Three pieces and Robes<br>dresses you every morning.';
        const earned = _MS_UNLOCKS.filter(u => u.at <= n && _msCrossed[u.key]).pop();
        if (earned) return earned.label + ' just opened.<br>' + _msWord(left) + ' ' + pieces + ' for the ' + next.label.toLowerCase() + '.';
        return reach;
      }

      function _msEnsureCss() {
        if (document.getElementById('rb-ms-style')) return;
        const st = document.createElement('style');
        st.id = 'rb-ms-style';
        // --ms-locked is the one tone with no token: light enough to read as
        // not-yet-earned, dark enough to sit visibly on the track.
        st.textContent =
          '.rb-ms{--ms-locked:#C4B8A4;display:flex;flex-direction:column;gap:9px}' +
          // The last quarter of the track fades to near-transparent — the
          // meter has no endpoint to fill (learning meter, 2026-07-29). Mask,
          // not background, so the fill and any tick inside the fade dim too.
          '.rb-ms-track{position:relative;height:3px;background:var(--cream-400);border-radius:2px;' +
            '-webkit-mask-image:linear-gradient(90deg,#000 0,#000 75%,rgba(0,0,0,0.05) 100%);' +
            'mask-image:linear-gradient(90deg,#000 0,#000 75%,rgba(0,0,0,0.05) 100%)}' +
          '.rb-ms-fill{position:absolute;left:0;top:0;bottom:0;background:var(--ink);border-radius:2px;' +
            'transition:width 650ms cubic-bezier(0.4,0,0.2,1)}' +
          '.rb-ms-tick{position:absolute;top:-3px;width:1px;height:9px;background:var(--ms-locked)}' +
          '.rb-ms-tick.on{background:var(--ink-soft)}' +
          '.rb-ms-cols{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}' +
          '.rb-ms-col{display:flex;align-items:baseline;gap:5px;min-width:0}' +
          '.rb-ms-at{font-family:var(--font-serif);font-size:13px;line-height:1;color:var(--ms-locked);flex:none}' +
          '.rb-ms-col.on .rb-ms-at{color:var(--ink)}' +
          '.rb-ms-lbl{font-size:10px;line-height:1.3;color:var(--ink-soft)}' +
          '.rb-ms-col.on .rb-ms-lbl{color:var(--ink)}' +
          '@media(max-width:520px){.rb-ms-col{flex-direction:column;align-items:flex-start;gap:1px}}' +
          '@media(prefers-reduced-motion:reduce){.rb-ms-fill{transition:none}}';
        document.head.appendChild(st);
      }

      // The one milestone bar — home progress card and the wardrobe empty
      // state render the identical component so the promise reads the same
      // in both places. A LEARNING meter, not a completion meter (Clodagh
      // test 2026-07-29 — the old n/15 fraction read as the wardrobe's item
      // limit): the track is scaled to _MS_SCALE so the last milestone sits
      // at 78%, the final quarter fades out (no endpoint to fill), and the
      // columns name capability (`cap`), never a feature to unlock.
      // Structure only: no per-tick status text. "Locked" would be a lie
      // (every edit is built and open), "n away" repeats the headline, and
      // earned is already carried by the tick and numeral going dark — so
      // the headline states, the bar shows.
      const _MS_SCALE = 20;
      // Piecewise through the tick positions so the fill meets each tick
      // exactly at its milestone count (a straight n/_MS_SCALE would underrun
      // the nudged 78% last tick).
      function _msFillPct(n) {
        const pts = [{ at: 0, pos: 0 }].concat(_MS_UNLOCKS, [{ at: _MS_SCALE, pos: 100 }]);
        for (let i = 1; i < pts.length; i++) {
          if (n <= pts[i].at) {
            const a = pts[i - 1], b = pts[i];
            return a.pos + ((n - a.at) / (b.at - a.at)) * (b.pos - a.pos);
          }
        }
        return 100;
      }
      function _msBarHtml(n) {
        _msEnsureCss();
        const pct = Math.min(100, _msFillPct(n));
        const ticks = _MS_UNLOCKS.map(u =>
          '<div class="rb-ms-tick' + (n >= u.at ? ' on' : '') + '" style="left:' + u.pos + '%"></div>'
        ).join('');
        const next = _msNext(n);
        const cols = _MS_UNLOCKS.map(u => {
          const lit = n >= u.at || (next && next.key === u.key);
          return '<div class="rb-ms-col' + (lit ? ' on' : '') + '">' +
            '<span class="rb-ms-at">' + String(u.at).padStart(2, '0') + '</span>' +
            '<span class="rb-ms-lbl">' + u.cap + '</span>' +
          '</div>';
        }).join('');
        return '<div class="rb-ms">' +
          '<div class="rb-ms-track"><div class="rb-ms-fill" style="width:' + pct + '%"></div>' + ticks + '</div>' +
          '<div class="rb-ms-cols">' + cols + '</div>' +
        '</div>';
      }

      // Home module order, by piece count. Below the first unlock there is
      // little to prompt about, so the progress card leads directly under the
      // greeting (FTUE) — from 3 pieces on the prompt leads again, as it does
      // today. The rail travels with the prompt in both; #rb-styled always
      // sits immediately above the tracker, which is where its own mount()
      // puts it, so the two never fight. Idempotent — safe on every sync.
      function _rbFtueOrder(n) {
        const dash = document.getElementById('dash');
        const mast = dash && dash.querySelector('.dash-mast');
        const conc = dash && dash.querySelector('.concierge');
        const trk = document.getElementById('wtrk');
        if (!dash || !mast || !conc || !trk) return;
        const rail = document.getElementById('rb-rail');
        const styled = document.getElementById('rb-styled');
        const seq = (n < _MS_UNLOCKS[0].at
          ? [styled, trk, conc, rail]
          : [conc, rail, styled, trk]).filter(Boolean);
        seq.forEach((el, i) => {
          const prev = i === 0 ? mast : seq[i - 1];
          if (prev.nextSibling !== el) dash.insertBefore(el, prev.nextSibling);
        });
      }

      // The concierge is absent until the first unlock — a brand-new user is
      // never shown a shelf of edits she has nothing to feed. From 3 pieces
      // the section appears with ALL THREE edits open: Daily Look, Weekly
      // Planner and Travel Edit are all built and live, and the app-wide
      // convention is that a working feature is never locked behind a count.
      function _rbGateConcierge(n) {
        const svc = document.querySelector('.services');
        if (!svc) return;
        svc.style.display = n >= _MS_UNLOCKS[0].at ? '' : 'none';
      }

      window.__wtrkEdit = function(id) {
        const it = _waItems.find(w => String(w.id) === String(id));
        if (it) _waOpenEdit(it);
      };
      function _wtrkOpenAdd() {
        _waEditId = null;
        _waAfterAdd = null;
        if (window.WA && WA.open) WA.open();
      }
      function _waSyncCounts() {
        const n = _waItems.length;
        const label = n + ' piece' + (n !== 1 ? 's' : '');

        if (!document.getElementById('rb-wtrk-style')) {
          const st = document.createElement('style');
          st.id = 'rb-wtrk-style';
          st.textContent =
            '.wtrk-star{position:absolute;top:5px;right:5px;width:18px;height:18px;border-radius:100px;background:var(--ink,#202021);display:flex;align-items:center;justify-content:center;z-index:2;pointer-events:none}' +
            '.wtrk-star svg{width:9px;height:9px;display:block}';
          document.head.appendChild(st);
        }

        // wg-count pill inside the wardrobe panel (wishlist view owns the
        // count label while it's active — see _waV2Sync)
        const countEl = document.getElementById('wg-count');
        if (countEl && _waView !== 'wishlist') countEl.textContent = label;

        // nav badge
        const navBadge = document.querySelector('.nav-wbtn-count');
        if (navBadge) navBadge.textContent = n;

        // dashboard tracker: derived headline + milestone bar + the
        // catalogued pieces themselves, so the wardrobe is visible on the
        // dashboard, not just counted
        _msTrack(n);
        const numEl = document.getElementById('wtrk-num');
        const headEl = document.getElementById('wtrk-head');
        const msEl = document.getElementById('wtrk-ms');
        // The card retires for good one piece PAST the last milestone — at 15
        // it still has a job (Style notes has only just unlocked); at 16 count
        // and adding both live in the Wardrobe tab and nothing takes its place.
        // The section stays in the DOM — it's _rbApplyLayout's anchor.
        const complete = n > _WA_TARGET;
        const trkSection = document.getElementById('wtrk');
        if (trkSection) {
          trkSection.style.display = complete ? 'none' : '';
        }
        // Bare count, no denominator — "n / 15" read as the wardrobe's item
        // limit (Clodagh test 2026-07-29). Never reintroduce a fraction here.
        if (numEl) numEl.innerHTML = n + '<span class="wtrk-num-lbl">Piece' + (n === 1 ? '' : 's') + ' filed</span>';
        if (headEl) headEl.innerHTML = _msHeadline(n);
        if (msEl) msEl.innerHTML = _msBarHtml(n);

        const itemsEl = document.getElementById('wtrk-items');
        if (itemsEl) {
          // Hero pieces lead the strip (starred badge) while the tracker is
          // still on the page (<15 items) — the rest keep newest-first order
          const ordered = _waItems.slice().sort((a, b) => {
            const ah = a.hero_position != null, bh = b.hero_position != null;
            if (ah !== bh) return ah ? -1 : 1;
            return ah ? (a.hero_position || 0) - (b.hero_position || 0) : 0;
          });
          const tiles = ordered.slice(0, 12).map(it => {
            const idAttr = _waEsc(String(it.id));
            return '<button class="wtrk-it" onclick="window.__wtrkEdit(\'' + idAttr + '\')" title="' + _waEsc(it.label) + '">' +
              (it.image_url
                ? '<img src="' + _waEsc(it.image_url) + '" alt="" loading="lazy">'
                : '<div class="wtrk-mono">' + _waEsc((it.label || '?').charAt(0).toUpperCase()) + '</div>') +
              (it.hero_position != null ? '<span class="wtrk-star">' + _waStarSvg(true) + '</span>' : '') +
              '<div class="wtrk-it-scrim"><div class="wtrk-it-name">' + _waEsc(it.label) + '</div>' +
              (it.category ? '<div class="wtrk-it-cat">' + _waEsc(it.category) + '</div>' : '') + '</div></button>';
          }).join('');
          const more = n > 12
            ? '<button class="wtrk-add" style="border-style:solid" onclick="window.App&&App.showWardrobe&&App.showWardrobe()"><span>+' + (n - 12) + ' more</span></button>'
            : '';
          itemsEl.innerHTML = tiles + more +
            '<button class="wtrk-add" id="wtrk-add-tile"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Add</span></button>';
          const addTile = document.getElementById('wtrk-add-tile');
          if (addTile) addTile.onclick = _wtrkOpenAdd;
        }

        const ctaEl = document.getElementById('wtrk-cta');
        if (ctaEl) {
          ctaEl.childNodes[0].textContent = n === 0 ? 'Add your first pieces' : 'Add pieces';
          ctaEl.onclick = function(e) { e.preventDefault(); e.stopPropagation(); _wtrkOpenAdd(); };
        }
        const snapEl = document.getElementById('wtrk-snap');
        if (snapEl) snapEl.onclick = _wtrkOpenAdd;

        // Refresh the masthead — once the count lands, the returner echo shows
        // the real number (and an established ≥3-piece closet flips a first
        // load to the returner register).
        if (typeof _rbUpdateMasthead === 'function') _rbUpdateMasthead();
        _rbFtueOrder(n);
        _rbGateConcierge(n);
        if (typeof _rbSilPrompt === 'function') _rbSilPrompt();
      }

      // ── Pack-for-a-trip multi-select (wardrobe-first PRD: the connection
      // to packing lives inside the wardrobe too) ────────────────────────
      let _wgPackMode = false;
      let _wgPackSel = [];

      function _wgDecorate(div, on) {
        div.style.outline = on ? '2px solid #202021' : '';
        div.style.outlineOffset = on ? '-2px' : '';
        let chk = div.querySelector('.wg-pack-chk');
        if (on && !chk) {
          chk = document.createElement('span');
          chk.className = 'wg-pack-chk';
          chk.style.cssText = 'position:absolute;top:8px;right:8px;width:20px;height:20px;border-radius:50%;background:#202021;color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center;z-index:2;line-height:1;pointer-events:none';
          chk.textContent = '✓';
          const wrap = div.querySelector('.wg-img-wrap') || div;
          wrap.style.position = 'relative';
          wrap.appendChild(chk);
        } else if (!on && chk) chk.remove();
      }

      function _wgPackBar() {
        let bar = document.getElementById('wg-packbar');
        if (!_wgPackMode) { if (bar) bar.remove(); return; }
        if (!bar) {
          bar = document.createElement('div');
          bar.id = 'wg-packbar';
          bar.style.cssText = 'position:fixed;bottom:22px;left:50%;transform:translateX(-50%);z-index:60;display:flex;gap:10px;align-items:center;background:#202021;border-radius:100px;padding:10px 12px 10px 22px;box-shadow:0 12px 32px -8px rgba(32,32,33,0.45);max-width:calc(100vw - 32px);box-sizing:border-box;flex-wrap:wrap;justify-content:center';
          document.body.appendChild(bar);
        }
        const n = _wgPackSel.length;
        bar.innerHTML = '<span style="font-size:12px;color:#fff;letter-spacing:.04em;white-space:nowrap">' +
          (n ? n + ' piece' + (n === 1 ? '' : 's') + ' selected' : 'Tap everything you’re tempted to bring') + '</span>' +
          '<button onclick="window.__wgPackGo()"' + (n < 2 ? ' disabled' : '') + ' style="padding:9px 18px;border:none;border-radius:100px;background:#fff;color:#202021;font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;cursor:' + (n < 2 ? 'default' : 'pointer') + ';opacity:' + (n < 2 ? '.5' : '1') + '">Pack for a trip →</button>' +
          '<button onclick="window.__wgPackCancel()" style="padding:9px 12px;border:none;border-radius:100px;background:none;color:rgba(255,255,255,0.72);font-size:11px;cursor:pointer">Cancel</button>';
      }

      window.__wgPackStart = function() {
        _wgPackMode = true;
        _wgPackSel = [];
        _waRender();
        _wgPackBar();
      };
      window.__wgPackCancel = function() {
        _wgPackMode = false;
        _wgPackSel = [];
        _waRender();
        _wgPackBar();
      };
      window.__wgPackGo = function() {
        if (_wgPackSel.length < 2) return;
        const sel = _wgPackSel.slice();
        window.__wgPackCancel();
        // drop the wardrobe overlay so the brief modal lands on the dashboard
        const wp = document.querySelector('.wardrobe-panel');
        if (wp && wp.classList.contains('visible')) {
          const wbtnCount = document.querySelector('.nav-wbtn-count');
          const wbtn = wbtnCount ? wbtnCount.closest('button') : null;
          if (wbtn) wbtn.click(); else wp.classList.remove('visible');
        }
        window.__tvOpen({ anchors: sel });
      };

      // Any path that closes the wardrobe panel also ends select mode —
      // otherwise the floating pack bar outlives the grid it selects from.
      (function _wgWatchPanel() {
        const wp = document.querySelector('.wardrobe-panel');
        if (!wp) { setTimeout(_wgWatchPanel, 500); return; }
        new MutationObserver(function() {
          if (!wp.classList.contains('visible') && _wgPackMode) window.__wgPackCancel();
        }).observe(wp, { attributes: true, attributeFilter: ['class'] });
      })();

      function _waCard(it) {
        const div = document.createElement('div');
        div.className = 'wg-item';
        const meta = [it.brand, it.times_worn > 0 ? it.times_worn + '\xd7 worn' : null].filter(Boolean).join(' \xb7 ');
        // Star = feature on the Hero Rack (hidden in pack mode — the pack
        // check occupies the same corner)
        const isHero = it.hero_position != null;
        const star = _wgPackMode ? '' :
          '<button class="rb-star' + (isHero ? ' on' : '') + '" title="' + (isHero ? 'Remove from Hero Rack' : 'Feature in Hero Rack') + '" onclick="event.stopPropagation();window.__waHeroToggle(\'' + _waEsc(String(it.id)) + '\')">' + _waStarSvg(isHero) + '</button>';
        div.innerHTML = '<div class="wg-img-wrap">' +
          (it.image_url ? '<img src="' + _waEsc(it.image_url) + '" alt="' + _waEsc(it.label) + '" loading="lazy">' :
            '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;opacity:.3"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>') +
          (it.times_worn === 0 ? '<div class="wg-owned-badge">Never worn</div>' : '') +
          star +
          '</div><div class="wg-info"><div class="wg-name">' + _waEsc(it.label) + '</div>' +
          (meta ? '<div class="wg-metar">' + _waEsc(meta) + '</div>' : '') + '</div>';
        if (_wgPackMode) _wgDecorate(div, _wgPackSel.indexOf(String(it.id)) !== -1);
        div.addEventListener('click', () => {
          if (_wgPackMode) {
            const id = String(it.id);
            const i = _wgPackSel.indexOf(id);
            if (i === -1) _wgPackSel.push(id); else _wgPackSel.splice(i, 1);
            _wgDecorate(div, i === -1);
            _wgPackBar();
            return;
          }
          _waOpenEdit(it);
        });
        return div;
      }

      function _waAddCard() {
        // Amplified entry card (was a bare `+`): the engine room of the
        // product deserves weight — and it sells the roadmap doors too.
        const div = document.createElement('div');
        div.className = 'wg-item rb-add-card';
        div.innerHTML = '<span class="rb-add-plus">+</span>' +
          '<span class="rb-add-serif">Add a piece</span>' +
          '<span class="rb-add-hint">Photograph \xb7 Link \xb7 Receipt</span>';
        div.addEventListener('click', () => window.__waAddChooser());
        return div;
      }

      let _waFiltersBuilt = false;
      function _waBuildFilters() {
        const container = document.getElementById('wg-filters');
        if (!container) return;
        // Only rebuild if the bundle has overwritten our tabs (its mock pills
        // carry no .wg-tab class, so their write leaves none behind)
        const existing = container.querySelector('.wg-tab');
        if (_waFiltersBuilt && existing) return;
        container.innerHTML = '';
        _waFiltersBuilt = true;
        // Light text tabs, not pills (design handoff: 10 heavy pills read
        // cluttered, especially on mobile — underline marks the active one)
        WA_CATS.forEach(cat => {
          const btn = document.createElement('button');
          btn.className = 'wg-tab' + (cat === _waCat ? ' active' : '');
          btn.textContent = cat;
          btn.addEventListener('click', () => {
            _waCat = cat;
            container.querySelectorAll('.wg-tab').forEach(p => p.classList.toggle('active', p.textContent === cat));
            _waRender();
          });
          container.appendChild(btn);
        });
        // Add piece — the primary toolbar action (add rework 2026-07:
        // adding beats filtering, so Add is the ink button and Refine
        // demoted to outline). Hidden ≤640px — the FAB covers mobile.
        const addBtn = document.createElement('button');
        addBtn.className = 'wg-pill rb-add-pill';
        addBtn.id = 'rb-add-pill';
        addBtn.style.marginLeft = 'auto';
        addBtn.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" style="flex-shrink:0"><path d="M12 5v14M5 12h14"/></svg>Add piece';
        addBtn.addEventListener('click', () => {
          if (_waView === 'wishlist') window.__wlOpenAdd();
          else window.__waAddChooser();
        });
        container.appendChild(addBtn);
        // Refine — the secondary filter layer (season, colour, fit, wear,
        // brand) collapses into one drawer instead of more pills (design
        // brief: the primary row is already at 10 tabs and won't scale)
        const refBtn = document.createElement('button');
        refBtn.className = 'wg-pill rb-refine-pill';
        refBtn.id = 'rb-refine-pill';
        refBtn.innerHTML = 'Refine';
        refBtn.addEventListener('click', () => window.__waRefToggle());
        container.appendChild(refBtn);
        _waRefinePillSync();
        // Multi-select → Travel Edit, straight from the wardrobe (PRD:
        // the packing connection lives across the platform)
        const packBtn = document.createElement('button');
        packBtn.className = 'wg-pill wg-pack-pill';
        packBtn.textContent = 'Pack a trip';
        packBtn.addEventListener('click', () => {
          if (_wgPackMode) window.__wgPackCancel(); else window.__wgPackStart();
        });
        container.appendChild(packBtn);
      }

      function _waShowDeleteBtn(show) {
        let btn = document.getElementById('wa-del-btn');
        if (!btn && show) {
          btn = document.createElement('button');
          btn.id = 'wa-del-btn';
          btn.style.cssText = 'display:block;width:100%;margin-top:10px;padding:12px;background:none;border:none;cursor:pointer;font-size:11px;color:var(--ink-faint);letter-spacing:.06em;transition:color .2s';
          btn.textContent = 'Remove from wardrobe';
          btn.onmouseover = () => { btn.style.color = '#b03030'; };
          btn.onmouseout  = () => { btn.style.color = ''; };
          btn.onclick = _waDelete;
          const cta = document.getElementById('wa-cta');
          if (cta && cta.parentNode) cta.parentNode.insertBefore(btn, cta.nextSibling);
        }
        if (btn) btn.style.display = show ? 'block' : 'none';
      }

      function _waOpenEdit(it) {
        _waEditId = it.id;
        if (!window.WA) return;
        WA.open();
        // Use 100ms — enough time for both _patchWA's 50ms restore and any bundle timers to settle
        setTimeout(() => {
          const label = document.getElementById('wa-label-in');
          const cat   = document.getElementById('wa-cat');
          const brand = document.getElementById('wa-brand');
          const notes = document.getElementById('wa-notes');
          const cta   = document.getElementById('wa-cta');
          if (!label) { console.warn('[robes] edit: #wa-label-in still missing at 100ms'); return; }
          label.value = it.label  || '';
          if (cat)   cat.value   = it.category || '';
          if (brand) brand.value = it.brand   || '';
          if (notes) notes.value = it.notes   || '';
          if (cta)   cta.textContent = 'Update piece';
          // Bundle's validate() only enables #wa-cta when the label is non-empty,
          // and it last ran during open() while the field was still blank — re-run
          // it now that the saved label is populated, else "Update piece" stays disabled.
          label.dispatchEvent(new Event('input', { bubbles: true }));
          if (window.WA && typeof WA.validate === 'function') WA.validate();
          else if (cta) cta.removeAttribute('disabled');

          // Store item_dna for WA.submit to save back
          window.__waSawItemDna = (it.item_dna && typeof it.item_dna === 'object') ? JSON.parse(JSON.stringify(it.item_dna)) : {};

          // Inject custom swatches + pre-select the saved colour
          if (window.__rbInjectSwatches) window.__rbInjectSwatches(it.color || '');

          // Render silhouette pills from item_dna if present
          const dnaFit = it.item_dna && it.item_dna.structural_dna && Array.isArray(it.item_dna.structural_dna.silhouette_fit)
            ? it.item_dna.structural_dna.silhouette_fit : [];
          if (dnaFit.length) {
            window.__waSawFit = dnaFit.slice();
            // Inject pills section after swatch container
            const swatchContainer = document.getElementById('wa-swatches');
            if (swatchContainer && !document.getElementById('rb-fit-pills-wrap')) {
              const wrap = document.createElement('div');
              wrap.id = 'rb-fit-pills-wrap';
              wrap.style.cssText = 'margin-top:12px;';
              wrap.innerHTML = `<label style="font-size:10px;letter-spacing:0.1em;color:var(--ink-faint);display:block;margin-bottom:8px;">SILHOUETTE &amp; FIT</label><div id="rb-fit-pills" style="display:flex;flex-wrap:wrap;gap:6px;"></div>`;
              swatchContainer.parentNode.insertBefore(wrap, swatchContainer.nextSibling);
            }
            window.__rbRemovePill = function(i) {
              window.__waSawFit.splice(i, 1);
              if (window.__waSawItemDna && window.__waSawItemDna.structural_dna) {
                window.__waSawItemDna.structural_dna.silhouette_fit = window.__waSawFit.slice();
              }
              _rbRenderEditPills();
            };
            function _rbRenderEditPills() {
              const c = document.getElementById('rb-fit-pills');
              if (!c) return;
              c.innerHTML = window.__waSawFit.map(function(p, i) {
                return `<span style="display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border:1px solid #C8B8A2;border-radius:20px;font-size:12px;color:#4A3F35;background:#FAF8F5;white-space:nowrap;">${p}<button onclick="window.__rbRemovePill(${i})" style="background:none;border:none;cursor:pointer;color:var(--ink-faint);font-size:13px;line-height:1;padding:0;margin-left:2px;">×</button></span>`;
              }).join('');
            }
            _rbRenderEditPills();
          }

          // Show existing photo
          if (it.image_url) {
            const tileImg   = document.getElementById('wa-tile-img');
            const tileEmpty = document.getElementById('wa-tile-empty');
            const tileFill  = document.getElementById('wa-tile-fill');
            if (tileImg)   tileImg.src = it.image_url;
            if (tileEmpty) tileEmpty.style.display = 'none';
            if (tileFill)  tileFill.style.display  = 'block';
          }

          // Progressive capture expander — prefilled from the saved row
          document.getElementById('rb-wa-detail-host')?.remove();
          if (window.__rbWaDetailInject) window.__rbWaDetailInject(it);

          _waShowDeleteBtn(true);
        }, 100);
      }

      // Patch WA.submit — keep all other WA methods untouched
      const _origWAClose = () => window.WA && WA.close();
      const _origWASubmit = window.WA && WA.submit;

      // 3-step wardrobe add flow: (1) our photo-capture UI, (2) Reading…, (3) Here's what Robes saw.
      // We own all 3 steps — replace .fm-step on WA.open, use our own file input.
      (function _waSetupAutoTag() {
        let _photoDataUrl = '';
        let _origStepHTML = '';

        if (!document.getElementById('wa-spin-style')) {
          const st = document.createElement('style'); st.id = 'wa-spin-style';
          st.textContent = [
            '@keyframes wa-spin{to{transform:rotate(360deg)}}',
            '@keyframes rb-scan-line{0%{top:0%;opacity:1}80%{top:100%;opacity:1}81%{top:0%;opacity:0}100%{top:0%;opacity:1}}',
            '@keyframes rb-scan-glow{0%,100%{opacity:.7}50%{opacity:1}}',
          ].join('');
          document.head.appendChild(st);
        }

        // Swatch renderer — shared by add (step 3) and edit modal; the
        // palette itself (_ALL_SWATCHES) lives at wardrobe-wiring scope so
        // the Refine drawer's colour filter uses the same set.
        const _printBg = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Cpath d='M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2' stroke='%23A89880' stroke-width='1.5'/%3E%3C/svg%3E\") #EDE8E0";
        const _multiBg = "conic-gradient(#FF1493,#FF4500,#E1FD2E,#00A86B,#0047AB,#4B0082,#FF1493)";
        function _swLum(hex) {
          if (!hex) return 200;
          const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
          return r*0.299 + g*0.587 + b*0.114;
        }
        function _buildSwatchRows(selectedColor) {
          function _swBtn(sw) {
            const sel = sw.name === selectedColor;
            const lum = _swLum(sw.hex);
            const chkColor = lum < 130 ? '#fff' : '#2A2520';
            const bg = sw.hex ? `background:${sw.hex}` : sw.name === 'Multi' ? `background:${_multiBg}` : `background:${_printBg}`;
            const shadow = sw.hex === '#FFFFFF'
              ? 'box-shadow:inset 0 0 0 1.5px #D0C8BC,0 1px 3px rgba(0,0,0,0.1)'
              : 'box-shadow:inset 0 1px 3px rgba(0,0,0,0.18),0 0 0 1px rgba(0,0,0,0.07)';
            const outline = sel ? 'outline:2.5px solid #2A2520;outline-offset:2.5px' : '';
            const chk = sel ? `<svg style="position:absolute;inset:0;margin:auto;display:block;pointer-events:none" width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 5.5l3 3 5-5" stroke="${chkColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>` : '';
            return `<button aria-label="${sw.name}" onclick="window.__rbPickSwatch(this,'${sw.name}')" onmouseenter="var l=document.getElementById('rb-sw-label');if(l)l.textContent='${sw.name}'" onmouseleave="var l=document.getElementById('rb-sw-label');if(l)l.textContent=window.__waSawColor||''" style="position:relative;width:30px;height:30px;border-radius:50%;border:none;cursor:pointer;flex-shrink:0;${bg};${shadow};${outline}">${chk}</button>`;
          }
          return `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;">${_ALL_SWATCHES.slice(0,10).map(_swBtn).join('')}</div><div style="display:flex;flex-wrap:wrap;gap:8px;">${_ALL_SWATCHES.slice(10).map(_swBtn).join('')}</div>`;
        }

        // Inject custom swatches into any open modal form (used by edit mode)
        window.__rbInjectSwatches = function(selectedColor) {
          window.__waSawColor = selectedColor || '';
          // #wa-sw-name is now only a data carrier for WA.submit — the colour
          // name is shown in the injected #rb-sw-label header, so hide the span
          // to stop the raw colour ("Black") leaking as stray text under the pills.
          const swNameEl = document.getElementById('wa-sw-name');
          if (swNameEl) { swNameEl.textContent = selectedColor || ''; swNameEl.style.display = 'none'; }
          // Replace bundle swatch container with our custom rows
          const swatchContainer = document.getElementById('wa-swatches');
          if (swatchContainer) {
            swatchContainer.innerHTML = `<div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px;"><span style="font-size:10px;letter-spacing:0.1em;color:var(--ink-faint);">COLOUR</span><span id="rb-sw-label" style="font-size:12px;color:#6A5E54;font-style:italic;">${selectedColor||''}</span></div>${_buildSwatchRows(selectedColor)}`;
            swatchContainer.style.cssText = 'display:block';
            return;
          }
        };

        window.__rbPickSwatch = function(el, name) {
          window.__waSawColor = name;
          const swEl = document.getElementById('wa-sw-name');
          if (swEl) swEl.textContent = name;
          const lbl = document.getElementById('rb-sw-label');
          if (lbl) lbl.textContent = name;
          // Update outlines on all swatch buttons in both step-3 and edit modal
          document.querySelectorAll('#wa-modal button[aria-label]').forEach(function(btn) {
            const isThis = btn === el;
            btn.style.outline = isThis ? '2.5px solid #2A2520' : '';
            btn.style.outlineOffset = isThis ? '2.5px' : '';
            const chkSvg = btn.querySelector('svg');
            if (isThis && !chkSvg) {
              const lum = _swLum(btn.style.background.includes('#') ? btn.style.background.trim() : null);
              const chkColor = lum < 130 ? '#fff' : '#2A2520';
              btn.insertAdjacentHTML('beforeend', `<svg style="position:absolute;inset:0;margin:auto;display:block;pointer-events:none" width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 5.5l3 3 5-5" stroke="${chkColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
            } else if (!isThis && chkSvg) {
              chkSvg.remove();
            }
          });
        };

        function _setDot(n) {
          const dotsWrap = document.querySelector('#wa-modal .fm-dots');
          if (!dotsWrap) return;
          let dots = dotsWrap.querySelectorAll('.fmd');
          while (dots.length < 3) { const d = document.createElement('span'); d.className = 'fmd'; dotsWrap.appendChild(d); dots = dotsWrap.querySelectorAll('.fmd'); }
          dots.forEach((d, i) => d.classList.toggle('cur', i === n - 1));
        }

        // Downscale + transcode via the shared helper (see _rbDownscale) —
        // kept as a local alias because everything in this closure uses it.
        function _waFileToDataUrl(file) { return _rbDownscale(file); }

        // Bridge for WA.submit (which lives outside this closure): pull the
        // next batch photo straight into step 2, or bail out on a bad file.
        _waBatchAdvance = function(file) {
          _waFileToDataUrl(file).then(_runStep2).catch(function() {
            _waBatchQueue = []; _waBatchTotal = 0; _waBatchDone = 0;
            _origWAClose();
          });
        };

        function _waBatchTag() {
          return _waBatchTotal > 1
            ? `<div style="font-size:10px;letter-spacing:0.14em;color:#9A8070;margin:0 0 6px;">PIECE ${_waBatchDone + 1} OF ${_waBatchTotal}</div>`
            : '';
        }

        function _showStep1() {
          const step = document.querySelector('#wa-modal .fm-step');
          if (!step) return;
          step.innerHTML = `
            <h2 class="fm-h">Add a piece.</h2>
            <p style="font-size:14px;color:var(--ink-faint);margin:0 0 20px;">Snap it or attach it. Robes reads the colour, the cut and the label — and fills in the rest.</p>
            <label id="wa-rb-zone" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;height:240px;border:1.5px dashed #C8B8A2;border-radius:var(--rad);background:#FAF8F5;cursor:pointer;text-align:center;padding:20px;box-sizing:border-box;position:relative;">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#C8B8A2" stroke-width="1.4"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <span style="font-size:16px;color:#6A5E54;letter-spacing:0.01em;">Snap or attach the piece</span>
              <span style="font-size:13px;color:var(--ink-faint);">Take a photo — or select several and Robes files them one after another</span>
              <input id="wa-rb-file" type="file" multiple
                accept="image/*,.jpg,.jpeg,.png,.heic,.heif,.webp"
                style="position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;clip:rect(0 0 0 0);">
            </label>`;
          _setDot(1);

          // Bundle's validate() calls #wa-label-in.focus() via closure — keep a hidden one so it never throws
          const _dummyLbl = document.createElement('input');
          _dummyLbl.id = 'wa-label-in'; _dummyLbl.type = 'text'; _dummyLbl.style.display = 'none';
          step.appendChild(_dummyLbl);

          const fileInput = document.getElementById('wa-rb-file');
          const zone = document.getElementById('wa-rb-zone');
          function _process(files) {
            const list = Array.prototype.slice.call(files || [])
              .filter(function(f) { return f && (/^image\//.test(f.type) || /\.(heic|heif)$/i.test(f.name)); });
            if (!list.length) return;
            if (_waBatchQueue.length) {
              // Retake mid-batch: the new photo replaces the current piece
              // and any extra picks join the front of the queue.
              _waBatchQueue = list.slice(1).concat(_waBatchQueue);
              _waBatchTotal += list.length - 1;
            } else {
              _waBatchQueue = list.slice(1);
              _waBatchTotal = list.length;
              _waBatchDone = 0;
            }
            _waFileToDataUrl(list[0]).then(_runStep2).catch(function(err) {
              console.warn('[robes-autotag] could not read dropped file:', err);
            });
          }
          if (fileInput) {
            fileInput.addEventListener('change', function() { _process(this.files); });
          }
          if (zone) {
            ['dragenter', 'dragover'].forEach(function(ev) {
              zone.addEventListener(ev, function(e) {
                e.preventDefault(); e.stopPropagation();
                zone.style.borderColor = '#2A2520'; zone.style.background = '#F3EEE6';
              });
            });
            ['dragleave', 'dragend'].forEach(function(ev) {
              zone.addEventListener(ev, function(e) {
                e.preventDefault(); e.stopPropagation();
                zone.style.borderColor = '#C8B8A2'; zone.style.background = '#FAF8F5';
              });
            });
            zone.addEventListener('drop', function(e) {
              e.preventDefault(); e.stopPropagation();
              zone.style.borderColor = '#C8B8A2'; zone.style.background = '#FAF8F5';
              _process(e.dataTransfer && e.dataTransfer.files);
            });
          }
        }

        function _runStep2(dataUrl) {
          _photoDataUrl = dataUrl;
          const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (!match) return;

          const step = document.querySelector('#wa-modal .fm-step');
          if (!step) return;

          const bracketW = 18, bracketT = 2, bracketC = 'rgba(255,255,255,0.9)';
          const bStyle = `position:absolute;width:${bracketW}px;height:${bracketW}px;`;
          step.innerHTML = `
            ${_waBatchTag()}
            <h2 class="fm-h" style="margin-bottom:4px;">Reading your piece…</h2>
            <p style="font-size:14px;color:var(--ink-faint);margin:0 0 16px;">One moment — Robes is looking at the photo.</p>
            <div style="position:relative;height:280px;border-radius:var(--rad);overflow:hidden;background:#1A1410;">
              <img src="${dataUrl}" style="width:100%;height:100%;object-fit:contain;display:block;opacity:0.85;">
              <div style="position:absolute;inset:0;background:rgba(10,8,6,0.18);pointer-events:none;"></div>
              <div style="position:absolute;left:0;right:0;height:2px;animation:rb-scan-line 2.2s linear infinite;pointer-events:none;">
                <div style="height:2px;background:linear-gradient(to right,transparent,rgba(255,255,255,0.9),transparent);box-shadow:0 0 12px 3px rgba(255,255,255,0.35);animation:rb-scan-glow 2.2s ease-in-out infinite;"></div>
                <div style="height:32px;margin-top:-2px;background:linear-gradient(to bottom,rgba(255,255,255,0.06),transparent);pointer-events:none;"></div>
              </div>
              <div style="${bStyle}top:14px;left:14px;border-top:${bracketT}px solid ${bracketC};border-left:${bracketT}px solid ${bracketC};border-radius:2px 0 0 0;"></div>
              <div style="${bStyle}top:14px;right:14px;border-top:${bracketT}px solid ${bracketC};border-right:${bracketT}px solid ${bracketC};border-radius:0 2px 0 0;"></div>
              <div style="${bStyle}bottom:14px;left:14px;border-bottom:${bracketT}px solid ${bracketC};border-left:${bracketT}px solid ${bracketC};border-radius:0 0 0 2px;"></div>
              <div style="${bStyle}bottom:14px;right:14px;border-bottom:${bracketT}px solid ${bracketC};border-right:${bracketT}px solid ${bracketC};border-radius:0 0 2px 0;"></div>
              <div style="position:absolute;bottom:0;left:0;right:0;padding:14px 16px;background:linear-gradient(to top,rgba(10,8,6,0.75) 60%,transparent);">
                <span id="wa-read-txt" style="color:rgba(255,255,255,0.9);font-size:13px;letter-spacing:0.04em;">Identifying colour and fabric…</span>
              </div>
            </div>`;
          _setDot(2);

          // Keep hidden #wa-label-in so bundle's validate closure never throws
          const _dummyLbl2 = document.createElement('input');
          _dummyLbl2.id = 'wa-label-in'; _dummyLbl2.type = 'text'; _dummyLbl2.style.display = 'none';
          step.appendChild(_dummyLbl2);

          const readTexts = ['Identifying colour and fabric…','Reading the silhouette…','Checking for brand details…'];
          let ti = 0;
          const txtInterval = setInterval(() => {
            ti = (ti + 1) % readTexts.length;
            const el = document.getElementById('wa-read-txt');
            if (el) el.textContent = readTexts[ti];
          }, 1800);

          fetch('/api/wardrobe/analyse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: match[2], mimeType: match[1], userId: _waUid() || undefined })
          })
          .then(r => {
            if (!r.ok) throw new Error('analyse ' + r.status);
            return r.json();
          })
          .then(tag => {
            clearInterval(txtInterval);
            _runStep3(dataUrl, tag);
          })
          .catch(err => {
            clearInterval(txtInterval);
            console.warn('[robes-autotag] analyse network error, showing empty step 3:', err);
            _runStep3(dataUrl, { label: '', category: 'Other', color: '', brand: '', notes: '', item_dna: { display: {}, structural_dna: { silhouette_fit: [] }, ai_generated_notes: '' } });
          });
        }

        function _runStep3(dataUrl, tag) {
          const step = document.querySelector('#wa-modal .fm-step');
          if (!step) return;
          _setDot(3);
          const cats = ['Outerwear','Tops','Bottoms','Shoes','Accessories','Dresses','Bags','Swimwear'];

          // Map Gemini's returned colour names → our fashion names
          const GEMINI_MAP = {
            'White':'White','Cream':'Cream','Alabaster':'Cream',
            'Navy':'Navy','Denim blue':'Navy','Royal blue':'Cobalt','Blue':'Cobalt',
            'Light grey':'Charcoal','Charcoal':'Charcoal',
            'Black':'Black','Chocolate':'Espresso',
            'Tan':'Camel','Sand':'Camel','Camel':'Camel',
            'Taupe':'Taupe','Mauve':'Taupe',
            'Khaki':'Olive','Sage':'Olive','Olive':'Olive',
            'Aubergine':'Aubergine',
            'Dark green':'Forest','Forest':'Forest',
            'Burgundy':'Bordeaux','Bordeaux':'Bordeaux',
            'Blush':'Blush','Dusty rose':'Blush',
            'Yellow':'Ochre','Ochre':'Ochre',
            'Hot pink':'Magenta','Magenta':'Magenta',
            'Cobalt':'Cobalt','Emerald':'Emerald','Green':'Emerald',
            'Rust':'Vermillion','Orange':'Vermillion','Vermillion':'Vermillion',
            'Acid':'Acid',
            'Multi':'Print','Stripe':'Print','Print':'Print',
          };

          const initColor = GEMINI_MAP[tag.color] || tag.color || '';
          window.__waSawColor = initColor;
          window.__waSawItemDna = tag.item_dna || {};

          const rowsHTML = _buildSwatchRows(initColor);

          // Silhouette & fit pills from structural_dna
          const fitPills = (tag.item_dna && tag.item_dna.structural_dna && Array.isArray(tag.item_dna.structural_dna.silhouette_fit))
            ? tag.item_dna.structural_dna.silhouette_fit
            : [];
          window.__waSawFit = fitPills.slice();

          // `sync` is set on the pill-removal path only — the initial render
          // must not pre-paint the Cut row ahead of the ledger reveal.
          function _renderFitPills(sync) {
            const container = document.getElementById('rb-fit-pills');
            if (!container) return;
            container.innerHTML = window.__waSawFit.map(function(p, i) {
              return `<span style="display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border:1px solid #C8B8A2;border-radius:20px;font-size:12px;color:#4A3F35;background:#FAF8F5;white-space:nowrap;">${p}<button onclick="window.__rbRemovePill(${i})" style="background:none;border:none;cursor:pointer;color:var(--ink-faint);font-size:13px;line-height:1;padding:0;margin-left:2px;">×</button></span>`;
            }).join('');
            if (sync && window.__rbSawSync) window.__rbSawSync(4, window.__waSawFit.slice(0, 2).join(' · ') || '—');
          }
          window.__rbRemovePill = function(i) {
            window.__waSawFit.splice(i, 1);
            if (window.__waSawItemDna && window.__waSawItemDna.structural_dna) {
              window.__waSawItemDna.structural_dna.silhouette_fit = window.__waSawFit.slice();
            }
            _renderFitPills(true);
          };

          const aiNotes = (tag.item_dna && tag.item_dna.ai_generated_notes) || tag.notes || '';

          // ── The reveal (wardrobe-logging rework 2026-07-29) ─────────────
          // The onboarding filing "magic" — tag pops over the photo, the
          // "What Robes files" ledger filling row by row — plays on EVERY
          // add; the full correction form (label/category/brand/swatches/
          // pills/notes + the progressive-capture expander) collapses behind
          // one "Adjust the details" row. Info on demand, wow by default.
          function _sawEsc(s) {
            return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
          }
          if (!document.getElementById('rb-wa-saw-style')) {
            const sawSt = document.createElement('style');
            sawSt.id = 'rb-wa-saw-style';
            sawSt.textContent =
              // contain, never cover — a portrait garment photo in this wide
              // frame would otherwise zoom until its width fills the box,
              // cropping the piece top and bottom (beta report 2026-07-29).
              // The dark panel letterboxes the spare space like a specimen
              // plate; the tags sit on the panel, not the image, so their
              // spots are unaffected.
              '.rb-saw-panel{position:relative;height:300px;border-radius:var(--rad);overflow:hidden;background:#1A1410;margin-bottom:14px}' +
              '.rb-saw-panel>img{width:100%;height:100%;object-fit:contain;display:block}' +
              '.rb-saw-retake{position:absolute;top:10px;right:10px;z-index:5;background:rgba(250,248,245,0.92);border:1px solid #D8CEBC;border-radius:100px;padding:6px 13px;font-size:12px;color:#6A5E54;cursor:pointer;font-family:inherit}' +
              '.rb-saw-tag{position:absolute;display:inline-flex;align-items:center;gap:7px;background:rgba(250,248,245,0.94);border:1px solid #E3DCD0;border-radius:100px;padding:6px 10px;font-weight:500;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:#2A2520;white-space:nowrap;max-width:84%;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 10px rgba(32,32,33,0.18);opacity:0;animation:rbSawPop .5s cubic-bezier(0.22,1,0.36,1) both;z-index:3}' +
              ".rb-saw-tag::before{content:'';width:5px;height:5px;border-radius:50%;background:#AE9290;flex:none}" +
              '.rb-saw-banner{position:absolute;left:10px;right:10px;bottom:10px;z-index:3;background:rgba(32,32,33,0.86);color:#FAF8F5;border-radius:2px;padding:11px 14px;font-family:var(--font-serif,Georgia,serif);font-weight:300;font-size:16px;letter-spacing:0.01em;text-align:center;opacity:0;animation:rbSawPop .55s cubic-bezier(0.22,1,0.36,1) both}' +
              '@keyframes rbSawPop{from{opacity:0;transform:translateY(6px) scale(0.7)}60%{opacity:1;transform:translateY(0) scale(1.04)}to{opacity:1;transform:none}}' +
              '.rb-saw-read{list-style:none;margin:0 0 14px;padding:0}' +
              '.rb-saw-row{display:flex;align-items:baseline;gap:14px;padding:9px 2px;border-bottom:1px solid #EFE9DF}' +
              '.rb-saw-num{font-family:var(--font-serif,Georgia,serif);font-weight:300;font-size:15px;color:#C9BCA6;width:18px;flex:none}' +
              '.rb-saw-lbl{flex:1;font-weight:500;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#9A8070;align-self:center}' +
              '.rb-saw-val{font-family:var(--font-serif,Georgia,serif);font-weight:300;font-size:16px;color:#2A2520;text-align:right;max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
              '.rb-saw-val.is-on{color:#B9AC96;font-style:italic;animation:rbSawPulse 1.4s ease-in-out infinite}' +
              '@keyframes rbSawPulse{0%,100%{opacity:1}50%{opacity:.45}}' +
              '.rb-saw-toggle{display:flex;align-items:center;justify-content:space-between;width:100%;background:#FAF8F5;border:1px solid #E3DCD0;border-radius:var(--rad-sm);padding:12px 14px;font-size:13px;color:#6A5E54;cursor:pointer;font-family:inherit;margin-bottom:14px;box-sizing:border-box}' +
              '.rb-saw-toggle svg{transition:transform .25s ease;flex:none}' +
              '.rb-saw-toggle.open svg{transform:rotate(180deg)}' +
              '@media(prefers-reduced-motion:reduce){.rb-saw-tag,.rb-saw-banner{animation-duration:0s}.rb-saw-val.is-on{animation:none}}';
            document.head.appendChild(sawSt);
          }

          const dna = tag.item_dna || {};
          const edColor = (dna.display && dna.display.editorial_color_name) || initColor;
          // A readable piece gets the theatre; an unreadable one goes straight
          // to the (expanded) form — there is nothing to celebrate yet.
          const readable = !!tag.label;
          const ledgerVals = [
            tag.label || '',
            tag.category || '',
            tag.brand || (dna.display && dna.display.brand_raw) || 'Unlabelled',
            edColor || 'Read',
            fitPills.slice(0, 2).join(' · ') || '—',
          ];
          const LEDGER_LBLS = ['The piece', 'Category', 'Brand', 'Colour', 'Cut'];
          const SAW_SPOTS = [
            { top: '10%', left: '8%' },
            { top: '30%', right: '8%' },
            { top: '52%', left: '10%' },
            { top: '68%', right: '12%' },
          ];
          const chips = [];
          if (tag.category) chips.push(tag.category);
          if (edColor) chips.push(edColor);
          if (tag.brand) chips.push(tag.brand);
          fitPills.forEach(function(f) { if (chips.length < SAW_SPOTS.length) chips.push(f); });

          const tagsHtml = readable
            ? chips.map(function(c, idx) {
                const s = SAW_SPOTS[idx];
                const pos = 'top:' + s.top + ';' + (s.left ? 'left:' + s.left : 'right:' + s.right) + ';';
                return `<span class="rb-saw-tag" style="${pos}animation-delay:${(0.15 + idx * 0.4).toFixed(2)}s">${_sawEsc(c)}</span>`;
              }).join('') +
              `<span class="rb-saw-banner" style="animation-delay:${(0.35 + chips.length * 0.4).toFixed(2)}s">${_sawEsc(tag.label)}</span>`
            : '';

          const ledgerHtml = readable
            ? `<ul class="rb-saw-read" id="rb-saw-read">${LEDGER_LBLS.map(function(l, idx) {
                return `<li class="rb-saw-row"><span class="rb-saw-num">${String(idx + 1).padStart(2, '0')}</span><span class="rb-saw-lbl">${l}</span><span class="rb-saw-val is-on">Reading</span></li>`;
              }).join('')}</ul>`
            : '';

          step.innerHTML = `
            ${_waBatchTag()}
            <h2 class="fm-h" style="margin-bottom:4px;">Here's what Robes <em style="font-style:italic;color:#9A7060">saw.</em></h2>
            <p style="font-size:13px;color:var(--ink-faint);margin:0 0 16px;">${readable ? `Filed from your photo — adjust the details only if something isn't quite right.` : `Robes couldn't quite read this one — give it a name and it files all the same.`}</p>
            <div class="rb-saw-panel" id="rb-saw-panel">
              <img id="wa-saw-photo" alt="">
              ${tagsHtml}
              <button type="button" class="rb-saw-retake" onclick="window.__waRetake&&window.__waRetake()">↺ Retake</button>
            </div>
            ${ledgerHtml}
            <button type="button" class="rb-saw-toggle" id="rb-saw-toggle" onclick="window.__rbSawExpand&&window.__rbSawExpand()">
              <span>✎ Adjust the details</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A8070" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div id="rb-saw-edit" style="display:none;">
              <div style="margin-bottom:12px;">
                <label style="font-size:10px;letter-spacing:0.1em;color:var(--ink-faint);display:block;margin-bottom:5px;">THE PIECE</label>
                <input id="wa-saw-label" value="${(tag.label||'').replace(/"/g,'&quot;')}" style="width:100%;box-sizing:border-box;padding:10px 14px;border:1px solid #D8CEBC;border-radius:var(--rad-sm);font-size:15px;font-family:inherit;background:#fff;color:#2A2520;" oninput="window.__waSawLabel=this.value;window.__rbSawSync&&window.__rbSawSync(0,this.value)">
              </div>
              <div style="display:flex;gap:10px;margin-bottom:12px;">
                <div style="flex:1;">
                  <label style="font-size:10px;letter-spacing:0.1em;color:var(--ink-faint);display:block;margin-bottom:5px;">CATEGORY</label>
                  <select id="wa-saw-cat" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #D8CEBC;border-radius:var(--rad-sm);font-size:14px;font-family:inherit;background:#fff;color:#2A2520;" onchange="window.__waSawCat=this.value;window.__rbSawSync&&window.__rbSawSync(1,this.value)">
                    ${cats.map(o => `<option${tag.category===o?' selected':''}>${o}</option>`).join('')}
                  </select>
                </div>
                <div style="flex:1;">
                  <label style="font-size:10px;letter-spacing:0.1em;color:var(--ink-faint);display:block;margin-bottom:5px;">BRAND</label>
                  <input id="wa-saw-brand" value="${(tag.brand||'').replace(/"/g,'&quot;')}" placeholder="Unknown" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #D8CEBC;border-radius:var(--rad-sm);font-size:14px;font-family:inherit;background:#fff;color:#2A2520;" oninput="window.__waSawBrand=this.value;window.__rbSawSync&&window.__rbSawSync(2,this.value||'Unlabelled')">
                </div>
              </div>
              <div style="margin-bottom:12px;">
                <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px;">
                  <label style="font-size:10px;letter-spacing:0.1em;color:var(--ink-faint);">COLOUR</label>
                  <span id="rb-sw-label" style="font-size:12px;color:#6A5E54;font-style:italic;">${initColor}</span>
                </div>
                ${rowsHTML}
              </div>
              ${fitPills.length ? `<div style="margin-bottom:12px;">
                <label style="font-size:10px;letter-spacing:0.1em;color:var(--ink-faint);display:block;margin-bottom:8px;">SILHOUETTE &amp; FIT</label>
                <div id="rb-fit-pills" style="display:flex;flex-wrap:wrap;gap:6px;"></div>
              </div>` : ''}
              <div style="margin-bottom:16px;">
                <label style="font-size:10px;letter-spacing:0.1em;color:var(--ink-faint);display:block;margin-bottom:5px;">NOTES <span style="font-weight:400;letter-spacing:0;text-transform:none;color:var(--ink-faint);">optional</span></label>
                <textarea id="wa-saw-notes" placeholder="Fabric, fit, occasion…" style="width:100%;box-sizing:border-box;padding:10px 14px;border:1px solid #D8CEBC;border-radius:var(--rad-sm);font-size:14px;font-family:inherit;background:#fff;color:#2A2520;resize:none;height:72px;" oninput="window.__waSawNotes=this.value">${aiNotes.replace(/</g,'&lt;')}</textarea>
              </div>
              <div id="rb-wa-detail-host"></div>
            </div>
            <button id="wa-saw-cta" onclick="window.__waSawSubmit&&window.__waSawSubmit()" style="width:100%;padding:14px;background:#2A2520;color:#F8F5F0;border:none;border-radius:var(--rad-sm);font-size:14px;letter-spacing:0.08em;cursor:pointer;font-family:inherit;">ADD TO WARDROBE →</button>`;

          // Set the photo src via DOM (not innerHTML) so large data URLs aren't truncated
          const photoEl = document.getElementById('wa-saw-photo');
          if (photoEl) photoEl.src = dataUrl;

          // Live sync: an edit in the collapsed form updates the ledger row
          // (and the photo banner for the name) so the reveal never lies.
          window.__rbSawSync = function(idx, txt) {
            ledgerVals[idx] = txt;
            const spans = document.querySelectorAll('#rb-saw-read .rb-saw-val');
            if (spans[idx]) { spans[idx].textContent = txt; spans[idx].className = 'rb-saw-val'; }
            if (idx === 0) {
              const b = document.querySelector('#rb-saw-panel .rb-saw-banner');
              if (b) b.textContent = txt;
            }
          };

          // The collapsed details editor. force=true (empty-label guard) always opens.
          window.__rbSawExpand = function(force) {
            const box = document.getElementById('rb-saw-edit');
            const tg = document.getElementById('rb-saw-toggle');
            if (!box) return;
            const open = force === true ? true : box.style.display === 'none';
            box.style.display = open ? 'block' : 'none';
            if (tg) {
              tg.classList.toggle('open', open);
              const lbl = tg.querySelector('span');
              if (lbl) lbl.textContent = open ? 'Hide the details' : '✎ Adjust the details';
            }
          };

          // Swatch picks route through the shared __rbPickSwatch — sync the
          // Colour ledger row off the committed value a tick later.
          const editBox = document.getElementById('rb-saw-edit');
          if (editBox) {
            editBox.addEventListener('click', function(e) {
              if (e.target && e.target.closest && e.target.closest('button[aria-label]')) {
                setTimeout(function() { window.__rbSawSync && window.__rbSawSync(3, window.__waSawColor || ''); }, 0);
              }
            });
          }

          // The filing reveal — ledger rows fill one at a time, mirroring
          // onboarding's revealLedger. Bails silently if the step re-renders
          // (retake, batch advance) mid-play.
          if (readable) {
            let rc = 0;
            const revealTick = function() {
              const spans = document.querySelectorAll('#rb-saw-read .rb-saw-val');
              if (!spans.length) return;
              spans.forEach(function(sp, idx) {
                const done = idx < rc;
                sp.textContent = done ? ledgerVals[idx] : 'Reading';
                sp.className = 'rb-saw-val' + (done ? '' : ' is-on');
              });
              if (rc < ledgerVals.length) { rc++; setTimeout(revealTick, 420); }
            };
            setTimeout(revealTick, 250);
          } else {
            window.__rbSawExpand(true);
          }

          // Render pills after innerHTML is set
          _renderFitPills();

          // Progressive capture — "Add more detail" (season, cost-per-wear,
          // fit, sentiment, Hero Rack). Fresh state per piece, batch included.
          if (window.__rbWaDetailInject) window.__rbWaDetailInject(null);

          window.__waSawLabel = tag.label || '';
          window.__waSawCat   = tag.category || '';
          window.__waSawBrand = tag.brand || '';
          window.__waSawNotes = aiNotes;
          window.__waRetake   = function() { _showStep1(); };
          window.__waSawSubmit = function() {
            const step = document.querySelector('#wa-modal .fm-step');
            if (!step) return;
            // The bundle's WA.submit silently returns on an empty label, which
            // would leave the CTA stuck on "Saving…" — catch it here instead.
            // The name field lives in the collapsed details editor, so open it
            // before pointing at it.
            if (!(window.__waSawLabel || '').trim()) {
              if (window.__rbSawExpand) window.__rbSawExpand(true);
              const nameEl = document.getElementById('wa-saw-label');
              if (nameEl) {
                nameEl.style.borderColor = '#B0533B';
                nameEl.focus();
                let hint = document.getElementById('wa-saw-namehint');
                if (!hint) {
                  hint = document.createElement('div');
                  hint.id = 'wa-saw-namehint';
                  hint.style.cssText = 'font-size:12px;color:#B0533B;margin:6px 0 0;';
                  nameEl.parentNode.appendChild(hint);
                }
                hint.textContent = 'Give the piece a name first — even “black blazer” will do.';
                nameEl.addEventListener('input', function clr() {
                  nameEl.style.borderColor = '#D8CEBC';
                  if (hint) hint.textContent = '';
                  nameEl.removeEventListener('input', clr);
                });
              }
              return;
            }
            // Keep the polished review visible and flip its own CTA to "Saving…"
            // — do NOT swap the whole step back to the bundle's empty "Add a
            // piece" form (that flash was the reported bug). The bundle form
            // WA.submit reads from is injected into a hidden host instead.
            const sawBtn = document.getElementById('wa-saw-cta');
            if (sawBtn) { sawBtn.disabled = true; sawBtn.style.opacity = '0.65'; sawBtn.style.cursor = 'default'; sawBtn.textContent = 'Saving…'; }
            let host = document.getElementById('wa-hidden-form');
            if (!host) {
              host = document.createElement('div');
              host.id = 'wa-hidden-form';
              host.style.display = 'none';
              step.appendChild(host);
            }
            if (_origStepHTML) host.innerHTML = _origStepHTML;
            const lEl  = document.getElementById('wa-label-in');
            const cEl  = document.getElementById('wa-cat');
            const bEl  = document.getElementById('wa-brand');
            const nEl  = document.getElementById('wa-notes');
            const swEl = document.getElementById('wa-sw-name');
            const tileImg  = document.getElementById('wa-tile-img');
            const tileEl   = document.getElementById('wa-tile');
            const tileFill  = document.getElementById('wa-tile-fill');
            const tileEmpty = document.getElementById('wa-tile-empty');
            if (lEl)  lEl.value        = window.__waSawLabel || '';
            if (cEl)  cEl.value        = window.__waSawCat   || '';
            if (bEl)  bEl.value        = window.__waSawBrand || '';
            if (nEl)  nEl.value        = window.__waSawNotes  || '';
            if (swEl) swEl.textContent = window.__waSawColor  || '';
            if (tileImg && _photoDataUrl) tileImg.src = _photoDataUrl;
            if (tileEl)   tileEl.classList.add('filled');
            if (tileFill)  tileFill.style.display  = 'block';
            if (tileEmpty) tileEmpty.style.display = 'none';
            setTimeout(() => { window.WA && WA.submit && WA.submit(); }, 50);
          };
        }

        function _patchWA() {
          if (!window.WA || !WA.open || WA.open._rbPatched) return false;
          // Capture the pristine bundle add-form NOW, while .fm-step still
          // holds the static HTML. Without this, _origStepHTML stays empty
          // until the first add-flow open captures it — so a Snap Mine that
          // is the very first WA.open of the session had nothing to restore,
          // and the bundle's open() crashed on a null #wa-label-in whenever
          // a prior flow had already replaced .fm-step. Guarded on the label
          // so we never snapshot our own custom step content.
          if (!_origStepHTML) {
            const step0 = document.querySelector('#wa-modal .fm-step');
            // Guard on .wa-grid — unique to the real bundle form — so we never
            // snapshot a stripped step-1/2/3 state (which only has a dummy
            // #wa-label-in) and poison every later restore.
            if (step0 && step0.querySelector('.wa-grid')) _origStepHTML = step0.innerHTML;
          }
          const _origOpen = WA.open;
          WA.open = function() {
            _photoDataUrl = '';
            // The bundle's open() does $('wa-label-in').value = '' etc. — it
            // needs the bundle form present in .fm-step. If a prior flow left
            // our custom step content there (e.g. a swap → Snap Mine, or the
            // modal closed mid-add without submitting), restore the bundle
            // form first so _origOpen doesn't crash on a null #wa-label-in.
            // Runs in BOTH add and edit modes. On the very first open
            // _origStepHTML is empty and the bundle form is already present,
            // so this is a no-op and the form is captured at line ~843.
            // The bundle's open()/validate() write to a fixed set of fields
            // that live inside .fm-step. Our custom add-steps (and interrupted
            // add flows) can leave .fm-step with SOME or NONE of them — step 1
            // keeps only a dummy #wa-label-in, so a gate on that field alone
            // let the bundle sail past it and crash on the next null (#wa-cat).
            // Guarantee EVERY required field exists before _origOpen: restore
            // the captured bundle form if we have it, then shim any still-
            // missing field. _showStep1 replaces the content 150ms later.
            const _WA_FIELDS = ['wa-label-in', 'wa-cat', 'wa-brand', 'wa-notes', 'wa-sw-name', 'wa-swatches', 'wa-cta'];
            if (_WA_FIELDS.some(id => !document.getElementById(id))) {
              const step = document.querySelector('#wa-modal .fm-step');
              if (step && _origStepHTML) step.innerHTML = _origStepHTML;
              const stillMissing = _WA_FIELDS.filter(id => !document.getElementById(id));
              if (stillMissing.length) {
                const host = document.querySelector('#wa-modal .fm-step') || document.getElementById('wa-modal');
                if (host) {
                  const shim = document.createElement('div');
                  shim.style.display = 'none';
                  host.appendChild(shim);
                  const TAG = { 'wa-cat': 'select', 'wa-notes': 'textarea', 'wa-sw-name': 'span', 'wa-swatches': 'div', 'wa-cta': 'button' };
                  stillMissing.forEach(id => { const el = document.createElement(TAG[id] || 'input'); el.id = id; shim.appendChild(el); });
                }
              }
            }
            try {
              _origOpen.apply(this, arguments);
            } catch (e) {
              // Absolute backstop — the bundle open() must never break Snap Mine.
              console.warn('[robes] bundle WA.open threw, opening modal directly:', e);
              const m = document.getElementById('wa-modal');
              if (m) m.classList.add('open');
              document.body.classList.add('modal-open');
            }
            if (!_waEditId) {
              // Add mode: capture bundle form HTML once, then show photo step
              setTimeout(function() {
                const step = document.querySelector('#wa-modal .fm-step');
                // Only capture the real bundle form (.wa-grid), never a step state
                if (step && !_origStepHTML && step.querySelector('.wa-grid')) _origStepHTML = step.innerHTML;
                _showStep1();
              }, 150);
            }
          };
          WA.open._rbPatched = true;
          if (WA.close && !WA.close._rbPatched) {
            const _origClose = WA.close;
            WA.close = function() {
              _photoDataUrl = '';
              _waBatchQueue = []; _waBatchTotal = 0; _waBatchDone = 0;
              // Progressive-capture state must not leak into the next open
              window.__rbWaDetail = null;
              document.getElementById('rb-wa-detail-host')?.remove();
              _origClose.apply(this, arguments);
            };
            WA.close._rbPatched = true;
          }
          // Guard validate — bundle tries to focus #wa-label-in which doesn't exist on steps 1-3
          if (WA.validate && !WA.validate._rbPatched) {
            const _origValidate = WA.validate;
            WA.validate = function() {
              if (!document.getElementById('wa-label-in')) return;
              _origValidate.apply(this, arguments);
            };
            WA.validate._rbPatched = true;
          }
          console.log('[robes-autotag] WA patched');
          return true;
        }

        if (!_patchWA()) {
          const poll = setInterval(function() { if (_patchWA()) clearInterval(poll); }, 200);
        }
      })();




      if (window.WA) {
        WA.submit = async function() {
          const label = (document.getElementById('wa-label-in') || {}).value && document.getElementById('wa-label-in').value.trim();
          if (!label) { const l = document.getElementById('wa-label-in'); if (l) l.focus(); return; }

          const editId = _waEditId;
          const cta = document.getElementById('wa-cta');
          if (cta) { cta.disabled = true; cta.textContent = 'Saving…'; }

          try {
            let imageUrl = editId ? (_waItems.find(i => i.id === editId) || {}).image_url || null : null;

            // Upload new photo if one was selected (data URL in tile)
            const tileImg  = document.getElementById('wa-tile-img');
            const tileFill = document.getElementById('wa-tile-fill');
            const tileSrc  = tileImg ? tileImg.src : '';
            const tileEl   = document.getElementById('wa-tile');
            const isFilled = (tileEl && tileEl.classList.contains('filled')) ||
                             (tileFill && tileFill.style.display === 'block');
            const isDataUrl = tileSrc && tileSrc.startsWith('data:');
            if (isFilled && isDataUrl) {
              const match = tileSrc.match(/^data:([^;]+);base64,(.+)$/);
              if (match) {
                try {
                  const res = await fetch('/api/wardrobe/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: match[2], mimeType: match[1] })
                  });
                  const j = await res.json();
                  if (j.url) imageUrl = j.url;
                  else console.warn('Upload returned no URL:', j);
                } catch(uploadErr) { console.warn('Photo upload failed:', uploadErr); }
              }
            }

            const colorName = (document.getElementById('wa-sw-name') || {}).textContent && document.getElementById('wa-sw-name').textContent.trim();
            // Merge current colour + notes into item_dna before saving
            const savedDna = window.__waSawItemDna || {};
            if (colorName) {
              savedDna.display = Object.assign({}, savedDna.display || {}, { editorial_color_name: colorName });
            }
            const notesVal = ((document.getElementById('wa-notes') || {}).value || '').trim() || null;
            if (notesVal) savedDna.ai_generated_notes = notesVal;

            const payload = {
              user_id:   _waUid(),
              label,
              category:  (document.getElementById('wa-cat')   || {}).value || 'Other',
              color:     colorName || null,
              brand:     ((document.getElementById('wa-brand') || {}).value || '').trim() || null,
              notes:     notesVal,
              image_url: imageUrl,
              item_dna:  Object.keys(savedDna).length ? savedDna : undefined,
            };

            // Progressive capture (wardrobe v2) — only when the expander was
            // mounted for this piece (add step 3 / edit both mount it), and
            // only while the v2 columns are known to exist.
            const _V2_KEYS = ['seasons', 'occasions', 'price', 'fit_confidence', 'sentiment', 'hero_position'];
            const det = window.__rbWaDetail;
            if (det && _waV2Cols) {
              const seas = det.when.filter(w => WA_SEASONS.indexOf(w) !== -1);
              const occ  = det.when.filter(w => WA_SEASONS.indexOf(w) === -1);
              payload.seasons        = seas.length ? seas : null;
              payload.occasions      = occ.length ? occ : null;
              payload.price          = det.price && Number(det.price) > 0 ? Number(det.price) : null;
              payload.fit_confidence = det.fitConf || null;
              payload.sentiment      = det.sentiment || null;
              payload.hero_position  = det.hero ? (det.heroPos != null ? det.heroPos : _waHeroNextPos()) : null;
            }

            let created = null;
            try {
              if (editId) {
                await _waFetch('PATCH', 'wardrobe_items?id=eq.' + editId, payload);
              } else {
                created = await _waFetch('POST', 'wardrobe_items', payload);
              }
            } catch (err) {
              // Pre-migration Supabase rejects unknown columns (PGRST204) —
              // strip the v2 fields, remember, and retry once so the core
              // save never fails on a schema that hasn't caught up yet.
              if (det && /PGRST204|column/i.test(String(err && err.message || err))) {
                _waV2Cols = false;
                _V2_KEYS.forEach(k => delete payload[k]);
                if (editId) {
                  await _waFetch('PATCH', 'wardrobe_items?id=eq.' + editId, payload);
                } else {
                  created = await _waFetch('POST', 'wardrobe_items', payload);
                }
              } else throw err;
            }

            if (!editId) _rbTrack('wardrobe_added', { label: payload.label || '', category: payload.category || '' });
            _waEditId = null;
            // Batch mode: keep the modal open and roll the next queued photo
            // into step 2 — closing between pieces made 15 photos feel like
            // 15 chores. (Snapshot the total: closing clears the counters.)
            const batchNext = !editId && _waBatchQueue.length ? _waBatchQueue.shift() : null;
            const batchTotal = _waBatchTotal;
            if (batchNext) _waBatchDone++;
            else _origWAClose();
            await _waLoad();
            if (batchNext) _waShowToast('Piece ' + _waBatchDone + ' of ' + batchTotal + ' added');
            else if (!editId && batchTotal > 1) _waShowToast('All ' + batchTotal + ' pieces in your wardrobe');
            else _waShowToast(editId ? 'Piece updated' : 'Added to wardrobe');

            // A pending "Snap mine" swap is waiting on this new piece —
            // apply it now that _waItems has reloaded with the new row.
            let hooked = false;
            if (!editId && typeof _waAfterAdd === 'function') {
              const hook = _waAfterAdd;
              _waAfterAdd = null;
              hooked = true;
              const newId = (Array.isArray(created) && created[0] && created[0].id != null)
                ? created[0].id
                : (_waItems[0] && _waItems[0].id);
              if (newId != null) { try { hook(newId); } catch (e) { console.warn('[robes] after-add hook:', e); } }
            }

            if (batchNext && typeof _waBatchAdvance === 'function') {
              _waBatchAdvance(batchNext);
            } else if (!editId && !hooked) {
              // P0 fork moment: a freshly filed piece immediately offers its
              // two payoffs — 3 editorial ways, or today's look built around
              // it. Skipped when another flow armed the add (swap/snap-mine)
              // and between batch pieces (fires once, on the last).
              const newRow = (Array.isArray(created) && created[0]) || _waItems[0] || null;
              if (newRow && window.__rbAddFork) window.__rbAddFork(newRow);
            }
          } catch(e) {
            console.error('WA submit:', e);
            _waShowToast('Something went wrong — try again');
            if (cta) { cta.disabled = false; cta.textContent = editId ? 'Update piece' : 'Add to wardrobe'; }
            // Re-enable the visible step-3 CTA (add flow) so the user can retry.
            const sawBtn = document.getElementById('wa-saw-cta');
            if (sawBtn) { sawBtn.disabled = false; sawBtn.style.opacity = '1'; sawBtn.style.cursor = 'pointer'; sawBtn.textContent = 'ADD TO WARDROBE →'; }
          }
        };
      }

      async function _waDelete() {
        if (!_waEditId) return;
        if (!confirm('Remove this piece from your wardrobe?')) return;
        try {
          await _waFetch('DELETE', 'wardrobe_items?id=eq.' + _waEditId, undefined);
          _origWAClose();
          _waEditId = null;
          await _waLoad();
          _waShowToast('Piece removed');
        } catch(e) { _waShowToast('Could not remove piece'); }
      }

      // ═══════════════════════════════════════════════════════════════════
      // Wardrobe v2 — Hero Rack · Refine drawer · Wishlist · add chooser
      // (Claude Design handoff 2026-07-14: "hierarchy over uniformity".)
      // The mock was a UX guide only — everything below renders with the
      // beta's own tokens and card DNA. Persistence needs
      // supabase/wardrobe_v2_migration.sql; until it runs the code degrades
      // gracefully (saves retry without the new columns, hero/wishlist
      // toast "not ready yet") — same convention as the lookbook table.
      // ═══════════════════════════════════════════════════════════════════

      // `var` on purpose — early readers (_waSyncCounts at boot, observer
      // callbacks) must see undefined/default, never throw (TDZ gotcha).
      var _waView = 'all';                 // 'all' | 'wishlist'
      var _waV2Cols = true;                // v2 columns present? flipped off on PGRST204
      var _wlItems = [], _wlLoaded = false, _wlTableMissing = false;
      var _waRefine = { seasons: [], colors: [], fits: [], worn: 'all', brand: '' };
      var _waRefineOpen = false;

      const WA_SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter', 'Year-round'];
      const WA_OCCASIONS = ['Everyday', 'Work', 'Evening', 'Travel'];
      const _WA_HERO_CAP = 10;

      function _waSeasonNow() {
        const m = new Date().getMonth();
        return m >= 2 && m <= 4 ? 'Spring' : m >= 5 && m <= 7 ? 'Summer' : m >= 8 && m <= 10 ? 'Autumn' : 'Winter';
      }
      // Untagged pieces are treated as Year-round everywhere — most of the
      // catalogue starts untagged, and a season filter that hid them all
      // would read as broken, not strict.
      function _waItemSeasons(it) {
        return (Array.isArray(it.seasons) && it.seasons.length) ? it.seasons : ['Year-round'];
      }
      function _waInSeasonNow(it) {
        const s = _waItemSeasons(it);
        return s.indexOf('Year-round') !== -1 || s.indexOf(_waSeasonNow()) !== -1;
      }

      function _waMatchRefine(it) {
        const r = _waRefine;
        if (r.seasons.length) {
          const s = _waItemSeasons(it);
          // Year-round pieces are always in season, so they pass any pick
          if (s.indexOf('Year-round') === -1 && !r.seasons.some(x => s.indexOf(x) !== -1)) return false;
        }
        if (r.worn === 'worn' && !(it.times_worn > 0)) return false;
        if (r.worn === 'never' && it.times_worn > 0) return false;
        if (r.colors.length && r.colors.indexOf(it.color) === -1) return false;
        if (r.brand && (it.brand || '') !== r.brand) return false;
        if (r.fits.length) {
          const f = (it.item_dna && it.item_dna.structural_dna && Array.isArray(it.item_dna.structural_dna.silhouette_fit))
            ? it.item_dna.structural_dna.silhouette_fit : [];
          if (!f.some(x => r.fits.indexOf(x) !== -1)) return false;
        }
        return true;
      }
      function _waRefineCount() {
        const r = _waRefine;
        return r.seasons.length + r.colors.length + r.fits.length + (r.brand ? 1 : 0) + (r.worn !== 'all' ? 1 : 0);
      }
      function _waFilteredItems() {
        return _waItems.filter(i => (_waCat === 'All' || i.category === _waCat) && _waMatchRefine(i));
      }

      // "Coming soon" door — reuses the bundle's dialog like the affiliate CTA
      function _waSoon(title, sub) {
        if (window.KP && KP.comingSoon) KP.comingSoon(title + ',<br><em>coming soon.</em>', sub);
        else _waShowToast(title + ' — coming soon');
      }

      function _waStarSvg(on) {
        return '<svg viewBox="0 0 24 24" fill="' + (on ? '#fff' : 'none') + '" stroke="' + (on ? '#fff' : '#202021') + '" stroke-width="1.3"><path d="M12 3.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.9 6.75 19.7l1-5.85L3.5 9.65l5.9-.85z"/></svg>';
      }

      // ── Hero Rack ─────────────────────────────────────────────────────
      function _waHeroAll() {
        return _waItems.filter(i => i.hero_position != null)
          .sort((a, b) => (a.hero_position || 0) - (b.hero_position || 0));
      }
      function _waHeroNextPos() {
        return _waItems.reduce((m, i) => Math.max(m, i.hero_position || 0), 0) + 1;
      }

      window.__waHeroToggle = async function(id) {
        const it = _waItems.find(i => String(i.id) === String(id));
        if (!it) return;
        const on = it.hero_position == null;
        if (on && _waHeroAll().length >= _WA_HERO_CAP) {
          _waShowToast('The Hero Rack holds ' + _WA_HERO_CAP + ' — remove one first');
          return;
        }
        const prev = it.hero_position;
        it.hero_position = on ? _waHeroNextPos() : null;   // optimistic
        _waRender();
        _waHeroPickerPaint();
        try {
          await _waFetch('PATCH', 'wardrobe_items?id=eq.' + it.id, { hero_position: it.hero_position });
          _waShowToast(on ? 'Saved to your Hero Rack' : 'Removed from your Hero Rack');
        } catch (e) {
          it.hero_position = prev;
          _waRender();
          _waHeroPickerPaint();
          if (/PGRST204|column/i.test(String(e && e.message || e))) {
            _waV2Cols = false;
            _waShowToast('Robes couldn’t save that just now — try again shortly');
          } else _waShowToast('Could not update the Hero Rack');
        }
      };

      // No dedicated hero rail (integration pass 2026-07-21): starred pieces
      // simply lead the wardrobe grid itself (see the sort in _waRender) and
      // the grid-card stars + toast are the whole feature surface.

      // Hero picker — tap-to-toggle over the whole catalogue, no re-uploads
      // (door-less since the rail retired; kept for the edit-modal expander
      // and any future re-entry point)
      window.__waHeroPicker = function() {
        document.getElementById('rb-hero-picker')?.remove();
        const modal = document.createElement('div');
        modal.id = 'rb-hero-picker';
        modal.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(32,32,33,0.45);display:flex;align-items:flex-end;justify-content:center';
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
        modal.innerHTML = '<div style="background:var(--cream,#FAF8F5);width:100%;max-width:880px;border-radius:var(--rad-lg) 18px 0 0;max-height:82vh;display:flex;flex-direction:column;box-sizing:border-box">' +
          '<div style="padding:22px 26px 14px;border-bottom:0.5px solid rgba(32,32,33,0.12);display:flex;align-items:flex-end;justify-content:space-between;gap:14px">' +
            '<div><div style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:6px">Build your Hero Rack</div>' +
            '<div style="font-family:var(--font-serif);font-weight:300;font-size:26px;color:var(--ink);line-height:1">Tap the pieces you reach for first</div></div>' +
            '<button onclick="document.getElementById(\'rb-hero-picker\').remove()" style="border:none;background:var(--cream-200,#EFE9DC);width:32px;height:32px;border-radius:100px;cursor:pointer;color:var(--ink);font-size:15px;flex-shrink:0">✕</button></div>' +
          '<div id="rb-hero-pick-grid" style="overflow-y:auto;padding:18px 26px;display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:14px 12px"></div>' +
          '<div style="padding:14px 26px;border-top:0.5px solid rgba(32,32,33,0.12);display:flex;align-items:center;justify-content:space-between;gap:12px">' +
            '<span id="rb-hero-pick-count" style="font-size:11.5px;color:var(--ink-faint)"></span>' +
            '<button onclick="document.getElementById(\'rb-hero-picker\').remove()" class="rb-wg-cta">Done</button></div></div>';
        document.body.appendChild(modal);
        _waHeroPickerPaint();
      };

      function _waHeroPickerPaint() {
        const grid = document.getElementById('rb-hero-pick-grid');
        if (!grid) return;
        grid.innerHTML = _waItems.map(function(it) {
          const sel = it.hero_position != null;
          const img = it.image_url
            ? '<img src="' + _waEsc(it.image_url) + '" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">'
            : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"><span style="font-family:var(--font-serif);font-size:24px;color:var(--cream-400)">' + _waEsc((it.label || '?').charAt(0).toUpperCase()) + '</span></div>';
          return '<button onclick="window.__waHeroToggle(\'' + _waEsc(String(it.id)) + '\')" style="border:none;background:none;padding:0;cursor:pointer;text-align:left;font-family:inherit">' +
            '<div style="position:relative;aspect-ratio:3/4;border-radius:10px;overflow:hidden;background:var(--cream-200,#EFE9DC);outline:' + (sel ? '2px solid var(--ink,#202021)' : 'none') + ';outline-offset:-2px">' + img +
            (sel ? '<span style="position:absolute;inset:0;background:rgba(32,32,33,0.28);display:flex;align-items:center;justify-content:center"><span style="width:26px;height:26px;border-radius:100px;background:#FAF8F5;color:#202021;display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 6 9 17l-5-5"/></svg></span></span>' : '') +
            '</div><div style="font-size:11px;font-weight:500;color:var(--ink);margin-top:6px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _waEsc(it.label) + '</div></button>';
        }).join('');
        const count = document.getElementById('rb-hero-pick-count');
        if (count) count.textContent = _waHeroAll().length + ' of ' + _WA_HERO_CAP + ' featured';
      }

      // ── Refine drawer ─────────────────────────────────────────────────
      window.__waRefTog = function(kind, val) {
        const a = _waRefine[kind];
        const i = a.indexOf(val);
        if (i === -1) a.push(val); else a.splice(i, 1);
        _waRender();
        _waRefineRender();
      };
      window.__waRefWorn = function(v) { _waRefine.worn = v; _waRender(); _waRefineRender(); };
      window.__waRefBrand = function(el) { _waRefine.brand = el.value; _waRender(); _waRefineRender(); };
      // One clear for both filter tiers — category tabs back to All, drawer wiped.
      window.__waFiltersClear = function() {
        _waCat = 'All';
        window.__waRefClear();
        document.querySelectorAll('#wg-filters .wg-tab').forEach(p => p.classList.toggle('active', p.textContent === 'All'));
      };
      window.__waRefClear = function() {
        _waRefine = { seasons: [], colors: [], fits: [], worn: 'all', brand: '' };
        _waRender();
        _waRefineRender();
      };
      window.__waRefToggle = function() {
        _waRefineOpen = !_waRefineOpen;
        _waRefineRender();
      };
      // Colour wheel in the filter — a custom pick maps to the nearest
      // palette colour (item.color values are always palette names)
      function _waHexDist(a, b) {
        const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
        const x = p(a), y = p(b);
        return (x[0] - y[0]) * (x[0] - y[0]) + (x[1] - y[1]) * (x[1] - y[1]) + (x[2] - y[2]) * (x[2] - y[2]);
      }
      window.__waRefWheel = function(el) {
        const hex = (el.value || '').toLowerCase();
        if (!/^#[0-9a-f]{6}$/.test(hex)) return;
        let best = null, bd = Infinity;
        _ALL_SWATCHES.forEach(function(sw) {
          if (!sw.hex) return;
          const d = _waHexDist(hex, sw.hex);
          if (d < bd) { bd = d; best = sw; }
        });
        if (!best) return;
        if (_waRefine.colors.indexOf(best.name) === -1) _waRefine.colors.push(best.name);
        _waShowToast('Filtering by ' + best.name);
        _waRender();
        _waRefineRender();
      };

      function _waRefinePillSync() {
        const pill = document.getElementById('rb-refine-pill');
        if (!pill) return;
        const n = _waRefineCount();
        pill.classList.toggle('active', _waRefineOpen || n > 0);
        pill.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" style="flex-shrink:0"><path d="M4 6h16M7 12h10M10 18h4"/></svg>Refine' +
          (n ? ' <span class="rb-refine-badge">' + n + '</span>' : '');
      }

      function _waRefineRender() {
        const drawer = document.getElementById('rb-refine');
        if (!drawer) return;
        _waRefinePillSync();
        if (!_waRefineOpen || _waView === 'wishlist') { drawer.style.display = 'none'; return; }
        drawer.style.display = '';
        const r = _waRefine;
        const chip = function(kind, label, on) {
          return '<button class="rb-ref-chip' + (on ? ' on' : '') + '" onclick="window.__waRefTog(\'' + kind + '\',\'' + _waEsc(label).replace(/'/g, '\\\'') + '\')">' + _waEsc(label) + '</button>';
        };
        const seasonChips = WA_SEASONS.map(s => chip('seasons', s, r.seasons.indexOf(s) !== -1)).join('');
        // Colour: the FULL palette items are saved to (same set as the
        // add/edit modal), closed by the colour wheel — a custom pick maps
        // to the nearest palette colour. (Design handoff: don't limit the
        // filter to owned colours.)
        const ownColors = [];
        _waItems.forEach(i => { if (i.color && ownColors.indexOf(i.color) === -1) ownColors.push(i.color); });
        const extraColors = ownColors.filter(c => !_ALL_SWATCHES.some(sw => sw.name === c));
        const colorHtml = _ALL_SWATCHES.map(function(sw) {
          const on = r.colors.indexOf(sw.name) !== -1;
          const bg = sw.hex ? 'background:' + sw.hex : (sw.name === 'Multi'
            ? 'background:conic-gradient(#FF1493,#FF4500,#E1FD2E,#00A86B,#0047AB,#4B0082,#FF1493)'
            : 'background:repeating-linear-gradient(45deg,#EDE8E0 0 3px,#A89880 3px 4px)');
          return '<button class="rb-sw' + (on ? ' on' : '') + '" title="' + _waEsc(sw.name) + '" aria-label="' + _waEsc(sw.name) + '" style="' + bg + '" onclick="window.__waRefTog(\'colors\',\'' + _waEsc(sw.name) + '\')"></button>';
        }).join('') +
          '<label class="rb-sw rb-sw-wheel" title="Pick any colour"><input type="color" value="#a89880" onchange="window.__waRefWheel(this)"></label>' +
          extraColors.map(c => chip('colors', c, r.colors.indexOf(c) !== -1)).join('');
        // Fits: union of silhouette_fit tags across her pieces
        const fitSet = [];
        _waItems.forEach(function(i) {
          const f = (i.item_dna && i.item_dna.structural_dna && Array.isArray(i.item_dna.structural_dna.silhouette_fit))
            ? i.item_dna.structural_dna.silhouette_fit : [];
          f.forEach(x => { if (fitSet.indexOf(x) === -1) fitSet.push(x); });
        });
        const fitChips = fitSet.slice(0, 14).map(f => chip('fits', f, r.fits.indexOf(f) !== -1)).join('');
        const wornOpts = [['all', 'All'], ['worn', 'Worn'], ['never', 'Never worn']].map(function(d) {
          const on = r.worn === d[0];
          return '<button class="rb-ref-seg' + (on ? ' on' : '') + '" onclick="window.__waRefWorn(\'' + d[0] + '\')">' + d[1] + '</button>';
        }).join('');
        const brands = [];
        _waItems.forEach(i => { if (i.brand && brands.indexOf(i.brand) === -1) brands.push(i.brand); });
        brands.sort();
        const brandOpts = '<option value="">All brands</option>' + brands.map(b =>
          '<option value="' + _waEsc(b) + '"' + (r.brand === b ? ' selected' : '') + '>' + _waEsc(b) + '</option>').join('');
        const n = _waFilteredItems().length;
        drawer.innerHTML = '<div class="rb-ref-grid">' +
          '<div><div class="rb-ref-lbl">Season</div><div class="rb-ref-chips">' + seasonChips + '</div></div>' +
          '<div><div class="rb-ref-lbl">Colour</div><div class="rb-ref-chips" style="gap:9px;max-width:252px">' + colorHtml + '</div></div>' +
          (fitChips ? '<div><div class="rb-ref-lbl">Silhouette &amp; fit</div><div class="rb-ref-chips">' + fitChips + '</div></div>' : '') +
          '<div><div class="rb-ref-lbl">Wear</div><div class="rb-ref-segwrap">' + wornOpts + '</div></div>' +
          (brands.length ? '<div><div class="rb-ref-lbl">Brand</div><select class="rb-ref-select" onchange="window.__waRefBrand(this)">' + brandOpts + '</select></div>' : '') +
          '</div>' +
          '<div class="rb-ref-foot">' +
            '<button onclick="window.__waRefClear()" style="border:none;background:none;color:var(--ink-faint);font-size:11.5px;cursor:pointer;font-family:inherit;letter-spacing:.03em;padding:0">Clear all</button>' +
            '<button class="rb-wg-cta" onclick="window.__waRefToggle()">Show ' + n + ' piece' + (n === 1 ? '' : 's') + '</button>' +
          '</div>';
      }

      // ── Wishlist ──────────────────────────────────────────────────────
      async function _wlLoad() {
        if (!_waUid()) return;
        try {
          const data = await _waFetch('GET', 'wishlist_items?user_id=eq.' + _waUid() + '&order=created_at.desc&select=*');
          _wlItems = data || [];
          _wlLoaded = true;
          _wlTableMissing = false;
        } catch (e) {
          // Table not created yet (migration pending) — degrade silently
          if (/relation|does not exist|PGRST205|schema cache|404/i.test(String(e && e.message || e))) _wlTableMissing = true;
          else console.error('wishlist load:', e);
        }
        _waV2Sync();
      }

      const _WL_SRC = {
        robes:     { label: 'Robes suggests',           sage: true },
        url:       { label: 'Saved from a link',        dot: '#A89880' },
        instagram: { label: 'Saved from Instagram',     dot: '#8E7077' },
        substack:  { label: 'Saved from Substack',      dot: '#C6A24A' },
        screenshot:{ label: 'Saved from a screenshot',  dot: '#A89880' },
        photo:     { label: 'Saved by you',             dot: '#A89880' }
      };

      // Rack "Save"/"Add" pipeline (Build 1, amended 2026-07-22): a
      // Daily/Weekly/Travel rack piece already carries full metadata from
      // generation, so this writes wishlist_items directly rather than
      // reopening the manual capture modal (__wlOpenAdd) — same table, same
      // pipeline, no parallel one. Idempotent via a flag kept on the item
      // itself (mirrors how `packed`/`added`/`anchored` already persist
      // through each surface's patch-saved fn). opts.silent skips the toast
      // — Travel's `Add` writes here invisibly; its own trip-scoped
      // confirmation ("added to the pack") already fired.
      async function _wlSaveFromItem(it, opts) {
        opts = opts || {};
        if (it.wishlisted) {
          if (!opts.silent) _waShowToast('Saved to your wishlist.');
          return;
        }
        if (!_waUid()) return;
        try {
          const priceRaw = String(it.price_point || '').replace(/[^0-9.]/g, '');
          await _waFetch('POST', 'wishlist_items', {
            user_id: _waUid(),
            label: it.name,
            category: it.category === 'Swim' ? 'Swimwear' : (it.category || 'Other'),
            color: it.color || null,
            brand: it.brand || null,
            price: priceRaw ? Number(priceRaw) : null,
            image_url: null,
            source_type: 'robes',
            source_label: _WL_SRC.robes.label,
          });
          it.wishlisted = true;
          _wlLoad();
          if (!opts.silent) _waShowToast('Saved to your wishlist.');
        } catch (e) {
          console.warn('[robes] wishlist save failed:', e);
          if (!opts.silent) _waShowToast('Could not save it — try again');
        }
      }

      function _wlCard(w) {
        const src = _WL_SRC[w.source_type] || _WL_SRC.photo;
        const chipLabel = w.source_label || src.label;
        const img = w.image_url
          ? '<img src="' + _waEsc(w.image_url) + '" alt="' + _waEsc(w.label) + '" loading="lazy">'
          : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"><span style="font-family:var(--font-serif);font-size:30px;color:var(--cream-400)">' + _waEsc((w.label || '?').charAt(0).toUpperCase()) + '</span></div>';
        const meta = [w.brand, w.price > 0 ? '€' + Math.round(w.price) : null].filter(Boolean).join(' \xb7 ');
        return '<div class="rb-wl-item">' +
          '<div class="rb-wl-tile' + (w.source_type === 'robes' ? ' rb-wl-robes' : '') + '">' + img +
            '<span class="rb-wl-chip' + (src.sage ? ' sage' : '') + '">' +
              (src.sage ? '' : '<span class="rb-wl-dot" style="background:' + (src.dot || '#A89880') + '"></span>') +
              '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + _waEsc(chipLabel) + '</span></span>' +
          '</div>' +
          '<div class="wg-info"><div class="wg-name">' + _waEsc(w.label) + '</div>' +
          (meta ? '<div class="wg-metar">' + _waEsc(meta) + '</div>' : '') +
          (w.note ? '<div class="rb-wl-note">' + _waEsc(w.note) + '</div>' : '') +
          '<div class="rb-wl-actions">' +
            '<button class="rb-wl-buy" onclick="window.__wlBought(\'' + _waEsc(String(w.id)) + '\')">I bought this</button>' +
            '<button class="rb-wl-rm" title="Remove" onclick="window.__wlRemove(\'' + _waEsc(String(w.id)) + '\')">✕</button>' +
          '</div></div></div>';
      }

      function _wlRender() {
        const grid = document.getElementById('rb-wl-grid');
        if (!grid) return;
        if (!_wlItems.length) {
          // Editorial empty state — the one place the delight register lives
          grid.innerHTML = '<div class="rb-wl-empty" style="grid-column:1/-1">' +
            '<div style="font-size:9px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:14px">The Wishlist</div>' +
            '<div style="font-family:var(--font-serif);font-weight:300;font-size:clamp(26px,4vw,36px);line-height:1.15;color:var(--ink);margin-bottom:6px">Save what catches your eye.</div>' +
            '<div style="font-family:var(--font-serif);font-style:italic;font-weight:300;font-size:clamp(18px,3vw,24px);line-height:1.3;color:var(--ink-faint);margin-bottom:22px">Robes will tell you if it earns a place<br>next to what you already own.</div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:9px;justify-content:center">' +
              '<button class="rb-wg-cta" onclick="window.__wlOpenAdd()">Save a piece</button>' +
              '<button onclick="window.__wlSoonLink()" style="display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border:0.5px solid var(--rule-mid);border-radius:100px;background:#fff;color:var(--ink-soft);font-size:11.5px;cursor:pointer;font-family:inherit">Paste a link <span class="rb-soon-tag">Coming soon</span></button>' +
            '</div>' +
            '<div style="margin-top:12px;font-size:11px;color:var(--ink-faint)">A screenshot, a photo, an influencer sighting — Robes reads what it can.</div></div>';
          return;
        }
        grid.innerHTML = _wlItems.map(_wlCard).join('') +
          '<div class="rb-wl-item"><button class="rb-add-card" style="width:100%" onclick="window.__wlOpenAdd()">' +
            '<span class="rb-add-plus">+</span>' +
            '<span class="rb-add-serif">Save something</span>' +
            '<span class="rb-add-hint">Screenshot \xb7 Photo \xb7 Link</span></button></div>';
      }

      window.__wlSoonLink = function() {
        _waSoon('Paste a link', 'Drop a product link and Robes saves the piece — photo, brand and price included.');
      };

      window.__wlBought = async function(id) {
        const w = _wlItems.find(x => String(x.id) === String(id));
        if (!w) return;
        try {
          const payload = {
            user_id: _waUid(), label: w.label, category: w.category || 'Other',
            color: w.color || null, brand: w.brand || null, notes: w.note || null,
            image_url: w.image_url || null,
            item_dna: (w.item_dna && typeof w.item_dna === 'object' && Object.keys(w.item_dna).length) ? w.item_dna : undefined
          };
          const created = await _waFetch('POST', 'wardrobe_items', payload);
          await _waFetch('DELETE', 'wishlist_items?id=eq.' + id, undefined);
          _wlItems = _wlItems.filter(x => String(x.id) !== String(id));
          await _waLoad();
          _waShowToast(w.label + ' is in your wardrobe');
          // Same peak moment as a fresh add — offer the styling fork
          const row = (Array.isArray(created) && created[0]) || null;
          if (row && window.__rbAddFork) window.__rbAddFork(row);
        } catch (e) {
          console.error('wishlist bought:', e);
          _waShowToast('Could not move the piece — try again');
        }
      };

      window.__wlRemove = function(id) {
        window._rbConfirmDelete('Remove from your wishlist?', async function() {
          try {
            await _waFetch('DELETE', 'wishlist_items?id=eq.' + id, undefined);
            _wlItems = _wlItems.filter(x => String(x.id) !== String(id));
            _waV2Sync();
            _waShowToast('Removed from your wishlist');
          } catch (e) { _waShowToast('Could not remove it — try again'); }
        });
      };

      // Save-to-wishlist modal: screenshot/photo now; link + receipt later
      window.__wlOpenAdd = function() {
        document.getElementById('rb-wl-modal')?.remove();
        const serif = "'Cormorant',Georgia,serif";
        const modal = document.createElement('div');
        modal.id = 'rb-wl-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(32,32,33,0.45);display:flex;align-items:center;justify-content:center;padding:24px';
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
        const card = document.createElement('div');
        card.style.cssText = 'background:#FAF8F5;border-radius:20px;width:100%;max-width:440px;box-sizing:border-box;box-shadow:0 24px 60px -12px rgba(32,32,33,0.28);padding:26px;max-height:86vh;overflow-y:auto';
        modal.appendChild(card);
        document.body.appendChild(modal);
        let photo = '';

        function stepPick() {
          card.innerHTML = '<div style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:10px">The Wishlist</div>' +
            '<div style="font-family:' + serif + ';font-size:26px;font-weight:300;color:#202021;line-height:1.15;margin-bottom:6px">Save what catches your eye.</div>' +
            '<div style="font-size:12px;color:#6E6A64;margin-bottom:18px">A screenshot, a photo, a saved image — Robes reads what it can.</div>' +
            '<label id="rb-wl-zone" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;height:168px;border:1.5px dashed #C8B8A2;border-radius:var(--rad);background:#fff;cursor:pointer;text-align:center;padding:16px;box-sizing:border-box">' +
              '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#C8B8A2" stroke-width="1.4"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8M12 18v3"/></svg>' +
              '<span style="font-size:14px;color:#6A5E54">Screenshot or photo</span>' +
              '<span style="font-size:11.5px;color:var(--ink-faint)">From Instagram, Substack, or your camera roll</span>' +
              '<input id="rb-wl-file" type="file" accept="image/*" style="display:none"></label>' +
            '<button id="rb-wl-link" style="width:100%;margin-top:10px;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border:0.5px solid rgba(32,32,33,0.12);border-radius:var(--rad);background:#fff;color:var(--ink-faint);font-size:12px;cursor:pointer;font-family:inherit">Paste a link <span class="rb-soon-tag">Coming soon</span></button>' +
            '<button id="rb-wl-cancel" style="display:block;margin:12px auto 0;background:none;border:none;color:var(--ink-faint);font-size:11.5px;cursor:pointer;text-decoration:underline;font-family:inherit;padding:4px">Cancel</button>';
          card.querySelector('#rb-wl-file').addEventListener('change', function() {
            if (this.files && this.files[0]) {
              _rbDownscale(this.files[0]).then(stepRead).catch(function() { _waShowToast('Could not read that image'); });
            }
          });
          card.querySelector('#rb-wl-link').onclick = function() { modal.remove(); window.__wlSoonLink(); };
          card.querySelector('#rb-wl-cancel').onclick = function() { modal.remove(); };
        }

        function stepRead(dataUrl) {
          photo = dataUrl;
          card.innerHTML = '<div style="text-align:center;padding:34px 10px">' +
            '<div style="width:26px;height:26px;border:2px solid #E7E0CF;border-top-color:#202021;border-radius:100px;margin:0 auto 16px;animation:wa-spin 0.9s linear infinite"></div>' +
            '<div style="font-family:' + serif + ';font-style:italic;font-weight:300;font-size:19px;color:#202021">Reading the piece…</div>' +
            '<div style="font-size:12px;color:var(--ink-faint);margin-top:6px">Robes is looking at the image.</div></div>';
          const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (!m) { stepConfirm({}); return; }
          fetch('/api/wardrobe/analyse', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: m[2], mimeType: m[1], userId: _waUid() || undefined })
          }).then(r => r.ok ? r.json() : {}).catch(() => ({})).then(tag => stepConfirm(tag || {}));
        }

        function stepConfirm(tag) {
          let src = 'screenshot';
          const srcDefs = [['screenshot', 'Screenshot'], ['instagram', 'Instagram'], ['substack', 'Substack'], ['photo', 'In person']];
          card.innerHTML = '<div style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:10px">The Wishlist</div>' +
            '<div style="font-family:' + serif + ';font-size:26px;font-weight:300;color:#202021;line-height:1.15;margin-bottom:16px">' + (tag.label ? 'Here’s what Robes <em style="font-style:italic;color:#9A7060">saw.</em>' : 'Name the piece.') + '</div>' +
            '<div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:14px">' +
              '<img id="rb-wl-thumb" style="width:74px;height:96px;object-fit:cover;border-radius:var(--rad-sm);flex-shrink:0" alt="">' +
              '<div style="flex:1;min-width:0">' +
                '<label style="font-size:10px;letter-spacing:0.1em;color:var(--ink-faint);display:block;margin-bottom:5px">PIECE</label>' +
                '<input id="rb-wl-label" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #D8CEBC;border-radius:var(--rad-sm);font-size:14px;font-family:inherit;background:#fff;color:#2A2520;margin-bottom:9px">' +
                '<label style="font-size:10px;letter-spacing:0.1em;color:var(--ink-faint);display:block;margin-bottom:5px">BRAND</label>' +
                '<input id="rb-wl-brand" placeholder="Unknown" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #D8CEBC;border-radius:var(--rad-sm);font-size:14px;font-family:inherit;background:#fff;color:#2A2520">' +
              '</div></div>' +
            '<div style="display:flex;gap:10px;margin-bottom:14px">' +
              '<div style="flex:1"><label style="font-size:10px;letter-spacing:0.1em;color:var(--ink-faint);display:block;margin-bottom:5px">PRICE <span style="color:var(--ink-faint);letter-spacing:0;text-transform:none">optional</span></label>' +
              '<div style="position:relative"><span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--ink-faint);font-size:13px">€</span>' +
              '<input id="rb-wl-price" inputmode="decimal" placeholder="0" style="width:100%;box-sizing:border-box;padding:10px 12px 10px 26px;border:1px solid #D8CEBC;border-radius:var(--rad-sm);font-size:14px;font-family:inherit;background:#fff;color:#2A2520"></div></div></div>' +
            '<label style="font-size:10px;letter-spacing:0.1em;color:var(--ink-faint);display:block;margin-bottom:7px">WHERE DID YOU SPOT IT?</label>' +
            '<div id="rb-wl-src" style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:20px">' +
              srcDefs.map(d => '<button data-src="' + d[0] + '" style="padding:7px 13px;border-radius:100px;font-size:12px;cursor:pointer;font-family:inherit;transition:all .15s;border:1px solid ' + (d[0] === src ? '#2A2520;background:#2A2520;color:#F8F5F0' : '#D8CEBC;background:#fff;color:#6A5E54') + '">' + d[1] + '</button>').join('') + '</div>' +
            '<button id="rb-wl-save" style="width:100%;padding:14px;background:#2A2520;color:#F8F5F0;border:none;border-radius:var(--rad-sm);font-size:13px;letter-spacing:0.08em;cursor:pointer;font-family:inherit">SAVE TO WISHLIST →</button>';
          const thumb = card.querySelector('#rb-wl-thumb');
          if (thumb && photo) thumb.src = photo;
          const lblEl = card.querySelector('#rb-wl-label');
          lblEl.value = tag.label || '';
          card.querySelector('#rb-wl-brand').value = tag.brand || '';
          card.querySelector('#rb-wl-src').addEventListener('click', function(e) {
            const b = e.target.closest('button[data-src]');
            if (!b) return;
            src = b.dataset.src;
            this.querySelectorAll('button[data-src]').forEach(function(x) {
              const on = x.dataset.src === src;
              x.style.border = '1px solid ' + (on ? '#2A2520' : '#D8CEBC');
              x.style.background = on ? '#2A2520' : '#fff';
              x.style.color = on ? '#F8F5F0' : '#6A5E54';
            });
          });
          card.querySelector('#rb-wl-save').onclick = async function() {
            const label = lblEl.value.trim();
            if (!label) { lblEl.style.borderColor = '#B0533B'; lblEl.focus(); return; }
            this.disabled = true; this.style.opacity = '0.65'; this.textContent = 'Saving…';
            const btn = this;
            try {
              let url = null;
              const m = photo.match(/^data:([^;]+);base64,(.+)$/);
              if (m) {
                try {
                  const r = await fetch('/api/wardrobe/upload', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: m[2], mimeType: m[1] })
                  });
                  const j = await r.json();
                  if (j.url) url = j.url;
                } catch (upErr) { console.warn('wishlist photo upload failed:', upErr); }
              }
              const priceRaw = (card.querySelector('#rb-wl-price').value || '').replace(/[^0-9.]/g, '');
              await _waFetch('POST', 'wishlist_items', {
                user_id: _waUid(), label,
                category: tag.category || 'Other',
                color: tag.color || null,
                brand: (card.querySelector('#rb-wl-brand').value || '').trim() || null,
                price: priceRaw ? Number(priceRaw) : null,
                image_url: url,
                source_type: src,
                source_label: (_WL_SRC[src] || _WL_SRC.photo).label,
                item_dna: (tag.item_dna && typeof tag.item_dna === 'object') ? tag.item_dna : {}
              });
              _rbTrack('wishlist_added', { label: label || '', source: src || '' });
              modal.remove();
              await _wlLoad();
              if (_waView !== 'wishlist' && window.__waSetView) window.__waSetView('wishlist');
              _waShowToast('Saved to your wishlist');
            } catch (e) {
              console.error('wishlist save:', e);
              const missing = /relation|does not exist|PGRST205|schema cache/i.test(String(e && e.message || e));
              _waShowToast(missing ? 'Robes couldn’t save that just now — try again shortly' : 'Could not save — try again');
              btn.disabled = false; btn.style.opacity = '1'; btn.textContent = 'SAVE TO WISHLIST →';
            }
          };
        }
        stepPick();
      };

      // ── Add chooser — Photograph live; Link + Receipt sold as roadmap ──
      window.__waAddChooser = function() {
        if (_waView === 'wishlist') { window.__wlOpenAdd(); return; }
        document.getElementById('rb-add-chooser')?.remove();
        const serif = "'Cormorant',Georgia,serif";
        const modal = document.createElement('div');
        modal.id = 'rb-add-chooser';
        modal.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(32,32,33,0.45);display:flex;align-items:center;justify-content:center;padding:24px';
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
        function door(id, icon, label, hint, soon) {
          return '<button id="' + id + '" style="display:flex;align-items:center;gap:13px;width:100%;padding:13px 14px;border:0.5px solid rgba(32,32,33,0.12);border-radius:var(--rad);background:#fff;cursor:pointer;font-family:inherit;text-align:left;transition:all .15s' + (soon ? ';opacity:.62' : '') + '">' +
            '<span style="width:32px;height:32px;border-radius:9px;background:#F0EBE3;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#202021">' + icon + '</span>' +
            '<span style="flex:1;min-width:0"><span style="display:block;font-size:13px;font-weight:500;color:#202021">' + label +
            (soon ? ' <span class="rb-soon-tag">Coming soon</span>' : '') + '</span>' +
            '<span style="display:block;font-size:11px;color:var(--ink-faint);margin-top:1px">' + hint + '</span></span></button>';
        }
        modal.innerHTML = '<div style="background:#FAF8F5;border-radius:20px;width:100%;max-width:400px;box-sizing:border-box;box-shadow:0 24px 60px -12px rgba(32,32,33,0.28);padding:26px">' +
          '<div style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:8px">Add a piece</div>' +
          '<div style="font-family:' + serif + ';font-size:25px;font-weight:300;color:#202021;line-height:1.15;margin-bottom:18px">How would you like to add it?</div>' +
          '<div style="display:flex;flex-direction:column;gap:9px">' +
            door('rb-add-photo', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>', 'Photograph', 'Snap it or attach it — Robes reads the rest', false) +
            door('rb-add-link', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>', 'Paste a link', 'From any retailer page', true) +
            door('rb-add-receipt', '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg>', 'Import a receipt', 'Robes reads the line items', true) +
          '</div>' +
          '<button id="rb-add-close" style="display:block;margin:14px auto 0;background:none;border:none;color:var(--ink-faint);font-size:11.5px;cursor:pointer;text-decoration:underline;font-family:inherit;padding:4px">Cancel</button></div>';
        document.body.appendChild(modal);
        modal.querySelector('#rb-add-photo').onclick = function() {
          modal.remove();
          _waEditId = null; _waAfterAdd = null;
          if (window.WA && WA.open) WA.open();
        };
        modal.querySelector('#rb-add-link').onclick = function() {
          modal.remove();
          _waSoon('Paste a link', 'Drop a product link and Robes files the piece — photo, brand and price included.');
        };
        modal.querySelector('#rb-add-receipt').onclick = function() {
          modal.remove();
          _waSoon('Receipt import', 'Forward or photograph a receipt and Robes files every piece on it.');
        };
        modal.querySelector('#rb-add-close').onclick = function() { modal.remove(); };
      };

      // ── Progressive capture — "Add more detail" expander ──────────────
      // Shared by add step 3 and the edit modal. State lives on window so
      // WA.submit (outside the autotag closure) can read it; WA.close wipes it.
      window.__rbWaDetail = null;

      window.__rbWaDetailInject = function(it) {
        // Reset per piece (also per batch photo)
        window.__rbWaDetail = {
          open: false,
          when: (it ? [].concat(it.seasons || [], it.occasions || []) : []),
          price: it && it.price != null ? String(it.price) : '',
          fitConf: (it && it.fit_confidence) || '',
          sentiment: (it && it.sentiment) || '',
          hero: !!(it && it.hero_position != null),
          heroPos: it && it.hero_position != null ? it.hero_position : null,
          worn: (it && it.times_worn) || 0,
          addingTag: false
        };
        let host = document.getElementById('rb-wa-detail-host');
        if (!host) {
          // Edit modal path: create the host just above the CTA
          const cta = document.getElementById('wa-cta');
          if (!cta || !cta.parentNode) return;
          host = document.createElement('div');
          host.id = 'rb-wa-detail-host';
          cta.parentNode.insertBefore(host, cta);
        }
        _rbWaDetailPaint();
      };

      window.__rbWaDetTogWhen = function(val) {
        const d = window.__rbWaDetail; if (!d) return;
        const i = d.when.indexOf(val);
        if (i === -1) d.when.push(val); else d.when.splice(i, 1);
        _rbWaDetailPaint();
      };
      window.__rbWaDetFit = function(val) {
        const d = window.__rbWaDetail; if (!d) return;
        d.fitConf = d.fitConf === val ? '' : val;
        _rbWaDetailPaint();
      };
      window.__rbWaDetSent = function(val) {
        const d = window.__rbWaDetail; if (!d) return;
        d.sentiment = d.sentiment === val ? '' : val;
        _rbWaDetailPaint();
      };
      window.__rbWaDetHero = function() {
        const d = window.__rbWaDetail; if (!d) return;
        if (!d.hero && !(d.heroPos != null) && _waHeroAll().length >= _WA_HERO_CAP) {
          _waShowToast('The Hero Rack holds ' + _WA_HERO_CAP + ' — remove one first');
          return;
        }
        d.hero = !d.hero;
        _rbWaDetailPaint();
      };
      window.__rbWaDetOpen = function() {
        const d = window.__rbWaDetail; if (!d) return;
        d.open = true;
        _rbWaDetailPaint();
      };
      window.__rbWaDetPrice = function(el) {
        const d = window.__rbWaDetail; if (!d) return;
        d.price = (el.value || '').replace(/[^0-9.]/g, '');
        const cpw = document.getElementById('rb-wa-cpw');
        if (cpw) cpw.textContent = _rbWaCpwLabel(d);
      };
      window.__rbWaDetTagStart = function() {
        const d = window.__rbWaDetail; if (!d) return;
        d.addingTag = true;
        _rbWaDetailPaint();
        const inp = document.getElementById('rb-wa-tag-in');
        if (inp) inp.focus();
      };
      window.__rbWaDetTagKey = function(e, el) {
        const d = window.__rbWaDetail; if (!d) return;
        // Enter commits and repaints (removing the input) — the orphaned
        // input then fires blur, which must not repaint again mid-remove.
        if (!d.addingTag) return;
        if (e.type === 'blur' || e.key === 'Enter') {
          if (e.key === 'Enter') e.preventDefault();
          const v = (el.value || '').trim();
          if (v && d.when.indexOf(v) === -1) d.when.push(v);
          d.addingTag = false;
          _rbWaDetailPaint();
        } else if (e.key === 'Escape') {
          d.addingTag = false;
          _rbWaDetailPaint();
        }
      };

      function _rbWaCpwLabel(d) {
        const p = Number(d.price);
        if (p > 0 && d.worn > 0) return '€' + Math.round(p / d.worn) + ' per wear';
        if (p > 0) return 'worth tracking from first wear';
        return 'add a price to see cost-per-wear';
      }

      function _rbWaDetailPaint() {
        const host = document.getElementById('rb-wa-detail-host');
        const d = window.__rbWaDetail;
        if (!host || !d) return;
        const lbl = 'font-size:10px;letter-spacing:0.1em;color:var(--ink-faint);display:block;margin-bottom:8px;';
        if (!d.open) {
          const has = d.when.length + (d.price ? 1 : 0) + (d.fitConf ? 1 : 0) + (d.sentiment ? 1 : 0) + (d.hero ? 1 : 0);
          host.innerHTML = '<button onclick="window.__rbWaDetOpen()" style="width:100%;margin:2px 0 14px;border:1px solid #D8CEBC;border-radius:10px;background:#fff;padding:12px;font-size:12px;letter-spacing:0.03em;color:var(--ink-faint);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;transition:all .15s">' +
            '<span style="font-size:14px;line-height:1">+</span> Add more detail' +
            '<span style="font-size:10.5px;color:#C8B8A2">— season, cost-per-wear, fit' + (has ? ' \xb7 ' + has + ' set' : '') + '</span></button>';
          return;
        }
        const whenAll = WA_SEASONS.concat(WA_OCCASIONS).concat(d.when.filter(w => WA_SEASONS.indexOf(w) === -1 && WA_OCCASIONS.indexOf(w) === -1));
        const whenChips = whenAll.map(function(w) {
          const on = d.when.indexOf(w) !== -1;
          return '<button onclick="window.__rbWaDetTogWhen(\'' + _waEsc(w).replace(/'/g, '\\\'') + '\')" style="padding:6px 13px;border-radius:100px;font-size:12px;cursor:pointer;font-family:inherit;transition:all .15s;border:1px solid ' + (on ? '#2A2520;background:#2A2520;color:#F8F5F0' : '#D8CEBC;background:#fff;color:#6A5E54') + '">' + _waEsc(w) + '</button>';
        }).join('');
        const tagCtl = d.addingTag
          ? '<input id="rb-wa-tag-in" placeholder="Type &amp; press Enter" onkeydown="window.__rbWaDetTagKey(event,this)" onblur="window.__rbWaDetTagKey(event,this)" style="border:1px solid #2A2520;border-radius:100px;padding:6px 13px;font-size:12px;background:#fff;color:#2A2520;width:140px;font-family:inherit">'
          : '<button onclick="window.__rbWaDetTagStart()" style="padding:6px 13px;border:1px dashed #C8B8A2;background:none;border-radius:100px;font-size:12px;color:var(--ink-faint);cursor:pointer;font-family:inherit">+ tag</button>';
        const fitOpts = ['True to size', 'Runs small', 'Runs large'].map(function(f) {
          const on = d.fitConf === f;
          return '<button onclick="window.__rbWaDetFit(\'' + f + '\')" style="border:none;cursor:pointer;border-radius:100px;padding:7px 13px;font-size:11.5px;font-family:inherit;transition:all .15s;background:' + (on ? '#2A2520;color:#F8F5F0' : 'transparent;color:var(--ink-faint)') + '">' + f + '</button>';
        }).join('');
        const sentOpts = [['Irreplaceable', 'Robes will never suggest letting it go'], ['Would repurchase', 'Fine to replace if it wears out']].map(function(s) {
          const on = d.sentiment === s[0];
          return '<button onclick="window.__rbWaDetSent(\'' + s[0] + '\')" style="flex:1;min-width:140px;border:1px solid ' + (on ? '#2A2520' : '#D8CEBC') + ';background:' + (on ? '#F0EBE3' : '#fff') + ';color:#2A2520;border-radius:10px;padding:11px 12px;font-size:12.5px;cursor:pointer;font-family:inherit;text-align:left;line-height:1.3;transition:all .15s">' + s[0] +
            '<span style="display:block;font-size:10.5px;color:var(--ink-faint);margin-top:2px">' + s[1] + '</span></button>';
        }).join('');
        host.innerHTML = '<div style="margin:2px 0 14px;border:1px solid #D8CEBC;border-radius:var(--rad);background:#fff;padding:16px;display:flex;flex-direction:column;gap:16px">' +
          '<div><label style="' + lbl + '">WHEN DO YOU WEAR THIS</label><div style="display:flex;flex-wrap:wrap;gap:7px">' + whenChips + tagCtl + '</div></div>' +
          '<div><label style="' + lbl + '">PURCHASE PRICE <span style="letter-spacing:0;text-transform:none;color:var(--ink-faint)">private — powers cost-per-wear</span></label>' +
            '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
            '<div style="position:relative"><span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--ink-faint);font-size:13px">€</span>' +
            '<input value="' + _waEsc(d.price) + '" inputmode="decimal" placeholder="0" oninput="window.__rbWaDetPrice(this)" style="width:110px;box-sizing:border-box;padding:9px 12px 9px 26px;border:1px solid #D8CEBC;border-radius:var(--rad-sm);font-size:14px;font-family:inherit;background:#fff;color:#2A2520"></div>' +
            '<span id="rb-wa-cpw" style="font-family:var(--font-serif);font-style:italic;font-size:15px;color:#7E7C5A">' + _rbWaCpwLabel(d) + '</span></div></div>' +
          '<div><label style="' + lbl + '">FIT CONFIDENCE</label><div style="display:inline-flex;background:#F0EBE3;border:1px solid #E7E0CF;border-radius:100px;padding:3px;flex-wrap:wrap">' + fitOpts + '</div></div>' +
          '<div><label style="' + lbl + '">IF IT WERE LOST TOMORROW</label><div style="display:flex;gap:9px;flex-wrap:wrap">' + sentOpts + '</div></div>' +
          '<div onclick="window.__rbWaDetHero()" style="border:1px solid ' + (d.hero ? '#2A2520' : '#D8CEBC') + ';background:' + (d.hero ? '#F0EBE3' : '#fff') + ';border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all .15s">' +
            '<svg viewBox="0 0 24 24" width="17" height="17" fill="' + (d.hero ? '#2A2520' : 'none') + '" stroke="#2A2520" stroke-width="1.3"><path d="M12 3.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.9 6.75 19.7l1-5.85L3.5 9.65l5.9-.85z"/></svg>' +
            '<span style="flex:1"><span style="font-size:12.5px;font-weight:500;color:#2A2520">Feature in Hero Rack</span>' +
            '<span style="display:block;font-size:10.5px;color:var(--ink-faint);margin-top:1px">Pin it to the shelf you reach for first</span></span>' +
            '<span style="width:38px;height:22px;border-radius:100px;background:' + (d.hero ? '#2A2520' : '#D8CEBC') + ';position:relative;transition:all .2s;flex-shrink:0"><span style="position:absolute;top:2px;left:' + (d.hero ? '18px' : '2px') + ';width:18px;height:18px;border-radius:100px;background:#fff;transition:all .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span></span></div>' +
          '</div>';
      }

      // ── View switching + panel augmentation ───────────────────────────
      window.__waSetView = function(v) {
        _waView = v === 'wishlist' ? 'wishlist' : v === 'looks' ? 'looks' : 'all';
        // Clicking Looks always lands the tab's landing grid (Annie,
        // 2026-07-30: no sub-sub-nav — the tab is the way back from a
        // detail or the composer). __lkOpen/__lkNew route through here
        // FIRST, then set their own view.
        if (_waView === 'looks') { _lkView = 'grid'; _lkActive = null; }
        _waV2Sync();
        if (window.rbSetCrumb) {
          if (_waView === 'all') {
            rbSetCrumb([{ label: 'Wardrobe' }]);
          } else {
            rbSetCrumb([
              { label: 'Wardrobe', action: function() { window.__waSetView && window.__waSetView('all'); } },
              { label: _waView === 'wishlist' ? 'Wishlist' : 'Looks' }
            ]);
          }
        }
        if (window._rbNav) _rbNav(_waView === 'wishlist' ? '/wishlist' : _waView === 'looks' ? '/looks' : '/wardrobe');
      };

      function _waV2Sync() {
        const panel = document.querySelector('.wardrobe-panel');
        if (!panel || !document.getElementById('rb-wsub')) return;
        const wish = _waView === 'wishlist';
        const looks = _waView === 'looks';
        // Build the Looks surface BEFORE the visibility pass below reads it —
        // on the first switch the wrap doesn't exist yet, and a display it
        // never received leaves the tab blank behind its own CSS default.
        if (looks) _lkEnsureDom();
        const title = panel.querySelector('.wg-title');
        const sub = panel.querySelector('.wg-sub');
        // Looks is a tab INSIDE the wardrobe, not a destination (brief A1) —
        // the header keeps saying Wardrobe.
        if (title) title.textContent = wish ? 'Your wishlist' : 'Your wardrobe';
        if (sub) sub.textContent = wish
          ? 'Pieces you don’t own yet — Robes weighs each against what’s already yours.'
          : 'Everything Robes styles from.';
        const count = document.getElementById('wg-count');
        if (count) {
          count.textContent = wish
            ? _wlItems.length + ' saved'
            : looks
              ? _lkLooks.length + ' look' + (_lkLooks.length === 1 ? '' : 's')
              : _waItems.length + ' piece' + (_waItems.length === 1 ? '' : 's');
        }
        const cta = document.getElementById('rb-wg-cta-head');
        if (cta) cta.style.display = wish ? '' : 'none'; // wishlist-only add path
        const filters = document.getElementById('wg-filters');
        if (filters) filters.style.display = wish || looks ? 'none' : '';
        const grid = document.getElementById('wg-grid');
        if (grid) grid.style.display = wish || looks ? 'none' : '';
        const wlGrid = document.getElementById('rb-wl-grid');
        if (wlGrid) wlGrid.style.display = wish ? 'grid' : 'none';
        const lkWrap = document.getElementById('rb-lk-wrap');
        if (lkWrap) lkWrap.style.display = looks ? 'block' : 'none';
        const tabs = document.getElementById('rb-wsub');
        if (tabs) {
          tabs.querySelectorAll('button').forEach(function(b) {
            b.classList.toggle('active', b.dataset.view === _waView);
          });
          const wlTab = tabs.querySelector('[data-view="wishlist"]');
          if (wlTab) wlTab.textContent = 'Wishlist' + (_wlItems.length ? ' (' + _wlItems.length + ')' : '');
          const lkTab = tabs.querySelector('[data-view="looks"]');
          if (lkTab) lkTab.textContent = 'Looks' + (_lkLooks.length ? ' (' + _lkLooks.length + ')' : '');
        }
        _waRefineRender();
        if (wish) _wlRender();
        if (looks) _lkPaint();
      }

      // One-time DOM augmentation of the static wardrobe panel
      (function _waV2Setup() {
        const panel = document.querySelector('.wardrobe-panel');
        if (!panel) { setTimeout(_waV2Setup, 400); return; }
        if (document.getElementById('rb-wsub')) return;

        // Styles — injected like the tracker/scan style tags
        if (!document.getElementById('rb-wa2-style')) {
          const st = document.createElement('style');
          st.id = 'rb-wa2-style';
          st.textContent = [
            // sub-tabs
            '.rb-wsub{display:flex;gap:20px;margin-bottom:20px;border-bottom:0.5px solid var(--rule-mid)}',
            '.rb-wsub button{background:none;border:none;padding:2px 1px 10px;margin-bottom:-1px;font-size:13px;font-family:inherit;color:var(--ink-faint);cursor:pointer;border-bottom:1.5px solid transparent;letter-spacing:.02em;transition:color .15s}',
            '.rb-wsub button.active{color:var(--ink);font-weight:500;border-bottom-color:var(--ink)}',
            '.rb-wsub button:hover{color:var(--ink)}',
            // header CTA (shared pill button)
            '.rb-wg-cta{padding:10px 18px;border:none;border-radius:100px;background:var(--ink);color:#fff;font-size:11px;font-weight:500;letter-spacing:.07em;text-transform:uppercase;cursor:pointer;font-family:inherit;white-space:nowrap;transition:opacity .15s}',
            '.rb-wg-cta:hover{opacity:.85}',
            '.rb-wg-actions{display:flex;align-items:center;gap:12px;flex-shrink:0}',
            // star button (grid cards — heroes lead the grid, no separate rail)
            '.rb-star{position:absolute;top:8px;right:8px;width:29px;height:29px;border-radius:100px;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;background:rgba(255,255,255,.86);backdrop-filter:blur(4px);transition:all .15s;z-index:2;padding:0;opacity:0}',
            '.rb-star svg{width:14px;height:14px;display:block}',
            '.rb-star.on{background:var(--ink);opacity:1}',
            '.wg-item:hover .rb-star{opacity:1}',
            '@media(hover:none){.rb-star{opacity:1}}',
            // refine
            '#rb-refine{border:0.5px solid var(--rule-mid);border-radius:var(--rad);background:#fff;padding:18px 20px;margin:-12px 0 24px}',
            '.rb-ref-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:20px 28px}',
            '.rb-ref-lbl{font-size:9.5px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:10px}',
            '.rb-ref-chips{display:flex;flex-wrap:wrap;gap:7px;align-items:center}',
            '.rb-ref-chip{padding:6px 13px;border:0.5px solid var(--rule-mid);background:#fff;border-radius:100px;font-size:11.5px;color:var(--ink-soft);cursor:pointer;font-family:inherit;transition:all .15s}',
            '.rb-ref-chip.on{background:var(--ink);color:#fff;border-color:var(--ink)}',
            '.rb-sw{width:26px;height:26px;border-radius:100px;border:none;cursor:pointer;position:relative;box-shadow:inset 0 1px 3px rgba(0,0,0,.15),0 0 0 1px rgba(0,0,0,.07);padding:0;flex-shrink:0}',
            '.rb-sw.on{outline:2px solid var(--ink);outline-offset:2px}',
            '.rb-ref-segwrap{display:inline-flex;background:var(--cream-100);border:0.5px solid var(--rule-mid);border-radius:100px;padding:3px}',
            '.rb-ref-seg{border:none;cursor:pointer;border-radius:100px;padding:6px 13px;font-size:11px;font-family:inherit;background:transparent;color:var(--ink-faint);transition:all .15s}',
            '.rb-ref-seg.on{background:var(--ink);color:#fff}',
            '.rb-ref-select{width:100%;max-width:210px;border:0.5px solid var(--rule-mid);border-radius:var(--rad-sm);padding:9px 12px;font-size:12.5px;background:#fff;color:var(--ink);font-family:inherit;cursor:pointer}',
            '.rb-ref-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:0.5px solid var(--rule);margin-top:16px;padding-top:14px}',
            '.rb-refine-badge{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;border-radius:100px;background:#fff;color:var(--ink);font-size:9.5px;padding:0 4px;margin-left:2px;vertical-align:1px}',
            // Refine is outline (add rework 2026-07 — Add is the primary ink
            // action); it still goes dark via .wg-pill.active when the drawer
            // is open or filters are applied
            '.wg-pill.rb-refine-pill{display:inline-flex;align-items:center;gap:7px}',
            '.wg-pill.rb-add-pill{display:inline-flex;align-items:center;gap:7px;background:var(--ink);color:#fff;border-color:var(--ink)}',
            '.wg-pill.rb-add-pill:hover{opacity:.85}',
            // Mobile FAB — shown only while the wardrobe panel is open (.on,
            // toggled by a .visible observer) and only under 640px
            '#rb-wa-fab{display:none;position:fixed;right:18px;bottom:96px;width:52px;height:52px;border-radius:100px;background:var(--ink);border:none;cursor:pointer;z-index:47;align-items:center;justify-content:center;box-shadow:0 10px 26px rgba(32,32,33,.28);padding:0}',
            '.rb-sw-wheel{background:conic-gradient(from 90deg,#ff2d2d,#ff9e2d,#f4e02d,#38d64a,#2db7ff,#3a4dff,#b23aff,#ff2da8,#ff2d2d);display:inline-block;position:relative;overflow:hidden}',
            '.rb-sw-wheel input{position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;border:none;padding:0}',
            // Category text tabs (replaced the heavy pill row — design handoff)
            '.wg-filters{align-items:center}',
            '.wg-tab{background:none;border:none;border-bottom:1.5px solid transparent;padding:4px 2px 8px;margin-right:13px;font-size:13px;font-family:inherit;color:var(--ink-faint);cursor:pointer;letter-spacing:.01em;transition:color .15s;white-space:nowrap}',
            '.wg-tab.active{color:var(--ink);font-weight:500;border-bottom-color:var(--ink)}',
            '.wg-tab:hover{color:var(--ink)}',
            // wishlist
            '#rb-wl-grid{display:none;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:18px}',
            '.rb-wl-tile{position:relative;aspect-ratio:3/4;border-radius:var(--rad);overflow:hidden;border:1.5px dashed var(--cream-400);background:var(--cream-100);box-sizing:border-box}',
            '.rb-wl-tile.rb-wl-robes{border-color:var(--sage)}',
            '.rb-wl-tile img{width:100%;height:100%;object-fit:cover;display:block}',
            '.rb-wl-chip{position:absolute;top:8px;left:8px;display:inline-flex;align-items:center;gap:6px;background:rgba(250,248,245,.92);color:var(--ink);font-size:9.5px;letter-spacing:.03em;padding:4px 9px;border-radius:100px;backdrop-filter:blur(4px);max-width:calc(100% - 16px)}',
            '.rb-wl-chip.sage{background:var(--sage);color:#fff}',
            '.rb-wl-dot{width:5px;height:5px;border-radius:100px;flex:0 0 auto}',
            '.rb-wl-note{margin-top:8px;background:var(--sage-bg);border-left:2px solid var(--sage);border-radius:0 6px 6px 0;padding:8px 10px;font-size:10.5px;line-height:1.5;color:var(--ink-soft)}',
            '.rb-wl-actions{display:flex;gap:7px;margin-top:10px}',
            '.rb-wl-buy{flex:1;padding:9px 6px;border:none;border-radius:100px;background:var(--ink);color:#fff;font-size:10px;font-weight:500;letter-spacing:.07em;text-transform:uppercase;cursor:pointer;font-family:inherit;transition:opacity .15s}',
            '.rb-wl-buy:hover{opacity:.85}',
            '.rb-wl-rm{padding:9px 12px;border:0.5px solid var(--rule-mid);border-radius:100px;background:#fff;color:var(--ink-faint);font-size:10.5px;cursor:pointer;font-family:inherit;transition:all .15s}',
            '.rb-wl-rm:hover{color:#b03030;border-color:#b03030}',
            '.rb-wl-empty{border:1.5px dashed var(--cream-400);border-radius:var(--rad-lg);background:var(--rose-bg);padding:clamp(30px,6vw,56px) 24px;text-align:center}',
            '.rb-soon-tag{font-size:9px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;background:var(--cream-200);color:var(--ink-soft);border-radius:100px;padding:3px 8px;vertical-align:1px}',
            // amplified add-entry card
            '.rb-add-card{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;aspect-ratio:3/4;border-radius:var(--rad);border:1.5px dashed var(--rule-mid);background:var(--cream-100);cursor:pointer;transition:all .15s;text-align:center;padding:14px;box-sizing:border-box;font-family:inherit}',
            '.rb-add-card:hover{border-color:var(--ink-faint);background:var(--cream-200)}',
            '.rb-add-plus{width:40px;height:40px;border-radius:100px;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-size:21px;font-weight:300;line-height:1}',
            '.rb-add-serif{font-family:var(--font-serif);font-weight:300;font-size:19px;color:var(--ink)}',
            '.rb-add-hint{font-size:10px;letter-spacing:.05em;color:var(--ink-faint)}',
            // decorative ghost tiles behind the add card at zero pieces
            '.rb-ghost-card{aspect-ratio:3/4;border-radius:var(--rad);border:1px dashed var(--rule);pointer-events:none}',
            // mobile
            '@media(max-width:767px){#wg-packbar{bottom:96px !important}.rb-wg-cta{padding:9px 14px;font-size:10px}.rb-wsub{gap:16px}#rb-wl-grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}.wg-filters .wg-tab{flex-shrink:0;margin-right:9px}#rb-add-pill{display:none}#rb-wa-fab.on{display:flex}}'
          ].join('\n');
          document.head.appendChild(st);
        }

        const header = panel.querySelector('.wg-header');
        const sub = panel.querySelector('.wg-sub');
        const filters = document.getElementById('wg-filters');
        const grid = document.getElementById('wg-grid');
        if (!header || !filters || !grid) return;

        // Sub-tabs BELOW the title (mock order: YOUR WARDROBE leads, then
        // All pieces / Wishlist) — Wishlist nests UNDER Wardrobe
        const tabs = document.createElement('div');
        tabs.id = 'rb-wsub';
        tabs.className = 'rb-wsub';
        // Pieces | Looks | Wishlist — the vocabulary is already in the product
        // ("10 pieces · 7 looks" in the Travel Edit), so this needs no new
        // language and no nav change (brief A1).
        tabs.innerHTML = '<button data-view="all" class="active">All pieces</button>' +
          '<button data-view="looks">Looks</button>' +
          '<button data-view="wishlist">Wishlist</button>';
        tabs.addEventListener('click', function(e) {
          const b = e.target.closest('button[data-view]');
          if (b) window.__waSetView(b.dataset.view);
        });
        header.parentNode.insertBefore(tabs, header.nextSibling);

        // Header carries only the count now (add rework, nav architecture
        // 2026-07: adding moved to the toolbar + mobile FAB). The old
        // header CTA survives ONLY for the wishlist view — its toolbar is
        // hidden there, so this stays the wishlist's add path.
        const actions = document.createElement('div');
        actions.className = 'rb-wg-actions';
        const cta = document.createElement('button');
        cta.id = 'rb-wg-cta-head';
        cta.className = 'rb-wg-cta';
        cta.textContent = '+ Save a piece';
        cta.style.display = 'none';
        cta.addEventListener('click', function() { window.__wlOpenAdd(); });
        actions.appendChild(cta);
        const countEl = document.getElementById('wg-count');
        if (countEl) actions.appendChild(countEl); // move, keep id
        header.appendChild(actions);

        // Mobile FAB — a thumb-reachable + riding above the dock, always
        // one tap away regardless of scroll depth (view-aware: files into
        // the wardrobe or the wishlist depending on the open sub-tab)
        if (!document.getElementById('rb-wa-fab')) {
          const fab = document.createElement('button');
          fab.id = 'rb-wa-fab';
          fab.title = 'Add a piece';
          fab.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#FAF8F5" stroke-width="1.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
          fab.addEventListener('click', function() {
            if (_waView === 'wishlist') window.__wlOpenAdd();
            else window.__waAddChooser();
          });
          document.body.appendChild(fab);
          const _fabSync = function() { fab.classList.toggle('on', panel.classList.contains('visible')); };
          new MutationObserver(_fabSync).observe(panel, { attributes: true, attributeFilter: ['class'] });
          _fabSync();
        }

        // Refine drawer host (hidden until toggled)
        const refine = document.createElement('div');
        refine.id = 'rb-refine';
        refine.style.display = 'none';
        filters.parentNode.insertBefore(refine, filters.nextSibling);

        // Wishlist grid after the owned grid
        const wl = document.createElement('div');
        wl.id = 'rb-wl-grid';
        grid.parentNode.insertBefore(wl, grid.nextSibling);
      })();

      _waObserveGrid();

      // Zero out the bundle's mock counts (nav badge "10", tracker "10 / 15")
      // immediately — a new user must never see test data while the real
      // wardrobe loads. _waLoad() re-syncs with real numbers when it lands.
      _waSyncCounts();

      // Poll until Supabase session is ready, then load real wardrobe data.
      // The Looks catalogue rides the same gate — it resolves piece photos out
      // of _waItems, so it must never load first.
      (function _waInit() {
        if (_waUid()) { _waLoad().then(function() { if (typeof _lkLoad === 'function') _lkLoad(); }); }
        else { setTimeout(_waInit, 250); }
      })();

      // Intercept App.showWardrobe and filterWardrobe so Supabase data
      // is used instead of the bundle's in-memory mock W store.
      // App is defined in the bundle scripts so we patch after they run.
      const _origShowWardrobe = window.App && App.showWardrobe && App.showWardrobe.bind(App);
      if (window.App) {
        // Neutralise bundle methods that call the private renderWardrobe with mock data
        App.addPiece = function() {};
        App.filterWardrobe = function(f) {
          _waCat = f;
          document.querySelectorAll('#wg-filters .wg-tab').forEach(p =>
            p.classList.toggle('active', p.textContent === f));
          _waRender();
        };

        App.showWardrobe = function() {
          // The result surfaces (kp/dl/tv pages, moodboard, lookbook) are
          // fixed overlays ABOVE the in-flow wardrobe panel — opened from one
          // of them, the panel used to render invisibly underneath (beta bug:
          // the nav animated but no content appeared). Drop them first.
          if (window.__rbCloseResultOverlays) window.__rbCloseResultOverlays();
          if (_origShowWardrobe) _origShowWardrobe(); // showView + closeAvatarMenu (also calls private renderWardrobe)
          // Immediately overwrite what renderWardrobe just wrote with real data.
          // This runs synchronously before the browser paints, so mock items never show.
          _waBuildFilters();
          _waRender();
          _waLoad(); // async refresh from Supabase — crumb set by MutationObserver on .wardrobe-panel.visible
        };
      }

      // Deep links: /wardrobe, /lookbook and /moodboards serve the dashboard
      // and auto-open the matching page
      if (window.location.pathname === '/wardrobe' && window.App && App.showWardrobe) {
        setTimeout(() => App.showWardrobe(), 100);
      }
      if (window.location.pathname === '/looks' && window.App && App.showWardrobe) {
        // Looks nests under the wardrobe panel — open it, then switch view
        // (after the visibility observer has set the base Wardrobe crumb)
        setTimeout(() => {
          App.showWardrobe();
          setTimeout(() => window.__waSetView && window.__waSetView('looks'), 150);
        }, 100);
      }
      if (window.location.pathname === '/wishlist' && window.App && App.showWardrobe) {
        // Wishlist nests under the wardrobe panel — open it, then switch view
        // (after the visibility observer has set the base Wardrobe crumb)
        setTimeout(() => {
          App.showWardrobe();
          setTimeout(() => window.__waSetView && window.__waSetView('wishlist'), 150);
        }, 100);
      }
      if (window.location.pathname === '/lookbook') {
        setTimeout(() => window.__snOpen && window.__snOpen(), 400);
      }
      if (window.location.pathname === '/moodboards' && !_RB_MB_HIDDEN) {
        setTimeout(() => window._mbShowAllPage && window._mbShowAllPage(), 400);
      }
      if (window.location.pathname.indexOf('/moodboard/') === 0 && !_RB_MB_HIDDEN) {
        // The board may only exist in the cloud copy — retry until the
        // lookbook pull lands (or give up quietly)
        const _mbDeepSlug = window.location.pathname.slice('/moodboard/'.length);
        let _mbDeepTries = 0;
        const _mbDeepT = setInterval(() => {
          const item = window._mbFindBySlug && window._mbFindBySlug(_mbDeepSlug);
          if (item && window.__mbOpenSaved) { clearInterval(_mbDeepT); window.__mbOpenSaved(item.id); }
          else if (++_mbDeepTries > 20) clearInterval(_mbDeepT);
        }, 500);
      }

      // ── Style Notes ─────────────────────────────────────────────────
      // localStorage keys are namespaced per user — a shared browser must
      // never leak one account's lookbook/moodboards into another. Legacy
      // global keys are removed so old test data can't resurface.
      // Uid must be read lazily on EVERY call (session loads async) — a
      // captured-once uid fell back to 'anon', writing every save into a
      // shared robes_style_notes__anon key that then surfaced as phantom
      // looks on any other account using the same browser.
      try {
        localStorage.removeItem('robes_style_notes'); localStorage.removeItem('robes_moodboards');
        localStorage.removeItem('robes_style_notes__anon'); localStorage.removeItem('robes_moodboards__anon');
      } catch (e) {}
      function SN_KEY() { const u = _waUid(); return u ? 'robes_style_notes__' + u : null; }

      function snLoad() {
        const k = SN_KEY(); if (!k) return [];
        try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; }
      }
      function snSave(items) {
        const k = SN_KEY(); if (!k) return;
        try {
          localStorage.setItem(k, JSON.stringify(items));
        } catch (e) {
          // Storage full — drop oldest items until it fits
          if (items.length > 1) snSave(items.slice(0, items.length - 1));
        }
      }
      // ── Cloud persistence (lookbook_items table) ─────────────────────
      // localStorage stays as the instant cache; Supabase is the durable
      // copy so looks + moodboards survive devices, reloads and storage
      // clears. If the migration hasn't run yet every call fails silently
      // and the app behaves exactly as before (local-only).
      function _lbRowToItem(r) {
        return { id: Number(r.id), type: r.type || 'key-piece', title: r.title || '', subtitle: r.subtitle || '', img: r.img || null, saved_at: r.created_at, ...(r.share_id ? { share_id: r.share_id, is_public: !!r.is_public } : {}), ...(r.data && typeof r.data === 'object' ? r.data : {}) };
      }
      function _lbItemToRow(item) {
        // share_id/is_public are real columns (share_migration.sql) — keep
        // them out of the data jsonb and carry them on pushes so a re-sync
        // never breaks a published /board/ link.
        const { id, type, title, subtitle, img, saved_at, share_id, is_public, ...data } = item;
        return { id, user_id: _waUid(), type: type || 'key-piece', title: title || '', subtitle: subtitle || '', img: img || null, ...(share_id ? { share_id, is_public: !!is_public } : {}), data };
      }
      function _lbCloudPush(item) {
        if (!_waUid()) return;
        _waFetch('POST', 'lookbook_items', _lbItemToRow(item))
          .catch(e => console.warn('[robes] lookbook cloud push failed:', String(e.message || e).slice(0, 120)));
      }
      function _lbCloudPatch(item) {
        if (!_waUid()) return;
        const row = _lbItemToRow(item);
        delete row.id; delete row.user_id;
        _waFetch('PATCH', 'lookbook_items?id=eq.' + item.id + '&user_id=eq.' + _waUid(), row)
          .catch(e => console.warn('[robes] lookbook cloud patch failed:', String(e.message || e).slice(0, 120)));
      }
      function _lbCloudDelete(id) {
        if (!_waUid()) return;
        _waFetch('DELETE', 'lookbook_items?id=eq.' + id + '&user_id=eq.' + _waUid())
          .catch(() => {});
        // No FK cascade exists (lookbook PK is (user_id,id), source_id is
        // plain text) — orphaned index rows paint ghost days on the rail.
        _pdDeleteSource(String(id));
      }
      async function _lbCloudPull() {
        // Wait for the session-dependent helpers (same lazy pattern as _waInit)
        let tries = 0;
        while (!_waUid() && tries++ < 40) await new Promise(r => setTimeout(r, 250));
        if (!_waUid()) return;
        try {
          const rows = await _waFetch('GET', 'lookbook_items?user_id=eq.' + _waUid() + '&order=created_at.desc&limit=100&select=*');
          if (!Array.isArray(rows)) return;
          const cloudSn = [], cloudMb = [];
          rows.forEach(r => (r.type === 'moodboard' ? cloudMb : cloudSn).push(_lbRowToItem(r)));
          // Local-only entries (saved offline / pre-migration) sync up
          snLoad().forEach(i => { if (!cloudSn.find(c => c.id === i.id)) { cloudSn.push(i); _lbCloudPush(i); } });
          _mbLoad().forEach(i => { if (!cloudMb.find(c => c.id === i.id)) { cloudMb.push(i); _lbCloudPush(i); } });
          cloudSn.sort((a, b) => b.id - a.id);
          cloudMb.sort((a, b) => b.id - a.id);
          snSave(cloudSn);
          _mbSave(cloudMb);
          snRefreshRow();
          snRenderPage();
          _mbRenderPage();
          console.log('[robes] lookbook cloud sync: ' + cloudSn.length + ' looks, ' + cloudMb.length + ' moodboards');
          // Rail cards name their parent plan from this cache — repaint now
          // that titles can resolve
          if (window._rbRailPaint) window._rbRailPaint();
        } catch (e) {
          console.warn('[robes] lookbook cloud pull skipped:', String(e.message || e).slice(0, 120));
        }
      }

      // ── planned_days index (migration 12) ────────────────────────────
      // The dated-day index over the lookbook blobs: one row per MOMENT
      // (a date holds a 'day' slot and optionally an 'evening'), keyed
      // (user_id, source_id, day_index, slot), upserted alongside every
      // blob write. The blob stays authoritative for rendering; these rows
      // exist so a rail card or month cell never parses a blob. Until the
      // migration runs every call warns once and no-ops (the app behaves
      // exactly as before) — the same degradation convention as wishlist.
      var _pdDown = false;      // table missing → stop trying this session
      var _pdWarned = false;
      var _pdTimers = {};       // per-source debounce so a flick-storm coalesces
      function _pdWarn(msg) {
        if (!_pdWarned) { console.warn('[robes] planned_days: ' + msg + ' — run supabase/planned_days_migration.sql'); _pdWarned = true; }
      }
      function _pdMissing(t) {
        return /planned_days/.test(t) && (/PGRST205|42P01|Could not find the table|does not exist/.test(t));
      }
      // A day is a local-calendar concept — always the LOCAL date, never
      // toISOString() (which is UTC and goes wrong at 23:00 in the US).
      function _pdLocalISO(d) {
        const x = d || new Date();
        return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
      }
      // Day arithmetic on ISO strings rides UTC internally so DST shifts
      // can never skip or double a calendar date.
      function _pdAddISO(iso, n) {
        const d = new Date(iso + 'T00:00:00Z');
        if (isNaN(d)) return null;
        d.setUTCDate(d.getUTCDate() + n);
        return d.toISOString().slice(0, 10);
      }
      function _pdHttp(u) { return (typeof u === 'string' && u.indexOf('http') === 0) ? u : null; }
      function _pdBase(sourceType, sourceId, dayIndex, dayDate, slot) {
        return {
          user_id: _waUid(), day_date: dayDate,
          source_type: sourceType, source_id: String(sourceId), day_index: dayIndex,
          slot: slot || 'day', environment: _RB_ENV,
          updated_at: new Date().toISOString(),
        };
      }
      // Frame for the thumb strip: truthful wardrobe photo first, then the
      // generated still — but never a still on a flicked piece (same rule
      // as _tvFrame/_dlAltered: an altered piece must not wear the
      // original's imagery).
      function _pdItemThumb(it, gen) {
        if (it && it.wardrobe_match && _pdHttp(it.wardrobe_match.image_url)) return it.wardrobe_match.image_url;
        try { if (typeof _dlAltered === 'function' && _dlAltered(it)) return null; } catch (_) {}
        if (it && Number.isInteger(it.image_index) && Array.isArray(gen)) return _pdHttp(gen[it.image_index]);
        return null;
      }
      function _pdThumbs(items, gen) {
        const out = [];
        for (const it of items || []) {
          const u = _pdItemThumb(it, gen);
          if (u && out.indexOf(u) === -1) out.push(u);
          if (out.length >= 3) break;
        }
        return out;
      }
      function _pdOwnedIds(items) {
        const out = [];
        (items || []).forEach(it => { if (it && it.wardrobe_match && it.wardrobe_match.id != null) out.push(it.wardrobe_match.id); });
        return out;
      }

      // Row builders — one per track. Each returns {rows, totalDays} or
      // null when the blob can't emit dated rows (old saves without ISO
      // dates: skipped here, covered by the backfill script).
      function _pdRowsWk(sourceId, w) {
        const iso = w && Array.isArray(w.week_iso) ? w.week_iso : null;
        if (!iso || !Array.isArray(w.days) || !w.days.length) return null;
        const rows = [];
        // Pinned = a fixed moment SHE placed (intake pin or a prompt-stated
        // day) — a generation constraint, not decoration. Evenings are the
        // intake's second moments: one 'evening' row each, her activity,
        // no look content until Phase 3 parity gives weekly per-slot looks.
        const pinnedSet = new Set(Array.isArray(w.pinned_days) ? w.pinned_days : []);
        w.days.forEach((d, i) => {
          if (!iso[i]) return;
          const rest = !!d.rest;
          rows.push({
            ..._pdBase('weekly', sourceId, i, iso[i], 'day'),
            pinned: pinnedSet.has(i),
            status: rest ? 'free' : (d.worn ? 'worn' : 'planned'),
            activity: rest ? null : (d.user_activity || d.occasion || null),
            headline: rest ? null : (d.note || d.occasion || null),
            thumb_urls: rest ? [] : _pdThumbs(d.items, w.generatedImages),
            item_ids: rest ? [] : _pdOwnedIds(d.items),
          });
        });
        (Array.isArray(w.evenings) ? w.evenings : []).forEach(ev => {
          const i = ev && ev.day_index;
          if (!Number.isInteger(i) || !iso[i] || !w.days[i] || w.days[i].rest) return;
          // A dressed evening (lazy per-slot look, Stage 5) enriches its row
          const el = w.days[i].evening_look;
          rows.push({
            ..._pdBase('weekly', sourceId, i, iso[i], 'evening'),
            pinned: !!ev.pinned,
            status: 'planned',
            activity: ev.activity || null,
            headline: el ? (el.note || el.occasion || null) : null,
            thumb_urls: el ? _pdThumbs(el.items, w.generatedImages) : [],
            item_ids: el ? _pdOwnedIds(el.items) : [],
          });
        });
        return rows.length ? { rows, totalDays: w.days.length } : null;
      }
      function _pdRowsTv(sourceId, t) {
        if (!t || !t.dateFrom) return null;
        const from = new Date(t.dateFrom + 'T00:00:00Z');
        if (isNaN(from)) return null;
        const rows = [];
        const days = Array.isArray(t.days) ? t.days : [];
        if (!days.length) {
          // Deferred trip — the trip must band on the calendar before any
          // outfits exist: one 'planned' row per date, no headline/thumbs.
          const n = _tvTripDays({ dateFrom: t.dateFrom, dateTo: t.dateTo }).n;
          const plan = Array.isArray(t.trip_day_plan) ? t.trip_day_plan : [];
          for (let i = 0; i < n; i++) {
            rows.push({
              ..._pdBase('travel', sourceId, i, _pdAddISO(t.dateFrom, i), 'day'),
              status: plan[i] === null ? 'free' : 'planned',
              activity: (typeof plan[i] === 'string' && plan[i]) ? plan[i] : null,
              headline: null, thumb_urls: [], item_ids: [],
            });
          }
          return { rows, totalDays: n };
        }
        days.forEach((d, i) => {
          const date = _pdAddISO(t.dateFrom, i);
          if (!date) return;
          const label = ((d.day_label || '').split('·')[1] || '').trim();
          if (d.rest || !Array.isArray(d.slots) || !d.slots.length) {
            rows.push({ ..._pdBase('travel', sourceId, i, date, 'day'), status: 'free', activity: d.user_activity || null, headline: null, thumb_urls: [], item_ids: [] });
            return;
          }
          d.slots.slice(0, 2).forEach((s, si) => {
            const slotName = (String(s.slot || '').toLowerCase() === 'evening' || si === 1) ? 'evening' : 'day';
            const pieces = (Array.isArray(s.formula) ? s.formula : [])
              .map(f => (t.capsule || [])[f.item_index]).filter(Boolean);
            rows.push({
              ..._pdBase('travel', sourceId, i, date, slotName),
              status: d.worn ? 'worn' : 'planned',
              activity: d.user_activity || label || null,
              headline: s.title || null,
              thumb_urls: _pdThumbs(pieces, t.generatedImages),
              item_ids: _pdOwnedIds(pieces),
            });
          });
        });
        return rows.length ? { rows, totalDays: days.length } : null;
      }
      function _pdRowsDl(sourceId, d) {
        if (!d || !d.anchor_date) return null; // pre-index saves: no date, no row
        const items = [];
        (d.steps || []).forEach(s => (s.items || []).forEach(it => items.push(it)));
        return {
          rows: [{
            ..._pdBase('daily', sourceId, 0, d.anchor_date, d.slot === 'evening' ? 'evening' : 'day'),
            status: d.worn ? 'worn' : 'planned',
            activity: d.occasion_label || (d.prompt ? String(d.prompt).slice(0, 120) : null),
            headline: d.headline || null,
            thumb_urls: _pdThumbs(items, d.generatedImages),
            item_ids: _pdOwnedIds(items),
          }],
          totalDays: 1,
        };
      }

      // The sync: upsert every emitted row, then sweep rows the blob no
      // longer produces — a shrunk range (day_index past the end) and
      // evenings that no longer exist. An evening that survives in the
      // index but not the blob paints a ghost moment on the rail — the
      // same bug class as orphaned rows on delete.
      function _pdWrite(built, sourceId) {
        const url = _SUPA_URL + '/rest/v1/planned_days';
        const headers = {
          'apikey': _SUPA_KEY, 'Authorization': 'Bearer ' + _waToken(),
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        };
        fetch(url + '?on_conflict=user_id,source_id,day_index,slot', { method: 'POST', headers, body: JSON.stringify(built.rows) })
          .then(r => {
            if (!r.ok) return r.text().then(t => { if (_pdMissing(t)) { _pdDown = true; _pdWarn('table missing'); } else console.warn('[robes] planned_days upsert failed:', r.status, String(t).slice(0, 160)); });
            const base = url + '?user_id=eq.' + _waUid() + '&source_id=eq.' + encodeURIComponent(String(sourceId));
            const del = q => fetch(base + q, { method: 'DELETE', headers }).catch(() => {});
            del('&day_index=gte.' + built.totalDays);
            const evIdx = built.rows.filter(x => x.slot === 'evening').map(x => x.day_index);
            del('&slot=eq.evening' + (evIdx.length ? '&day_index=not.in.(' + evIdx.join(',') + ')' : ''));
            // A fresh plan should show on the home rail when she returns
            if (window._rbRailPaint) setTimeout(window._rbRailPaint, 700);
          })
          .catch(() => {});
      }
      function _pdSync(sourceType, sourceId, blob) {
        try {
          if (_pdDown || !sourceId || !_waUid() || !_waToken()) return;
          clearTimeout(_pdTimers[sourceId]);
          _pdTimers[sourceId] = setTimeout(() => {
            try {
              const built = sourceType === 'weekly' ? _pdRowsWk(sourceId, blob)
                : sourceType === 'travel' ? _pdRowsTv(sourceId, blob)
                : sourceType === 'daily' ? _pdRowsDl(sourceId, blob) : null;
              if (built && built.rows.length) _pdWrite(built, sourceId);
            } catch (e) { console.warn('[robes] planned_days sync skipped:', String(e && e.message || e).slice(0, 120)); }
          }, 600);
        } catch (_) {}
      }
      // Convenience: re-sync a source from whatever the lookbook cache now
      // holds — the one call every patch path shares.
      function _pdSyncSaved(id) {
        if (!id) return;
        const it = snLoad().find(x => x.id === id);
        if (!it) return;
        if (it.type === 'weekly-plan' && it.wkData) _pdSync('weekly', id, it.wkData);
        else if (it.type === 'travel-edit' && it.tvData) _pdSync('travel', id, it.tvData);
        else if (it.type === 'daily-look' && it.dlData) _pdSync('daily', id, it.dlData);
      }
      function _pdDeleteSource(sourceId) {
        if (_pdDown || !_waUid() || sourceId == null) return;
        clearTimeout(_pdTimers[sourceId]);
        fetch(_SUPA_URL + '/rest/v1/planned_days?user_id=eq.' + _waUid() + '&source_id=eq.' + encodeURIComponent(String(sourceId)), {
          method: 'DELETE',
          headers: { 'apikey': _SUPA_KEY, 'Authorization': 'Bearer ' + _waToken(), 'Content-Type': 'application/json' },
        }).catch(() => {});
      }

      // ── planned_days read helpers (nothing consumes them until the rail
      // ships — built now so the design build lands on a proven contract).
      // Precedence is a READ-time question resolved per (date, slot):
      // explicit Daily > Travel > Weekly > auto-planned, ties to the most
      // recent updated_at. A trip's evening contends with a week's evening;
      // it never displaces the week's daytime.
      // 'look' outranks everything: pinning a specific saved look at a date is
      // the most deliberate statement she can make about that day (brief A3).
      // It only ever wins on the index-fed surfaces (rail, calendar) — the
      // weekly and travel artifacts derive their strips from their own blob.
      function _pdTier(t) { return t === 'look' ? 4 : t === 'daily' ? 3 : t === 'travel' ? 2 : t === 'weekly' ? 1 : 0; }
      function _pdWinner(rows) {
        return rows.slice().sort((a, b) =>
          (_pdTier(b.source_type) - _pdTier(a.source_type)) ||
          (new Date(b.updated_at || 0) - new Date(a.updated_at || 0)))[0] || null;
      }
      // Parent resolution rides the local lookbook cache (synced by
      // _lbCloudPull at boot) — never a second query per card.
      function _pdParent(sourceId) {
        const it = snLoad().find(x => String(x.id) === String(sourceId));
        return it ? { title: it.title || null, type: it.type || null } : { title: null, type: null };
      }
      function _pdCacheKey() { const u = _waUid(); return u ? 'robes_planned_days__' + u : null; }
      function _pdCacheRead() {
        const k = _pdCacheKey(); if (!k) return [];
        try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (_) { return []; }
      }
      function _pdCacheWrite(rows) {
        const k = _pdCacheKey(); if (!k) return;
        try { localStorage.setItem(k, JSON.stringify(rows.slice(0, 400))); } catch (_) {}
      }
      async function _pdFetch(fromISO, toISO) {
        const rows = await _waFetch('GET', 'planned_days?user_id=eq.' + _waUid()
          + '&day_date=gte.' + fromISO + '&day_date=lte.' + toISO
          + '&order=day_date.asc&select=*');
        return Array.isArray(rows) ? rows : [];
      }
      function _pdDateList(fromISO, toISO) {
        const out = [];
        let d = fromISO;
        for (let i = 0; i < 62 && d; i++) { out.push(d); if (d === toISO) break; d = _pdAddISO(d, 1); }
        return out;
      }
      // Same-type supersession for ONE date's rows: re-planning the same
      // dates COEXISTS in the table (decision: write-time exclusion loses
      // data) — but at read time a newer plan of the SAME type supersedes
      // an older one WHOLESALE for the date. Without this, a superseded
      // plan's evening row (no contender in the fresh plan, which left its
      // evening free) wins the evening slot and paints a ghost moment on
      // the rail that's empty on click-through. Cross-type complements (a
      // trip's evening beside a week's day) still resolve per slot.
      function _pdFreshest(here) {
        const latest = {};
        here.forEach(r => {
          const u = new Date(r.updated_at || 0).getTime();
          const c = latest[r.source_type];
          if (!c || u > c.u) latest[r.source_type] = { id: r.source_id, u };
        });
        return here.filter(r => String(latest[r.source_type].id) === String(r.source_id));
      }
      // SOURCE-level supersession (audit D-08, 2026-07-24): two weekly
      // plans or two trips whose date ranges OVERLAP are the same
      // real-world plan re-planned — only the freshest survives,
      // WHOLESALE. Per-date _pdFreshest can't drop a stale source's rows
      // on dates the fresh plan no longer covers (a trip shifted by two
      // days), which is how a ghost band paints beside its replacement on
      // the month grid and a stale day wins an uncontested rail slot.
      // Daily looks are exempt — a date's day + evening are two separate
      // saved siblings that coexist by design.
      function _pdSupersede(rows) {
        const src = {};
        rows.forEach(r => {
          const s = src[r.source_id] = src[r.source_id] || { type: r.source_type, min: r.day_date, max: r.day_date, u: 0 };
          if (r.day_date < s.min) s.min = r.day_date;
          if (r.day_date > s.max) s.max = r.day_date;
          const t = new Date(r.updated_at || 0).getTime();
          if (t > s.u) s.u = t;
        });
        const ids = Object.keys(src);
        const dead = {};
        ids.forEach(a => ids.forEach(b => {
          if (a === b) return;
          const A = src[a], B = src[b];
          if (A.type !== B.type || A.type === 'daily') return;
          if (A.min <= B.max && B.min <= A.max) {
            if (A.u < B.u || (A.u === B.u && String(a) < String(b))) dead[a] = true;
          }
        }));
        return Object.keys(dead).length ? rows.filter(r => !dead[r.source_id]) : rows;
      }
      function _pdSlots(rows, fromISO, toISO) {
        rows = _pdSupersede(rows);
        return _pdDateList(fromISO, toISO).map(date => {
          const here = _pdFreshest(rows.filter(r => r.day_date === date));
          const moments = [];
          ['day', 'evening'].forEach(slot => {
            const w = _pdWinner(here.filter(r => (r.slot || 'day') === slot));
            if (w) moments.push({ ...w, parent: _pdParent(w.source_id) });
          });
          return { date, moments };
        });
      }
      // The rail is DATE-driven: seven slots whether or not rows exist —
      // an unplanned Thursday is still a Thursday. Paints from the local
      // cache instantly (cb fires once with cached, again with fresh).
      function _pdRail(fromISO, toISO, cb) {
        const from = fromISO || _pdAddISO(_pdLocalISO(), -1);
        const to = toISO || _pdAddISO(from, 6);
        const cached = _pdCacheRead().filter(r => r.day_date >= from && r.day_date <= to);
        if (cb && cached.length) { try { cb(_pdSlots(cached, from, to), true); } catch (_) {} }
        const p = (_pdDown ? Promise.resolve(cached) : _pdFetch(from, to).then(rows => {
          const rest = _pdCacheRead().filter(r => r.day_date < from || r.day_date > to);
          _pdCacheWrite(rest.concat(rows));
          return rows;
        }).catch(e => {
          const t = String(e && e.message || e);
          if (_pdMissing(t)) { _pdDown = true; _pdWarn('table missing'); }
          else console.warn('[robes] planned_days rail read failed:', t.slice(0, 120));
          return cached;
        })).then(rows => _pdSlots(rows, from, to));
        if (cb) p.then(slots => { try { cb(slots, false); } catch (_) {} });
        return p;
      }
      // The month needs the LOSING rows too (band extents come from every
      // row of a source) — return all rows unresolved, grouped by source.
      function _pdMonth(fromISO, toISO) {
        return (_pdDown ? Promise.resolve([]) : _pdFetch(fromISO, toISO).catch(e => {
          const t = String(e && e.message || e);
          if (_pdMissing(t)) { _pdDown = true; _pdWarn('table missing'); }
          else console.warn('[robes] planned_days month read failed:', t.slice(0, 120));
          return [];
        })).then(rows => {
          const sources = {};
          rows.forEach(r => { if (!sources[r.source_id]) sources[r.source_id] = _pdParent(r.source_id); });
          return { rows, sources };
        });
      }
      window._pdRail = _pdRail;
      window._pdMonth = _pdMonth;
      window._pdLocalISO = _pdLocalISO;

      function snAdd(item) {
        const items = snLoad();
        const rec = { ...item, id: Date.now(), saved_at: new Date().toISOString() };
        items.unshift(rec);
        snSave(items);
        snRefreshRow();
        // Lookbook content now exists → let the moodboard row re-evaluate its
        // empty state (a styled key piece suppresses the "create your first"
        // card). Guarded: no-ops until #rb-mb is mounted.
        if (typeof _rbRenderMoodboards === 'function') _rbRenderMoodboards();
        _lbCloudPush(rec);
        return rec.id;
      }
      function snUpdate(id, patch) {
        const items = snLoad();
        const it = items.find(i => i.id === id);
        if (!it) return;
        Object.assign(it, patch);
        snSave(items);
        snRefreshRow();
        _lbCloudPatch(it);
      }
      function snRemove(id) {
        snSave(snLoad().filter(i => i.id !== id));
        snRefreshRow();
        snRenderPage();
        // Lookbook may now be empty → moodboard row re-evaluates whether the
        // first-run empty card should reappear.
        if (typeof _rbRenderMoodboards === 'function') _rbRenderMoodboards();
        _lbCloudDelete(id);
      }

      // ── Inject Style Notes page ──────────────────────────────────────
      const snPage = document.createElement('div');
      snPage.id = 'sn-page';
      // top:60px + z-index below the main nav (50) so weather / wardrobe
      // count / avatar stay visible and usable — the page must never
      // strip the global context (same pattern as the moodboard panel).
      snPage.style.cssText = 'display:none;position:fixed;left:0;right:0;bottom:0;top:var(--nav-h,64px);z-index:45;background:#FAF8F5;overflow-y:auto';
      snPage.innerHTML = `
        <div style="padding:32px var(--s6,24px) 24px;max-width:var(--shell,1440px);margin:0 auto;box-sizing:border-box">
          <div id="sn-headrow" style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin:0 0 16px">
            <p style="font-size:11px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--rose,#8E7077);margin:0">Lookbook</p>
          </div>
          <div id="sn-tabs" style="display:flex;gap:22px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;border-bottom:0.5px solid rgba(32,32,33,0.12);margin:0 0 24px"></div>
          <div id="sn-grid" style="display:grid;gap:20px"></div>
          <div id="sn-empty" style="display:none;padding:80px 0;text-align:center">
            <p id="sn-empty-t" style="font-family:'Cormorant',Georgia,serif;font-size:22px;font-weight:300;color:#202021;margin:0 0 10px">Nothing saved yet.</p>
            <p id="sn-empty-s" style="font-size:13px;color:var(--ink-faint);line-height:1.6">Style a key piece or save today's look<br>and it will appear here.</p>
          </div>
        </div>`;
      document.body.appendChild(snPage);

      // ── Lookbook type filters — one All row for the four result types
      // (same text-tab scan pattern as the wardrobe's category tabs)
      var _snFilter = 'all';
      const _SN_FILTERS = [
        ['all', 'All'], ['key-piece', 'Key pieces'], ['daily-look', 'Daily looks'],
        ['weekly-plan', 'Weekly plans'], ['travel-edit', 'Travel edits']
      ];
      if (!document.getElementById('rb-sn-style')) {
        const snSt = document.createElement('style');
        snSt.id = 'rb-sn-style';
        snSt.textContent = '#sn-tabs::-webkit-scrollbar{display:none}' +
          '#sn-grid{grid-template-columns:repeat(3,minmax(0,1fr))}' +
          '@media(max-width:1023px){#sn-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}' +
          '@media(max-width:767px){#sn-grid{grid-template-columns:1fr}}' +
          '.sn-ftab{background:none;border:none;border-bottom:1.5px solid transparent;padding:2px 1px 10px;margin-bottom:-1px;font-size:13px;font-family:inherit;color:var(--ink-faint);cursor:pointer;white-space:nowrap;letter-spacing:.01em;transition:color .15s;flex-shrink:0}' +
          '.sn-ftab.active{color:#202021;font-weight:500;border-bottom-color:#202021}' +
          '.sn-ftab:hover{color:#202021}';
        document.head.appendChild(snSt);
      }
      (function _snTabsInit() {
        const row = snPage.querySelector('#sn-tabs');
        row.innerHTML = _SN_FILTERS.map(([k, l]) =>
          `<button class="sn-ftab${k === 'all' ? ' active' : ''}" data-snf="${k}">${l}</button>`).join('');
        row.addEventListener('click', function(e) {
          const b = e.target.closest('button[data-snf]');
          if (b) _snSetFilter(b.dataset.snf);
        });
      })();
      function _snSetFilter(f) {
        _snFilter = f;
        snPage.querySelectorAll('.sn-ftab').forEach(b =>
          b.classList.toggle('active', b.dataset.snf === f));
        snRenderPage();
      }

      window.__snClose = function() {
        document.getElementById('sn-page').style.display = 'none';
        window.rbClearCrumb && window.rbClearCrumb();
        window._rbNav && window._rbNav('/dashboard');
      };
      window.__snOpen = function() {
        const av = document.getElementById('av-menu');
        if (av) av.classList.remove('open');
        document.getElementById('sn-page').style.display = 'block';
        _snSetFilter('all'); // the page always reopens on All (wardrobe convention)
        window.rbSetCrumb && window.rbSetCrumb([{ label: 'Lookbook' }]);
        window._rbNav && window._rbNav('/lookbook');
      };
      // Deleting is destructive — always confirm first (beta feedback:
      // looks were vanishing on a stray tap of the hover ×).
      window._rbConfirmDelete = function(title, onYes) {
        document.getElementById('rb-del-modal')?.remove();
        const modal = document.createElement('div');
        modal.id = 'rb-del-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:960;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:24px';
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
        modal.innerHTML = `
          <div style="background:#FAF8F5;border-radius:20px;width:100%;max-width:380px;box-sizing:border-box;box-shadow:0 24px 60px -12px rgba(32,32,33,0.28);padding:28px 26px;text-align:center">
            <p style="font-family:'Cormorant',Georgia,serif;font-size:24px;font-weight:300;color:#202021;margin:0 0 8px;line-height:1.25">${title}</p>
            <p style="font-size:12.5px;color:#6E6A64;line-height:1.6;margin:0 0 20px">This can’t be undone.</p>
            <div style="display:flex;gap:9px">
              <button id="rb-del-cancel" style="flex:1;padding:13px 20px;border:1px solid rgba(32,32,33,0.18);border-radius:100px;background:#fff;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#202021;font-family:inherit">Cancel</button>
              <button id="rb-del-yes" style="flex:1;padding:13px 20px;border:none;border-radius:100px;background:#202021;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#fff;font-family:inherit">Delete</button>
            </div>
          </div>`;
        document.body.appendChild(modal);
        modal.querySelector('#rb-del-cancel').onclick = function() { modal.remove(); };
        modal.querySelector('#rb-del-yes').onclick = function() { modal.remove(); onYes(); };
      };
      window.__snRemove = function(id) {
        window._rbConfirmDelete('Delete this look?', function() { snRemove(id); });
      };
      // One label per lookbook entry type — used by all three render sites
      // (lookbook page, dashboard rows); extend here when a new type ships.
      function _snTypeLabel(type) {
        return type === 'daily-look' ? 'Daily look'
          : type === 'weekly-plan' ? 'Weekly plan'
          : type === 'travel-edit' ? 'Travel edit'
          : type === 'look' ? 'Look'
          : 'Key piece';
      }

      window.__snOpenItem = function(id) {
        const item = snLoad().find(i => i.id === id);
        if (!item) return;
        // Close sn-page if open
        document.getElementById('sn-page').style.display = 'none';
        if (item.type === 'daily-look' && item.dlData) {
          window.__dlRenderResult(item.dlData, item.dlData.prompt || item.title, { skipSave: true, savedId: item.id });
        } else if (item.type === 'weekly-plan' && item.wkData) {
          window.__wkRenderResult(item.wkData, item.wkData.prompt || item.title, { skipSave: true, savedId: item.id });
        } else if (item.type === 'travel-edit' && item.tvData) {
          window.__tvRenderResult(item.tvData, { skipSave: true, savedId: item.id });
        } else if (item.type === 'key-piece' && item.kpData) {
          window.__kpRenderResult(item.kpData, item.title, { skipSave: true, savedId: item.id });
        } else {
          // Fallback: just open style notes page
          window.__snOpen();
        }
      };

      // ── Lookbook empty state · "Ways to fill it" ──────────────────────
      // An empty lookbook raises exactly one question — so how do I fill it?
      // Its own filters are the concierge's outputs, so the concierge answers
      // it, using the REAL .svc cards cloned from the dashboard rather than a
      // second set of hand-rolled rows: one design, one place to change it.
      // Every card routes back to the home prompt box with its intent armed —
      // the prompt is the one front door, so the empty Lookbook never opens a
      // modal of its own. Removed the moment anything is saved.
      function _snWayIntent(card) {
        if (card.classList.contains('svc-daily')) return 'dress-me';
        const t = (card.querySelector('.svc-title') || {}).textContent || '';
        const l = t.toLowerCase();
        if (l.indexOf('week') >= 0) return 'weekly';
        if (l.indexOf('travel') >= 0 || l.indexOf('pack') >= 0) return 'travel';
        return 'style';
      }
      window.__snWay = function(intent) {
        if (window.__snClose) window.__snClose();
        // Let the overlay drop before the prompt scrolls itself into view.
        setTimeout(function () {
          if (typeof _cbSetIntent === 'function') _cbSetIntent(intent);
        }, 80);
      };
      function _snClearWays() {
        const el = document.getElementById('sn-ways');
        if (el) el.remove();
        const empty = document.getElementById('sn-empty');
        if (empty) empty.style.padding = '80px 0';
      }
      // Repaint if the cards get transformed while the empty state is open.
      function _snRepaintWays() {
        const page = document.getElementById('sn-page');
        const empty = document.getElementById('sn-empty');
        if (page && page.style.display !== 'none' && empty && empty.style.display !== 'none') _snPaintWays();
      }
      var _snWaysTries = 0;
      function _snPaintWays() {
        _snClearWays();
        const empty = document.getElementById('sn-empty');
        const svcs = document.querySelectorAll('.services .svc');
        // Clone ONLY after personalize has relabelled + reordered the cards
        // at 600ms — `.svc-daily` is the marker it leaves behind. Cloning the
        // raw bundle markup gave the empty Lookbook the legacy trio ("Key
        // piece, three ways", photo imagery, wrong order) on any open that
        // beat the transform, which corrected itself on refresh. Keying on
        // the transformed DOM rather than a timer makes it deterministic:
        // until it lands, show the bare empty state and retry briefly.
        const ready = document.querySelector('.services .svc-daily');
        if (!empty || !svcs.length || !ready) {
          if (_snWaysTries < 20) {
            _snWaysTries++;
            setTimeout(function () {
              const e = document.getElementById('sn-empty');
              if (e && e.style.display !== 'none') _snPaintWays();
            }, 150);
          }
          return;
        }
        _snWaysTries = 0;
        empty.style.padding = '44px 0 24px';
        const ways = document.createElement('div');
        ways.id = 'sn-ways';
        ways.style.cssText = 'margin:34px auto 0;text-align:left';
        ways.innerHTML =
          '<div class="sec-head"><span class="sec-ey">Ways to fill it</span>' +
          '<span class="sec-meta">Each one starts from the prompt on your dashboard</span></div>' +
          '<div class="services-grid" id="sn-ways-grid"></div>';
        const grid = ways.querySelector('#sn-ways-grid');
        svcs.forEach(function (src) {
          const card = src.cloneNode(true);
          // cloneNode carries the inline onclick ATTRIBUTE (the bundle's
          // modal openers) even where personalize overrode the property —
          // strip it or the clone reopens the very paths this replaces.
          card.removeAttribute('onclick');
          card.removeAttribute('data-comment-anchor');
          // The cataloguing progress pill belongs to the dashboard card —
          // here it reads as a gate on an invitation. The wardrobe count
          // already sits on the dashboard she is being sent back to.
          const pill = card.querySelector('.rb-lock-wrap');
          if (pill) pill.remove();
          const intent = _snWayIntent(src);
          card.onclick = function () { window.__snWay(intent); };
          grid.appendChild(card);
        });
        empty.appendChild(ways);
      }

      function snRenderPage() {
        _snWaysTries = 0;
        const items = snLoad();
        const grid = document.getElementById('sn-grid');
        const empty = document.getElementById('sn-empty');
        if (!grid) return;
        const visible = _snFilter === 'all' ? items : items.filter(i => i.type === _snFilter);
        const emptyT = document.getElementById('sn-empty-t');
        const emptyS = document.getElementById('sn-empty-s');
        if (!items.length) {
          grid.style.display = 'none';
          empty.style.display = 'block';
          if (emptyT) emptyT.textContent = 'Nothing saved yet.';
          if (emptyS) emptyS.innerHTML = 'Every look Robes builds is filed here.';
          _snPaintWays();
          return;
        }
        if (!visible.length) {
          // Filter matched nothing — items exist, just not of this type
          const lbl = (_SN_FILTERS.find(f => f[0] === _snFilter) || [0, 'looks'])[1].toLowerCase();
          grid.style.display = 'none';
          empty.style.display = 'block';
          if (emptyT) emptyT.textContent = 'No ' + lbl + ' yet.';
          if (emptyS) emptyS.innerHTML = 'When you save one, it will appear here.';
          _snClearWays();
          return;
        }
        grid.style.display = 'grid';
        empty.style.display = 'none';
        _snClearWays();
        _rbcInitSwipe();
        grid.innerHTML = visible.map(item => `
          <div onclick="window.__snOpenItem(${item.id})" data-rmfn="__snRemove" data-rmidx="${item.id}" data-rmconfirm="1" style="position:relative;background:#fff;border-radius:var(--rad);overflow:hidden;box-shadow:0 1px 3px rgba(32,32,33,0.08);cursor:pointer" onmouseenter="this.querySelector('.sn-rm').style.opacity='1'" onmouseleave="this.querySelector('.sn-rm').style.opacity='0'">
            <button class="sn-rm" onclick="event.stopPropagation();window.__snRemove(${item.id})" style="position:absolute;top:10px;right:10px;opacity:0;transition:opacity .15s;background:rgba(32,32,33,0.55);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            ${item.img ? `<img src="${_waEsc(item.img)}" style="width:100%;aspect-ratio:3/4;object-fit:cover;display:block" alt="">` : `<div style="width:100%;aspect-ratio:3/4;background:#F0EDE8;display:flex;align-items:center;justify-content:center"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C8B8A2" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`}
            <div style="padding:14px 16px 16px">
              <span style="display:inline-block;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:6px">${_snTypeLabel(item.type)}</span>
              <div style="font-family:'Cormorant',Georgia,serif;font-size:17px;font-weight:300;color:#202021;line-height:1.3;margin-bottom:4px">${_waEsc(item.title)}</div>
              <div style="font-size:11px;color:var(--ink-faint)">${_waEsc(item.subtitle || '')}</div>
            </div>
          </div>`).join('');
      }

      // ── Conditional dashboard row ────────────────────────────────────
      function snRefreshRow() {
        const items = snLoad().slice(0, 4);
        let row = document.getElementById('sn-row');

        if (!items.length) {
          if (row) row.style.display = 'none';
          return;
        }

        if (!row) {
          row = document.createElement('section');
          row.id = 'sn-row';
          // Match the surrounding sections' padding — no extra indent
          row.style.cssText = 'margin:32px 0;';
          const dual = document.getElementById('dual');
          if (dual && dual.parentNode) {
            dual.parentNode.insertBefore(row, dual.nextSibling);
          }
        }

        const allItems = snLoad();
        row.style.display = 'block';
        _rbcInitSwipe();
        row.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
            <span style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint)">Lookbook</span>
            <button onclick="window.__snOpen()" style="background:none;border:none;cursor:pointer;font-size:11px;color:var(--ink-faint);letter-spacing:.04em;padding:0;text-decoration:underline;text-underline-offset:3px">View all</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
            ${items.map(item => `
              <div onclick="window.__snOpenItem(${item.id})" data-rmfn="__snRemove" data-rmidx="${item.id}" data-rmconfirm="1" style="cursor:pointer;border-radius:10px;overflow:hidden;background:#fff;box-shadow:0 1px 3px rgba(32,32,33,0.07)">
                ${item.img
                  ? `<img src="${item.img}" style="width:100%;aspect-ratio:1/1;object-fit:cover;display:block" alt="">`
                  : `<div style="width:100%;aspect-ratio:1/1;background:#F0EDE8;display:flex;align-items:center;justify-content:center"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C8B8A2" stroke-width="1.4"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`}
                <div style="padding:10px 12px 12px">
                  <div style="font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:3px">${_snTypeLabel(item.type)}</div>
                  <div style="font-family:'Cormorant',Georgia,serif;font-size:15px;font-weight:300;color:#202021;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.title}</div>
                </div>
              </div>`).join('')}
          </div>`;
      }

      // ── Wire save buttons ────────────────────────────────────────────
      // "Save all three" on the Key Piece results panel
      const kpSaveBtn = document.querySelector('.mb-btn.mb-btn-primary');
      if (kpSaveBtn) {
        kpSaveBtn.onclick = function() {
          const titleEl = document.querySelector('.mb-h');
          const imgEl = document.querySelector('.mb-img img');
          snAdd({
            type: 'key-piece',
            title: titleEl ? titleEl.textContent.trim() : 'Key piece',
            subtitle: 'Worn three ways · Today',
            img: imgEl ? imgEl.src : null,
          });
          _waShowToast('Saved to your style notes');
        };
      }

      // "Wear this today" on the look builder
      const lookSaveBtn = document.querySelector('.lb-btn.lb-primary');
      if (lookSaveBtn) {
        lookSaveBtn.onclick = function() {
          const titleEl = document.querySelector('.today-title');
          const imgEl = document.querySelector('.today-img img');
          snAdd({
            type: 'look',
            title: titleEl ? titleEl.textContent.trim() : 'Today\'s look',
            subtitle: new Date().toLocaleDateString('en-GB', { weekday: 'long' }) + ' · Today',
            img: imgEl ? imgEl.src : null,
          });
          _waShowToast('Look saved to your style notes');
        };
      }

      // Patch avatar dropdown: rename items + add Moodboards link
      // Also override KP.submitStyle to call the real /api/style endpoint
      // + reorder Styling Concierge cards: Key Piece → Weekly Planner → Travel Edit
      setTimeout(() => {
        // Wardrobe + Lookbook are now first-class nav destinations (top-nav
        // links on desktop, the fixed dock on mobile), so they no longer
        // belong in the account dropdown — remove both bundle items.
        Array.from(document.querySelectorAll('.av-item')).forEach(btn => {
          if (btn.textContent.includes('My wardrobe') || btn.textContent.includes('My Wardrobe')) btn.remove();
        });

        // Bundle's "Style notes" item is the Lookbook entry — pull it too.
        const snAvItem = Array.from(document.querySelectorAll('.av-item')).find(b => b.textContent.includes('Style notes') || b.textContent.includes('Lookbook'));
        if (snAvItem) snAvItem.remove();

        // Add Moodboards item to av-menu after Lookbook (hidden in P0)
        const avMenu = document.getElementById('av-menu');
        if (avMenu && !_RB_MB_HIDDEN && !document.getElementById('av-moodboards')) {
          const mbBtn = document.createElement('button');
          mbBtn.id = 'av-moodboards';
          mbBtn.className = 'av-item';
          mbBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></svg>Moodboards`;
          mbBtn.onclick = () => {
            avMenu.classList.remove('open');
            if (window._mbShowAllPage) window._mbShowAllPage();
          };
          // Insert after snAvItem if found, else append
          if (snAvItem && snAvItem.parentNode === avMenu) {
            avMenu.insertBefore(mbBtn, snAvItem.nextSibling);
          } else {
            avMenu.appendChild(mbBtn);
          }
        }

        // Add Style Notes item to av-menu after Moodboards
        if (avMenu && !document.getElementById('av-stylenotes')) {
          const snBtn = document.createElement('button');
          snBtn.id = 'av-stylenotes';
          snBtn.className = 'av-item';
          snBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c3.5 4.2 6 7.5 6 10.2a6 6 0 0 1-12 0C6 10.5 8.5 7.2 12 3z"></path></svg>Style notes`;
          snBtn.onclick = () => { avMenu.classList.remove('open'); window.location.href = '/stylenotes'; };
          const mbItem = document.getElementById('av-moodboards');
          if (mbItem && mbItem.parentNode === avMenu) {
            avMenu.insertBefore(snBtn, mbItem.nextSibling);
          } else if (snAvItem && snAvItem.parentNode === avMenu) {
            // Moodboards hidden (P0) — slot Style notes straight after Lookbook
            avMenu.insertBefore(snBtn, snAvItem.nextSibling);
          } else {
            avMenu.appendChild(snBtn);
          }
        }

        // Add Log out item at the bottom of av-menu
        if (avMenu && !document.getElementById('av-logout')) {
          const loBtn = document.createElement('button');
          loBtn.id = 'av-logout';
          loBtn.className = 'av-item';
          loBtn.style.cssText = 'border-top:0.5px solid var(--rule);border-radius:0;margin-top:4px;padding-top:12px';
          loBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>Log out`;
          loBtn.onclick = async () => {
            avMenu.classList.remove('open');
            loBtn.textContent = 'Signing out…';
            try {
              const sb = window.__robes_sb ||
                (window.supabase && window.supabase.createClient(
                  'https://ayowpaknssulsqqvwpqx.supabase.co',
                  'sb_publishable_D_iIPtp_R6kjN_711jfyTg_sFmRdpwJ'
                ));
              if (sb) await sb.auth.signOut();
            } catch (e) {
              console.error('Sign out failed:', e);
            }
            window.location.href = '/signup.html?mode=signin';
          };
          avMenu.appendChild(loBtn);
        }

        // Reorder + relabel concierge cards — bundle order: Weekly(01), Travel(02), Key Piece(03)
        // Target order: Daily Outfit(01), Weekly Planner(02), Travel Edit(03)
        const grid = document.querySelector('.services-grid');
        if (grid) {
          const svcs = Array.from(grid.querySelectorAll('.svc'));
          if (svcs.length === 3) {
            const [weekly, travel, keyPiece] = svcs;

            // Transform Key Piece → Daily Outfit
            keyPiece.classList.add('svc-daily');
            keyPiece.onclick = null;
            const kpTitle = keyPiece.querySelector('.svc-title');
            if (kpTitle) kpTitle.textContent = 'Daily outfit';
            const kpDesc = keyPiece.querySelector('.svc-desc');
            if (kpDesc) kpDesc.textContent = 'A fresh look styled from your wardrobe each morning, synced to the forecast.';

            // Calendar illustration for Weekly Planner
            const calSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 280" width="400" height="280"><rect width="400" height="280" fill="%23F5F1EB"/><g fill="none" stroke="%23D4C8B8" stroke-width="0.8"><line x1="57" y1="40" x2="57" y2="260"/><line x1="114" y1="40" x2="114" y2="260"/><line x1="171" y1="40" x2="171" y2="260"/><line x1="228" y1="40" x2="228" y2="260"/><line x1="285" y1="40" x2="285" y2="260"/><line x1="342" y1="40" x2="342" y2="260"/><line x1="28" y1="80" x2="372" y2="80"/><line x1="28" y1="140" x2="372" y2="140"/><line x1="28" y1="200" x2="372" y2="200"/><line x1="28" y1="40" x2="372" y2="40"/><line x1="28" y1="260" x2="372" y2="260"/><line x1="28" y1="40" x2="28" y2="260"/><line x1="372" y1="40" x2="372" y2="260"/></g><g font-family="Georgia,serif" font-size="11" fill="%23B0A090" text-anchor="middle"><text x="42" y="30">M</text><text x="85" y="30">T</text><text x="142" y="30">W</text><text x="199" y="30">T</text><text x="256" y="30">F</text><text x="313" y="30">S</text><text x="357" y="30">S</text></g><g font-family="Georgia,serif" font-size="10" fill="%23C8B8A8" text-anchor="middle"><text x="42" y="58">14</text><text x="99" y="58">15</text><text x="156" y="58">16</text><text x="213" y="58">17</text><text x="270" y="58">18</text><text x="327" y="58">19</text><text x="357" y="58">20</text></g><rect x="31" y="86" width="50" height="44" rx="4" fill="%23E8DEDD" opacity="0.9"/><rect x="4" y="86" width="3" height="44" rx="1.5" fill="%23A08898"/><rect x="117" y="86" width="50" height="44" rx="4" fill="%23E8DEDD" opacity="0.8"/><rect x="113" y="86" width="3" height="44" rx="1.5" fill="%238A9870"/><rect x="231" y="66" width="50" height="104" rx="4" fill="%23E8DEDD" opacity="0.85"/><rect x="227" y="66" width="3" height="104" rx="1.5" fill="%23789060"/><rect x="88" y="146" width="50" height="44" rx="4" fill="%23E8DEDD" opacity="0.8"/><rect x="84" y="146" width="3" height="44" rx="1.5" fill="%238A9870"/><rect x="174" y="146" width="50" height="44" rx="4" fill="%23E8DEDD" opacity="0.75"/><rect x="170" y="146" width="3" height="44" rx="1.5" fill="%23A08898"/><rect x="345" y="146" width="22" height="44" rx="4" fill="%23E8DEDD" opacity="0.8"/><rect x="341" y="146" width="3" height="44" rx="1.5" fill="%23A08898"/><rect x="117" y="206" width="50" height="44" rx="4" fill="%23E8DEDD" opacity="0.8"/><rect x="113" y="206" width="3" height="44" rx="1.5" fill="%238A9870"/><rect x="288" y="206" width="50" height="44" rx="4" fill="%23E8DEDD" opacity="0.75"/><rect x="284" y="206" width="3" height="44" rx="1.5" fill="%23A89878"/></svg>`;

            // Premium suitcase illustration for Travel Edit
            const suitSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 280"><rect width="400" height="280" fill="%23EEE8E4"/><rect x="62" y="62" width="276" height="178" rx="22" fill="%23E8E0D6" stroke="%23C8BAB0" stroke-width="1.4"/><rect x="74" y="74" width="252" height="154" rx="16" fill="%23E2D8CE" stroke="%23C0B4A8" stroke-width="0.7"/><path d="M168 62 C168 38 232 38 232 62" fill="none" stroke="%23C0B0A6" stroke-width="2" stroke-linecap="round"/><rect x="158" y="56" width="14" height="10" rx="4" fill="%23D0C4BA"/><rect x="228" y="56" width="14" height="10" rx="4" fill="%23D0C4BA"/><rect x="62" y="62" width="10" height="10" rx="3" fill="%23D4C8BC"/><rect x="328" y="62" width="10" height="10" rx="3" fill="%23D4C8BC"/><rect x="62" y="230" width="10" height="10" rx="3" fill="%23D4C8BC"/><rect x="328" y="230" width="10" height="10" rx="3" fill="%23D4C8BC"/><line x1="74" y1="156" x2="326" y2="156" stroke="%23C0B4A8" stroke-width="0.8"/><rect x="186" y="150" width="28" height="12" rx="5" fill="%23D8CCBF" stroke="%23C0B0A4" stroke-width="1"/><rect x="192" y="154" width="16" height="5" rx="2" fill="%23C8BBB0"/><rect x="86" y="84" width="110" height="62" rx="10" fill="%23DDD4C8" stroke="%23C4B8AC" stroke-width="0.8"/><line x1="98" y1="99" x2="184" y2="99" stroke="%23C8BCAF" stroke-width="0.9"/><line x1="98" y1="112" x2="178" y2="112" stroke="%23C8BCAF" stroke-width="0.7"/><line x1="98" y1="124" x2="170" y2="124" stroke="%23C8BCAF" stroke-width="0.6" opacity="0.7"/><rect x="206" y="84" width="110" height="62" rx="10" fill="%23E4DAD0" stroke="%23C4B4A8" stroke-width="0.8"/><ellipse cx="237" cy="105" rx="18" ry="14" fill="%23D8CEBE" stroke="%23C0B2A4" stroke-width="0.9"/><ellipse cx="278" cy="105" rx="18" ry="14" fill="%23D4CAB8" stroke="%23BCAE9E" stroke-width="0.9"/><ellipse cx="257" cy="130" rx="18" ry="14" fill="%23DCD2C0" stroke="%23C0B2A4" stroke-width="0.9"/><ellipse cx="237" cy="105" rx="7" ry="5" fill="none" stroke="%23C8BAA8" stroke-width="0.7"/><ellipse cx="278" cy="105" rx="7" ry="5" fill="none" stroke="%23C0B2A0" stroke-width="0.7"/><rect x="86" y="164" width="52" height="58" rx="10" fill="%23DAD0C4" stroke="%23C4B8AC" stroke-width="0.8"/><path d="M96 202 Q108 192 126 196 Q130 197 130 202" fill="none" stroke="%23C0B4A8" stroke-width="1.1" stroke-linecap="round"/><rect x="148" y="164" width="58" height="58" rx="10" fill="%23D8CEC2" stroke="%23C0B4A8" stroke-width="0.8"/><line x1="160" y1="184" x2="194" y2="184" stroke="%23C4B8AC" stroke-width="0.9"/><line x1="160" y1="196" x2="188" y2="196" stroke="%23C4B8AC" stroke-width="0.7"/><rect x="216" y="164" width="100" height="58" rx="10" fill="%23E0D6CA" stroke="%23C8BCAE" stroke-width="0.8"/><rect x="228" y="177" width="36" height="32" rx="6" fill="%23D4CAB8" stroke="%23C0B4A4" stroke-width="0.8"/><rect x="272" y="177" width="32" height="32" rx="6" fill="%23D0C6B4" stroke="%23BCAE9E" stroke-width="0.8"/></svg>`;

            const weeklyImg = weekly.querySelector('.svc-img img');
            if (weeklyImg) weeklyImg.src = calSvg;
            // Weekly Plan is live (P0): the CTA sets the weekly intent and
            // injects the scaffolding phrase into the concierge prompt.
            weekly.querySelector('.rb-soon-tag')?.remove();
            weekly.onclick = function() { if (typeof _cbSetIntent === 'function') _cbSetIntent('weekly'); };
            const wkDesc = weekly.querySelector('.svc-desc');
            if (wkDesc) wkDesc.textContent = 'Your week mapped day by day — every outfit routed through your own wardrobe, no repeats.';
            const wkCta = weekly.querySelector('.svc-cta');
            if (wkCta) wkCta.innerHTML = `Plan my week<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
            const travelImg = travel.querySelector('.svc-img img');
            if (travelImg) travelImg.src = suitSvg;

            // Travel Edit is live — replace the bundle's comingSoon with the
            // capsule packing brief modal
            travel.onclick = function() { window.__tvOpen && window.__tvOpen(); };
            const tvDesc = travel.querySelector('.svc-desc');
            if (tvDesc) tvDesc.textContent = 'A tight capsule for your next trip — every piece worn three ways, weather-checked, mapped day by day.';

            // Reorder: [Daily Outfit, Weekly Planner, Travel Edit]
            grid.innerHTML = '';
            [keyPiece, weekly, travel].forEach((el, i) => {
              const num = el.querySelector('.svc-num');
              if (num) num.textContent = String(i + 1).padStart(2, '0');
              grid.appendChild(el);
            });
            // The empty Lookbook clones these — if it painted before now it
            // is showing the legacy trio, so repaint it against the real set.
            if (typeof _snRepaintWays === 'function') _snRepaintWays();
          }
        }

        if (window.KP && KP.submitStyle) {
          KP.submitStyle = async function() {
            const input = document.getElementById('kp-input');
            const prompt = input ? input.value.trim() : '';

            // Read photo from the preview tile the bundle already populated
            const tileImg = document.getElementById('kp-tile-img');
            const photoData = (tileImg && tileImg.src && tileImg.src.startsWith('data:')) ? tileImg.src : null;

            if (!prompt && !photoData) {
              _waShowToast('Add a piece description or photo first');
              return;
            }

            // Show full-page loading overlay
            let overlay = document.getElementById('kp-loading-overlay');
            if (!overlay) {
              overlay = document.createElement('div');
              overlay.id = 'kp-loading-overlay';
              overlay.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(250,248,245,0.92);backdrop-filter:blur(6px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px';
              overlay.innerHTML = `
                <div style="font-family:'Cormorant',Georgia,serif;font-size:28px;font-weight:300;color:#202021;text-align:center">Styling your piece<br><em>three ways…</em></div>
                <div style="font-size:12px;color:var(--ink-faint);letter-spacing:.06em" id="kp-load-msg">Composing your looks</div>
                <div style="width:120px;height:1px;background:rgba(32,32,33,0.1);position:relative;overflow:hidden;margin-top:8px">
                  <div id="kp-load-bar" style="position:absolute;inset:0;background:#202021;transform:translateX(-100%);animation:kpLoadBar 2.5s ease-in-out infinite"></div>
                </div>`;
              document.body.appendChild(overlay);
            }
            overlay.style.display = 'flex';
            KP.closeKeyPiece();

            // Update message after a few seconds
            const msgs = ['Generating editorial looks', 'Composing outfits…', 'Creating images…', 'Almost ready…'];
            let mi = 0;
            const msgInterval = setInterval(() => {
              mi = Math.min(mi + 1, msgs.length - 1);
              const el = document.getElementById('kp-load-msg');
              if (el) el.textContent = msgs[mi];
            }, 8000);

            try {
              const genId = _rbGenId();
              const res = await fetch('/api/style', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, photo: photoData, userId: _waUid() || undefined, genId, styleDna: _rbStyleDna(), styleIcons: _rbStyleIcons(), gender: _rbGender(), wardrobeCount: _waItems.length, wardrobeItems: _waItems.map(i => ({ label: i.label, category: i.category, color: i.color, times_worn: i.times_worn })), intent: 'style' }),
              });
              clearInterval(msgInterval);
              overlay.style.display = 'none';
              if (!res.ok) throw new Error(await res.text());
              const data = await res.json();
              data.genId = genId;
              window.__kpRenderResult(data, prompt);
            } catch (err) {
              clearInterval(msgInterval);
              overlay.style.display = 'none';
              console.error('[Robes] /api/style error:', err.message);
              _waShowToast(err.message && err.message.length < 120 ? err.message : 'Something went wrong — please try again');
            }
          };
        }
      }, 600);

      // Store last result so saved items can be re-opened
      window.__lastKpData = null;

      // Full-page result overlay — 100% inline styles, no external CSS classes
      let kpResultPage = null;
      let dlResultPage = null; // Daily Look page (Context-to-Core render)
      let tvResultPage = null; // Travel Edit page (capsule + lookbook render)
      let wkResultPage = null; // Weekly Plan page (P0 calendar-strip render)

      // Close every fixed result overlay (kp/dl/tv pages, moodboard result +
      // list, lookbook page) so an in-flow view like the wardrobe panel can
      // actually be seen. Used by the patched App.showWardrobe.
      window.__rbCloseResultOverlays = function() {
        if (kpResultPage) kpResultPage.style.display = 'none';
        if (dlResultPage) dlResultPage.style.display = 'none';
        if (tvResultPage) tvResultPage.style.display = 'none';
        if (wkResultPage) wkResultPage.style.display = 'none';
        window.__mbCloseResult && window.__mbCloseResult();
        window.__mbCloseList && window.__mbCloseList();
        const snEl = document.getElementById('sn-page');
        if (snEl) snEl.style.display = 'none';
        window.rbClearCrumb && window.rbClearCrumb();
      };
      window.__lastKpData = null;

      // All four result pages are fixed overlays at z-index:40 — DOM order,
      // not open order, decides who paints on top, so every render must hide
      // its siblings or a stale later-appended page stays visible above it.
      function _rbHideResultPages(except) {
        if (except !== 'kp' && kpResultPage) kpResultPage.style.display = 'none';
        if (except !== 'dl' && dlResultPage) dlResultPage.style.display = 'none';
        if (except !== 'tv' && tvResultPage) tvResultPage.style.display = 'none';
        if (except !== 'wk' && wkResultPage) wkResultPage.style.display = 'none';
      }

      window.__kpGoBack = function() {
        if (kpResultPage) kpResultPage.style.display = 'none';
        window.rbClearCrumb && window.rbClearCrumb();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // kpResultPage is now z-index:40 (below nav:50) — crumb lives in main nav
      };

      // Poll the /api/style background image job and slot images in as they land
      let _kpPollTimer = null;
      let _kpActiveSaveId = null; // lookbook id of the look being rendered — images patch into it
      function _kpStopPolling() { if (_kpPollTimer) { clearTimeout(_kpPollTimer); _kpPollTimer = null; } }
      function _kpPersistImages() {
        // Write hosted image URLs into the saved lookbook entry so tiles
        // survive navigation + reload (server uploads to Cloudinary first)
        if (!_kpActiveSaveId || !window.__lastKpData) return;
        const urls = (window.__lastKpData.generatedImages || []).map(s => (typeof s === 'string' && s.indexOf('http') === 0) ? s : null);
        if (!urls.some(Boolean)) return;
        const it = snLoad().find(x => x.id === _kpActiveSaveId);
        if (!it) return;
        snUpdate(_kpActiveSaveId, {
          img: urls.find(Boolean) || it.img || null,
          kpData: { ...(it.kpData || {}), generatedImages: urls },
        });
      }
      function _kpSetLookImage(i, src) {
        const wrap = document.getElementById('kp-look-imgwrap-' + i);
        if (!wrap) return;
        const ph = wrap.querySelector('.kp-img-ph');
        if (ph) ph.remove();
        if (!wrap.querySelector('img')) {
          const img = document.createElement('img');
          img.src = src;
          img.alt = '';
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0;opacity:0;transition:opacity .5s ease';
          wrap.insertBefore(img, wrap.firstChild);
          requestAnimationFrame(() => { img.style.opacity = '1'; });
          const num = wrap.querySelector('span');
          if (num) { num.style.color = 'rgba(255,255,255,0.85)'; num.style.textShadow = '0 1px 8px rgba(32,32,33,0.35)'; }
        }
      }
      function _kpSettlePlaceholder(i) {
        const wrap = document.getElementById('kp-look-imgwrap-' + i);
        if (!wrap || wrap.querySelector('img')) return;
        const ph = wrap.querySelector('.kp-img-ph');
        if (ph) {
          ph.style.animation = 'none';
          ph.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C8BCAE" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
        }
      }
      function _kpPollImages(jobId, count) {
        _kpStopPolling();
        const t0 = Date.now();
        function tick() {
          fetch('/api/images/' + jobId)
            .then(r => r.ok ? r.json() : null)
            .then(job => {
              if (job && Array.isArray(job.images)) {
                let changed = false;
                job.images.forEach((src, i) => {
                  if (src) {
                    _kpSetLookImage(i, src);
                    if (window.__lastKpData) {
                      if (!Array.isArray(window.__lastKpData.generatedImages)) window.__lastKpData.generatedImages = [];
                      if (window.__lastKpData.generatedImages[i] !== src) { window.__lastKpData.generatedImages[i] = src; changed = true; }
                    }
                  }
                });
                if (changed) _kpPersistImages();
                if (job.done) {
                  for (let i = 0; i < count; i++) _kpSettlePlaceholder(i);
                  return;
                }
              } else if (!job) {
                // job expired/unknown — settle whatever is still waiting
                for (let i = 0; i < count; i++) _kpSettlePlaceholder(i);
                return;
              }
              if (Date.now() - t0 < 300000) _kpPollTimer = setTimeout(tick, 3500);
              else for (let i = 0; i < count; i++) _kpSettlePlaceholder(i);
            })
            .catch(() => {
              if (Date.now() - t0 < 300000) _kpPollTimer = setTimeout(tick, 5000);
              else for (let i = 0; i < count; i++) _kpSettlePlaceholder(i);
            });
        }
        _kpPollTimer = setTimeout(tick, 2500);
      }

      window.__kpRenderResult = function(data, promptText, opts) {
        if (!data || !Array.isArray(data.ways) || !data.ways.length) {
          _waShowToast('Could not render looks — please try again');
          return;
        }
        _kpStopPolling();
        _rbHideResultPages('kp');
        window.__lastKpData = data;
        const { ways, generatedImages, fallback, photoUrl } = data;
        const kpIntent = (opts && opts.intent) || data.intent || 'style';
        const kpCtx = (opts && opts.context) || data.context || null;
        const kpDaily = kpIntent === 'dress-me';
        // A custom name (set via Rename) is stored on the render data as
        // `headline` — it takes over the editorial H1 so a rename sticks
        // visibly here and on every reopen.
        const kpHeadline = (data.headline || '').trim();
        const pieceName = kpHeadline || (fallback ? 'Balmain waistcoat' : (promptText || 'Your piece'));
        const serif = "'Cormorant',Georgia,serif";
        const sans = "-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif";

        if (!kpResultPage) {
          kpResultPage = document.createElement('div');
          kpResultPage.id = 'kp-result-page';
          kpResultPage.style.cssText = 'position:fixed;left:0;top:var(--nav-h,60px);right:0;bottom:0;width:100%;z-index:40;background:#FAF8F5;overflow-y:auto;font-family:' + sans;
          document.body.appendChild(kpResultPage);
        }
        if (!document.getElementById('kp-img-style')) {
          const kis = document.createElement('style');
          kis.id = 'kp-img-style';
          kis.textContent = '@keyframes kpPhPulse{0%,100%{opacity:1}50%{opacity:.55}}' +
            // Mobile: the single-column card gives the image a short landscape
            // box (min-height) — a cover-fit portrait image loses head + feet
            // to the crop. Let the image flow at its natural ratio instead;
            // min-height only backstops the pending-placeholder state.
            '@media(max-width:700px){.kp-look-card{grid-template-columns:1fr !important}.kp-look-card>div:last-child{padding:20px 22px 26px !important}.kp-look-imgwrap{min-height:300px !important}.kp-look-imgwrap img{position:static !important;height:auto !important}}' +
            // <=767px the glass header share circle covers kp — hide the in-page one
            '@media(max-width:767px){.rb-kp-share{display:none !important}}';
          document.head.appendChild(kis);
        }
        const imagesPending = !!data.jobId;

        window.rbSetCrumb && window.rbSetCrumb([{ label: 'Style a piece' }]);
        try { kpResultPage.innerHTML = `
          <div style="width:100%;max-width:900px;margin:0 auto;padding:40px 32px 80px;box-sizing:border-box">

            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin:0 0 12px">
              <h1 id="kp-headline" style="font-family:${serif};font-weight:300;font-size:clamp(32px,4vw,52px);color:#202021;line-height:1.1;margin:0">${kpHeadline ? _waEsc(kpHeadline) : (kpDaily ? 'Your day,<br><em style="color:var(--ink-faint)">dressed three ways.</em>' : 'Your piece,<br><em style="color:var(--ink-faint)">worn three ways.</em>')}</h1>
              <div style="display:flex;align-items:center;gap:10px;margin-top:8px;flex-shrink:0"><button class="rb-kp-share" title="Share this look" style="border:none;background:var(--ink);color:var(--cream-100);border-radius:100px;padding:12px 22px;font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;font-family:inherit;transition:opacity .15s" onclick="window.__rbShare&&window.__rbShare()">Share this look</button><button class="rb-rename-tbtn" title="Rename" onclick="window.__rbRename&&window.__rbRename('kp')"><svg viewBox="0 0 24 24"><path d="M4 20h4L18 10l-4-4L4 16v4z"/><path d="M13 7l4 4"/></svg></button></div>
            </div>
            <p style="font-size:14px;line-height:1.7;color:#6E6A64;max-width:560px;margin:0 0 24px">${fallback ? "We didn't recognise your request, so we've styled a Balmain waistcoat for you instead." : kpDaily ? 'Three complete outfits for today — weather-checked, built from anchor to exclamation point.' : 'Three distinct looks — different moods, occasions, and ways of dressing.'}</p>

            ${kpDaily && kpCtx && (kpCtx.city || kpCtx.tempRange) ? `
            <div style="display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12px;color:#6E6A64;letter-spacing:.04em;border:0.5px solid rgba(32,32,33,0.12);border-radius:40px;padding:9px 18px;margin:0 0 28px;background:#fff">
              <span>🌤</span>
              <strong style="font-weight:500;color:#202021">${_waEsc([kpCtx.city, kpCtx.month].filter(Boolean).join(' · '))}</strong>
              ${kpCtx.tempRange ? `<span style="color:rgba(32,32,33,0.2)">|</span><span>${_waEsc(kpCtx.tempRange)}</span>` : ''}
              ${kpCtx.hint ? `<span style="color:rgba(32,32,33,0.2)">|</span><span style="font-style:italic">${_waEsc(kpCtx.hint)}</span>` : ''}
            </div>` : ''}

            <div style="display:flex;align-items:center;gap:14px;padding:14px 16px;border:0.5px solid rgba(32,32,33,0.15);border-radius:var(--rad);background:#fff;max-width:400px;margin-bottom:40px">
              ${photoUrl ? `<img src="${_waEsc(photoUrl)}" style="width:64px;height:80px;border-radius:4px;object-fit:cover;flex-shrink:0" alt="">` : ''}
              <div>
                <div style="font-size:9.5px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:4px">${kpDaily ? "Today's brief" : 'Your piece'}</div>
                <div style="font-family:${serif};font-size:22px;font-weight:400;color:#202021;line-height:1.1">${_waEsc(pieceName)}</div>
                ${photoUrl ? '<div style="font-size:12px;color:var(--ink-faint);margin-top:4px">✓ The one you uploaded</div>' : ''}
              </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:32px">
              ${ways.map((w, i) => {
                const genImg = generatedImages && generatedImages[i];
                const phInner = imagesPending
                  ? `<span style="font-family:${serif};font-style:italic;font-size:15px;color:var(--ink-faint);text-align:center;padding:0 24px">Creating your editorial image…</span>`
                  : `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C8BCAE" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
                return `
                <div class="kp-look-card" style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,3fr);gap:24px;background:#fff;border-radius:var(--rad);overflow:hidden;border:0.5px solid rgba(32,32,33,0.08)">
                  <div class="kp-look-imgwrap" id="kp-look-imgwrap-${i}" style="position:relative;background:#EDE9E2;min-height:340px">
                    ${genImg
                      ? `<img src="${_waEsc(genImg)}" style="width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0" alt="">`
                      : `<div class="kp-img-ph" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;${imagesPending ? 'animation:kpPhPulse 1.8s ease-in-out infinite' : ''}">${phInner}</div>`}
                    <span style="position:absolute;top:14px;left:16px;font-family:${serif};font-weight:300;font-size:20px;color:${genImg ? 'rgba(255,255,255,0.85);text-shadow:0 1px 8px rgba(32,32,33,0.35)' : 'rgba(32,32,33,0.35)'}">${String(i+1).padStart(2,'0')}</span>
                  </div>
                  <div style="padding:28px 28px 28px 4px;display:flex;flex-direction:column;gap:16px">
                    <div style="font-size:10px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:#B8A898">${_waEsc(w.eyebrow || '')}</div>
                    <div style="font-family:${serif};font-weight:300;font-size:28px;color:#202021;line-height:1.08">${_waEsc(w.title || '')}</div>
                    <div style="display:flex;flex-direction:column;gap:14px;margin-top:4px">
                      <div><div style="font-size:9.5px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:#B8A898;margin-bottom:5px">The Outfit</div><p style="font-size:13px;line-height:1.65;color:#6E6A64;margin:0">${_waEsc(w.outfit || '')}</p></div>
                      <div><div style="font-size:9.5px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:#B8A898;margin-bottom:5px">Key Details</div><p style="font-size:13px;line-height:1.65;color:#6E6A64;margin:0">${_waEsc(w.details || '')}</p></div>
                      <div><div style="font-size:9.5px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:#B8A898;margin-bottom:5px">Accessories</div><p style="font-size:13px;line-height:1.65;color:#6E6A64;margin:0">${_waEsc(w.accessories || '')}</p></div>
                    </div>
                  </div>
                </div>`;
              }).join('')}
            </div>

            <div style="margin-top:48px;padding:28px 24px;background:rgba(32,32,33,0.03);border-radius:var(--rad);text-align:center">
              <div style="font-family:${serif};font-size:22px;font-weight:300;color:#202021;margin-bottom:6px">How were these looks?</div>
              <div id="kp-fb-prompt">
                <div style="font-size:13px;color:var(--ink-faint);margin-bottom:18px;font-style:italic">Tell us — your taste shapes what comes next.</div>
                <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
                  <button id="kp-fb-up" onclick="window.__kpFbRate(1)" style="display:flex;align-items:center;gap:8px;padding:10px 22px;border:1px solid rgba(32,32,33,0.15);border-radius:40px;background:#fff;font-size:12px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#202021;font-family:${sans}">👍 Loved them</button>
                  <button id="kp-fb-dn" onclick="window.__kpFbRate(0)" style="display:flex;align-items:center;gap:8px;padding:10px 22px;border:1px solid rgba(32,32,33,0.15);border-radius:40px;background:#fff;font-size:12px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#202021;font-family:${sans}">Not quite</button>
                </div>
              </div>
              <div id="kp-fb-expand" hidden style="margin-top:16px">
                <textarea id="kp-fb-text" placeholder="What would have made them better?" rows="3" style="width:100%;border:1px solid rgba(32,32,33,0.15);border-radius:var(--rad-sm);padding:12px 14px;font-size:13px;color:#202021;resize:none;outline:none;box-sizing:border-box;font-family:${sans}"></textarea>
                <button onclick="window.__kpFbSubmit()" style="margin-top:10px;padding:10px 28px;background:#202021;color:#fff;border:none;border-radius:40px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;font-family:${sans}">Send feedback</button>
              </div>
              <div id="kp-fb-done" hidden style="font-size:13px;color:#7E7C5A;margin-top:12px">Thank you — noted.</div>
            </div>
          </div>`; } catch(e) {
          console.error('[Robes] kpResultPage render error:', e);
          kpResultPage.innerHTML = `<div style="padding:80px 24px;text-align:center;font-family:${sans};color:#6E6A64">Something went wrong rendering your looks — please try again.</div>`;
        }

        kpResultPage.style.display = 'block';
        kpResultPage.scrollTo({ top: 0 });

        // Images generate in the background on the server — poll and slot them in
        if (imagesPending) _kpPollImages(data.jobId, ways.length);

        // Auto-save. Generated images are patched in by _kpPollImages once
        // they land as hosted URLs (base64 is never persisted — it would
        // blow the localStorage quota). Skipped when re-opening an
        // already-saved look from the lookbook, else entries duplicate.
        if (!opts || !opts.skipSave) {
          const persistable = (generatedImages || []).map(s => (typeof s === 'string' && s.indexOf('http') === 0) ? s : null);
          _kpActiveSaveId = snAdd({
            type: 'key-piece',
            title: pieceName,
            subtitle: (kpDaily ? "Today's outfits · " : 'Worn three ways · ') + new Date().toLocaleDateString('en-GB', { weekday: 'long' }),
            img: persistable.find(Boolean) || photoUrl || null,
            kpData: { ways, fallback, photoUrl, generatedImages: persistable, intent: kpIntent, context: kpCtx, genId: data.genId || null },
          });
          _rbTrack('look_generated', { track: kpDaily ? 'daily-3way' : 'key-piece', item: String(_kpActiveSaveId), fallback: !!fallback });
        } else {
          // Reopened from the lookbook — data is kpData (no id of its own), so
          // the row id MUST come from opts.savedId. Without it _kpActiveSaveId
          // stayed null and every Share lazy-minted a duplicate key-piece row.
          _kpActiveSaveId = (opts && opts.savedId) || data.id || null;
        }

        let kpFbRating = null;
        window.__kpFbRate = function(val) {
          kpFbRating = val;
          document.getElementById('kp-fb-up').style.background = val === 1 ? '#F0EDE8' : '#fff';
          document.getElementById('kp-fb-dn').style.background = val === 0 ? '#F0EDE8' : '#fff';
          document.getElementById('kp-fb-expand').hidden = false;
          setTimeout(() => { const t = document.getElementById('kp-fb-text'); if (t) t.focus(); }, 60);
        };
        window.__kpFbSubmit = function() {
          const comment = (document.getElementById('kp-fb-text').value || '').trim();
          // PRD §4: feedback maps to user, prompt, timestamp + active payload vars
          fetch('/api/feedback', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
            email: (window.__robes_session && window.__robes_session.user && window.__robes_session.user.email) || '',
            rating: kpFbRating,
            comment,
            prompt: promptText || '',
            looksOutput: JSON.stringify({ surface: kpDaily ? 'daily-look' : 'key-piece', intent: kpIntent, context: kpCtx, titles: ways.map(w => w.title), ts: new Date().toISOString() }),
          }) }).catch(()=>{});
          _rbFbCloud(kpDaily ? 'daily' : 'key-piece', _kpActiveSaveId, kpFbRating, comment);
          document.getElementById('kp-fb-prompt').hidden = true;
          document.getElementById('kp-fb-expand').hidden = true;
          document.getElementById('kp-fb-done').hidden = false;
        };
      };

      // ── Daily Look — Context-to-Core page (PRD: systematic daily dressing) ──
      // One outfit for the real day, rendered as the stylist's four
      // architectural steps with per-item swap. Balance shifts with the
      // wardrobe: 0 items = fully aspirational, ≥15 = closet-first.
      let _dlPollTimer = null;
      let _dlActiveSaveId = null; // lookbook id of the live daily look
      window.__lastDlData = null;
      function _dlStopPolling() { if (_dlPollTimer) { clearTimeout(_dlPollTimer); _dlPollTimer = null; } }

      function _dlPersistImages() {
        if (!_dlActiveSaveId || !window.__lastDlData) return;
        const urls = (window.__lastDlData.generatedImages || []).map(s => (typeof s === 'string' && s.indexOf('http') === 0) ? s : null);
        if (!urls.some(Boolean)) return;
        const it = snLoad().find(x => x.id === _dlActiveSaveId);
        if (!it) return;
        snUpdate(_dlActiveSaveId, {
          img: urls.find(Boolean) || it.img || null,
          dlData: { ...(it.dlData || {}), generatedImages: urls },
        });
        _pdSyncSaved(_dlActiveSaveId);
      }

      // Generated frames appear in TWO places now (the moodboard tile and
      // the rack viewport), so frames carry data-dlimg="i" instead of an id
      // and the poller patches every instance.
      function _dlSetImage(i, src) {
        document.querySelectorAll('[data-dlimg="' + i + '"]').forEach(wrap => {
          if (wrap.querySelector('img')) return;
          const ph = wrap.querySelector('.dl-img-ph');
          if (ph) ph.remove();
          const img = document.createElement('img');
          img.src = src;
          img.alt = '';
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0;opacity:0;transition:opacity .5s ease';
          wrap.insertBefore(img, wrap.firstChild);
          requestAnimationFrame(() => { img.style.opacity = '1'; });
        });
      }

      function _dlSettlePlaceholder(i) {
        document.querySelectorAll('[data-dlimg="' + i + '"]').forEach(wrap => {
          if (wrap.querySelector('img')) return;
          const ph = wrap.querySelector('.dl-img-ph');
          if (ph) {
            ph.style.animation = 'none';
            ph.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C8BCAE" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
          }
        });
      }

      function _dlPollImages(jobId, count) {
        _dlStopPolling();
        const t0 = Date.now();
        function tick() {
          fetch('/api/images/' + jobId)
            .then(r => r.ok ? r.json() : null)
            .then(job => {
              if (job && Array.isArray(job.images)) {
                let changed = false;
                job.images.forEach((src, i) => {
                  if (src) {
                    _dlSetImage(i, src);
                    if (window.__lastDlData) {
                      if (!Array.isArray(window.__lastDlData.generatedImages)) window.__lastDlData.generatedImages = [];
                      if (window.__lastDlData.generatedImages[i] !== src) { window.__lastDlData.generatedImages[i] = src; changed = true; }
                    }
                  }
                });
                if (changed) _dlPersistImages();
                if (job.done) {
                  for (let i = 0; i < count; i++) _dlSettlePlaceholder(i);
                  return;
                }
              } else if (!job) {
                for (let i = 0; i < count; i++) _dlSettlePlaceholder(i);
                return;
              }
              // Staggered gen: ~3s/item + 20-40s per image → generous window
              if (Date.now() - t0 < 300000) _dlPollTimer = setTimeout(tick, 4000);
              else for (let i = 0; i < count; i++) _dlSettlePlaceholder(i);
            })
            .catch(() => {
              if (Date.now() - t0 < 300000) _dlPollTimer = setTimeout(tick, 6000);
              else for (let i = 0; i < count; i++) _dlSettlePlaceholder(i);
            });
        }
        _dlPollTimer = setTimeout(tick, 3000);
      }

      window.__dlGoBack = function() {
        if (dlResultPage) dlResultPage.style.display = 'none';
        _waAfterAdd = null; // leaving the look cancels any armed snap-mine swap
        window.rbClearCrumb && window.rbClearCrumb();
        window._rbNav && window._rbNav('/dashboard');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };

      // opts.locked = anchored pieces a restyle must keep; opts.savedId =
      // the lookbook entry a restyle evolves (instead of minting a new one).
      // Guards the full-screen generation overlay: a hung fetch must never
      // trap her behind the blur. 90s hard abort, and a quiet Cancel link
      // appears after 15s so a long wait is always escapable.
      function _rbOverlayGuard(overlay) {
        const controller = new AbortController();
        const g = { signal: controller.signal, userCancelled: false, timedOut: false };
        const cancelTimer = setTimeout(() => {
          if (!overlay || overlay.style.display === 'none') return;
          let c = document.getElementById('kp-load-cancel');
          if (!c) {
            c = document.createElement('button');
            c.id = 'kp-load-cancel';
            c.style.cssText = 'margin-top:14px;background:none;border:none;cursor:pointer;font-size:12px;letter-spacing:.06em;color:var(--ink-faint);text-decoration:underline;font-family:inherit';
            overlay.appendChild(c);
          }
          c.textContent = 'Cancel';
          c.style.display = '';
          c.onclick = () => { g.userCancelled = true; controller.abort(); };
        }, 15000);
        const abortTimer = setTimeout(() => { g.timedOut = true; controller.abort(); }, 90000);
        g.done = () => {
          clearTimeout(cancelTimer);
          clearTimeout(abortTimer);
          const c = document.getElementById('kp-load-cancel');
          if (c) c.style.display = 'none';
        };
        return g;
      }

      window.__dlSubmit = async function(prompt, opts) {
        const locked = (opts && Array.isArray(opts.locked)) ? opts.locked : null;
        let overlay = document.getElementById('kp-loading-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'kp-loading-overlay';
          overlay.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(250,248,245,0.92);backdrop-filter:blur(6px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px';
          overlay.innerHTML = `
            <div id="kp-load-title" style="font-family:'Cormorant',Georgia,serif;font-size:28px;font-weight:300;color:#202021;text-align:center"></div>
            <div style="font-size:12px;color:var(--ink-faint);letter-spacing:.06em" id="kp-load-msg">Composing your looks</div>
            <div style="width:120px;height:1px;background:rgba(32,32,33,0.1);position:relative;overflow:hidden;margin-top:8px">
              <div id="kp-load-bar" style="position:absolute;inset:0;background:#202021;transform:translateX(-100%);animation:kpLoadBar 2.5s ease-in-out infinite"></div>
            </div>`;
          document.body.appendChild(overlay);
        }
        const loadTitle = document.getElementById('kp-load-title');
        if (loadTitle) loadTitle.innerHTML = locked && locked.length
          ? 'Restyling around<br><em>your anchors…</em>'
          : 'One prompt.<br><em>Dressed for anything.</em>';
        overlay.style.display = 'flex';
        const msgs = ['Reading the day’s context', 'Building anchor to accents…', 'Balancing the proportions…', 'Almost ready…'];
        let mi = 0;
        const msgEl0 = document.getElementById('kp-load-msg');
        if (msgEl0) msgEl0.textContent = msgs[0];
        const msgInterval = setInterval(() => {
          mi = Math.min(mi + 1, msgs.length - 1);
          const el = document.getElementById('kp-load-msg');
          if (el) el.textContent = msgs[mi];
        }, 8000);
        // Deferred location ask: the day's weather is only requested once a
        // dress-me actually needs it (capped so a slow answer never stalls her)
        if (window.__rbWeatherAsk && !(window.__rbCtx && window.__rbCtx.city)) {
          try { await Promise.race([window.__rbWeatherAsk(), new Promise(r => setTimeout(r, 6000))]); } catch (e) {}
        }
        const rc = window.__rbCtx || {};
        const context = {
          city: rc.city || '',
          month: new Date().toLocaleDateString('en-GB', { month: 'long' }),
          tempRange: rc.tempRange || (rc.tempC != null ? rc.tempC + '°C' : ''),
          condition: rc.condition || '',
          hint: rc.hint || '',
        };
        const guard = _rbOverlayGuard(overlay);
        const genId = _rbGenId();
        try {
          const res = await fetch('/api/daily', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: guard.signal,
            body: JSON.stringify({
              prompt,
              name,
              styleDna: _rbStyleDna(), styleIcons: _rbStyleIcons(), gender: _rbGender(),
              wardrobeItems: _waItems.map(i => ({ id: i.id, label: i.label, category: i.category, color: i.color, brand: i.brand, image_url: i.image_url, times_worn: i.times_worn, hero: i.hero_position != null || undefined, seasons: (Array.isArray(i.seasons) && i.seasons.length) ? i.seasons : undefined })),
              context,
              locked: locked || undefined,
              userId: _waUid() || undefined,
              genId,
            }),
          });
          guard.done();
          clearInterval(msgInterval);
          overlay.style.display = 'none';
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          data.genId = genId;
          // Every daily look is anchored to a local calendar date — the
          // change that makes "dress this day" addressable from the rail.
          // A restyle keeps the saved look's original date; a fresh submit
          // defaults to today unless the caller aimed it (opts.anchorDate).
          const savedPrev = (opts && opts.savedId) ? snLoad().find(x => x.id === opts.savedId) : null;
          data.anchor_date = (opts && opts.anchorDate)
            || (savedPrev && savedPrev.dlData && savedPrev.dlData.anchor_date)
            || _pdLocalISO();
          // An evening ask lands as the date's EVENING moment — it
          // coexists with the day's look in planned_days instead of
          // displacing it (restyles keep the saved look's slot).
          data.slot = (opts && opts.slot)
            || (savedPrev && savedPrev.dlData && savedPrev.dlData.slot)
            || undefined;
          // Re-mark the anchors on the fresh look so they stay locked
          if (locked && locked.length) {
            const freshFlat = [];
            (data.steps || []).forEach(s => (s.items || []).forEach(it => freshFlat.push(it)));
            locked.forEach(l => {
              const m = freshFlat.find(it => !it.anchored && (
                (l.wardrobe_id != null && it.wardrobe_match && String(it.wardrobe_match.id) === String(l.wardrobe_id)) ||
                (it.name || '').toLowerCase() === (l.name || '').toLowerCase()));
              if (m) {
                m.anchored = true;
                // The model can drop wardrobe_index on a locked owned piece —
                // restore the match from what the client already knows.
                if (!m.wardrobe_match && l.wardrobe_id != null) {
                  const wi = _waItems.find(w => String(w.id) === String(l.wardrobe_id));
                  if (wi) { m.wardrobe_match = { id: wi.id, label: wi.label, image_url: wi.image_url || null, color: wi.color || '' }; m.retailer_hint = ''; m.price_point = ''; }
                }
              }
            });
          }
          const savedId = opts && opts.savedId;
          window.__dlRenderResult({ ...data, context }, prompt, savedId ? { skipSave: true, savedId } : undefined);
          if (savedId) {
            const saved = snLoad().find(x => x.id === savedId);
            if (saved) {
              snUpdate(savedId, {
                title: data.headline || saved.title,
                dlData: { ...data, context, jobId: undefined, generatedImages: [], prompt: prompt || '' },
              });
              _pdSyncSaved(savedId);
            }
          }
        } catch (err) {
          guard.done();
          clearInterval(msgInterval);
          overlay.style.display = 'none';
          console.error('[Robes] /api/daily error:', err.message);
          if (guard.userCancelled) return;
          _waShowToast(guard.timedOut
            ? 'That took longer than it should — please try again.'
            : 'Robes couldn’t finish that look — please try again in a moment.');
        }
      };

      // ── Daily Look console (Daily Match redesign, amendments 2026-07) ──
      // Left column: "The Look" — a single stylist moodboard (dark panel,
      // Instagram-stylist register) with the interactive stylist note
      // beneath (fresh commentary lands on every restyle). Right column:
      // "The Rack" — the Clueless-style product listing ordered top /
      // bottom (or dress) / shoes / bag / accessories / layer, where every
      // card flicks through similar options (AI alternates + owned pieces
      // in the category), can be anchored (locked through restyles),
      // swapped or shopped. A sticky payoff bar closes the page.
      function _dlSlot(it) {
        const c = (it && it.category || '').toLowerCase();
        if (c.indexOf('top') === 0) return { l: 'Top', o: 1 };
        if (c.indexOf('bottom') === 0) return { l: 'Bottom', o: 2 };
        if (c.indexOf('dress') === 0) return { l: 'Dress', o: 2 };
        if (c.indexOf('shoe') === 0) return { l: 'Shoes', o: 3 };
        if (c.indexOf('bag') === 0) return { l: 'Bag', o: 4 };
        if (c.indexOf('accessor') === 0) return { l: 'Accessory', o: 5 };
        if (c.indexOf('outer') === 0) return { l: 'Layer', o: 6 };
        if (c.indexOf('swim') === 0) return { l: 'Swim', o: 7 };
        return { l: 'Piece', o: 8 };
      }
      function _dlShort(nm) {
        const n = String(nm || '').toLowerCase();
        for (const k of ['tote', 'trench', 'belt', 'scarf', 'clutch']) if (n.indexOf(k) !== -1) return k;
        const w = n.replace(/[^a-z\s-]/g, '').trim().split(/\s+/);
        return w[w.length - 1] || 'piece';
      }
      function _dlFabric(nm) {
        const n = String(nm || '').toLowerCase();
        const map = [['linen', 'linen'], ['silk', 'silk'], ['satin', 'satin'], ['cotton', 'cotton'], ['crochet', 'knit'], ['knit', 'knit'], ['cashmere', 'cashmere'], ['wool', 'wool'], ['denim', 'denim'], ['jean', 'denim'], ['leather', 'leather'], ['suede', 'suede'], ['straw', 'raffia'], ['woven', 'raffia'], ['tee', 'jersey'], ['tank', 'jersey'], ['jersey', 'jersey'], ['polo', 'piqué'], ['sneaker', 'canvas'], ['trainer', 'canvas'], ['loafer', 'leather'], ['sandal', 'leather'], ['boot', 'leather'], ['gold', 'gold'], ['necklace', 'gold'], ['earring', 'gold'], ['sunglass', 'acetate'], ['trench', 'cotton twill'], ['pliss', 'plissé'], ['tweed', 'tweed'], ['velvet', 'velvet']];
        for (const [k, v] of map) if (n.indexOf(k) !== -1) return v;
        return 'textile';
      }
      function _dlAltered(it) {
        return !!(it.orig && (it.orig.name || '').toLowerCase() !== (it.name || '').toLowerCase());
      }
      // Fabric chip row, deduped by label (audit F8) — each builder used to
      // map every item independently, so repeated fabrics (three linen
      // pieces) each rendered their own chip. One chip per distinct fabric,
      // first-appearance order, swatched from the first matching item.
      function _rbcFabricsHtml(items, palette) {
        const seen = new Set();
        const chips = [];
        items.forEach(it => {
          const label = _dlFabric(it.name);
          const key = label.toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);
          const c = (it.wardrobe_match && it.wardrobe_match.color) || '';
          const hex = (c && /^#/.test(c)) ? c : (palette[0] || '#E7E0CF');
          chips.push(`<span class="fab"><span class="sw" style="background:${_waEsc(hex)}"></span><span class="fl">${_waEsc(label)}</span></span>`);
        });
        return chips.join('');
      }
      // The flick-through carousel for one rack card: the original styled
      // piece, then AI alternates and owned wardrobe matches in whichever
      // order opts.aiFirst asks for. Rebuilt from live data each time.
      // opts.aiFirst controls whether AI-suggested alternates or owned
      // wardrobe matches come first after the served original (Build 2's
      // ordering guard): Daily keeps its established order (AI alternates
      // were always generated upfront, ahead of owned); Weekly and Travel
      // — which are quietly protecting the wear-what-you-own north star by
      // only ever offering owned matches — must show owned first, with any
      // newly on-demand-fetched AI alternates trailing behind, never ahead.
      function _dlOptions(it, opts) {
        const aiFirst = !opts || opts.aiFirst !== false;
        if (!it.orig) it.orig = { name: it.name, brand: it.brand || '', retailer_hint: it.retailer_hint || '', price_point: it.price_point || '', wardrobe_match: it.wardrobe_match || null, how: it.how || '' };
        const origOpt = { kind: 'orig', name: it.orig.name, brand: it.orig.brand, retailer_hint: it.orig.retailer_hint, price_point: it.orig.price_point, wardrobe_match: it.orig.wardrobe_match, how: it.orig.how };
        const aiOpts = [];
        (Array.isArray(it.alternates) ? it.alternates : []).forEach(a => {
          if (a && a.name && a.name.toLowerCase() !== origOpt.name.toLowerCase() && !aiOpts.some(o => (o.name || '').toLowerCase() === a.name.toLowerCase())) {
            aiOpts.push({ kind: 'ai', name: a.name, brand: a.brand || '', retailer_hint: a.retailer_hint || '', price_point: a.price_point || '', how: a.how || '' });
          }
        });
        const catL = (it.category || '').toLowerCase().replace(/s$/, '');
        const origId = it.orig.wardrobe_match ? String(it.orig.wardrobe_match.id) : null;
        const ownedOpts = [];
        _waItems.filter(wi => ((wi.category || '').toLowerCase().replace(/s$/, '') === catL) && String(wi.id) !== origId)
          .slice(0, 4)
          .forEach(wi => ownedOpts.push({ kind: 'owned', name: wi.label, brand: wi.brand || '', retailer_hint: '', price_point: '', wardrobeId: wi.id, image: wi.image_url || null, color: wi.color || '' }));
        return aiFirst ? [origOpt, ...aiOpts, ...ownedOpts] : [origOpt, ...ownedOpts, ...aiOpts];
      }
      function _dlOptIndex(it, list) {
        if (it.wardrobe_match) {
          const i = list.findIndex(o =>
            (o.kind === 'owned' && String(o.wardrobeId) === String(it.wardrobe_match.id)) ||
            (o.kind === 'orig' && o.wardrobe_match && String(o.wardrobe_match.id) === String(it.wardrobe_match.id)));
          if (i !== -1) return i;
        }
        const i = list.findIndex(o => (o.name || '').toLowerCase() === (it.name || '').toLowerCase());
        return i === -1 ? 0 : i;
      }
      function _dlApplyOption(it, o) {
        if (o.kind === 'owned') {
          it.wardrobe_match = { id: o.wardrobeId, label: o.name, image_url: o.image || null, color: o.color || '' };
          it.name = o.name; it.brand = o.brand; it.retailer_hint = ''; it.price_point = '';
        } else {
          it.name = o.name; it.brand = o.brand; it.retailer_hint = o.retailer_hint; it.price_point = o.price_point;
          it.wardrobe_match = (o.kind === 'orig' && o.wardrobe_match) ? o.wardrobe_match : null;
        }
        // The row note describes how a SPECIFIC piece is worn — it can't
        // follow a flick/swap without going stale. The original option keeps
        // its generated note; an on-demand alternate (Build 2) carries its
        // own; anything else (a legacy alternate, an owned swap-in) has none
        // rather than showing a mismatched line.
        it.how = o.how || '';
      }

      // ── On-demand AI alternates (Tranche 2, Build 2) — Weekly and Travel
      // carry no per-item alternates upfront (unlike Daily's schema); a
      // single small endpoint fetches 2 for ONE piece, triggered when she
      // engages with Swap — never on render — and cached for the rest of
      // the session (keyed on surface+category+name) so re-opening Swap on
      // the same piece never re-fetches. Populating it.alternates here is
      // enough — the shared carousel (_dlOptions) already reads it live.
      const _rbAltCache = new Map();
      function _rbAltKey(surface, it) {
        return surface + '|' + String(it.category || '').toLowerCase() + '|' + String(it.name || '').toLowerCase();
      }
      function _rbFetchAlternates(it, surface, otherNames) {
        if (Array.isArray(it.alternates) && it.alternates.length) return Promise.resolve(it.alternates);
        const key = _rbAltKey(surface, it);
        let p = _rbAltCache.get(key);
        if (!p) {
          p = fetch('/api/alternates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              item: { name: it.name, category: it.category, brand: it.brand },
              context: otherNames || [],
              styleDna: (typeof _rbStyleDna === 'function') ? _rbStyleDna() : null,
              styleIcons: (typeof _rbStyleIcons === 'function') ? _rbStyleIcons() : null,
              gender: (typeof _rbGender === 'function') ? _rbGender() : undefined,
            }),
          }).then(r => r.json()).then(d => Array.isArray(d.alternates) ? d.alternates : []).catch(() => []);
          _rbAltCache.set(key, p);
        }
        return p.then(alts => { if (alts.length) it.alternates = alts; return alts; });
      }
      // Fires the fetch for every not-yet-fetched piece in the visible
      // day/slot in the background, then repaints once so the carousel
      // dot-count reflects whatever landed — this is the "prefetch the
      // visible day only" half that covers most of Build 2's accepted
      // latency cost. A no-op (no fetch, no repaint) once everything in
      // view already has alternates, so it's safe to call on every day/
      // slot switch without re-fetching or looping.
      function _rbPrefetchAlternates(items, surface, repaintFn) {
        if (!Array.isArray(items) || !items.length) return;
        const pending = items.filter(it => !(Array.isArray(it.alternates) && it.alternates.length));
        if (!pending.length) return;
        const names = items.map(it => it.name).filter(Boolean);
        Promise.all(pending.map(it => _rbFetchAlternates(it, surface, names.filter(n => n !== it.name))))
          .then(results => {
            if (results.some(a => a && a.length) && typeof repaintFn === 'function') repaintFn();
          });
      }

      // ── Shared Look/Rack console (audit P1 — one canonical template) ──
      // Renders the two console halves for the Daily, Weekly and Travel day
      // consoles from ONE markup + ONE stylesheet (.rbc-*). The surfaces
      // stay thin adapters: they supply frames, provenance lines and their
      // own handlers; the structure itself never forks again.
      const _rbcChevL = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
      const _rbcChevR = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
      const _rbcLockSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
      const _rbcSwapSvg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>`;
      const _rbcCheckSvg = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

      // Display-side price normaliser (audit F3/D4) — the model sometimes
      // emits "EUR550" instead of "€550" (only Weekly's prompt lacked the €
      // example); this is defence in depth, not a substitute for that fix.
      function _rbcPrice(raw) {
        const s = String(raw || '').trim();
        if (!s) return '';
        const m = s.match(/^(?:EUR|eur)\s*(.+)$/);
        return m ? '€' + m[1] : s;
      }

      // Deduped retailer + formatted price for an unowned piece (audit
      // F4/F5/D5) — the retailer is omitted when it just repeats the brand
      // (case/whitespace-insensitive). Shared by _rbcProvenance (Rack rows)
      // and the Travel capsule card (brief 2026-07-22 §B.1) — the capsule
      // card's markup doesn't match the Rack row shape, so it can't reuse
      // _rbcProvenance's full HTML output, but it must reuse this logic
      // rather than re-deriving it, which is what produced "ZARA · ZARA".
      function _rbcRetailPrice(it) {
        const brand = (it.brand || '').trim();
        const retailerRaw = (it.retailer_hint || '').trim();
        const retailer = (retailerRaw && retailerRaw.toLowerCase() !== brand.toLowerCase()) ? retailerRaw : '';
        return [retailer, _rbcPrice(it.price_point)].filter(Boolean).join(' · ');
      }

      // Shared provenance line for a rack row (audit F1/F4/F5/D5) — owned
      // pieces show the ownership tick; unowned pieces show brand + a
      // retailer/price line. `extraHtml` lets a surface prefix a state tag
      // (Travel's Worth adding / Added to the pack).
      function _rbcProvenance(it, extraHtml) {
        if (it.wardrobe_match) return `<span class="owned">${_rbcCheckSvg} In your wardrobe</span>`;
        const brand = (it.brand || '').trim();
        const retailPrice = _rbcRetailPrice(it);
        return `${extraHtml || ''}${brand ? `<span class="brand">${_waEsc(brand)}</span>` : ''}${retailPrice ? `<span class="price">${_waEsc(retailPrice)}</span>` : ''}`;
      }

      const _RBC_CSS = `
.rbc-panel{background:#fff;border:0.5px solid var(--rule-mid);border-radius:var(--rad-lg);padding:18px}
.rbc-lhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.rbc-lhead .lab{font-size:9px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-faint)}
.rbc-lhead .robes{font-size:9px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--rose)}
.rbc-quote{font-family:var(--font-serif);font-style:italic;font-weight:300;font-size:16px;line-height:1.42;color:var(--ink-soft);margin-bottom:14px;padding-left:13px;border-left:2px solid var(--rose-mid)}
.rbc-board{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.rbc-tile{position:relative;border-radius:var(--rad-sm);overflow:hidden;aspect-ratio:1/1.16;text-align:left;padding:0;background:var(--cream-200);border:0.5px solid var(--rule-mid);cursor:pointer}
.rbc-tile.wide{grid-column:span 2;aspect-ratio:2/1.05}
.rbc-tile.isnew{border:1px dashed rgba(185,138,78,0.6)}
.rbc-tile .tgrad{position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,rgba(0,0,0,0.42));z-index:1;pointer-events:none}
.rbc-tile .tslot{position:absolute;left:9px;top:8px;z-index:2;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:#fff;background:rgba(32,32,33,0.42);padding:3px 7px;border-radius:100px}
.rbc-tile .tlab{position:absolute;left:10px;bottom:9px;right:10px;z-index:2;font-family:var(--font-serif);font-style:italic;font-weight:400;font-size:15px;color:#fff;line-height:1.05;pointer-events:none}
.rbc-tile .town{position:absolute;top:7px;right:7px;z-index:2;width:18px;height:18px;border-radius:50%;background:#fff;display:grid;place-items:center;color:#4A7C59}
.rbc-tile .tadd{position:absolute;top:7px;right:7px;z-index:2;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#fff;background:rgba(185,138,78,0.92);padding:2px 7px;border-radius:100px}
.rbc-tile .tnav{position:absolute;top:50%;transform:translateY(-50%);z-index:3;width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.92);border:0.5px solid var(--rule-mid);display:grid;place-items:center;opacity:0;transition:opacity .15s;padding:0;color:var(--ink);cursor:pointer}
.rbc-tile:hover .tnav{opacity:1}
.rbc-tile .tnav.l{left:6px}
.rbc-tile .tnav.r{right:6px}
.rbc-fabrics{display:flex;flex-wrap:wrap;gap:9px 14px;margin-top:14px;padding-top:13px;border-top:0.5px solid var(--rule)}
.rbc-fabrics .fab{display:flex;align-items:center;gap:7px}
.rbc-fabrics .sw{width:14px;height:14px;border-radius:3px;border:0.5px solid var(--rule-mid);display:block}
.rbc-fabrics .fl{font-family:var(--font-serif);font-style:italic;font-size:12.5px;color:var(--ink-faint)}
.rbc-lfoot{display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:13px;border-top:0.5px solid var(--rule)}
.rbc-palette{display:flex;gap:5px}
.rbc-palette span{width:14px;height:14px;border-radius:50%;border:0.5px solid var(--rule-mid);display:block}
.rbc-yours{font-size:10px;letter-spacing:.02em;color:var(--ink-faint)}
.rbc-yours b{color:var(--ink);font-weight:500}
.rbc-read{border:0.5px solid var(--rule-mid);border-radius:var(--rad);background:var(--cream-100);padding:15px 16px;margin-top:13px}
.rbc-read .rh{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.rbc-read .lab{font-size:9px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-faint)}
.rbc-read .score{font-family:var(--font-serif);font-weight:300;font-size:20px;color:var(--ink)}
.rbc-read .score .of{font-size:11px;color:var(--ink-faint)}
.rbc-read .bar{position:relative;height:5px;border-radius:100px;background:var(--cream-200);overflow:hidden}
.rbc-read .bar span{position:absolute;left:0;top:0;height:100%;border-radius:100px;transition:width .4s,background .4s;display:block}
.rbc-read p{font-size:12.5px;line-height:1.6;color:#3A3733;margin:11px 0 0}
.rbc-rackhead{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px;flex-wrap:wrap}
.rbc-rackhead .ey{font-size:10px;font-weight:500;letter-spacing:.24em;text-transform:uppercase;color:var(--rose)}
.rbc-rackhead h2{font-family:var(--font-serif);font-weight:300;font-style:italic;font-size:25px;line-height:1.05;margin:6px 0 0;color:var(--ink)}
.rbc-hbtns{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.rbc-hbtn{display:inline-flex;align-items:center;gap:7px;border:0.5px solid var(--rule-mid);border-radius:100px;padding:9px 15px;font-size:11.5px;color:var(--ink-soft);background:#fff;cursor:pointer;transition:all .15s;white-space:nowrap;font-family:inherit}
.rbc-hbtn:hover{border-color:rgba(32,32,33,0.22);color:var(--ink)}
.rbc-rack{display:flex;flex-direction:column;gap:12px}
.rbc-row{position:relative;display:grid;grid-template-columns:112px 1fr;gap:16px;align-items:stretch;border:0.5px solid var(--rule-mid);border-radius:var(--rad);background:#fff;padding:12px;transition:border-color .2s,background .2s}
.rbc-row.anchored{border-color:var(--ink)}
.rbc-row.packed{border-color:rgba(126,124,90,0.5);background:var(--sage-bg)}
.rbc-rm{position:absolute;top:-7px;right:-7px;z-index:4;width:22px;height:22px;border-radius:50%;border:0.5px solid var(--rule-mid);background:#fff;color:var(--ink-faint);font-size:13px;line-height:1;display:grid;place-items:center;cursor:pointer;opacity:.45;transition:opacity .15s,color .15s;padding:0;box-shadow:0 1px 4px rgba(32,32,33,0.08)}
.rbc-row:hover .rbc-rm{opacity:1}
.rbc-rm:hover{color:var(--ink);border-color:rgba(32,32,33,0.25)}
.rbc-vp{position:relative;align-self:start;width:100%;border-radius:var(--rad-sm);overflow:hidden;background:var(--cream-200);aspect-ratio:1/1}
.rbc-vp .vslot{position:absolute;top:8px;left:8px;z-index:2;font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink);background:rgba(255,255,255,0.86);padding:3px 7px;border-radius:100px}
.rbc-vp .vlooks{position:absolute;bottom:8px;left:8px;z-index:2;font-size:9px;letter-spacing:.04em;color:var(--ink);background:rgba(255,255,255,0.86);padding:3px 7px;border-radius:100px;white-space:nowrap}
.rbc-vp .vcount{position:absolute;bottom:8px;right:8px;z-index:2;font-size:9px;letter-spacing:.04em;color:var(--ink);background:rgba(255,255,255,0.86);padding:3px 7px;border-radius:100px}
.rbc-body{display:flex;flex-direction:column;justify-content:space-between;min-width:0;padding:2px 0}
.rbc-namerow{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.rbc-name{font-family:var(--font-serif);font-weight:400;font-size:21px;line-height:1.08;color:var(--ink)}
.rbc-anchpill{display:inline-flex;align-items:center;gap:5px;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);border:0.5px solid var(--rule-mid);border-radius:100px;padding:3px 9px;flex:none}
.rbc-sub{display:flex;align-items:center;gap:8px;margin-top:6px;font-size:12px;color:var(--ink-faint);flex-wrap:wrap}
.rbc-sub .price{color:var(--ink)}
.rbc-sub .brand{font-family:var(--font-serif);font-style:italic;font-size:13px}
.rbc-sub .owned{display:inline-flex;align-items:center;gap:5px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#4A7C59}
.rbc-sub .addtag{display:inline-flex;align-items:center;gap:5px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#8F6A2E}
.rbc-hownote{font-size:11.5px;line-height:1.5;color:var(--ink-soft);margin-top:7px;font-style:italic;font-family:var(--font-serif)}
.rbc-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:13px;flex-wrap:wrap}
.rbc-flip{display:flex;align-items:center;gap:9px}
.rbc-arrow{width:32px;height:32px;border:0.5px solid var(--rule-mid);border-radius:50%;display:grid;place-items:center;background:#fff;cursor:pointer;transition:all .15s;color:var(--ink);padding:0}
.rbc-arrow:hover{background:var(--ink);border-color:var(--ink);color:#fff}
.rbc-dots{display:flex;gap:5px;padding:0 2px}
.rbc-dots span{width:5px;height:5px;border-radius:50%;background:var(--cream-400);display:block;transition:all .2s}
.rbc-dots span.on{background:var(--ink);transform:scale(1.25)}
.rbc-acts{display:flex;gap:7px;flex-wrap:wrap;align-items:center}
.rbc-act{display:inline-flex;align-items:center;gap:6px;border:0.5px solid var(--rule-mid);border-radius:100px;padding:8px 13px;font-size:11px;letter-spacing:.01em;background:#fff;color:var(--ink-soft);cursor:pointer;transition:all .15s;font-family:inherit}
.rbc-act:hover{border-color:rgba(32,32,33,0.22);color:var(--ink)}
.rbc-act.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.rbc-act.save{background:var(--ink);color:#fff;border-color:var(--ink)}
.rbc-act.save:hover{opacity:.85;color:#fff}
.rbc-act.done{cursor:default;color:var(--ink-faint)}
.rbc-act.done:hover{border-color:var(--rule-mid);color:var(--ink-faint)}
.rbc-addpiece{margin-top:12px;width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px dashed var(--rule-mid);border-radius:var(--rad);padding:13px;font-size:12px;letter-spacing:.02em;background:transparent;color:var(--ink-soft);cursor:pointer;transition:all .15s;font-family:inherit}
.rbc-addpiece:hover{border-color:var(--ink-faint);color:var(--ink);background:#fff}
.rbd-strip{display:grid;grid-auto-flow:column;grid-auto-columns:200px;gap:10px;overflow-x:auto;padding-bottom:10px;margin-bottom:24px;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch}
.rbd-day{scroll-snap-align:start;position:relative;text-align:left;border:0.5px solid var(--rule-mid);border-radius:var(--rad);background:#fff;padding:13px 13px 12px;min-height:132px;display:flex;flex-direction:column;cursor:pointer;transition:border-color .2s,background .2s;font-family:inherit}
.rbd-day:hover{border-color:rgba(32,32,33,0.22)}
.rbd-day.active{border-color:var(--ink);background:var(--cream-100)}
.rbd-day.dim{opacity:.65}
.rbd-day .dtop{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.rbd-day .ddow{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink);font-weight:500}
.rbd-day .dright{display:inline-flex;align-items:center;gap:7px}
.rbd-day .ddate{font-size:9.5px;color:var(--ink-faint);white-space:nowrap}
.rbd-day .dst{width:8px;height:8px;border-radius:50%;border:1px solid var(--cream-400);background:transparent;display:block}
.rbd-day .dst.done{background:var(--sage);border-color:var(--sage)}
.rbd-day .dev{font-family:var(--font-serif);font-weight:400;font-size:16px;line-height:1.12;color:var(--ink);margin-bottom:4px}
.rbd-day .dmeta{font-size:10px;color:var(--ink-faint);line-height:1.4;margin-bottom:10px}
.rbd-day .dth{margin-top:auto;display:flex}
.rbd-day .dth span{width:24px;height:32px;border-radius:4px;overflow:hidden;border:0.5px solid var(--rule-mid);margin-left:-5px;background:var(--cream-200);display:block;background-size:cover;background-position:center}
.rbd-day .dth span:first-child{margin-left:0}
@media(max-width:900px){
.rbd-strip{grid-auto-columns:150px}
}
@media(max-width:520px){
.rbc-row{grid-template-columns:88px 1fr;gap:12px}
.rbc-name{font-size:18px}
}

/* ══ The Look, recomposed (design brief 2026-07-22) — the standing design.
   The Look is the finished artifact: a fixed 4:5 composition with a scale
   hierarchy, captions removed, one primary action. Keyed to body.rb-lookv2
   (added on every console render). The pre-2026-07-22 board rules above are
   now dead (always overridden here) — kept out of this pass to keep the
   graduation diff safe; a later cleanup can drop them. ══ */
/* Column — 480px fixed, all three surfaces (beats the #id rules → !important) */
.rb-lookv2 .dlm-console,.rb-lookv2 .wk-con,.rb-lookv2 .tvm-console{grid-template-columns:480px minmax(0,1fr) !important;gap:34px !important}
/* Panel becomes a flex column so the below-composition blocks can be ordered */
.rb-lookv2 .rbc-panel{display:flex;flex-direction:column}
.rb-lookv2 .rbc-lhead{order:0}
.rb-lookv2 .tvm-occ,.rb-lookv2 .rbc-occ{order:1}
.rb-lookv2 .rbc-board{order:2}
.rb-lookv2 .rbc-quote{order:3}
.rb-lookv2 .rbc-lfoot{display:contents}
.rb-lookv2 .rbc-palette{order:4}
.rb-lookv2 .rbc-fabrics{order:5}
.rb-lookv2 .rbc-yours{order:6}
.rb-lookv2 .rbc-action{order:8}
/* The export region — 4:5, 6×7 grid, columns ≈68px, hero ≈296px */
.rb-lookv2 .rbc-board{aspect-ratio:4/5;grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(7,1fr);gap:8px;padding:0;margin:0}
.rb-lookv2 .rbc-tile{aspect-ratio:auto;border-radius:0;border:none;cursor:default;pointer-events:none;min-width:0;min-height:0;container-type:size}
.rb-lookv2 .rbc-tile img{object-position:center}
/* The Look is the finished artifact — the only tile chrome kept is the
   owned tick. The "Add" commercial pill is stripped here (it belongs on the
   Rack, where she acts on pieces), and every caption/label/chevron is gone. */
.rb-lookv2 .rbc-tile .tslot,.rb-lookv2 .rbc-tile .tlab,.rb-lookv2 .rbc-tile .tnav,.rb-lookv2 .rbc-tile .tgrad,.rb-lookv2 .rbc-tile .tadd{display:none}
.rb-lookv2 .rbc-tile .town{top:8px;right:8px;width:19px;height:19px;box-shadow:0 1px 4px rgba(32,32,33,.16)}
/* Day/Evening selector — equal-width segments (id-scoped to beat the base
   #tv-result-page rule without !important) */
.rb-lookv2 #tv-result-page .tvm-occ{display:flex;width:220px;max-width:100%}
.rb-lookv2 #tv-result-page .tvm-occ button{flex:1;padding-left:4px;padding-right:4px;text-align:center}
/* Monogram fallback (Weekly) — sized from the tile, not fixed (§F) */
/* Scoped to the Look tile specifically — .rbc-mono is shared with the Rack
   row viewport (.rbc-vp) and the Travel capsule card, neither of which sets
   container-type:size; unscoped cqmin there falls back to the viewport and
   renders wildly oversized (verified: 252px in a 112px cell). */
.rb-lookv2 .rbc-tile .rbc-mono{font-size:42cqmin !important}
/* Scale hierarchy — placement by piece count. Hero is the first tile in
   slot order (the current wide-tile fallback). Empty cells are deliberate
   breathing room; the collapse rules avoid holes. */
.rb-lookv2 .rbc-board[data-n="6"] .rbc-tile:nth-child(1){grid-column:1/5;grid-row:1/5}
.rb-lookv2 .rbc-board[data-n="6"] .rbc-tile:nth-child(2){grid-column:5/7;grid-row:1/3}
.rb-lookv2 .rbc-board[data-n="6"] .rbc-tile:nth-child(3){grid-column:5/7;grid-row:3/5}
.rb-lookv2 .rbc-board[data-n="6"] .rbc-tile:nth-child(4){grid-column:1/3;grid-row:5/8}
.rb-lookv2 .rbc-board[data-n="6"] .rbc-tile:nth-child(5){grid-column:3/5;grid-row:5/7}
.rb-lookv2 .rbc-board[data-n="6"] .rbc-tile:nth-child(6){grid-column:5/7;grid-row:5/8}
.rb-lookv2 .rbc-board[data-n="5"] .rbc-tile:nth-child(1){grid-column:1/5;grid-row:1/5}
.rb-lookv2 .rbc-board[data-n="5"] .rbc-tile:nth-child(2){grid-column:5/7;grid-row:1/3}
.rb-lookv2 .rbc-board[data-n="5"] .rbc-tile:nth-child(3){grid-column:5/7;grid-row:3/5}
.rb-lookv2 .rbc-board[data-n="5"] .rbc-tile:nth-child(4){grid-column:1/4;grid-row:5/8}
.rb-lookv2 .rbc-board[data-n="5"] .rbc-tile:nth-child(5){grid-column:4/7;grid-row:5/8}
.rb-lookv2 .rbc-board[data-n="4"] .rbc-tile:nth-child(1){grid-column:1/5;grid-row:1/6}
.rb-lookv2 .rbc-board[data-n="4"] .rbc-tile:nth-child(2){grid-column:5/7;grid-row:1/4}
.rb-lookv2 .rbc-board[data-n="4"] .rbc-tile:nth-child(3){grid-column:5/7;grid-row:4/8}
.rb-lookv2 .rbc-board[data-n="4"] .rbc-tile:nth-child(4){grid-column:1/5;grid-row:6/8}
.rb-lookv2 .rbc-board[data-n="3"] .rbc-tile:nth-child(1){grid-column:1/5;grid-row:1/8}
.rb-lookv2 .rbc-board[data-n="3"] .rbc-tile:nth-child(2){grid-column:5/7;grid-row:1/4}
.rb-lookv2 .rbc-board[data-n="3"] .rbc-tile:nth-child(3){grid-column:5/7;grid-row:4/8}
.rb-lookv2 .rbc-board[data-n="2"] .rbc-tile:nth-child(1){grid-column:1/5;grid-row:1/8}
.rb-lookv2 .rbc-board[data-n="2"] .rbc-tile:nth-child(2){grid-column:5/7;grid-row:1/8}
/* Below the composition (§G): note → palette → fabric → ownership → action */
.rb-lookv2 .rbc-quote{margin:16px 0 0;padding-left:0;border-left:none;font-size:15px;line-height:1.62}
.rb-lookv2 .rbc-palette{margin-top:16px;gap:6px}
.rb-lookv2 .rbc-palette span{width:16px;height:16px}
.rb-lookv2 .rbc-fabrics{margin-top:16px;padding-top:0;border-top:none;gap:8px}
.rb-lookv2 .rbc-fabrics .fab{border:1px solid var(--rule-mid);border-radius:100px;padding:4px 9px;gap:6px}
.rb-lookv2 .rbc-fabrics .sw{width:9px;height:9px;border-radius:2px}
.rb-lookv2 .rbc-fabrics .fl{font-family:inherit;font-style:normal;font-size:9px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-soft)}
.rb-lookv2 .rbc-yours{margin-top:16px}
/* Daily/Weekly verdict line — bare copy beneath the ownership count, no box,
   no rule (the boxed "Read" is Travel-only now) */
.rb-lookv2 .rbc-action{margin-top:12px;padding-top:14px;border-top:0.5px solid var(--rule)}
.rb-lookv2 .rbc-action button{width:100%;border:none;background:var(--ink);color:var(--cream-100);border-radius:100px;padding:14px;font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;font-family:inherit;transition:opacity .15s}
.rb-lookv2 .rbc-action button:hover{opacity:.88}
/* Responsive — below 1080px stack Look above Rack; composition keeps 4:5 */
@media(max-width:1080px){
.rb-lookv2 .dlm-console,.rb-lookv2 .wk-con,.rb-lookv2 .tvm-console{grid-template-columns:1fr !important}
.rb-lookv2 .rbc-panel{max-width:480px;margin-left:auto;margin-right:auto}
}`;

      function _rbcEnsureCss() {
        if (!document.getElementById('rbc-style')) {
          const el = document.createElement('style');
          el.id = 'rbc-style';
          el.textContent = _RBC_CSS;
          document.head.appendChild(el);
        }
        // The recomposed Look (design brief 2026-07-22) is the standing design.
        // rb-lookv2 stays as the stable styling hook the .rbc-* CSS keys on.
        document.body.classList.add('rb-lookv2');
      }

      // Recompose transition (design brief §6/§H): when a piece changes on the
      // Rack, the affected Look tile settles back in. Single-phase settle
      // (the full re-render has already swapped the image); honours
      // prefers-reduced-motion. The apply handlers call this with the same idx
      // they operate on (tiles carry data-tilekey="idx").
      window.__rbcAnimateTile = function(idx) {
        try {
          if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
          const el = document.querySelector('.rbc-board .rbc-tile[data-tilekey="' + idx + '"]');
          if (!el || !el.animate) return;
          el.animate(
            [{ opacity: 0.35, transform: 'scale(0.94)' }, { opacity: 1, transform: 'scale(1)' }],
            { duration: 450, easing: 'cubic-bezier(0.22,0.61,0.36,1)' }
          );
        } catch (e) {}
      };

      // "The read" — the boxed verdict block. Now a TRAVEL-ONLY component
      // (brief 2026-07-22 supersedes Tranche 1 §3.1): Travel has a real
      // completion state (packed count), so the score + bar are meaningful.
      // Daily/Weekly render a bare verdict line in the footer instead — no
      // box, no header score, no bar (a 6/6 target nobody's reaching reads
      // as a shortfall). _rbcReadBlock itself is unchanged.
      function _rbcReadBlock(opts) {
        const pct = opts.total ? Math.round(opts.score / opts.total * 100) : 0;
        return `<div class="rbc-read">
          <div class="rh">
            <span class="lab">The read</span>
            <span class="score">${opts.score} / ${opts.total}<span class="of"> ${opts.unit}</span></span>
          </div>
          <div class="bar"><span style="width:${pct}%;background:${opts.clean ? 'var(--sage)' : '#B98A4E'}"></span></div>
          <p>${opts.verdict}</p>
        </div>`;
      }

      // Swipe-to-remove (mobile): a horizontal drag past the threshold on
      // any [data-rmfn] element fires its handler — rack rows animate out,
      // data-rmconfirm surfaces (lookbook cards) snap back and let the
      // handler's confirmation modal do the destructive step. The guard is
      // a window flag (not a let) so early boot callers can't hit the TDZ.
      function _rbcInitSwipe() {
        if (window.__rbcSwipeOn) return;
        window.__rbcSwipeOn = true;
        let row = null, sx = 0, sy = 0, dx = 0, horiz = null;
        document.addEventListener('touchstart', (e) => {
          row = e.target.closest ? e.target.closest('[data-rmfn]') : null;
          if (!row) return;
          const t = e.touches[0];
          sx = t.clientX; sy = t.clientY; dx = 0; horiz = null;
          row.style.transition = '';
        }, { passive: true });
        document.addEventListener('touchmove', (e) => {
          if (!row) return;
          const t = e.touches[0];
          const mx = t.clientX - sx, my = t.clientY - sy;
          if (horiz === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) horiz = Math.abs(mx) > Math.abs(my);
          if (!horiz) return;
          dx = Math.min(0, mx);
          row.style.transform = 'translateX(' + dx + 'px)';
          row.style.opacity = String(Math.max(0.35, 1 + dx / 300));
        }, { passive: true });
        document.addEventListener('touchend', () => {
          if (!row) return;
          const r = row;
          row = null;
          r.style.transition = 'transform .18s ease, opacity .18s ease';
          if (dx < -90) {
            const fn = r.getAttribute('data-rmfn'), idx = Number(r.getAttribute('data-rmidx'));
            if (r.hasAttribute('data-rmconfirm')) {
              // The handler brings its own confirmation modal — snap the
              // card back and let the modal be the destructive step.
              r.style.transform = '';
              r.style.opacity = '';
              if (typeof window[fn] === 'function') window[fn](idx);
            } else {
              r.style.transform = 'translateX(-110%)';
              r.style.opacity = '0';
              setTimeout(() => {
                if (typeof window[fn] === 'function') window[fn](idx);
                // If the guard declined (row still in the DOM), snap it back
                setTimeout(() => { if (r.isConnected) { r.style.transform = ''; r.style.opacity = ''; } }, 60);
              }, 180);
            }
          } else {
            r.style.transform = '';
            r.style.opacity = '';
          }
        }, { passive: true });
      }

      function _rbcTile(it, wide, cfg) {
        return `<button class="rbc-tile${wide ? ' wide' : ''}${it.isNew ? ' isnew' : ''}" data-tilekey="${it.idx}" onclick="window.${cfg.onSwap}(${it.idx})" title="Swap the ${_waEsc(it.shortName)}">
          <div${it.frame.pollAttr} style="position:absolute;inset:0;background:var(--cream-200)">${it.frame.inner}</div>
          <div class="tgrad"></div>
          <span class="tslot">${_waEsc(it.slot)}</span>
          ${it.owned ? `<span class="town">${_rbcCheckSvg}</span>` : (it.showAddTag ? `<span class="tadd">${_waEsc(cfg.addChipLabel || 'Add')}</span>` : '')}
          <span class="tnav l" onclick="event.stopPropagation();window.${cfg.onFlip}(${it.idx},-1)" title="Previous">${_rbcChevL}</span>
          <span class="tnav r" onclick="event.stopPropagation();window.${cfg.onFlip}(${it.idx},1)" title="Next">${_rbcChevR}</span>
          <span class="tlab">the ${_waEsc(it.shortName)}</span>
        </button>`;
      }

      function _rbcRow(it, cfg) {
        const dots = it.count.len > 1 && it.count.len <= 8
          ? `<span class="rbc-dots">${Array.from({ length: it.count.len }, (_, k) => `<span${k === it.count.cur ? ' class="on"' : ''}></span>`).join('')}</span>`
          : (it.count.len > 8 ? `<span style="font-size:9px;letter-spacing:.08em;color:var(--ink-faint)">${it.count.cur + 1} / ${it.count.len}</span>` : '');
        return `<div class="rbc-row${it.anchored ? ' anchored' : ''}${it.rowClass || ''}"${cfg.onRemove ? ` data-rmfn="${cfg.onRemove}" data-rmidx="${it.idx}"` : ''}>
          ${cfg.onRemove ? `<button class="rbc-rm" onclick="window.${cfg.onRemove}(${it.idx})" title="Remove from this look" aria-label="Remove from this look">×</button>` : ''}
          <div class="rbc-vp">
            <span class="vslot">${_waEsc(it.slot)}</span>
            <div${it.frame.pollAttr} style="position:absolute;inset:0">${it.frame.inner}</div>
            ${it.wearsHtml || ''}
            ${it.count.len > 1 ? `<span class="vcount">${it.count.cur + 1} / ${it.count.len}</span>` : ''}
          </div>
          <div class="rbc-body">
            <div>
              <div class="rbc-namerow">
                <div class="rbc-name">${_waEsc(it.name)}</div>
                ${it.anchored ? `<span class="rbc-anchpill">${_rbcLockSvg} Anchored</span>` : ''}
              </div>
              <div class="rbc-sub">${it.subHtml}</div>
              ${it.noteHtml || ''}
            </div>
            <div class="rbc-foot">
              <div class="rbc-flip">
                <button class="rbc-arrow" onclick="window.${cfg.onFlip}(${it.idx},-1)" aria-label="Previous option">${_rbcChevL}</button>
                ${dots}
                <button class="rbc-arrow" onclick="window.${cfg.onFlip}(${it.idx},1)" aria-label="Next option">${_rbcChevR}</button>
              </div>
              <div class="rbc-acts">
                ${cfg.onAnchor ? `<button class="rbc-act${it.anchored ? ' on' : ''}" onclick="window.${cfg.onAnchor}(${it.idx})" title="Lock this piece through restyles">${_rbcLockSvg} ${it.anchored ? 'Anchored' : 'Anchor'}</button>` : ''}
                <button class="rbc-act" onclick="window.${cfg.onSwap}(${it.idx})">${_rbcSwapSvg} Swap</button>
                ${it.thirdHtml || ''}
              </div>
            </div>
          </div>
        </div>`;
      }

      function _rbConsole(cfg, items) {
        _rbcEnsureCss();
        _rbcInitSwipe();
        // Ownership-count copy is canonical across all three surfaces
        // (audit F1) — computed here, once, from the items every surface
        // already hands in, rather than three call sites agreeing on a string.
        const ownedCount = items.filter(it => it.owned).length;
        const yoursHtml = `<b>${ownedCount}</b>&thinsp;of&thinsp;${items.length} from your wardrobe`;
        // The composition is a fixed 4:5 export region taking the first six
        // pieces in slot order (the Rack still lists everything).
        const boardItems = items.slice(0, 6);
        const actionHtml = cfg.lookActionHtml
          ? `<div class="rbc-action">${cfg.lookActionHtml}</div>` : '';
        const lookHtml = `
          <div class="rbc-panel">
            <div class="rbc-lhead">
              <span class="lab">${cfg.headLabel}</span>
              <span class="robes">Robes</span>
            </div>
            ${cfg.occHtml || ''}
            ${cfg.quoteHtml ? `<div class="rbc-quote">${cfg.quoteHtml}</div>` : ''}
            <div class="rbc-board" data-n="${boardItems.length}">${boardItems.map((it, i) => _rbcTile(it, i === 0, cfg)).join('')}</div>
            ${cfg.fabricsHtml ? `<div class="rbc-fabrics">${cfg.fabricsHtml}</div>` : ''}
            <div class="rbc-lfoot">
              <span class="rbc-palette">${cfg.paletteHtml || ''}</span>
              <span class="rbc-yours">${yoursHtml}</span>
            </div>
            ${actionHtml}
          </div>
          ${cfg.panelExtraHtml || ''}`;
        const rackHtml = `
          <div class="rbc-rackhead">
            <div style="min-width:0">
              <span class="ey">${cfg.rackLabel}</span>
              ${cfg.rackTitleHtml || ''}
            </div>
            <div class="rbc-hbtns">${cfg.headButtonsHtml || ''}</div>
          </div>
          ${cfg.rackHintHtml || ''}
          <div class="rbc-rack">${items.map(it => _rbcRow(it, cfg)).join('')}</div>
          ${cfg.addPieceFn ? `<button class="rbc-addpiece" onclick="window.${cfg.addPieceFn}()"><span style="font-size:16px;line-height:1;margin-top:-1px">+</span> Add a piece</button>` : ''}`;
        return { lookHtml, rackHtml };
      }

      // ── Shared day strip — the calendar navigator the Weekly and Travel
      // pages both lead with. days: [{dow, date, dot, dim, event, meta,
      // thumbs, onclick}]; meta may carry pre-escaped inline html.
      function _rbDayStrip(days, sel) {
        _rbcEnsureCss();
        return days.map((d, i) => `
          <button class="rbd-day${i === sel ? ' active' : ''}${d.dim ? ' dim' : ''}" onclick="${d.onclick}">
            <span class="dtop">
              <span class="ddow">${_waEsc(d.dow || '')}</span>
              <span class="dright">${d.date ? `<span class="ddate">${_waEsc(d.date)}</span>` : ''}${d.dot != null ? `<span class="dst${d.dot ? ' done' : ''}"></span>` : ''}</span>
            </span>
            <span class="dev">${_waEsc(d.event || '')}</span>
            <span class="dmeta">${d.meta || ''}</span>
            <span class="dth">${(d.thumbs || []).map(u => `<span${u ? ` style="background-image:url('${_waEsc(u)}')"` : ''}></span>`).join('')}</span>
          </button>`).join('');
      }

      // ═══ LookTile — the shared look primitive (brief A2, engineering B2)
      // ════════════════════════════════════════════════════════════════════
      // A Look renders in three places: the Looks grid (mosaic), a DayCard
      // (thumb strip), the Look detail hero (large mosaic). ONE renderer,
      // three densities — a DayCard IS a LookTile plus day context (date,
      // weather, occasion, evening line). There is deliberately no second
      // component drawing a look: two components rendering the same content
      // on different surfaces is precisely the failure that produced the
      // planned_days divergence, and it is cheapest to avoid it here, before
      // the Looks tab exists.
      //
      // The class PREFIX is a parameter (`dc` on day surfaces, `lt` on look
      // surfaces) so DayCard's markup is byte-identical to its pre-extraction
      // output — the DayCard harness pins those strings, and this extraction
      // is explicitly a no-visual-change refactor.
      var _LT_CSS = `
.rb-lk-tile{cursor:pointer;text-align:left;font-family:inherit}
.rb-lk-mos{position:relative;aspect-ratio:3/4;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:1px;background:var(--rule-mid);border-radius:var(--rad);overflow:hidden}
.rb-lk-mos.lt-hero{aspect-ratio:1/1;border-radius:var(--rad-card)}
.rb-lk-mos i{display:block;background-size:cover;background-position:center;background-color:var(--cream-200);transition:transform .4s var(--ease)}
.rb-lk-mos i.e{background-color:var(--cream-100)}
.rb-lk-tile:hover .rb-lk-mos i{transform:scale(1.03)}
.rb-lk-mos .lt-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.lt-info{padding:9px 2px 0}
.lt-title{font-family:var(--font-serif);font-weight:400;font-size:19px;line-height:1.15;color:var(--ink)}
.lt-title.prov{font-style:italic;color:var(--ink-soft)}
.lt-meta{font-size:10.5px;color:var(--ink-faint);margin-top:3px;opacity:0;transition:opacity .18s}
.rb-lk-tile:hover .lt-meta,.rb-lk-tile:focus-within .lt-meta{opacity:1}
@media(hover:none){.lt-meta{opacity:1}}
@media(max-width:767px){.lt-title{font-size:17px}.lt-meta{opacity:1}}`;
      function _ltEnsureCss() {
        if (document.getElementById('rb-lt-style')) return;
        const st = document.createElement('style');
        st.id = 'rb-lt-style';
        st.textContent = _LT_CSS;
        document.head.appendChild(st);
      }

      // A piece's colour, for the cells a photo can't fill: the item's own
      // analysed hex first, then the shared garment palette by colour name.
      function _ltToneOf(wi) {
        if (!wi) return null;
        let hex = wi.item_dna && wi.item_dna.display && wi.item_dna.display.primary_color_hex;
        if (hex && /^#[0-9a-fA-F]{3,8}$/.test(String(hex))) return hex;
        const sw = _ALL_SWATCHES.find(s => s.name.toLowerCase() === String(wi.color || '').toLowerCase());
        return (sw && sw.hex) || null;
      }

      // Wardrobe ids → mosaic cells. Photo if she has one, else the piece's
      // colour — a look must stay legible before every piece is photographed.
      function _ltCells(ids) {
        return (ids || []).map(id => {
          const wi = _waItems.find(w => String(w.id) === String(id));
          if (!wi) return null;
          return { url: _pdHttp(wi.image_url), tone: _ltToneOf(wi), name: wi.label || '' };
        }).filter(Boolean);
      }

      function _ltTitleHtml(title, p, provisional) {
        const cls = p + '-title' + (p === 'lt' && provisional ? ' prov' : '');
        return `<div class="${cls}">${_waEsc(title || '')}</div>`;
      }

      // The thumb strip (day surfaces). Mobile shows 2 thumbs — 3 + the +N
      // chip bled off narrow cards — so the 3rd carries .t3 and a mobile-only
      // chip re-counts against 2 shown.
      function _ltStripHtml(pieces, pieceTotal, p) {
        const th = (pieces || []).slice(0, 3);
        if (!th.length) return '';
        const total = pieceTotal != null ? pieceTotal : th.length;
        const ovD = Math.max(0, total - th.length);
        const ovM = Math.max(0, total - Math.min(2, th.length));
        const cell = u => (typeof u === 'string' && u.charAt(0) === '#')
          ? `background-color:${_waEsc(u)}` : `background-image:url('${_waEsc(u)}')`;
        let row = th.map((u, i) => `<i${i === 2 ? ' class="t3"' : ''} style="${cell(u)}"></i>`).join('');
        if (ovM !== ovD) {
          if (ovD > 0) row += `<span class="ov d">+${ovD}</span>`;
          if (ovM > 0) row += `<span class="ov m">+${ovM}</span>`;
        } else if (ovD > 0) {
          row += `<span class="ov">+${ovD}</span>`;
        }
        return `<div class="${p}-th">${row}</div>`;
      }

      // The mosaic (look surfaces): four cells, the look read as its pieces.
      // A look photograph fills the whole panel when there is one — the
      // pieces are still the record, the picture is just the look's image.
      function _ltMosaicHtml(cells, opts) {
        opts = opts || {};
        const cls = 'rb-lk-mos' + (opts.hero ? ' lt-hero' : '');
        if (opts.photo) {
          return `<div class="${cls}"><img class="lt-photo" src="${_waEsc(opts.photo)}" alt="${_waEsc(opts.alt || 'This look')}" loading="lazy"></div>`;
        }
        let inner = '';
        for (let i = 0; i < 4; i++) {
          const c = (cells || [])[i];
          if (!c) { inner += `<i class="e"></i>`; continue; }
          inner += c.url
            ? `<i style="background-image:url('${_waEsc(c.url)}')" title="${_waEsc(c.name)}"></i>`
            : `<i style="background-color:${_waEsc(c.tone || 'var(--cream-200)')}" title="${_waEsc(c.name)}"></i>`;
        }
        return `<div class="${cls}">${inner}</div>`;
      }

      // The standalone tile — the Looks grid. Title only; the count lives on
      // hover and on the detail (tile metadata decision, 2026-07-30).
      function _ltTile(d, opts) {
        _ltEnsureCss();
        opts = opts || {};
        const body = opts.body ? ` onclick="${opts.body}" role="button" tabindex="0"` : '';
        return `<div class="rb-lk-tile${opts.extraClass ? ' ' + opts.extraClass : ''}"${body}>` +
          _ltMosaicHtml(d.cells, { photo: d.photo, alt: d.title, hero: opts.hero }) +
          `<div class="lt-info">` +
            _ltTitleHtml(d.title, 'lt', d.provisional) +
            (d.meta ? `<div class="lt-meta">${_waEsc(d.meta)}</div>` : '') +
          `</div>` +
        `</div>`;
      }

      // The primitive is the app's, not this module's — any surface that needs
      // to draw a look composes these rather than hand-rolling a second card.
      window._rbLookTile = {
        tile: _ltTile, strip: _ltStripHtml, title: _ltTitleHtml,
        mosaic: _ltMosaicHtml, cells: _ltCells, tone: _ltToneOf,
      };

      // ═══ DayCard — the one canonical day renderer (design spec v2.0 +
      // engineering brief, 2026-07-24) ════════════════════════════════════
      // Composes LookTile (above) for the look itself — title and pieces —
      // and owns only the day context around it.
      // Four surfaces render a day (home rail, weekly strip, travel strip,
      // lookbook calendar) through ONE normalised shape (_dcMoments) and
      // ONE renderer (_dcCard). Two densities, bound to the surface, never
      // chosen: full (rail + strips) / compact (calendar). The strips
      // derive their DayCardData LIVE from the plan blob through the SAME
      // row builders the planned_days index uses (_pdRowsWk/_pdRowsTv,
      // §6.4 decision) — one shape, no freshness gap, the index stays
      // persistence-only. Action model (spec §6): the card BODY opens the
      // day (a peek overlay on rail + calendar, the console on the
      // strips); the top-right RING sets the day as focus (scopes the
      // prompt on home, re-points the console on the strips). No "Open →"
      // label anywhere — the body is the affordance.
      // ?daycard=off is the per-device kill switch (all four surfaces fall
      // back to their pre-DayCard renders, persisted); ?daycard=on clears.
      var _DC_FLAG_KEY = 'rb_daycard';
      (function () {
        try {
          const v = new URL(window.location.href).searchParams.get('daycard');
          if (v === 'off') localStorage.setItem(_DC_FLAG_KEY, 'off');
          else if (v === 'on') localStorage.removeItem(_DC_FLAG_KEY);
        } catch (_) {}
      })();
      function _rbDayCardOn() {
        try { return localStorage.getItem(_DC_FLAG_KEY) !== 'off'; } catch (_) { return true; }
      }
      // Whose words win the title — ONE config point (audit D-02; Annie
      // 2026-07-24: the USER'S words win, the generated headline is the
      // fallback). 'robes' flips the preference with no render changes.
      // _wkApplyDay's occasion overwrite is deliberately untouched — the
      // row builders already prefer user_activity, so her words surface
      // here regardless.
      var _DC_TITLE_MODE = 'user';
      // §10.1 — thumbnails are wardrobe-truth (spec v2.0 recommendation,
      // shipped). 'swatch' restores the palette-whisper treatment (hex
      // dots) if the escalated decision reopens.
      var _DC_THUMB_MODE = 'image';

      var _DC_RING_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2 L11 7 L16 9 L11 11 L9 16 L7 11 L2 9 L7 7 Z"></path><path d="M18.5 14 L19.5 16.5 L22 17.5 L19.5 18.5 L18.5 21 L17.5 18.5 L15 17.5 L17.5 16.5 Z"></path></svg>';

      var _DC_CSS = `
.rb-dc{position:relative;box-sizing:border-box;width:100%;height:100%;display:flex;flex-direction:column;padding:16px;border-radius:2px;min-height:176px;font-family:'Inter',-apple-system,sans-serif;background:#fff;color:var(--ink,#202021);border:1px solid #E7E0CF;transition:border-color .2s cubic-bezier(0.4,0,0.2,1),background .2s;text-align:left;overflow:hidden}
.rb-dc[onclick]{cursor:pointer}
.rb-dc[onclick]:hover{border-color:rgba(32,32,33,0.42)}
.rb-dc.dc-compact{padding:11px;min-height:150px}
.rb-dc.is-today{background:#EEE3DF;border-color:#D4C8C4}
.rb-dc.is-past{background:#FCFAF7;opacity:.62}
.rb-dc.is-empty{background:#FAF8F5;border-style:dashed;border-color:#D8CFC0}
.rb-dc.is-free{background:#FAF8F5;border-style:dashed;border-color:#D8CFC0}
.rb-dc .dc-freetag{font-family:'Cormorant',Georgia,serif;font-style:italic;font-size:12px;color:var(--ink-soft);margin-top:4px}
.rb-dc.is-empty-past{background:#FAF8F5;opacity:.4}
.rb-dc.is-void{border-color:rgba(32,32,33,0.05);background:transparent}
.rb-dc.is-pinned{border-color:#8E6A7C;box-shadow:0 0 0 1px #8E6A7C inset}
.rb-dc.is-focus{border-color:var(--ink,#202021);box-shadow:0 0 0 1px var(--ink,#202021) inset}
.rb-dc .dc-ey{font-weight:500;font-size:9.5px;letter-spacing:.2em;text-transform:uppercase;opacity:.72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-dc.dc-compact .dc-ey{font-family:'Cormorant',Georgia,serif;font-weight:300;font-size:22px;letter-spacing:0;text-transform:none;opacity:.9;line-height:1;margin-bottom:2px}
.rb-dc .dc-title{font-family:'Cormorant',Georgia,serif;font-weight:300;font-size:22px;line-height:1.08;letter-spacing:.002em;margin-top:8px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.16em}
.rb-dc.dc-compact .dc-title{font-weight:400;font-size:17px;min-height:0}
.rb-dc .dc-eve{font-weight:300;font-size:11.5px;line-height:1.4;opacity:.62;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rb-dc .dc-chip{margin-top:10px}
.rb-dc .dc-chip span{display:inline-flex;align-items:center;gap:6px;font-weight:400;font-size:9px;letter-spacing:.18em;text-transform:uppercase;opacity:.7}
.rb-dc .dc-chip i{width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.5;flex:none}
.rb-dc .dc-sp{flex:1}
.rb-dc .dc-th{display:flex;gap:5px;margin-top:12px}
.rb-dc.dc-compact .dc-th{gap:3px;margin-top:8px}
.rb-dc .dc-th i{width:34px;height:34px;border-radius:2px;flex:0 0 auto;background-size:cover;background-position:center;background-color:#EFE9DC;box-shadow:inset 0 0 0 1px rgba(32,32,33,0.08)}
.rb-dc.dc-compact .dc-th i{width:16px;height:16px}
.rb-dc .dc-th .ov{width:34px;height:34px;border-radius:2px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:400;opacity:.55;box-shadow:inset 0 0 0 1px rgba(32,32,33,0.14)}
.rb-dc.dc-compact .dc-th .ov{width:16px;height:16px;font-size:9px}
.rb-dc .dc-th .ov.m{display:none}
.rb-dc .dc-evemark{display:none;position:absolute;top:6px;right:7px;font-size:9px;color:#8E7077}
@media(max-width:767px){
.rb-dc .dc-th i.t3{display:none}
.rb-dc .dc-th .ov.d{display:none}
.rb-dc .dc-th .ov.m{display:flex}
}
@media(max-width:1000px){.rb-mcells .rb-dc.dc-compact .dc-th{display:none}}
@media(max-width:767px){
.rb-mcells .rb-dc.dc-compact{min-height:0;aspect-ratio:1;padding:5px;border-radius:var(--rad-sm)}
.rb-mcells .rb-dc.dc-compact .dc-ey{font-size:13px;margin-bottom:0}
.rb-mcells .rb-dc.dc-compact .dc-title{font-size:10px;line-height:1.25;margin-top:2px;min-height:0}
.rb-mcells .rb-dc.dc-compact .dc-eve{display:none}
.rb-mcells .rb-dc.dc-compact .dc-foot{display:none}
.rb-mcells .rb-dc.dc-compact .dc-evemark{display:block}
}
.rb-dc .dc-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px}
.rb-dc.dc-compact .dc-foot{margin-top:8px}
.rb-dc .dc-status{font-weight:400;font-size:10px;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;opacity:.45}
.rb-dc .dc-empty{flex:1;display:flex;flex-direction:column;justify-content:flex-end}
.rb-dc .dc-empty .t{font-family:'Cormorant',Georgia,serif;font-style:italic;font-weight:300;font-size:19px;line-height:1.1;opacity:.55}
.rb-dc .dc-empty .s{font-weight:300;font-size:11px;opacity:.42;margin-top:4px}
.rb-dc .dc-ring{position:absolute;top:7px;right:7px;height:28px;min-width:28px;justify-content:center;border:none;background:transparent;cursor:pointer;padding:4px;color:inherit;display:flex;align-items:center;gap:5px;opacity:.6;transition:opacity .2s;font-family:inherit;z-index:2}
.rb-dc .dc-ring:hover{opacity:.9}
.rb-dc.has-ring .dc-ey{padding-right:32px}
#rb-dpk{position:fixed;inset:0;z-index:940;display:flex;align-items:center;justify-content:center;padding:24px}
#rb-dpk .dpk-veil{position:absolute;inset:0;background:rgba(32,32,33,0.38)}
#rb-dpk .dpk-card{position:relative;background:#FAF8F5;border-radius:var(--rad-card);max-width:420px;width:100%;max-height:80vh;overflow-y:auto;padding:24px 26px 22px;box-shadow:0 18px 60px rgba(32,32,33,0.22)}
#rb-dpk .dpk-x{position:absolute;top:12px;right:14px;border:none;background:none;font-size:20px;color:var(--ink-faint);cursor:pointer;line-height:1;padding:4px}
#rb-dpk .dpk-date{font-size:10px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:14px}
#rb-dpk .mo{padding:12px 0;border-top:0.5px solid rgba(32,32,33,0.08)}
#rb-dpk .mo:first-of-type{border-top:none;padding-top:0}
#rb-dpk .mo .sl{font-size:9px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-faint)}
#rb-dpk .mo .sl .ch{font-weight:400;letter-spacing:.1em;color:var(--ink-faint)}
#rb-dpk .mo .ti{font-family:'Cormorant',Georgia,serif;font-weight:300;font-size:21px;line-height:1.15;color:var(--ink,#202021);margin-top:4px}
#rb-dpk .mo .th{display:flex;gap:5px;margin-top:9px}
#rb-dpk .mo .th i{width:38px;height:38px;border-radius:3px;background-size:cover;background-position:center;background-color:#EFE9DC;box-shadow:inset 0 0 0 1px rgba(32,32,33,0.08)}
#rb-dpk .dpk-acts{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:16px;padding-top:14px;border-top:0.5px solid rgba(32,32,33,0.08)}
#rb-dpk .dpk-btn{border:0.5px solid rgba(32,32,33,0.22);border-radius:100px;background:#fff;padding:10px 18px;font-size:11.5px;letter-spacing:.02em;color:var(--ink,#202021);cursor:pointer;font-family:inherit;transition:all .15s}
#rb-dpk .dpk-btn:hover{border-color:var(--ink,#202021)}
#rb-dpk .dpk-btn.primary{background:var(--ink,#202021);border-color:var(--ink,#202021);color:#fff}
#rb-dpk .dpk-btn.primary:hover{opacity:.85}
#rb-dpk .dpk-worn{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#7E7C5A;margin-right:auto}
@media(max-width:640px){#rb-dpk{align-items:flex-end;padding:0}#rb-dpk .dpk-card{border-radius:var(--rad-card) var(--rad-card) 0 0;max-width:none}}`;
      function _dcEnsureCss() {
        if (document.getElementById('rb-dc-style')) return;
        const st = document.createElement('style');
        st.id = 'rb-dc-style';
        st.textContent = _DC_CSS;
        document.head.appendChild(st);
      }

      // Word-boundary truncation (spec §4.3 — the evening line must never
      // cut mid-word).
      function _dcTruncate(str, max) {
        str = String(str || '');
        if (str.length <= max) return str;
        const cut = str.slice(0, max);
        const sp = cut.lastIndexOf(' ');
        return (sp > max * 0.5 ? cut.slice(0, sp) : cut).replace(/[\s,·—-]+$/, '') + '…';
      }
      // Sentence case = first letter capped, the rest left as typed —
      // lowercasing user text would wreck proper nouns ("Dalt Vila").
      function _dcSentence(s) {
        s = String(s || '').trim();
        return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
      }
      function _dcTitleOf(m) {
        if (!m) return '';
        const user = m.activity, gen = m.headline;
        return _dcSentence((_DC_TITLE_MODE === 'user' ? (user || gen) : (gen || user)) || '');
      }
      // Context chip = MEMBERSHIP only (spec §4.6): a trip or week the day
      // belongs to. A daily look belongs to nothing → no chip, never a
      // type label filling the slot.
      function _dcChipOf(m) {
        if (!m) return null;
        const it = snLoad().find(x => String(x.id) === String(m.source_id));
        if (m.source_type === 'travel') {
          const dest = it && it.tvData && it.tvData.destination;
          return dest ? dest + ' trip' : 'Trip';
        }
        if (m.source_type === 'weekly') {
          const iso = (it && it.wkData && Array.isArray(it.wkData.week_iso)) ? it.wkData.week_iso[0] : null;
          return iso ? 'Week of ' + new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Weekly plan';
        }
        return null;
      }
      // The +N denominator — the moment's full piece count, resolved from
      // the parent blob (live blob when the caller has it, else the local
      // lookbook cache — same pattern as _pdParent). planned_days.item_ids
      // is owned-only and can't carry a total (audit D-03; the ownership
      // count itself is DROPPED by product decision — never resurrect it).
      function _dcPieceTotal(m, liveBlob) {
        if (!m) return 0;
        try {
          // A pinned Look carries its own composition — no blob to parse.
          if (m.source_type === 'look') {
            const l = typeof _lkFind === 'function' ? _lkFind(m.source_id) : null;
            return l ? _lkPieceIds(l).length : (m.item_ids || []).length;
          }
          let blob = liveBlob;
          if (!blob) {
            const it = snLoad().find(x => String(x.id) === String(m.source_id));
            blob = it && (it.wkData || it.tvData || it.dlData);
          }
          if (!blob) return 0;
          if (m.source_type === 'weekly') {
            const d = (blob.days || [])[m.day_index];
            if (!d) return 0;
            if (m.slot === 'evening') return (d.evening_look && Array.isArray(d.evening_look.items)) ? d.evening_look.items.length : 0;
            return Array.isArray(d.items) ? d.items.length : 0;
          }
          if (m.source_type === 'travel') {
            const d = (blob.days || [])[m.day_index];
            const slots = (d && d.slots) || [];
            const s = m.slot === 'evening'
              ? (slots.find(x => String(x.slot || '').toLowerCase() === 'evening') || slots[1])
              : (slots.find(x => String(x.slot || '').toLowerCase() !== 'evening') || slots[0]);
            return (s && Array.isArray(s.formula)) ? s.formula.length : 0;
          }
          if (m.source_type === 'daily') {
            let n = 0;
            (blob.steps || []).forEach(s => { n += (s.items || []).length; });
            return n;
          }
        } catch (_) {}
        return 0;
      }
      // Swatch fallback (thumbMode 'swatch', §10.1 escape hatch): hex dots
      // from the day's owned pieces — the old palette whisper.
      function _dcSwatches(dayM, eveM) {
        const out = [];
        [dayM, eveM].forEach(m => m && (m.item_ids || []).forEach(id => {
          if (out.length >= 3) return;
          const hex = _ltToneOf(_waItems.find(w => String(w.id) === String(id)));
          if (hex && out.indexOf(hex) === -1) out.push(hex);
        }));
        return out;
      }

      // ── The normaliser: (day moment, evening moment) → DayCardData.
      // Moments are planned_days-shaped rows — from the index (rail,
      // calendar) or freshly derived from the live blob (strips). 'free'
      // and empty-future fold into ONE empty state (the component's rule:
      // an unfilled day always offers the CTA); a past empty day is its
      // own quiet state; 'void' (out-of-month) is the caller's to set.
      function _dcMoments(dayM, eveM, o) {
        o = o || {};
        const has = !!(dayM || eveM);
        const allFree = has && (!dayM || dayM.status === 'free') && (!eveM || eveM.status === 'free');
        const past = o.date && o.today && o.date < o.today;
        const todayIs = o.date && o.date === o.today;
        // A deliberately-free day is HER decision, not an absence — it keeps
        // its own state (+ the parent plan's chip) instead of folding into
        // empty and telling her "Nothing yet." (Wave 4, review finding).
        const state = !has
          ? (past ? 'empty-past' : 'empty')
          : allFree
            ? (past ? 'empty-past' : 'free')
            : (past ? 'past' : todayIs ? 'today' : 'planned');
        const d = {
          eyebrow: o.eyebrow || '',
          state,
          pinned: !!((dayM && dayM.pinned) || (eveM && eveM.pinned)),
          modifier: null,
          title: '', evening: null, chip: null, pieces: [], pieceTotal: 0,
          date: o.date || null,
        };
        if (state === 'free') { d.chip = _dcChipOf(dayM || eveM); return d; }
        if (state === 'empty' || state === 'empty-past') return d;
        const lead = (dayM && dayM.status !== 'free') ? dayM : (eveM || dayM);
        d.title = _dcTitleOf(lead);
        if (eveM && eveM.status !== 'free' && lead !== eveM) {
          const a = eveM.activity || eveM.headline;
          // 'Evening · Evening look' placeholder copy never reaches the
          // card (§11.3) — a contentless evening renders the bare mark.
          d.evening = (a && !/^evening( look| plan| outfit)?$/i.test(String(a).trim())) ? _dcSentence(a) : true;
        }
        d.chip = _dcChipOf(lead);
        if (_DC_THUMB_MODE === 'swatch') {
          d.pieces = _dcSwatches(dayM, eveM);
          d.pieceTotal = d.pieces.length;
        } else {
          // Thumbs come from the LEAD moment only (the day's look) so the
          // +N denominator and the visible pieces describe ONE look; the
          // other moment fills in only when the lead has no imagery.
          const other = lead === dayM ? eveM : dayM;
          const push = (th, list) => (Array.isArray(list) ? list : []).forEach(u => {
            if (th.length < 3 && typeof u === 'string' && u.indexOf('http') === 0 && th.indexOf(u) === -1) th.push(u);
          });
          const th = [];
          push(th, lead && lead.thumb_urls);
          if (!th.length) push(th, other && other.thumb_urls);
          d.pieces = th;
          d.pieceTotal = _dcPieceTotal(lead, o.blob) || th.length;
        }
        if ((dayM && dayM.status === 'worn') || (eveM && eveM.status === 'worn')) d.modifier = 'worn';
        return d;
      }

      // ── The renderer. opts: {density, body, ring, ringTip, ringTipShort,
      // focus, extraClass}. body/ring are inline onclick strings; the ring
      // renders only on full, populated, unmodified cards (component rule).
      function _dcCard(d, opts) {
        _dcEnsureCss();
        opts = opts || {};
        const compact = opts.density === 'compact';
        const state = d.state || 'planned';
        const isEmpty = state === 'empty' || state === 'empty-past' || state === 'void';
        const cls = ['rb-dc'];
        if (compact) cls.push('dc-compact');
        cls.push('is-' + state);
        if (d.pinned && state !== 'void') cls.push('is-pinned');
        if (opts.focus) cls.push('is-focus');
        if (opts.extraClass) cls.push(opts.extraClass);
        const body = opts.body && state !== 'void' && state !== 'empty-past'
          ? ` onclick="${opts.body}" role="button" tabindex="0"` : '';
        const eyTxt = d.eyebrow != null && d.eyebrow !== '' ? _waEsc(String(d.eyebrow)) : '&nbsp;';
        let inner = `<div class="dc-ey">${eyTxt}</div>`;
        const ring = (!compact && !isEmpty && !d.modifier && opts.ring)
          ? `<button class="dc-ring" title="${_waEsc(opts.ringTip || 'Set this day as focus')}" aria-label="${_waEsc(opts.ringTip || 'Set this day as focus')}" onclick="${opts.ring}">${_DC_RING_SVG}</button>`
          : '';
        if (ring) cls.push('has-ring');
        if (isEmpty) {
          // Compact empties are bare numerals — no body copy (component)
          if (!compact && state !== 'void') {
            inner += state === 'empty-past'
              ? `<div class="dc-empty"><div class="t">—</div></div>`
              : `<div class="dc-empty"><div class="t">Nothing yet.</div><div class="s">Tap to dress it.</div></div>`;
          }
        } else if (state === 'free') {
          // Her deliberate blank page — named as such, carrying the plan it
          // belongs to; the tap still offers to dress it. COPY: needs sign-off
          inner += compact
            ? `<div class="dc-freetag">left free</div>`
            : `<div class="dc-empty"><div class="t" style="font-style:italic">Left free.</div><div class="s">Tap to dress it.</div></div>`;
          if (!compact && d.chip) inner += `<div class="dc-chip"><span><i></i>${_waEsc(d.chip)}</span></div>`;
        } else {
          inner += _ltTitleHtml(d.title, 'dc');
          if (d.evening) {
            const txt = typeof d.evening === 'string' ? 'Evening · ' + _dcTruncate(d.evening, compact ? 16 : 34) : 'Evening';
            inner += `<div class="dc-eve">${_waEsc(txt)}</div>`;
            // Phone-scale calendar drops the text line — the ☾ mark keeps
            // the two-moment signal legible (§6.3 at 48px cells)
            if (compact) inner += `<span class="dc-evemark" title="Evening planned">☾</span>`;
          }
          if (!compact && d.chip) inner += `<div class="dc-chip"><span><i></i>${_waEsc(d.chip)}</span></div>`;
          inner += `<div class="dc-sp"></div>`;
          // The pieces are LookTile's (the strip density) — mobile's 2-thumb
          // treatment and the +N denominator live there, once.
          inner += _ltStripHtml(d.pieces, d.pieceTotal, 'dc');
          if (d.modifier === 'worn') inner += `<div class="dc-foot"><span class="dc-status">Worn ✓</span></div>`;
          else if (d.modifier === 'packed') inner += `<div class="dc-foot"><span class="dc-status">Packed ✓</span></div>`;
        }
        return `<div class="${cls.join(' ')}"${body}>${ring}${inner}</div>`;
      }

      // ── The ring's shared handler (§2.3): what the strip body USED to
      // do (re-point the console) and what the flagged rail tap did
      // (scope the prompt) — one function, surface-aware.
      window._rbSetFocus = function(surface, arg) {
        if (surface === 'weekly') { if (window.__wkSelectDay) window.__wkSelectDay(arg); return; }
        if (surface === 'travel') { if (window.__tvSelectDay) window.__tvSelectDay(arg); return; }
        if (surface === 'home' && arg && arg.date) {
          if (typeof _rbDiaryOn === 'function' && _rbDiaryOn() && typeof window._ikScopeDay === 'function') {
            window._ikScopeDay(arg.date, arg.slot || null);
          }
        }
      };

      // ── Day peek (Annie §6.2, 2026-07-24): body-tap on the rail and the
      // calendar opens a light overlay — the day at a glance with a
      // click-through to the full opener. Mark-worn lives here for past
      // days (the card footer only ever carries a status, never a CTA).
      var _dpkState = null;
      function _dcMarkWorn(moments) {
        // Blob-first stamping + times_worn on every owned piece — the same
        // discipline as the rail's legacy __rbRailWear (kept untouched for
        // the flag-off path).
        const ids = [];
        (moments || []).forEach(m => {
          const it = snLoad().find(x => String(x.id) === String(m.source_id));
          if (it) {
            if (it.type === 'weekly-plan' && it.wkData && it.wkData.days && it.wkData.days[m.day_index]) {
              it.wkData.days[m.day_index].worn = true;
              snUpdate(it.id, { wkData: it.wkData });
            } else if (it.type === 'travel-edit' && it.tvData && it.tvData.days && it.tvData.days[m.day_index]) {
              it.tvData.days[m.day_index].worn = true;
              snUpdate(it.id, { tvData: it.tvData });
            } else if (it.type === 'daily-look' && it.dlData) {
              it.dlData.worn = true;
              snUpdate(it.id, { dlData: it.dlData });
            }
            _pdSyncSaved(it.id);
          }
          (m.item_ids || []).forEach(id => { if (ids.indexOf(id) === -1) ids.push(id); });
          m.status = 'worn';
        });
        // Passive accrual (brief B3): a confirmed wear IS the save. Create the
        // Look if this exact composition isn't one yet, then write the Wear —
        // no separate step, no modal. __lkAccrue owns times_worn for the pieces
        // it records, so only the un-accrued path patches them here.
        const acc = (moments || []).length && typeof window.__lkAccrue === 'function'
          ? window.__lkAccrue(ids, {
              date: (moments[0] && moments[0].day_date) || _pdLocalISO(),
              hint: _dcTitleOf(moments[0]),
              source: (moments[0] && moments[0].source_type) || 'daily',
              sourceId: moments[0] && moments[0].source_id,
            })
          : null;
        if (!acc || !acc.wear) {
          ids.forEach(id => {
            const wi = _waItems.find(w => String(w.id) === String(id));
            if (wi) _waFetch('PATCH', 'wardrobe_items?id=eq.' + id, { times_worn: (Number(wi.times_worn) || 0) + 1 }).catch(() => {});
          });
        }
        if (ids.length) setTimeout(_waLoad, 900);
        _waShowToast('Logged — Robes remembers what you wore ✓');
      }
      window.__rbDayPeek = function(date, moments) {
        if (!moments || !moments.length) return;
        _dcEnsureCss();
        _dpkState = { date, moments };
        document.getElementById('rb-dpk')?.remove();
        const today = _pdLocalISO();
        const long = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
        const dayM = moments.find(m => (m.slot || 'day') === 'day') || moments[0];
        const worn = moments.some(m => m.status === 'worn');
        const isPast = date < today;
        const moBlock = m => {
          const t = _dcTitleOf(m) || (m.status === 'free' ? 'Left free' : 'Planned');
          const chip = _dcChipOf(m);
          const th = (Array.isArray(m.thumb_urls) ? m.thumb_urls : [])
            .filter(u => typeof u === 'string' && u.indexOf('http') === 0).slice(0, 3);
          return `<div class="mo"><div class="sl">${m.slot === 'evening' ? 'Evening' : 'Day'}${chip ? ` <span class="ch">· ${_waEsc(chip)}</span>` : ''}</div>` +
            `<div class="ti">${_waEsc(t)}</div>` +
            (th.length ? `<div class="th">${th.map(u => `<i style="background-image:url('${_waEsc(u)}')"></i>`).join('')}</div>` : '') +
            `</div>`;
        };
        const wear = isPast && !worn
          ? `<button class="dpk-btn" onclick="window.__rbDayPeekWear()">Wore it ✓</button>`
          : (worn ? `<span class="dpk-worn">Worn ✓</span>` : '');
        const el = document.createElement('div');
        el.id = 'rb-dpk';
        el.innerHTML = `<div class="dpk-veil" onclick="window.__rbDayPeekClose()"></div>` +
          `<div class="dpk-card" role="dialog" aria-modal="true">` +
          `<button class="dpk-x" onclick="window.__rbDayPeekClose()" aria-label="Close">×</button>` +
          `<div class="dpk-date">${_waEsc(long)}</div>` +
          moments.map(moBlock).join('') +
          `<div class="dpk-acts">${wear}<button class="dpk-btn primary" onclick="window.__rbDayPeekOpen()">Open the day →</button></div>` +
          `</div>`;
        document.body.appendChild(el);
        _rbTrack('day_peek_opened', { source_type: dayM.source_type });
      };
      window.__rbDayPeekClose = function() {
        document.getElementById('rb-dpk')?.remove();
        _dpkState = null;
      };
      window.__rbDayPeekOpen = function() {
        const s = _dpkState;
        window.__rbDayPeekClose();
        if (!s) return;
        const m = s.moments.find(x => (x.slot || 'day') === 'day') || s.moments[0];
        _rbTrack('day_opened_from_peek', { source_type: m.source_type });
        window._rbOpenPlannedDay(m);
      };
      window.__rbDayPeekWear = function() {
        const s = _dpkState;
        if (!s) return;
        _dcMarkWorn(s.moments);
        window.__rbDayPeekClose();
        if (window._rbRailRepaint) window._rbRailRepaint();
        else if (window._rbRailPaint) window._rbRailPaint();
      };
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && document.getElementById('rb-dpk')) window.__rbDayPeekClose();
      });

      // ═══ Looks — the Look as a saved entity ══════════════════════════════
      // Brief: docs/look-entity-brief.md (30 Jul 2026). Phase 1 (the entity,
      // accruing from wears she already confirms) + Phase 2 (manual build).
      //
      // Three objects, never one (§2). The question "does changing the shoes
      // create a new look?" dissolves once the THING is separated from THE
      // OCCASION IT WAS WORN:
      //   Look — saved, named, reusable. Mutable; small edits keep identity.
      //   Wear — this look, these exact pieces, this date. NEVER mutable.
      //   DayCard — presentation only (it composes LookTile, above).
      // Promotion to a new Look is only ever an EXPLICIT user action (A5/B5):
      // there is no similarity threshold and no inference in this module.
      //
      // Wardrobe gains a tab, not a destination (A1) — the nav stays
      // Wardrobe / Lookbook, and Looks sits beside All pieces and Wishlist in
      // the existing sub-tab row.
      //
      // Persistence: supabase/looks_migration.sql (migration 14). Until it
      // runs, every read/write falls back to the per-user localStorage cache
      // and warns ONCE — the planned_days / wishlist degradation convention.
      var _lkDown = false, _lkWarned = false, _lkLoaded = false;
      var _lkLooks = [];
      // Last worn ↓ by default; never-worn looks fall to the END descending
      // and to the FRONT ascending, so "what have I not worn?" is one tap.
      var _lkSortDesc = true;
      var _lkView = 'grid';          // 'grid' | 'detail' | 'new'
      var _lkActive = null;          // open look id
      var _lkSwapFor = null;         // piece id whose alternates are open
      var _lkPending = null;         // {from,to,pieces} awaiting Update / Save as new
      var _lkDone = null;            // quiet confirmation line after a resolution
      var _lkActNote = null;            // transient action note key
      var _lkTitleDraft = null, _lkTitleTouched = false;
      var _lkRetro = false;
      var _lkBusy = false;

      // The composer's rack. Slots are PRESENTATIONAL — the wardrobe's own
      // categories decide what can fill each one.
      var _LK_SLOTS = {
        Top:       { cats: ['Tops', 'Dresses', 'Outerwear'], add: 'Add a top' },
        Bottom:    { cats: ['Bottoms'],                      add: 'Add a bottom' },
        Shoe:      { cats: ['Shoes'],                        add: 'Add a shoe' },
        Bag:       { cats: ['Bags', 'Accessories'],           add: 'Add a bag' },
        Accessory: { cats: ['Accessories', 'Outerwear', 'Swimwear', 'Other'], add: 'Add a piece' },
      };
      var _LK_START_ROWS = [
        { key: 'r1', slot: 'Top', piece: null },
        { key: 'r2', slot: 'Bottom', piece: null },
        { key: 'r3', slot: 'Shoe', piece: null },
        { key: 'r4', slot: 'Bag', piece: null },
      ];
      var _lkRows = _LK_START_ROWS.map(r => Object.assign({}, r));
      var _lkOpenRow = null, _lkRowSeq = 4;
      var _lkPhoto = null;           // {url} once hosted, or {pending:true}
      var _lkNewTitleDraft = null, _lkNewTitleTouched = false;

      function LK_KEY() { const u = _waUid(); return u ? 'rb_looks__' + u : null; }
      function _lkCacheRead() {
        const k = LK_KEY(); if (!k) return [];
        try { const v = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; }
      }
      function _lkCacheWrite() {
        const k = LK_KEY(); if (!k) return;
        try { localStorage.setItem(k, JSON.stringify(_lkLooks)); } catch (_) {}
      }
      function _lkMissing(t) {
        return /looks|look_pieces|wears/.test(t) && /PGRST205|42P01|Could not find the table|does not exist/.test(t);
      }
      function _lkGuard(e, what) {
        const t = String(e && e.message || e);
        if (_lkMissing(t)) {
          _lkDown = true;
          if (!_lkWarned) { console.warn('[robes] looks: table missing — run supabase/looks_migration.sql'); _lkWarned = true; }
        } else {
          console.warn('[robes] looks ' + what + ' failed:', t.slice(0, 160));
        }
      }
      function _lkUuid() {
        try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (_) {}
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
      }

      // ── Reads ───────────────────────────────────────────────────────────
      // Three tables, one stitch. look_pieces and wears are RLS-scoped, so
      // neither needs a user filter — the policies are the filter.
      async function _lkLoad() {
        _lkLooks = _lkCacheRead();
        if (_lkLooks.length) _lkPaint();
        if (_lkDown || !_waUid() || !_waToken()) { _lkLoaded = true; _lkPaint(); return; }
        try {
          const [looks, pieces, wears] = await Promise.all([
            _waFetch('GET', 'looks?user_id=eq.' + _waUid() + '&order=created_at.desc&select=*'),
            _waFetch('GET', 'look_pieces?order=position.asc&select=*'),
            _waFetch('GET', 'wears?user_id=eq.' + _waUid() + '&order=worn_on.desc&select=*'),
          ]);
          const byId = {};
          (looks || []).forEach(l => {
            byId[l.id] = {
              id: l.id, name: l.name || '', name_provisional: !!l.name_provisional,
              note: l.note || '', photo_url: l.photo_url || null,
              source: l.source || 'wear', origin_look_id: l.origin_look_id || null,
              created_at: l.created_at, pieces: [], wears: [],
            };
          });
          (pieces || []).forEach(p => {
            const l = byId[p.look_id];
            if (l) l.pieces.push({ id: p.wardrobe_item_id, slot: p.slot || null, position: p.position || 0 });
          });
          (wears || []).forEach(w => {
            const l = byId[w.look_id];
            if (l) l.wears.push({ id: w.id, worn_on: w.worn_on, piece_ids: w.piece_ids || [], source: w.source || null, source_id: w.source_id || null });
          });
          const cloud = Object.keys(byId).map(k => byId[k]);
          // Local-only looks (saved before the migration ran, or offline) sync up
          _lkCacheRead().forEach(l => {
            if (!cloud.find(c => String(c.id) === String(l.id))) { cloud.push(l); _lkPushCloud(l); }
          });
          _lkLooks = cloud.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
          _lkCacheWrite();
          _lkLoaded = true;
          _lkPaint();
          _waV2Sync();
        } catch (e) {
          _lkGuard(e, 'load');
          _lkLoaded = true;
          _lkPaint();
        }
      }

      function _lkFind(id) { return _lkLooks.find(l => String(l.id) === String(id)) || null; }
      function _lkPieceIds(l) { return ((l && l.pieces) || []).map(p => p.id); }
      // Identity for passive accrual (B3): the exact SET of pieces. Not a
      // similarity threshold — an identical composition IS the same look.
      function _lkSig(ids) { return (ids || []).map(String).slice().sort().join('|'); }
      function _lkFindByPieces(ids) {
        const sig = _lkSig(ids);
        return sig ? _lkLooks.find(l => _lkSig(_lkPieceIds(l)) === sig) || null : null;
      }
      function _lkLastWorn(l) {
        const w = (l.wears || []).slice().sort((a, b) => String(b.worn_on).localeCompare(String(a.worn_on)))[0];
        return w ? w.worn_on : null;
      }
      function _lkWearCount(l) { return (l.wears || []).length; }
      // Cost per wear — the wear-more-buy-less payoff, and a real number or
      // nothing: only pieces she has priced count, and it needs a wear.
      function _lkCpw(l) {
        const n = _lkWearCount(l);
        if (!n) return null;
        let sum = 0, priced = 0;
        _lkPieceIds(l).forEach(id => {
          const wi = _waItems.find(w => String(w.id) === String(id));
          const p = wi && Number(wi.price);
          if (p > 0) { sum += p; priced++; }
        });
        return priced ? '€' + Math.max(1, Math.round(sum / n)) : null;
      }
      function _lkFmt(iso) {
        if (!iso) return '—';
        const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
        return isNaN(d) ? '—' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      }
      function _lkN(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }
      function _lkNames(ids) {
        return (ids || []).map(id => {
          const wi = _waItems.find(w => String(w.id) === String(id));
          return wi ? wi.label : null;
        }).filter(Boolean).join(' · ');
      }
      // The offered title (A6): her own words first (the occasion she typed,
      // the generated headline), then the look's own strongest piece. There is
      // no null state — a Look cannot be unnamed without breaking the grid.
      function _lkOfferName(ids, hint) {
        const h = _dcSentence(String(hint || '').trim());
        if (h && h.length > 2) return h.slice(0, 60);
        const first = (ids || []).map(id => _waItems.find(w => String(w.id) === String(id))).filter(Boolean)[0];
        if (first && first.label) {
          const word = String(first.label).trim().split(/\s+/).slice(-1)[0].toLowerCase();
          if (word) return 'The ' + word + ' one';
        }
        return 'Untitled look';
      }
      // The styling note, synthesised from the pieces — the same sentence
      // shape the generators produce, so a hand-built look reads like a
      // styled one.
      function _lkStyleNote(ids) {
        const names = (ids || []).map(id => _waItems.find(w => String(w.id) === String(id))).filter(Boolean).map(w => w.label);
        if (names.length < 2) return '';
        const lc = s => s.charAt(0).toLowerCase() + s.slice(1);
        return names[0] + ' with the ' + lc(names[1]) + (names[2] ? ', ' + lc(names[2]) : '') + '.';
      }

      // ── Writes ──────────────────────────────────────────────────────────
      function _lkPushCloud(l) {
        if (_lkDown || !_waUid()) return;
        _waFetch('POST', 'looks', {
          id: l.id, user_id: _waUid(), name: l.name, name_provisional: !!l.name_provisional,
          note: l.note || null, photo_url: l.photo_url || null,
          source: l.source || 'wear', origin_look_id: l.origin_look_id || null,
        }).then(() => _lkPiecesCloud(l)).catch(e => _lkGuard(e, 'create'));
      }
      function _lkPiecesCloud(l) {
        if (_lkDown || !_waUid()) return;
        const rows = (l.pieces || []).map((p, i) => ({
          look_id: l.id, wardrobe_item_id: p.id, slot: p.slot || null, position: p.position != null ? p.position : i,
        }));
        _waFetch('DELETE', 'look_pieces?look_id=eq.' + l.id)
          .then(() => rows.length ? _waFetch('POST', 'look_pieces', rows) : null)
          .catch(e => _lkGuard(e, 'pieces'));
      }
      function _lkPatchCloud(l, patch) {
        if (_lkDown || !_waUid()) return;
        _waFetch('PATCH', 'looks?id=eq.' + l.id + '&user_id=eq.' + _waUid(),
          Object.assign({ updated_at: new Date().toISOString() }, patch))
          .catch(e => _lkGuard(e, 'patch'));
      }
      function _lkPatch(id, patch, pieces) {
        const l = _lkFind(id);
        if (!l) return null;
        Object.assign(l, patch);
        _lkCacheWrite();
        _lkPatchCloud(l, patch);
        if (pieces) _lkPiecesCloud(l);
        return l;
      }
      function _lkCreate(o) {
        const ids = o.pieces || [];
        const l = {
          id: _lkUuid(),
          name: o.name || _lkOfferName(ids, o.hint),
          name_provisional: o.name_provisional !== false,
          note: o.note != null ? o.note : _lkStyleNote(ids),
          photo_url: o.photo_url || null,
          source: o.source || 'wear',
          origin_look_id: o.origin_look_id || null,
          created_at: new Date().toISOString(),
          pieces: ids.map((id, i) => ({ id, slot: (o.slots || {})[id] || null, position: i })),
          wears: [],
        };
        _lkLooks.unshift(l);
        _lkCacheWrite();
        _lkPushCloud(l);
        _rbTrack('look_created', { source: l.source, pieces: ids.length });
        return l;
      }

      // A wear is written once and never updated (B4). Idempotent per
      // (look, date) so a double-tap or a re-synced blob can't inflate the
      // count that "wear more, buy less" is measured on.
      function _lkAddWear(l, o) {
        o = o || {};
        const date = o.date || _pdLocalISO();
        if ((l.wears || []).some(w => String(w.worn_on).slice(0, 10) === date)) return null;
        const w = {
          id: _lkUuid(), worn_on: date, piece_ids: _lkPieceIds(l).slice(),
          source: o.source || 'looks', source_id: o.sourceId != null ? String(o.sourceId) : null,
        };
        l.wears.unshift(w);
        _lkCacheWrite();
        if (!_lkDown && _waUid()) {
          _waFetch('POST', 'wears', {
            id: w.id, look_id: l.id, user_id: _waUid(), worn_on: w.worn_on,
            piece_ids: w.piece_ids, source: w.source, source_id: w.source_id,
          }).catch(e => {
            // A duplicate is the unique index doing its job, not a failure
            if (!/23505|duplicate key/.test(String(e && e.message || e))) _lkGuard(e, 'wear');
          });
        }
        // times_worn on the pieces is what the rest of the app already reads
        w.piece_ids.forEach(id => {
          const wi = _waItems.find(x => String(x.id) === String(id));
          if (wi) {
            wi.times_worn = (Number(wi.times_worn) || 0) + 1;
            _waFetch('PATCH', 'wardrobe_items?id=eq.' + id, { times_worn: wi.times_worn }).catch(() => {});
          }
        });
        _rbTrack('wear_confirmed', { source: w.source, pieces: w.piece_ids.length });
        return w;
      }
      // Undo is a DELETE — the only correction path a wear has (B4).
      function _lkRemoveWear(l, date) {
        const i = (l.wears || []).findIndex(w => String(w.worn_on).slice(0, 10) === date);
        if (i < 0) return;
        const w = l.wears.splice(i, 1)[0];
        _lkCacheWrite();
        if (!_lkDown && _waUid()) _waFetch('DELETE', 'wears?id=eq.' + w.id + '&user_id=eq.' + _waUid()).catch(e => _lkGuard(e, 'unwear'));
        (w.piece_ids || []).forEach(id => {
          const wi = _waItems.find(x => String(x.id) === String(id));
          if (wi && Number(wi.times_worn) > 0) {
            wi.times_worn = Number(wi.times_worn) - 1;
            _waFetch('PATCH', 'wardrobe_items?id=eq.' + id, { times_worn: wi.times_worn }).catch(() => {});
          }
        });
        _rbTrack('wear_undone', {});
      }

      // ── Passive accrual (B3) ────────────────────────────────────────────
      // On a confirmed wear of ANY look — generated or hand-built — create
      // the Look if it doesn't exist, then create the Wear. No separate save
      // step, no modal: the catalogue grows from behaviour she already has.
      window.__lkAccrue = function(pieceIds, o) {
        o = o || {};
        const ids = (pieceIds || []).map(String).filter(Boolean);
        if (ids.length < 2) return null;   // a single piece is not a look
        let l = _lkFindByPieces(ids);
        if (!l) l = _lkCreate({ pieces: ids, hint: o.hint, source: 'wear' });
        const w = _lkAddWear(l, { date: o.date, source: o.source, sourceId: o.sourceId });
        _lkPaint();
        return { look: l, wear: w };
      };
      window.__lkUnaccrue = function(pieceIds, date) {
        const l = _lkFindByPieces((pieceIds || []).map(String));
        if (l) { _lkRemoveWear(l, date || _pdLocalISO()); _lkPaint(); }
      };

      // ── Pins (A3 "Pin to a day") ────────────────────────────────────────
      // planned_days IS the pin store — a pinned look is a dated moment like
      // any other, so the home rail and the month calendar show it with the
      // same DayCard the plans use. No new table, no new surface.
      function _lkPins(id) {
        return _pdCacheRead()
          .filter(r => r.source_type === 'look' && String(r.source_id) === String(id))
          .map(r => r.day_date)
          .sort();
      }
      function _pdRowsLk(l, dates) {
        const ids = _lkPieceIds(l);
        const thumbs = ids.map(id => {
          const wi = _waItems.find(w => String(w.id) === String(id));
          return wi ? _pdHttp(wi.image_url) : null;
        }).filter(Boolean).slice(0, 3);
        return {
          rows: dates.map((date, i) => Object.assign(_pdBase('look', l.id, i, date, 'day'), {
            status: (l.wears || []).some(w => String(w.worn_on).slice(0, 10) === date) ? 'worn' : 'planned',
            activity: l.name || null,
            headline: l.name || null,
            thumb_urls: thumbs,
            item_ids: ids,
          })),
          totalDays: dates.length,
        };
      }
      function _lkPin(id, date) {
        const l = _lkFind(id);
        if (!l || !date) return;
        const dates = _lkPins(id);
        if (dates.indexOf(date) === -1) dates.push(date);
        dates.sort();
        const built = _pdRowsLk(l, dates);
        // Optimistic cache write so the rail shows the pin before the round trip
        const rest = _pdCacheRead().filter(r => !(r.source_type === 'look' && String(r.source_id) === String(id)));
        _pdCacheWrite(rest.concat(built.rows));
        if (!_pdDown && _waUid() && _waToken()) _pdWrite(built, id);
        if (window._rbRailPaint) setTimeout(window._rbRailPaint, 300);
        _rbTrack('look_pinned', { offset_from_today: Math.round((new Date(date + 'T00:00:00Z') - new Date(_pdLocalISO() + 'T00:00:00Z')) / 86400000) });
      }

      // ── The tab ─────────────────────────────────────────────────────────
      var _LK_CSS = `
#rb-lk-wrap{display:none}
#rb-lk-bar{display:flex;align-items:center;gap:12px;margin:0 0 18px}
.rb-lk-sort{display:inline-flex;align-items:center;gap:9px;padding:8px 15px;border:0.5px solid var(--rule-mid);background:#fff;border-radius:100px;cursor:pointer;font-family:inherit;font-size:11.5px;color:var(--ink);transition:border-color .15s}
.rb-lk-sort:hover{border-color:var(--ink)}
.rb-lk-sort b{font-weight:400;color:var(--ink-faint)}
#rb-lk-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}
@media(max-width:1199px){#rb-lk-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:767px){#rb-lk-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}}
.rb-lk-det{display:flex;gap:40px;align-items:flex-start}
.rb-lk-det-l{flex:0 0 360px;max-width:360px}
.rb-lk-det-r{flex:1;min-width:0}
.rb-lk-eyebrow{font-size:9.5px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-faint)}
.rb-lk-title-in{width:100%;margin-top:7px;padding:2px 0 9px;border:none;border-bottom:0.5px solid var(--rule-mid);background:transparent;font-family:var(--font-serif);font-weight:300;font-size:clamp(26px,3vw,34px);line-height:1.1;color:var(--ink);outline:none}
.rb-lk-title-in.prov{font-style:italic;color:var(--ink-soft)}
.rb-lk-title-in:focus{border-bottom-color:var(--ink)}
.rb-lk-hint{font-size:11.5px;color:var(--ink-faint);margin-top:8px;min-height:1.2em}
.rb-lk-stats{display:flex;gap:28px;flex-wrap:wrap;margin-top:22px;padding:16px 0;border-top:0.5px solid var(--rule);border-bottom:0.5px solid var(--rule)}
.rb-lk-stat b{display:block;font-family:var(--font-serif);font-weight:300;font-size:25px;line-height:1;color:var(--ink)}
.rb-lk-stat span{display:block;font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-faint);margin-top:4px}
.rb-lk-acts{display:flex;gap:9px;flex-wrap:wrap;margin-top:20px}
.rb-lk-act{padding:11px 18px;border-radius:100px;border:0.5px solid var(--rule-mid);background:#fff;color:var(--ink);font-family:inherit;font-size:11.5px;cursor:pointer;transition:all .15s;white-space:nowrap}
.rb-lk-act:hover{border-color:var(--ink)}
.rb-lk-act.primary{background:var(--ink);border-color:var(--ink);color:#fff}
.rb-lk-act.primary:hover{opacity:.85}
.rb-lk-panel{margin-top:14px;padding:14px 16px;border:0.5px solid var(--ink);border-radius:var(--rad);background:var(--cream-100)}
.rb-lk-panel .pl{font-family:var(--font-serif);font-size:19px;line-height:1.25;color:var(--ink)}
.rb-lk-panel .pb{font-size:12.5px;line-height:1.6;color:var(--ink-soft);margin-top:6px}
.rb-lk-panel-acts{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:14px}
.rb-lk-quiet{background:none;border:none;padding:0 0 2px;font-family:inherit;font-size:11.5px;color:var(--ink-soft);border-bottom:0.5px solid var(--rule-mid);cursor:pointer}
.rb-lk-quiet:hover{color:var(--ink);border-bottom-color:var(--ink)}
.rb-lk-sec{font-size:9.5px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-faint);margin:26px 0 12px}
.rb-lk-row{display:flex;align-items:center;gap:14px;padding:11px 0;border-top:0.5px solid var(--rule)}
.rb-lk-row .th{width:38px;height:48px;flex:none;border-radius:var(--rad-sm);background-size:cover;background-position:center;background-color:var(--cream-200)}
.rb-lk-row .nm{flex:1;min-width:0;font-size:13px;color:var(--ink)}
.rb-lk-row .nm em{display:block;font-style:normal;font-size:11px;color:var(--ink-faint);margin-top:2px}
.rb-lk-pick{display:flex;gap:10px;overflow-x:auto;padding:12px 0 4px;scrollbar-width:none}
.rb-lk-pick::-webkit-scrollbar{width:0;height:0}
.rb-lk-opt{flex:none;width:92px;border:0.5px solid var(--rule-mid);border-radius:var(--rad-sm);overflow:hidden;cursor:pointer;background:#fff;padding:0;font-family:inherit;text-align:left;transition:border-color .15s}
.rb-lk-opt:hover{border-color:var(--ink)}
.rb-lk-opt i{display:block;height:74px;background-size:cover;background-position:center;background-color:var(--cream-200)}
.rb-lk-opt span{display:block;padding:7px 8px;font-size:10.5px;line-height:1.3;color:var(--ink)}
.rb-lk-wear{display:flex;align-items:baseline;gap:14px;padding:10px 0;border-top:0.5px solid var(--rule)}
.rb-lk-wear .dt{width:74px;flex:none;font-family:var(--font-serif);font-size:18px;color:var(--ink)}
.rb-lk-wear .pc{flex:1;font-size:11.5px;line-height:1.5;color:var(--ink-soft)}
.rb-lk-wear .tg{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);white-space:nowrap}
.rb-lk-empty{padding:56px 0 32px;max-width:520px}
.rb-lk-empty h3{font-family:var(--font-serif);font-weight:300;font-size:clamp(24px,3vw,30px);line-height:1.14;color:var(--ink);margin:0}
.rb-lk-empty h3 em{font-style:italic;color:var(--ink-soft)}
.rb-lk-empty p{font-size:13px;line-height:1.6;color:var(--ink-soft);margin:14px 0 0;max-width:420px}
.rb-lk-empty-acts{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}
.rb-lk-new{display:flex;gap:32px;align-items:flex-start}
.rb-lk-card{flex:0 0 340px;max-width:340px;border:0.5px solid var(--rule-mid);border-radius:var(--rad-card);background:#fff;padding:18px}
.rb-lk-card-hd{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:13px}
.rb-lk-card-hd b{font-size:9.5px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint)}
.rb-lk-card-hd i{font-style:normal;font-family:var(--font-serif);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-faint)}
.rb-lk-note{font-family:var(--font-serif);font-style:italic;font-size:17px;line-height:1.45;color:var(--ink);margin-top:14px;min-height:1.4em}
.rb-lk-pal{display:flex;align-items:center;gap:7px;margin-top:12px}
.rb-lk-pal i{width:15px;height:15px;border-radius:100px;background:var(--cream-200);box-shadow:inset 0 0 0 0.5px var(--rule-mid)}
.rb-lk-pal span{margin-left:auto;font-size:11px;color:var(--ink-faint)}
.rb-lk-card-foot{display:flex;align-items:center;gap:14px;margin-top:14px;padding-top:13px;border-top:0.5px solid var(--rule)}
.rb-lk-rack{flex:1;min-width:0}
.rb-lk-rrow{border:0.5px solid var(--rule-mid);border-radius:var(--rad);background:#fff;padding:13px 15px;margin-bottom:11px;transition:border-color .2s}
.rb-lk-rrow.on{border-color:var(--ink)}
.rb-lk-rmain{display:flex;align-items:center;gap:14px}
.rb-lk-rthumb{width:62px;height:78px;flex:none;border-radius:var(--rad-sm);background-size:cover;background-position:center;background-color:var(--cream-100);box-shadow:inset 0 0 0 0.5px var(--rule-mid);display:flex;align-items:flex-end;padding:6px;box-sizing:border-box}
.rb-lk-rthumb b{font-size:8px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-faint)}
.rb-lk-rbody{flex:1;min-width:0}
.rb-lk-rname{font-family:var(--font-serif);font-weight:400;font-size:21px;line-height:1.15;color:var(--ink)}
.rb-lk-rname.empty{font-style:italic;color:var(--ink-faint)}
.rb-lk-rmeta{font-size:11px;color:var(--ink-faint);margin-top:4px}
.rb-lk-ract{display:flex;align-items:center;gap:10px;flex:none}
.rb-lk-title-in::placeholder{color:var(--ink-faint);font-style:italic;opacity:1}
.rb-lk-con{display:grid;grid-template-columns:480px minmax(0,1fr);gap:34px;align-items:start}
@media(max-width:1080px){.rb-lk-con{grid-template-columns:1fr;gap:24px}.rb-lk-con>div:first-child{max-width:480px}}
.rbc-row.rb-lk-rempty{border-style:dashed;background:transparent}
.rb-lk-rempty .rbc-vp{background:var(--cream-100)}
.rb-lk-rempty .rbc-name{font-style:italic;color:var(--ink-faint)}
/* One piece placed: the standing scale sheet starts at data-n=2 — give the
   lone hero the whole composition rather than an unplaced 68px cell. */
.rb-lookv2 .rbc-board[data-n="1"] .rbc-tile:nth-child(1){grid-column:1/7;grid-row:1/8}
.rb-lk-rcta{padding:8px 14px;border-radius:100px;border:0.5px solid var(--ink);background:var(--ink);color:#fff;font-family:inherit;font-size:11px;cursor:pointer;white-space:nowrap;transition:all .15s}
.rb-lk-rcta.ghost{background:#fff;color:var(--ink);border-color:var(--rule-mid)}
.rb-lk-rcta.ghost:hover{border-color:var(--ink)}
.rb-lk-add{width:100%;padding:15px;border:1.5px dashed var(--rule-mid);border-radius:var(--rad);background:transparent;font-family:inherit;font-size:11.5px;color:var(--ink-faint);cursor:pointer;transition:all .15s}
.rb-lk-add:hover{border-color:var(--ink-faint);color:var(--ink)}
.rb-lk-save{width:100%;margin-top:16px;padding:14px;border:none;border-radius:100px;background:var(--ink);color:#fff;font-family:inherit;font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:opacity .15s}
.rb-lk-save:hover{opacity:.85}
@media(max-width:900px){
.rb-lk-det,.rb-lk-new{flex-direction:column;gap:24px}
.rb-lk-det-l,.rb-lk-card{flex:1 1 auto;max-width:none;width:100%}
.rb-lk-ract{flex-direction:column;align-items:stretch;gap:7px}
}
@media(max-width:767px){
.rb-lk-stats{gap:20px}
.rb-lk-rmain{align-items:flex-start}
.rb-lk-rname{font-size:19px}
}`;
      function _lkEnsureCss() {
        if (document.getElementById('rb-lk-style')) return;
        const st = document.createElement('style');
        st.id = 'rb-lk-style';
        st.textContent = _LK_CSS;
        document.head.appendChild(st);
      }

      // One-time DOM: the Looks surface rides INSIDE the wardrobe panel, so
      // nav state, crumbs and the mobile FAB keep working untouched.
      function _lkEnsureDom() {
        if (document.getElementById('rb-lk-wrap')) return true;
        const grid = document.getElementById('wg-grid');
        if (!grid) return false;
        _lkEnsureCss();
        const wrap = document.createElement('div');
        wrap.id = 'rb-lk-wrap';
        wrap.innerHTML = '<div id="rb-lk-bar"></div><div id="rb-lk-grid"></div><div id="rb-lk-body"></div>';
        const wl = document.getElementById('rb-wl-grid');
        (wl || grid).parentNode.insertBefore(wrap, (wl || grid).nextSibling);
        return true;
      }

      function _lkPaint() {
        if (_waView !== 'looks' || !_lkEnsureDom()) return;
        const bar = document.getElementById('rb-lk-bar');
        const grid = document.getElementById('rb-lk-grid');
        const body = document.getElementById('rb-lk-body');
        if (!bar || !grid || !body) return;
        const detail = _lkView !== 'grid';
        bar.style.display = detail || !_lkLooks.length ? 'none' : 'flex';
        grid.style.display = detail || !_lkLooks.length ? 'none' : 'grid';
        if (detail) {
          body.innerHTML = _lkView === 'new' ? _lkNewHtml() : _lkDetailHtml();
          return;
        }
        body.innerHTML = _lkLooks.length ? '' : _lkEmptyHtml();
        if (!_lkLooks.length) return;
        bar.innerHTML = '<button type="button" class="rb-lk-sort" onclick="window.__lkSort()">' +
          '<span>' + (_lkSortDesc ? 'Last worn' : 'First worn') + '</span>' +
          '<b>' + (_lkSortDesc ? '↓' : '↑') + '</b></button>';
        grid.innerHTML = _lkSorted().map(l => {
          const n = _lkWearCount(l);
          const last = _lkLastWorn(l);
          return _ltTile({
            title: l.name,
            provisional: l.name_provisional,
            cells: _ltCells(_lkPieceIds(l)),
            photo: l.photo_url,
            meta: _lkN(_lkPieceIds(l).length, 'piece') + ' · ' + (n ? _lkN(n, 'wear') + ' · last ' + _lkFmt(last) : 'not worn yet'),
          }, { body: "window.__lkOpen('" + l.id + "')" });
        }).join('') +
        // The way in stays on the grid — the same amplified add card the
        // pieces grid carries (Annie, 2026-07-30: the CTA vanished once a
        // look existed; only the empty state offered one).
        '<div class="rb-add-card" onclick="window.__lkNew()" role="button" tabindex="0">' +
          '<span class="rb-add-plus">+</span>' +
          '<span class="rb-add-serif">New look</span>' +
          '<span class="rb-add-hint">Built from your pieces</span>' +
        '</div>';
      }

      // Never-worn falls to the end descending, the front ascending.
      function _lkSorted() {
        return _lkLooks.slice().sort((a, b) => {
          const av = _lkLastWorn(a) || '', bv = _lkLastWorn(b) || '';
          return _lkSortDesc ? bv.localeCompare(av) : av.localeCompare(bv);
        });
      }

      function _lkEmptyHtml() {
        return '<div class="rb-lk-empty">' +
          '<h3>Nothing saved yet.<br><em>Wear something and it lands here.</em></h3>' +
          '<p>Confirm what you wore and Robes keeps it — named, reusable, countable.</p>' +
          '<div class="rb-lk-empty-acts">' +
            '<button type="button" class="rb-lk-act primary" onclick="window.__lkToday()">See today\'s look</button>' +
            '<button type="button" class="rb-lk-act" onclick="window.__lkNew()">Add one now</button>' +
          '</div></div>';
      }

      // ── Look detail (A3) ────────────────────────────────────────────────
      function _lkDetailHtml() {
        const l = _lkFind(_lkActive);
        if (!l) return _lkEmptyHtml();
        const ids = _lkPieceIds(l);
        const n = _lkWearCount(l);
        const cpw = _lkCpw(l);
        const today = _pdLocalISO();
        const wornToday = (l.wears || []).some(w => String(w.worn_on).slice(0, 10) === today);
        const prov = !!l.name_provisional;
        const title = _lkTitleDraft != null ? _lkTitleDraft : l.name;
        const pins = _lkPins(l.id).filter(d => d >= today);

        let h = '<div class="rb-lk-det"><div class="rb-lk-det-l">' +
          _ltMosaicHtml(_ltCells(ids), { photo: l.photo_url, alt: l.name, hero: true }) +
          (l.note ? '<div class="rb-lk-note">' + _waEsc(l.note) + '</div>' : '') +
          '</div><div class="rb-lk-det-r">';

        h += '<div class="rb-lk-eyebrow">' + (prov ? 'Robes named it' : 'Look') + '</div>' +
          '<input id="rb-lk-title" class="rb-lk-title-in' + (prov ? ' prov' : '') + '" value="' + _waEsc(title) + '"' +
            ' oninput="window.__lkTitleInput(this.value)" onchange="window.__lkTitleCommit(this.value)" onblur="window.__lkTitleCommit(this.value)">' +
          '<div class="rb-lk-hint" id="rb-lk-hint">' + (prov ? 'Leave it and it keeps this name.' : '') + '</div>';

        h += '<div class="rb-lk-stats">' +
          '<div class="rb-lk-stat"><b>' + ids.length + '</b><span>Pieces</span></div>' +
          '<div class="rb-lk-stat"><b>' + n + '</b><span>Wears</span></div>' +
          '<div class="rb-lk-stat"><b>' + _lkFmt(_lkLastWorn(l)) + '</b><span>Last worn</span></div>' +
          (cpw ? '<div class="rb-lk-stat"><b>' + cpw + '</b><span>Per wear</span></div>' : '') +
          '</div>';

        // The four actions are load-bearing (A3) — without them the tab is a
        // gallery; with them Looks is the tissue between Daily and Travel.
        h += '<div class="rb-lk-acts">' +
          (wornToday
            ? '<button type="button" class="rb-lk-act" disabled style="opacity:.5;cursor:default">Worn today ✓</button>'
            : '<button type="button" class="rb-lk-act primary" onclick="window.__lkWearToday()">Wear it today</button>') +
          '<button type="button" class="rb-lk-act" onclick="window.__lkAct(\'pin\')">Pin to a day</button>' +
          '<button type="button" class="rb-lk-act" onclick="window.__lkAct(\'pack\')">Pack it</button>' +
          '<button type="button" class="rb-lk-act" onclick="window.__lkAct(\'restyle\')">Restyle</button>' +
          '</div>';

        // Quiet undo on the day, not a toast (A4)
        if (wornToday) {
          h += '<div class="rb-lk-panel" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">' +
            '<div style="flex:1;min-width:0"><div class="pl">Worn today.</div>' +
            '<div class="pb">' + _lkN(n, 'wear') + (cpw ? ' · ' + cpw + ' per wear' : '') + '</div></div>' +
            '<button type="button" class="rb-lk-quiet" onclick="window.__lkUndoToday()">Not this, actually</button></div>';
        }

        if (_lkActNote === 'pin') {
          const d1 = today, d2 = _pdAddISO(today, 1), d3 = _pdAddISO(today, 2);
          h += '<div class="rb-lk-panel"><div class="pl">Which day?</div>' +
            '<div class="rb-lk-panel-acts">' +
            '<button type="button" class="rb-lk-act" onclick="window.__lkPinTo(\'' + d1 + '\')">Today</button>' +
            '<button type="button" class="rb-lk-act" onclick="window.__lkPinTo(\'' + d2 + '\')">Tomorrow</button>' +
            '<button type="button" class="rb-lk-act" onclick="window.__lkPinTo(\'' + d3 + '\')">' + _lkFmt(d3) + '</button>' +
            '<input type="date" min="' + today + '" onchange="window.__lkPinTo(this.value)" style="border:0.5px solid var(--rule-mid);border-radius:100px;padding:10px 14px;font-family:inherit;font-size:11.5px;background:#fff;color:var(--ink)">' +
            '<button type="button" class="rb-lk-quiet" onclick="window.__lkAct(null)">Cancel</button>' +
            '</div></div>';
        } else if (_lkActNote === 'restyle') {
          h += '<div class="rb-lk-panel"><div class="pl">Swap a piece below.</div>' +
            '<div class="pb">Robes asks before it touches the history.</div></div>';
        }

        if (pins.length) {
          h += '<div class="rb-lk-panel" style="border-color:var(--rule-mid);background:var(--sage-bg)">' +
            '<div class="pl">Pinned to ' + pins.map(_lkFmt).join(' and ') + '.</div>' +
            '<div class="rb-lk-panel-acts"><button type="button" class="rb-lk-quiet" onclick="window.__lkSeeDay(\'' + pins[0] + '\')">See the day</button></div></div>';
        }
        if (_lkDone) h += '<div class="rb-lk-panel" style="border-color:var(--rule-mid);background:#fff"><div class="pl">' + _waEsc(_lkDone) + '</div></div>';

        // Variant promotion (A5) — never silent, never inferred.
        if (_lkPending) {
          const toName = (_waItems.find(w => String(w.id) === String(_lkPending.to)) || {}).label || 'that piece';
          h += '<div class="rb-lk-panel"><div class="pl">' + _waEsc(l.name) + ' has been worn ' + _lkN(n, 'time') + '.</div>' +
            '<div class="pb">Swapping the ' + _waEsc(String(toName).toLowerCase()) + ' in keeps one look with ' + _lkN(n, 'wear') +
            ' — the days you already wore stay exactly as they were. Or keep both, if this is a different thing.</div>' +
            '<div class="rb-lk-panel-acts">' +
            '<button type="button" class="rb-lk-act primary" onclick="window.__lkUpdate()">Update this look</button>' +
            '<button type="button" class="rb-lk-act" onclick="window.__lkPromote()">Save as a new look</button>' +
            '<button type="button" class="rb-lk-quiet" onclick="window.__lkCancelPromote()">Leave it</button>' +
            '</div></div>';
        }

        h += '<div class="rb-lk-sec">The pieces</div>';
        ids.forEach(id => {
          const wi = _waItems.find(w => String(w.id) === String(id));
          const name = wi ? wi.label : 'A piece no longer in your wardrobe';
          const url = wi ? _pdHttp(wi.image_url) : null;
          const tone = _ltToneOf(wi);
          const open = String(_lkSwapFor) === String(id);
          h += '<div class="rb-lk-row"><div class="th" style="' +
            (url ? "background-image:url('" + _waEsc(url) + "')" : 'background-color:' + _waEsc(tone || 'var(--cream-200)')) + '"></div>' +
            '<div class="nm">' + _waEsc(name) + (wi ? '<em>' + _waEsc(wi.category || '') + (Number(wi.times_worn) ? ' · ' + Number(wi.times_worn) + '× worn' : '') + '</em>' : '') + '</div>' +
            (wi ? '<button type="button" class="rb-lk-quiet" onclick="window.__lkSwap(\'' + _waEsc(String(id)) + '\')">' + (open ? 'Close' : 'Swap') + '</button>' : '') +
            '</div>';
          if (open) h += _lkPickerHtml(_lkAlts(l, id), '__lkSwapPick', String(id), '__lkSwapSnap');
        });

        h += '<div class="rb-lk-sec" style="display:flex;align-items:baseline;gap:14px">Worn' +
          '<button type="button" class="rb-lk-quiet" style="letter-spacing:0;text-transform:none;font-weight:400" onclick="window.__lkRetro()">I wore this — add a date</button></div>';
        if (_lkRetro) {
          h += '<div class="rb-lk-panel-acts" style="margin:0 0 12px">' +
            '<button type="button" class="rb-lk-act" onclick="window.__lkRetroPick(\'' + today + '\')">Today</button>' +
            '<button type="button" class="rb-lk-act" onclick="window.__lkRetroPick(\'' + _pdAddISO(today, -1) + '\')">Yesterday</button>' +
            '<input type="date" max="' + today + '" onchange="window.__lkRetroPick(this.value)" style="border:0.5px solid var(--rule-mid);border-radius:100px;padding:10px 14px;font-family:inherit;font-size:11.5px;background:#fff;color:var(--ink)">' +
            '</div>';
        }
        if (n) {
          const cur = _lkSig(ids);
          (l.wears || []).slice().sort((a, b) => String(b.worn_on).localeCompare(String(a.worn_on))).forEach(w => {
            const names = _lkNames(w.piece_ids);
            h += '<div class="rb-lk-wear"><div class="dt">' + _lkFmt(w.worn_on) + '</div>' +
              '<div class="pc">' + _waEsc(names || '—') + '</div>' +
              '<div class="tg">' + (_lkSig(w.piece_ids) === cur ? 'Confirmed' : 'As worn') + '</div></div>';
          });
        } else {
          h += '<div class="rb-lk-wear"><div class="pc" style="font-family:var(--font-serif);font-style:italic;font-size:16px;color:var(--ink-faint)">Not worn yet.</div></div>';
        }

        return h + '</div></div>';
      }

      // Alternates for a swap: her OWN pieces in the same category, not
      // already in the look. No suggestions from outside the wardrobe.
      function _lkAlts(l, id) {
        const wi = _waItems.find(w => String(w.id) === String(id));
        if (!wi) return [];
        const inLook = _lkPieceIds(l).map(String);
        return _waItems
          .filter(x => x.category === wi.category && inLook.indexOf(String(x.id)) === -1)
          .slice(0, 8);
      }
      // addFn (optional): the normal wardrobe add flow, offered alongside the
      // catalogued options — and AS the way forward when the category is
      // empty. A slot must never dead-end on "nothing in that category"
      // (Annie's shoe, 2026-07-30): filing the piece IS the flow.
      function _lkPickerHtml(items, fnName, ctx, addFn) {
        const camSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
        if (!items.length) {
          if (!addFn) return '<div style="padding:0 0 12px;font-family:var(--font-serif);font-style:italic;font-size:15px;color:var(--ink-faint)">Nothing else in that category yet.</div>';
          return '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:12px 0 4px;border-top:0.5px solid var(--rule);margin-top:12px">' +
            '<span style="font-family:var(--font-serif);font-style:italic;font-size:15px;color:var(--ink-faint)">Nothing filed here yet — add it and Robes keeps it.</span>' +
            '<button type="button" class="rbc-act" onclick="window.' + addFn + '(\'' + _waEsc(String(ctx)) + '\')" style="display:inline-flex;align-items:center;gap:7px">' + camSvg + ' Add a piece</button>' +
            '</div>';
        }
        return '<div class="rb-lk-pick">' + items.map(x => {
          const url = _pdHttp(x.image_url);
          const tone = _ltToneOf(x);
          return '<button type="button" class="rb-lk-opt" onclick="window.' + fnName + '(\'' + _waEsc(String(ctx)) + '\',\'' + _waEsc(String(x.id)) + '\')">' +
            '<i style="' + (url ? "background-image:url('" + _waEsc(url) + "')" : 'background-color:' + _waEsc(tone || 'var(--cream-200)')) + '"></i>' +
            '<span>' + _waEsc(x.label) + '</span></button>';
        }).join('') +
        (addFn
          ? '<button type="button" class="rb-lk-opt" onclick="window.' + addFn + '(\'' + _waEsc(String(ctx)) + '\')" style="border-style:dashed">' +
            '<i style="background:var(--cream-100);display:flex;align-items:center;justify-content:center;color:var(--ink-faint)">' + camSvg + '</i>' +
            '<span>New piece</span></button>'
          : '') +
        '</div>';
      }

      // ── The composer (Phase 2) ──────────────────────────────────────────
      // The live console, verbatim (Annie, 2026-07-30: "the entire
      // functionality should carry across — we are not reinventing the
      // wheel"): _rbConsole draws The Look at the ratified 480px scale,
      // _rbcRow draws every filled rack card — same flick cluster, same
      // Swap through _rbSwapModal (wardrobe candidates + Snap mine), same
      // corner ✕. The only markup of our own is the dashed placeholder row
      // an empty slot shows, which no generated console ever needs.
      function _lkUsed() { return _lkRows.map(r => r.piece).filter(Boolean); }
      // Rows the rack shows, in slot order. A dress in the Top slot quietly
      // retires an empty Bottom row.
      function _lkVisibleRows() {
        const topPiece = (_lkRows.find(r => r.slot === 'Top') || {}).piece;
        const topIsDress = !!topPiece && (_waItems.find(w => String(w.id) === String(topPiece)) || {}).category === 'Dresses';
        return _lkRows.filter(r => !(topIsDress && r.slot === 'Bottom' && !r.piece));
      }
      // idx → row key map for the shared row/tile handlers (rebuilt on paint)
      var _lkConMap = [];
      function _lkConItems() {
        _lkConMap = [];
        return _lkVisibleRows().filter(r => r.piece).map(r => {
          const wi = _waItems.find(w => String(w.id) === String(r.piece));
          if (!wi) return null;
          _lkConMap.push(r.key);
          const idx = _lkConMap.length - 1;
          const url = _pdHttp(wi.image_url);
          const tone = _ltToneOf(wi);
          const opts = _lkRowOptions(r);
          const cur = Math.max(0, opts.findIndex(o => String(o.id) === String(wi.id)));
          return {
            idx,
            slot: r.slot,
            name: wi.label,
            shortName: String(wi.label || 'piece').split(/\s+/).slice(-1)[0].toLowerCase(),
            owned: true,
            anchored: false,
            isNew: false,
            frame: {
              pollAttr: '',
              inner: url
                ? `<img src="${_waEsc(url)}" style="width:100%;height:100%;object-fit:cover;display:block" alt="${_waEsc(wi.label)}">`
                : `<div style="width:100%;height:100%;background:${_waEsc(tone || 'var(--cream-200)')}"></div>`,
            },
            subHtml: _rbcProvenance({ wardrobe_match: true }),
            noteHtml: '',
            count: { cur, len: Math.max(1, opts.length) },
          };
        }).filter(Boolean);
      }
      function _lkNewHtml() {
        // The composer is rbc-markup throughout, and on the zero-piece and
        // photo paths _rbConsole (which injects the stylesheet) never runs —
        // ensure it here or a session that hasn't rendered a console yet
        // gets the naked markup (Annie's screenshot, 2026-07-30).
        _rbcEnsureCss();
        try { document.body.classList.add('rb-lookv2'); } catch (_) {}
        const used = _lkUsed();
        const nPlaced = used.length;
        const canSave = nPlaced >= 2;
        const items = _lkConItems();

        // The Look — the console panel. Zero pieces and the photo case get a
        // quiet stand-in with the same chrome (states no generated console has).
        let lookHtml;
        if (_lkPhoto && _lkPhoto.url) {
          lookHtml = '<div class="rbc-panel"><div class="rbc-lhead">' +
            '<span class="lab">The look · ' + _lkN(nPlaced, 'piece') + '</span><span class="robes">Robes</span></div>' +
            '<div style="aspect-ratio:4/5;border-radius:var(--rad-sm);overflow:hidden;background:var(--cream-200)">' +
              '<img src="' + _waEsc(_lkPhoto.url) + '" style="width:100%;height:100%;object-fit:cover;display:block" alt="This look"></div>' +
            (nPlaced ? '<div class="rbc-lfoot"><span class="rbc-palette"></span><span class="rbc-yours"><b>' + nPlaced + '</b>&thinsp;of&thinsp;' + nPlaced + ' from your wardrobe</span></div>' : '') +
            '</div>';
        } else if (!items.length) {
          lookHtml = '<div class="rbc-panel"><div class="rbc-lhead">' +
            '<span class="lab">The look · 0 pieces</span><span class="robes">Robes</span></div>' +
            '<div style="aspect-ratio:4/5;border:1.5px dashed var(--rule-mid);border-radius:var(--rad-sm);display:flex;align-items:center;justify-content:center;padding:24px;text-align:center">' +
              '<span style="font-family:var(--font-serif);font-style:italic;font-weight:300;font-size:19px;color:var(--ink-faint)">The look, once you start.</span></div>' +
            '</div>';
        } else {
          const note = _lkStyleNote(used);
          lookHtml = _rbConsole({
            headLabel: 'The look · ' + _lkN(nPlaced, 'piece'),
            quoteHtml: note ? _waEsc(note) : '',
            paletteHtml: used.map(id => {
              const tone = _ltToneOf(_waItems.find(w => String(w.id) === String(id)));
              return tone ? '<span style="background:' + _waEsc(tone) + '"></span>' : '';
            }).join(''),
            rackLabel: 'The Rack',
            onFlip: '__lkCFlip', onSwap: '__lkCSwap', onRemove: '__lkCRemove',
          }, items).lookHtml;
        }
        const photoRow = '<div style="display:flex;align-items:baseline;gap:14px;margin-top:12px">' +
          '<button type="button" class="rb-lk-quiet" onclick="window.__lkPhotoToggle()">' + (_lkPhoto ? 'Remove the photo' : 'Add a photo') + '</button>' +
          (_lkPhoto && _lkPhoto.pending ? '<span style="font-size:11px;color:var(--ink-faint)">Uploading…</span>' : '') +
          '</div>' +
          (canSave ? '<button type="button" class="rb-lk-save" onclick="window.__lkSave()">Save this look</button>' : '');

        // The Rack — the name leads it (placeholder until she types), then
        // the same rack rows the consoles use; empty slots keep the dashed
        // placeholder with the picker inside the row.
        let rackHtml = '<div class="rbc-rackhead"><div style="min-width:0;flex:1">' +
          '<span class="ey">The Rack</span>' +
          '<input id="rb-lk-newtitle" class="rb-lk-title-in" value="' + _waEsc(_lkNewTitleDraft != null ? _lkNewTitleDraft : '') + '"' +
            ' placeholder="Name your Look" oninput="window.__lkNewTitleInput(this.value)" style="font-size:clamp(22px,2.4vw,28px)">' +
          '</div></div>' +
          '<div class="rbc-rack">';
        const rowCfg = { onFlip: '__lkCFlip', onSwap: '__lkCSwap', onRemove: '__lkCRemove' };
        let fi = 0;
        _lkVisibleRows().forEach(r => {
          if (r.piece) {
            // `items` above is the same enumeration, so idx and _lkConMap agree
            if (items[fi]) rackHtml += _rbcRow(items[fi], rowCfg);
            fi++;
            return;
          }
          const def = _LK_SLOTS[r.slot] || _LK_SLOTS.Accessory;
          const open = _lkOpenRow === r.key;
          rackHtml += '<div class="rbc-row rb-lk-rempty">' +
            '<div class="rbc-vp"><span class="vslot">' + _waEsc(r.slot) + '</span></div>' +
            '<div class="rbc-body"><div><div class="rbc-name">' + _waEsc(def.add) + '</div></div>' +
              '<div class="rbc-foot"><div></div><div class="rbc-acts">' +
                '<button class="rbc-act' + (open ? '' : ' on') + '" onclick="window.__lkRowOpen(\'' + r.key + '\')">' + (open ? 'Close' : 'From your wardrobe') + '</button>' +
              '</div></div>' +
              (open ? _lkPickerHtml(_lkRowOptions(r), '__lkRowPick', r.key, '__lkRowSnap') : '') +
            '</div></div>';
        });
        rackHtml += '</div>' +
          '<button class="rbc-addpiece" onclick="window.__rbcAddMenu(\'__lkApplyNew\')"><span style="font-size:16px;line-height:1;margin-top:-1px">+</span> Add a piece</button>';

        return '<div class="rb-lk-con"><div>' + lookHtml + photoRow + '</div><div>' + rackHtml + '</div></div>';
      }
      function _lkRowOptions(r) {
        const def = _LK_SLOTS[r.slot] || _LK_SLOTS.Accessory;
        const used = _lkUsed().map(String);
        return _waItems.filter(x =>
          def.cats.indexOf(x.category) > -1 && (String(x.id) === String(r.piece) || used.indexOf(String(x.id)) === -1));
      }

      // ── Handlers ────────────────────────────────────────────────────────
      window.__lkSort = function() { _lkSortDesc = !_lkSortDesc; _lkPaint(); _rbTrack('looks_sorted', { desc: _lkSortDesc }); };
      window.__lkOpen = function(id) {
        if (_waView !== 'looks') window.__waSetView('looks');
        _lkActive = id; _lkView = 'detail';
        _lkSwapFor = null; _lkPending = null; _lkDone = null; _lkActNote = null;
        _lkTitleDraft = null; _lkTitleTouched = false; _lkRetro = false;
        _lkPaint();
        _rbTrack('look_opened', {});
      };
      window.__lkBack = function() {
        _lkView = 'grid'; _lkActive = null; _lkActNote = null; _lkDone = null;
        _lkPaint();
      };
      window.__lkAct = function(kind) {
        _lkActNote = kind;
        _lkDone = null;
        if (kind === 'restyle') {
          const l = _lkFind(_lkActive);
          const ids = _lkPieceIds(l);
          _lkSwapFor = ids[ids.length - 1] || null;   // the shoe/bag end: what she changes most
        }
        if (kind === 'pack') { _lkActNote = null; _lkPackIt(); return; }
        _lkPaint();
      };
      // Pack it → the trip intake, with this look's pieces as the shortlist.
      // Every route lands on the prompt (the app's standing rule) rather than
      // opening a second door into packing.
      function _lkPackIt() {
        const l = _lkFind(_lkActive);
        if (!l) return;
        const ids = _lkPieceIds(l).map(String);
        try { window._lkPackSeed = ids; } catch (_) {}
        _rbTrack('look_pack_routed', { pieces: ids.length });
        if (window.__rbNavGo) window.__rbNavGo('home');
        setTimeout(() => {
          if (typeof _cbSetIntent === 'function') _cbSetIntent('travel');
          _waShowToast(_lkN(ids.length, 'piece') + ' ready for the trip');
        }, 240);
      }
      window.__lkSeeDay = function(iso) {
        const l = _lkFind(_lkActive);
        if (!l || !iso) return;
        window.__rbDayPeek && window.__rbDayPeek(iso, [{
          source_type: 'look', source_id: l.id, day_index: 0, slot: 'day',
          day_date: iso, activity: l.name, headline: l.name,
          item_ids: _lkPieceIds(l),
          thumb_urls: _ltCells(_lkPieceIds(l)).map(c => c.url).filter(Boolean),
          status: (l.wears || []).some(w => String(w.worn_on).slice(0, 10) === iso) ? 'worn' : 'planned',
        }]);
      };
      window.__lkPinTo = function(iso) {
        if (!iso) return;
        _lkPin(_lkActive, iso);
        _lkActNote = null;
        _lkDone = 'Pinned to ' + _lkFmt(iso) + '.';
        _lkPaint();
      };
      // A tap is intent, so the tap IS the wear — with a quiet undo on the
      // card, never a confirm dialog and never a toast (A4, C1).
      window.__lkWearToday = function() {
        const l = _lkFind(_lkActive);
        if (!l) return;
        _lkAddWear(l, { source: 'looks' });
        _lkDone = null;
        _lkPaint();
      };
      window.__lkUndoToday = function() {
        const l = _lkFind(_lkActive);
        if (!l) return;
        _lkRemoveWear(l, _pdLocalISO());
        _lkPaint();
      };
      window.__lkRetro = function() { _lkRetro = !_lkRetro; _lkPaint(); };
      window.__lkRetroPick = function(iso) {
        const l = _lkFind(_lkActive);
        if (!l || !iso) return;
        const w = _lkAddWear(l, { date: iso, source: 'retro' });
        _lkRetro = false;
        _lkDone = w ? 'Recorded — worn ' + _lkFmt(iso) + '.' : 'Already recorded for ' + _lkFmt(iso) + '.';
        _lkPaint();
      };
      // Titles are offered, not applied (A6): the suggestion IS the name
      // until she types over it, and typing makes it hers.
      window.__lkTitleInput = function(v) {
        _lkTitleDraft = v; _lkTitleTouched = true;
        const el = document.getElementById('rb-lk-title');
        if (el) el.classList.remove('prov');
        const hint = document.getElementById('rb-lk-hint');
        if (hint) hint.textContent = 'Named by you.';
      };
      window.__lkTitleCommit = function(v) {
        const l = _lkFind(_lkActive);
        if (!l) return;
        const name = String(v || '').trim();
        if (!name || name === l.name) { _lkTitleDraft = null; return; }
        _lkPatch(l.id, { name, name_provisional: false });
        _lkTitleDraft = null;
        _rbTrack('look_renamed', {});
        _lkPaint();
      };
      window.__lkSwap = function(id) {
        _lkSwapFor = String(_lkSwapFor) === String(id) ? null : id;
        _lkPending = null; _lkDone = null;
        _lkPaint();
      };
      // Detail-swap's add-new door: file a piece, then it swaps in — which
      // still routes through the promotion question when there is history.
      window.__lkSwapSnap = function(pieceId) {
        _waEditId = null;
        _waAfterAdd = (newId) => window.__lkSwapPick(pieceId, newId);
        if (window.WA && WA.open) WA.open();
        let tries = 0;
        const poke = () => {
          const inp = document.getElementById('wa-rb-file');
          if (inp) { inp.click(); return; }
          if (++tries < 8) setTimeout(poke, 120);
        };
        setTimeout(poke, 220);
      };
      window.__lkSwapPick = function(from, to) {
        const l = _lkFind(_lkActive);
        if (!l) return;
        const next = _lkPieceIds(l).map(id => (String(id) === String(from) ? to : id));
        _lkSwapFor = null;
        // With history, the scope question is HERS to answer (A5). Without it,
        // there is nothing to protect — the edit just lands.
        if (_lkWearCount(l)) {
          _lkPending = { from, to, pieces: next };
        } else {
          l.pieces = next.map((id, i) => ({ id, slot: (l.pieces[i] || {}).slot || null, position: i }));
          l.note = _lkStyleNote(next);
          _lkCacheWrite();
          _lkPatchCloud(l, { note: l.note });
          _lkPiecesCloud(l);
          _lkDone = 'Swapped.';
        }
        _lkPaint();
      };
      window.__lkUpdate = function() {
        const l = _lkFind(_lkActive);
        if (!l || !_lkPending) return;
        const n = _lkWearCount(l);
        l.pieces = _lkPending.pieces.map((id, i) => ({ id, slot: (l.pieces[i] || {}).slot || null, position: i }));
        l.note = _lkStyleNote(_lkPending.pieces);
        _lkCacheWrite();
        _lkPatchCloud(l, { note: l.note });
        _lkPiecesCloud(l);
        _lkPending = null;
        // The wears keep their own snapshots — history is never rewritten.
        _lkDone = 'Updated. Its ' + _lkN(n, 'wear') + ' stay as they were.';
        _rbTrack('look_updated', { wears: n });
        _lkPaint();
      };
      window.__lkPromote = function() {
        const l = _lkFind(_lkActive);
        if (!l || !_lkPending) return;
        const toName = (_waItems.find(w => String(w.id) === String(_lkPending.to)) || {}).label || '';
        const word = String(toName).trim().split(/\s+/).slice(-1)[0];
        const nl = _lkCreate({
          pieces: _lkPending.pieces,
          name: l.name + (word ? ', in the ' + word.toLowerCase() : ' (variant)'),
          source: 'variant',
          origin_look_id: l.id,
        });
        _lkPending = null;
        _lkActive = nl.id;
        _lkDone = 'Saved as its own look. ' + l.name + ' is untouched.';
        _rbTrack('look_promoted', {});
        _lkPaint();
      };
      window.__lkCancelPromote = function() { _lkPending = null; _lkPaint(); };
      window.__lkToday = function() {
        if (window.__rbNavGo) window.__rbNavGo('home');
        setTimeout(() => { if (typeof _cbSetIntent === 'function') _cbSetIntent('dress-me'); }, 240);
      };

      // ── Composer handlers ───────────────────────────────────────────────
      window.__lkNew = function() {
        if (_waView !== 'looks') window.__waSetView('looks');
        _lkView = 'new';
        _lkRows = _LK_START_ROWS.map(r => Object.assign({}, r));
        _lkOpenRow = null; _lkRowSeq = 4; _lkPhoto = null;
        _lkNewTitleDraft = null; _lkNewTitleTouched = false;
        _lkPaint();
        _rbTrack('look_compose_opened', {});
      };
      window.__lkRowOpen = function(key) { _lkOpenRow = _lkOpenRow === key ? null : key; _lkPaint(); };
      // The normal add flow, aimed at a slot: the standard wardrobe add modal
      // (photograph → Robes files it), with the post-add hook landing the new
      // piece straight in the row — the same arming pattern as __rbcAddSnap.
      window.__lkRowSnap = function(key) {
        _waEditId = null;
        _waAfterAdd = (newId) => window.__lkRowPick(key, newId);
        if (window.WA && WA.open) WA.open();
        let tries = 0;
        const poke = () => {
          const inp = document.getElementById('wa-rb-file');
          if (inp) { inp.click(); return; }
          if (++tries < 8) setTimeout(poke, 120);
        };
        setTimeout(poke, 220);
      };
      window.__lkRowPick = function(key, id) {
        // Moving a piece to a second slot removes it from the first
        _lkRows = _lkRows.map(r => r.key === key ? Object.assign({}, r, { piece: id })
          : (String(r.piece) === String(id) ? Object.assign({}, r, { piece: null }) : r));
        _lkOpenRow = null;
        _lkPaint();
      };
      window.__lkRowClear = function(key) {
        const row = _lkRows.find(r => r.key === key);
        // An emptied accessory row drops out; a core slot stays as a placeholder
        if (row && row.slot === 'Accessory') _lkRows = _lkRows.filter(r => r.key !== key);
        else _lkRows = _lkRows.map(r => r.key === key ? Object.assign({}, r, { piece: null }) : r);
        _lkOpenRow = null;
        _lkPaint();
      };
      // ── Console handlers — idx comes from the shared row/tile markup and
      // maps back to a row through _lkConMap (rebuilt on every paint).
      function _lkRowByIdx(idx) {
        const key = _lkConMap[idx];
        return key ? _lkRows.find(r => r.key === key) || null : null;
      }
      // The flick: cycle the slot through her same-category pieces — the same
      // gesture as the consoles' option flick, wardrobe-only by construction.
      window.__lkCFlip = function(idx, dir) {
        const row = _lkRowByIdx(idx);
        if (!row) return;
        const opts = _lkRowOptions(row);
        if (opts.length < 2) { _waShowToast('Nothing else in that category yet'); return; }
        const cur = Math.max(0, opts.findIndex(o => String(o.id) === String(row.piece)));
        const next = opts[(cur + dir + opts.length) % opts.length];
        window.__lkRowPick(row.key, next.id);
      };
      // The swap: the SAME modal every console uses — her wardrobe by
      // category, Snap mine to file a new piece straight into the look.
      var _lkSwapIdx = null; // row the open swap modal is targeting
      window.__lkCSwap = function(idx) {
        const row = _lkRowByIdx(idx);
        const wi = row && _waItems.find(w => String(w.id) === String(row.piece));
        if (!wi) return;
        _lkSwapIdx = idx;
        _rbSwapModal(
          { name: wi.label, category: wi.category, brand: wi.brand || '', retailer_hint: '', price_point: '' },
          { id: 'lk-swap-modal', applyName: '__lkCSwapApply', snapName: '__lkCSnapMine', idx });
      };
      window.__lkCSwapApply = function(idx, wardrobeId) {
        const row = _lkRowByIdx(idx);
        if (!row) return;
        document.getElementById('lk-swap-modal')?.remove();
        window.__lkRowPick(row.key, wardrobeId);
        const wi = _waItems.find(w => String(w.id) === String(wardrobeId));
        if (wi) _waShowToast(wi.label + ' swapped in');
        _rbTrack('piece_swapped', { surface: 'look-compose', item: String(wardrobeId) });
      };
      window.__lkCSnapMine = function() {
        // Post-add hook: the piece she's about to snap lands in the row the
        // modal was opened for — the same arming pattern as __dlSnapMine.
        const idx = _lkSwapIdx;
        document.getElementById('lk-swap-modal')?.remove();
        _waEditId = null;
        _waAfterAdd = (newId) => window.__lkCSwapApply(idx, newId);
        if (window.WA && WA.open) WA.open();
      };
      // The corner ✕ (shared .rbc-rm): a core slot returns to its placeholder,
      // an added row drops out.
      window.__lkCRemove = function(idx) {
        const row = _lkRowByIdx(idx);
        if (row) window.__lkRowClear(row.key);
      };
      // "+ Add a piece" and Snap-mine land here with a wardrobe id: fill the
      // first empty core slot that takes the piece's category, else append.
      window.__lkApplyNew = function(id) {
        const wi = _waItems.find(w => String(w.id) === String(id));
        if (!wi) return;
        if (_lkUsed().map(String).indexOf(String(id)) > -1) { _lkPaint(); return; }
        const slotFor = _lkRows.find(r => !r.piece && (_LK_SLOTS[r.slot] || _LK_SLOTS.Accessory).cats.indexOf(wi.category) > -1);
        if (slotFor) {
          window.__lkRowPick(slotFor.key, id);
        } else {
          _lkRowSeq++;
          _lkRows = _lkRows.concat({ key: 'r' + _lkRowSeq, slot: 'Accessory', piece: id });
          _lkOpenRow = null;
          _lkPaint();
        }
        _waShowToast(wi.label + ' added to the look');
      };
      window.__lkNewTitleInput = function(v) {
        _lkNewTitleDraft = v;
        _lkNewTitleTouched = String(v || '').trim().length > 0;
      };
      // The photo is the look's image and nothing more — no reading, no
      // extraction (Phase 3 is a later, smaller problem). Hosted before it is
      // stored: base64 never goes into a row.
      window.__lkPhotoToggle = function() {
        if (_lkPhoto) { _lkPhoto = null; _lkPaint(); return; }
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = 'image/*,.jpg,.jpeg,.png,.heic,.heif,.webp';
        inp.style.cssText = 'position:absolute;width:1px;height:1px;clip:rect(0 0 0 0);overflow:hidden';
        document.body.appendChild(inp);
        inp.addEventListener('change', () => {
          const f = inp.files && inp.files[0];
          inp.remove();
          if (!f) return;
          _lkPhoto = { pending: true };
          _lkPaint();
          _rbDownscale(f).then(dataUrl => {
            const m = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
            if (!m) throw new Error('unreadable');
            return fetch('/api/wardrobe/upload', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: m[2], mimeType: m[1] }),
            }).then(r => r.json());
          }).then(j => {
            if (j && j.url) { _lkPhoto = { url: j.url }; }
            else { _lkPhoto = null; _waShowToast('That photo would not upload — try again shortly'); }
            _lkPaint();
          }).catch(() => {
            _lkPhoto = null;
            _waShowToast('That photo would not upload — try again shortly');
            _lkPaint();
          });
        });
        inp.click();
      };
      window.__lkSave = function() {
        const used = _lkUsed();
        if (used.length < 2 || _lkBusy) return;
        if (_lkPhoto && _lkPhoto.pending) { _waShowToast('One moment — the photo is still uploading'); return; }
        _lkBusy = true;
        const slots = {};
        _lkRows.forEach(r => { if (r.piece) slots[r.piece] = r.slot; });
        // The field is a placeholder until she types (A6 still holds at save:
        // an untouched field gets the offered name, marked provisional).
        const typed = String(_lkNewTitleDraft || '').trim();
        const l = _lkCreate({
          pieces: used, name: typed || _lkOfferName(used, null), name_provisional: !typed,
          source: 'manual', photo_url: _lkPhoto && _lkPhoto.url, slots,
        });
        _lkBusy = false;
        // Save lands her back on the grid, new look visible — no interstitial
        // (Annie, 2026-07-30: the confirmation page read as a broken landing).
        _lkView = 'grid';
        _lkActive = null;
        _lkPaint();
        _waV2Sync();
        _waShowToast(l.name + ' saved to Looks ✓');
      };

      // Grid + tab entry points used elsewhere in the app
      window.__lkGo = function() { window.__waSetView('looks'); };

      // ── "+ Add a piece" chooser — the rack's add flow offers her three
      // doors: an already-catalogued piece, the camera, or an upload (the
      // same trio as the concierge + menu). applyName is the per-surface
      // window fn that takes a wardrobe id and adds the piece to the look.
      window.__rbcAddMenu = function(applyName) {
        document.getElementById('rbc-add-menu')?.remove();
        const serif = "'Cormorant',Georgia,serif";
        const waSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6E6A64" stroke-width="1.8" stroke-linecap="round"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`;
        const camSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6E6A64" stroke-width="1.8" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
        const upSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6E6A64" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;
        const closeSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        const opt = (svg, label, sub, click) =>
          `<button onclick="${click}" style="display:flex;align-items:center;gap:13px;width:100%;padding:14px 16px;border:0.5px solid rgba(32,32,33,0.12);border-radius:var(--rad);background:#fff;cursor:pointer;font-family:inherit;text-align:left;margin-bottom:9px">
            ${svg}
            <span style="min-width:0"><span style="display:block;font-size:13.5px;color:#202021">${label}</span><span style="display:block;font-size:11px;color:var(--ink-faint);margin-top:1px">${sub}</span></span>
          </button>`;
        const modal = document.createElement('div');
        modal.id = 'rbc-add-menu';
        modal.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:24px';
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
        modal.innerHTML = `
          <div style="background:#FAF8F5;border-radius:20px;width:100%;max-width:400px;box-sizing:border-box;box-shadow:0 24px 60px -12px rgba(32,32,33,0.28);padding:24px 22px 16px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:2px">
              <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin:0">Add a piece</p>
              <button onclick="document.getElementById('rbc-add-menu').remove()" style="background:none;border:none;cursor:pointer;padding:2px;color:var(--ink-faint);line-height:1;margin-top:-2px">${closeSvg}</button>
            </div>
            <p style="font-family:${serif};font-size:24px;font-weight:300;color:#202021;margin:0 0 16px;line-height:1.15">Bring a piece into the look.</p>
            ${opt(waSvg, 'From your wardrobe', 'Pick something already catalogued', `window.__rbcWaPick('${applyName}')`)}
            ${opt(camSvg, 'Take a photo', 'Snap the piece — Robes files it, then styles it in', `window.__rbcAddSnap('${applyName}')`)}
            ${opt(upSvg, 'Upload a photo', 'From your camera roll or files', `window.__rbcAddSnap('${applyName}')`)}
          </div>`;
        document.body.appendChild(modal);
      };

      // Camera / upload door — the standard wardrobe add flow, with the
      // post-add hook armed so the new piece lands straight in the look.
      // The OS picker pops as soon as step 1 mounts (one click, like the
      // prompt box's + menu) — waiting past the ~150ms step-1 remount so
      // the click lands on the live input, not the one about to be
      // replaced; transient user activation comfortably outlives this.
      window.__rbcAddSnap = function(applyName) {
        document.getElementById('rbc-add-menu')?.remove();
        _waEditId = null;
        _waAfterAdd = (newId) => { if (typeof window[applyName] === 'function') window[applyName](newId); };
        if (window.WA && WA.open) WA.open();
        let tries = 0;
        const poke = () => {
          const inp = document.getElementById('wa-rb-file');
          if (inp) { inp.click(); return; }
          if (++tries < 8) setTimeout(poke, 120);
        };
        setTimeout(poke, 220);
      };

      // Wardrobe door — a full-catalogue grid; tap a piece to place it.
      window.__rbcWaPick = function(applyName) {
        document.getElementById('rbc-add-menu')?.remove();
        document.getElementById('rbc-wa-pick')?.remove();
        const serif = "'Cormorant',Georgia,serif";
        const closeSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        const items = _waItems.slice(0, 60);
        const grid = items.length ? items.map(wi => `
          <div onclick="document.getElementById('rbc-wa-pick').remove();window.${applyName}('${_waEsc(wi.id)}')" style="cursor:pointer;border-radius:var(--rad-sm);overflow:hidden;background:#fff;border:0.5px solid rgba(32,32,33,0.08);transition:box-shadow .15s" onmouseenter="this.style.boxShadow='0 4px 12px rgba(32,32,33,0.12)'" onmouseleave="this.style.boxShadow='none'">
            ${wi.image_url
              ? `<img src="${_waEsc(wi.image_url)}" style="width:100%;aspect-ratio:1;object-fit:cover;display:block" alt="">`
              : `<div style="aspect-ratio:1;background:#EDE8E0;display:flex;align-items:center;justify-content:center"><span style="font-family:${serif};font-size:22px;color:var(--ink-faint)">${_waEsc((wi.label || '?').charAt(0).toUpperCase())}</span></div>`}
            <div style="padding:7px 8px;font-size:10.5px;color:#3A3733;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_waEsc(wi.label)}</div>
          </div>`).join('') : '';
        const modal = document.createElement('div');
        modal.id = 'rbc-wa-pick';
        modal.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:24px';
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
        modal.innerHTML = `
          <div style="background:#FAF8F5;border-radius:20px;width:100%;max-width:480px;max-height:80vh;overflow-y:auto;box-sizing:border-box;box-shadow:0 24px 60px -12px rgba(32,32,33,0.28)">
            <div style="position:sticky;top:0;background:#FAF8F5;padding:20px 20px 0;z-index:2">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:2px">
                <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin:0">From your wardrobe</p>
                <button onclick="document.getElementById('rbc-wa-pick').remove()" style="background:none;border:none;cursor:pointer;padding:2px;color:var(--ink-faint);line-height:1;margin-top:-2px">${closeSvg}</button>
              </div>
              <p style="font-family:${serif};font-size:24px;font-weight:300;color:#202021;margin:0 0 14px;line-height:1.15">Pick the piece.</p>
              <div style="height:1px;background:rgba(32,32,33,0.08);margin:0 -20px 16px"></div>
            </div>
            <div style="padding:0 20px 28px">
              ${items.length
                ? `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${grid}</div>`
                : `<div style="text-align:center;padding:12px 0 8px">
                    <p style="font-family:${serif};font-size:16px;font-weight:300;color:#202021;margin:0 0 12px;line-height:1.5">Nothing catalogued yet — snap your first piece and it joins the look.</p>
                    <button onclick="window.__rbcAddSnap('${applyName}')" style="font-size:11px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:#fff;background:#202021;border:none;border-radius:100px;padding:12px 22px;cursor:pointer;font-family:inherit">Snap a piece</button>
                  </div>`}
            </div>
          </div>`;
        document.body.appendChild(modal);
      };

      // ── Shared feedback block (PRD §4 — every output) — one markup +
      // one handler pair for the daily / weekly / travel consoles. Render
      // _rbFeedbackBlock(prefix, copy), then arm _rbFeedbackArm(prefix, fn)
      // where fn() returns { prompt, looksOutput } at submit time.
      const _rbFbState = {};
      function _rbFeedbackArm(prefix, payloadFn) {
        _rbFbState[prefix] = { rating: null, payload: payloadFn };
      }
      function _rbFeedbackBlock(prefix, copy) {
        const sans = "-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif";
        return `
          <div style="margin-top:42px;padding:28px 24px;background:var(--cream-100);border:0.5px solid var(--rule);border-radius:var(--rad-lg);text-align:center">
            <div style="font-family:var(--font-serif);font-size:22px;font-weight:300;font-style:italic;color:var(--ink);margin-bottom:6px">${copy.title}</div>
            <div id="${prefix}-fb-prompt">
              <div style="font-size:13px;color:var(--ink-faint);margin-bottom:18px;font-style:italic">Tell us — your taste shapes what comes next.</div>
              <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
                <button id="${prefix}-fb-up" onclick="window.__rbFbRate('${prefix}',1)" style="display:flex;align-items:center;gap:8px;padding:10px 20px;border:0.5px solid var(--rule-mid);border-radius:100px;background:#fff;font-size:12px;cursor:pointer;color:var(--ink-soft);font-family:${sans}">${copy.up}</button>
                <button id="${prefix}-fb-dn" onclick="window.__rbFbRate('${prefix}',0)" style="display:flex;align-items:center;gap:8px;padding:10px 20px;border:0.5px solid var(--rule-mid);border-radius:100px;background:#fff;font-size:12px;cursor:pointer;color:var(--ink-soft);font-family:${sans}">${copy.down}</button>
              </div>
            </div>
            <div id="${prefix}-fb-expand" hidden style="margin-top:16px">
              <textarea id="${prefix}-fb-text" placeholder="What would have made it better?" rows="3" style="width:100%;border:0.5px solid var(--rule-mid);border-radius:var(--rad-sm);padding:12px 14px;font-size:13px;color:var(--ink);resize:none;outline:none;box-sizing:border-box;font-family:${sans}"></textarea>
              <button onclick="window.__rbFbSubmit('${prefix}')" style="margin-top:10px;padding:11px 26px;background:var(--ink);color:#fff;border:none;border-radius:100px;font-size:12px;cursor:pointer;font-family:${sans}">Send feedback</button>
            </div>
            <div id="${prefix}-fb-done" hidden style="font-size:13px;color:var(--sage);margin-top:12px">Thank you — noted.</div>
          </div>`;
      }
      window.__rbFbRate = function(prefix, val) {
        const st = _rbFbState[prefix];
        if (st) st.rating = val;
        const up = document.getElementById(prefix + '-fb-up'), dn = document.getElementById(prefix + '-fb-dn');
        if (up) up.style.background = val === 1 ? '#F0EDE8' : '#fff';
        if (dn) dn.style.background = val === 0 ? '#F0EDE8' : '#fff';
        const ex = document.getElementById(prefix + '-fb-expand');
        if (ex) ex.hidden = false;
        setTimeout(() => { const t = document.getElementById(prefix + '-fb-text'); if (t) t.focus(); }, 60);
      };
      window.__rbFbSubmit = function(prefix) {
        const st = _rbFbState[prefix] || {};
        const comment = ((document.getElementById(prefix + '-fb-text') || {}).value || '').trim();
        const p = (typeof st.payload === 'function' ? st.payload() : {}) || {};
        fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          email: (window.__robes_session && window.__robes_session.user && window.__robes_session.user.email) || '',
          rating: st.rating != null ? st.rating : null,
          comment,
          prompt: p.prompt || '',
          looksOutput: p.looksOutput || '',
        }) }).catch(() => {});
        _rbFbCloud(
          prefix === 'dl' ? 'daily' : prefix === 'wk' ? 'weekly' : 'travel',
          prefix === 'dl' ? _dlActiveSaveId : prefix === 'wk' ? _wkActiveSaveId : _tvActiveSaveId,
          st.rating, comment);
        const pr = document.getElementById(prefix + '-fb-prompt'), ex = document.getElementById(prefix + '-fb-expand'), dn = document.getElementById(prefix + '-fb-done');
        if (pr) pr.hidden = true;
        if (ex) ex.hidden = true;
        if (dn) dn.hidden = false;
      };

      // ── Shared surgical-fetch guard — one abort/timeout policy for the
      // per-day restyle calls (a hung fetch must never strand a console).
      async function _rbDayPost(url, body, ms) {
        const ctl = new AbortController();
        const abortTimer = setTimeout(() => ctl.abort(), ms || 75000);
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: ctl.signal,
            body: JSON.stringify({ ...body, userId: _waUid() || undefined }),
          });
          if (!res.ok) throw new Error(await res.text());
          const out = await res.json();
          _rbTrack('day_restyled', { endpoint: url });
          return out;
        } finally {
          clearTimeout(abortTimer);
        }
      }
      function _dlPatchSaved() {
        if (!_dlActiveSaveId || !window.__lastDlData) return;
        const saved = snLoad().find(x => x.id === _dlActiveSaveId);
        if (saved) {
          snUpdate(_dlActiveSaveId, { dlData: { ...(saved.dlData || {}), steps: window.__lastDlData.steps } });
          _pdSyncSaved(_dlActiveSaveId);
        }
      }
      function _dlRerender() {
        const data = window.__lastDlData;
        if (!data) return;
        const sc = dlResultPage ? dlResultPage.scrollTop : 0;
        window.__dlRenderResult(data, window.__lastDlPrompt || data.prompt || '', { skipSave: true, savedId: _dlActiveSaveId, keepScroll: sc });
        _dlPatchSaved();
      }
      // ── Day/Evening on the daily track (evening rules 2026-07-24) —
      // the date's two moments are two SEPARATE saved looks; the sibling
      // is the newest daily look at the same anchor date wearing the
      // other slot (newest-first matches read-time precedence).
      function _dlSibling(data, excludeId) {
        if (!data || !data.anchor_date) return null;
        const eve = data.slot === 'evening';
        return snLoad().find(x => x.type === 'daily-look' && x.dlData
          && x.dlData.anchor_date === data.anchor_date
          && ((x.dlData.slot === 'evening') !== eve)
          && (excludeId == null || x.id !== excludeId)) || null;
      }
      window.__dlSetSlot = function(oi) {
        const data = window.__lastDlData;
        if (!data) return;
        const tgtEve = oi === 1;
        if (tgtEve === (data.slot === 'evening')) { _dlRerender(); return; }
        const sib = _dlSibling(data, _dlActiveSaveId);
        if (sib) {
          window.__dlRenderResult(sib.dlData, sib.dlData.prompt || sib.title || '', { skipSave: true, savedId: sib.id });
          return;
        }
        // The tab stays in the DAILY context — even when another track
        // holds a moment on this date (a trip's dinner), never bounce her
        // into that artifact from here (first cut did; it read as being
        // dumped into the travel edit — the rail is the cross-track
        // surface). A daily evening she creates simply outranks it at
        // read time (daily > travel > weekly).
        // That moment has no look yet — the invitation (dressing it is an
        // ADDITION: this look is never restyled). Rendered in place of the
        // console; the switcher stays so she can flip straight back.
        const conEl = dlResultPage && dlResultPage.querySelector('.dlm-console');
        if (!conEl) return;
        const serif = "'Cormorant',Georgia,serif";
        const seg = (label, o, on) =>
          `<button onclick="window.__dlSetSlot(${o})" style="border:none;border-radius:100px;padding:5px 13px;font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;font-family:inherit;background:${on ? '#202021' : 'transparent'};color:${on ? '#fff' : '#8A8078'};white-space:nowrap">${label}</button>`;
        const pair = `<div style="display:inline-flex;gap:2px;background:#F5F0E8;border:0.5px solid rgba(32,32,33,0.1);border-radius:100px;padding:2px">`
          + seg('Day' + (tgtEve ? '' : ' · free'), 0, !tgtEve)
          + seg('Evening' + (tgtEve ? ' · free' : ''), 1, tgtEve)
          + `</div>`;
        // COPY: needs sign-off (invitation strings)
        conEl.innerHTML = `
          <div style="grid-column:1/-1">
            <div style="margin-bottom:10px">${pair}</div>
            <div style="background:#fff;border:0.5px dashed rgba(32,32,33,0.2);border-radius:16px;padding:40px 24px;text-align:center">
              <div style="font-family:${serif};font-size:26px;font-weight:300;color:#202021;margin-bottom:6px">The ${tgtEve ? 'evening' : 'day'}, <em style="font-style:italic">left free.</em></div>
              <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:16px">${tgtEve ? 'Add a plan and the evening gets its own look — the day stays exactly as it is.' : 'Give the day a plan and it gets its own look — the evening stays exactly as it is.'}</div>
              <input id="dl-eve-act" placeholder="${tgtEve ? 'Date night, drinks, a dinner out…' : 'Office day, errands, a lunch…'}" style="width:100%;max-width:320px;box-sizing:border-box;border:0.5px solid rgba(32,32,33,0.16);border-radius:100px;padding:11px 16px;font-size:13px;font-family:inherit;color:#202021;background:#FAF8F5;outline:none;margin:0 auto 14px;display:block" onkeydown="if(event.key==='Enter')window.__dlDressSlot(${oi})">
              <button onclick="window.__dlDressSlot(${oi})" style="background:#202021;color:#fff;border:none;border-radius:100px;padding:12px 22px;font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;font-family:inherit">✦ Dress the ${tgtEve ? 'evening' : 'day'} →</button>
            </div>
          </div>`;
      };
      window.__dlDressSlot = function(oi) {
        const data = window.__lastDlData;
        if (!data) return;
        const typed = ((document.getElementById('dl-eve-act') || {}).value || '').trim();
        if (!typed) { const el = document.getElementById('dl-eve-act'); if (el) el.focus(); return; }
        window.__dlSubmit(typed, { anchorDate: data.anchor_date, slot: oi === 1 ? 'evening' : undefined });
      };
      window.__dlFlip = function(fi, dir) {
        const it = window.__dlCurrentItems && window.__dlCurrentItems[fi];
        if (!it || !window.__lastDlData) return;
        const list = _dlOptions(it);
        if (list.length < 2) { _waShowToast('Nothing else fits this slot yet — snap more pieces'); return; }
        const next = list[(_dlOptIndex(it, list) + dir + list.length) % list.length];
        _dlApplyOption(it, next);
        _dlRerender();
        window.__rbcAnimateTile(fi);
      };
      window.__dlAnchor = function(fi) {
        const it = window.__dlCurrentItems && window.__dlCurrentItems[fi];
        if (!it) return;
        it.anchored = !it.anchored;
        _dlRerender();
        _waShowToast(it.anchored ? 'Anchored — restyles build around it' : 'Anchor released');
      };
      // Remove a piece she doesn't need (no jacket today, no bag) — the
      // look re-reads without it. Guarded so a look never empties out.
      window.__dlRemove = function(fi) {
        const flat = window.__dlCurrentItems || [];
        const it = flat[fi];
        if (!it || !window.__lastDlData) return;
        if (flat.length <= 2) { _waShowToast('A look needs at least two pieces'); _dlRerender(); return; }
        let k = fi;
        for (const s of window.__lastDlData.steps) {
          const items = s.items || [];
          if (k < items.length) { items.splice(k, 1); break; }
          k -= items.length;
        }
        _dlRerender();
        _waShowToast(it.name + ' removed from the look');
      };
      // "Restyle it" / "Dress me again" — a full re-mix that keeps every
      // anchored piece exactly where it is and evolves the SAME saved look.
      window.__dlRestyle = function() {
        const flat = window.__dlCurrentItems || [];
        const locked = flat.filter(it => it.anchored).map(it => ({
          name: it.name, category: it.category || '', brand: it.brand || '',
          wardrobe_id: it.wardrobe_match ? it.wardrobe_match.id : null,
        }));
        window.__dlSubmit(window.__lastDlPrompt || (window.__lastDlData && window.__lastDlData.prompt) || '', { locked, savedId: _dlActiveSaveId });
      };
      // Add a piece to the rack (+ button) — opens the wardrobe add modal
      // over the page; the new piece joins The Rack (and the moodboard board)
      // on the next render, using its own wardrobe photo.
      window.__dlAddOwned = function(id) {
        const wi = _waItems.find(i => String(i.id) === String(id));
        if (!wi || !window.__lastDlData || !Array.isArray(window.__lastDlData.steps) || !window.__lastDlData.steps.length) return;
        const steps = window.__lastDlData.steps;
        const step = steps[steps.length - 1];
        if (!Array.isArray(step.items)) step.items = [];
        step.items.push({
          name: wi.label, category: wi.category || 'Other', brand: wi.brand || '', description: '',
          wardrobe_index: -1, retailer_hint: '', price_point: '', alternates: [],
          wardrobe_match: { id: wi.id, label: wi.label, image_url: wi.image_url || null, color: wi.color || '' },
        });
        _dlRerender();
        _waShowToast(wi.label + ' added to the look');
      };
      window.__dlAddPiece = function() {
        window.__rbcAddMenu('__dlAddOwned');
      };

      // Save — the account-scoped acquisition verb for an unowned Daily
      // piece (Build 1, amended). Writes wishlist_items via _wlSaveFromItem;
      // never touches wardrobe_items.
      window.__dlSaveWishlist = async function(fi) {
        const it = window.__dlCurrentItems && window.__dlCurrentItems[fi];
        if (!it || it.wardrobe_match) return;
        await _wlSaveFromItem(it);
        _dlRerender();
      };

      let _dlWorn = false;
      window.__dlWear = async function() {
        if (_dlWorn) { _waShowToast('Already logged for this look'); return; }
        const flat = window.__dlCurrentItems || [];
        const ownedIds = flat.filter(it => it.wardrobe_match).map(it => it.wardrobe_match.id);
        if (!ownedIds.length) { _waShowToast('Nothing owned in this look yet — snap your pieces to log wears'); return; }
        _dlWorn = true;
        try {
          // Passive accrual (brief B3): this confirmed wear saves the Look, so
          // the daily look she wore becomes a catalogue entry with no extra
          // step. __lkAccrue owns times_worn for the wear it writes; the manual
          // patch below is the fallback when it declined (already logged today,
          // or fewer than two owned pieces).
          const anchorISO = (window.__lastDlData && window.__lastDlData.anchor_date) || null;
          const acc = typeof window.__lkAccrue === 'function' ? window.__lkAccrue(ownedIds, {
            date: anchorISO || _pdLocalISO(),
            hint: (window.__lastDlData && (window.__lastDlData.occasion_label || window.__lastDlData.headline)) || null,
            source: 'daily', sourceId: _dlActiveSaveId,
          }) : null;
          if (!acc || !acc.wear) {
            for (const id of ownedIds) {
              const wi = _waItems.find(w => String(w.id) === String(id));
              if (wi) await _waFetch('PATCH', 'wardrobe_items?id=eq.' + id, { times_worn: (Number(wi.times_worn) || 0) + 1 });
            }
          }
          _waLoad();
          // The worn signal lands on the day's index row too — stamped into
          // the blob first so a later patch/resync can't revert the status.
          if (window.__lastDlData) window.__lastDlData.worn = true;
          if (_dlActiveSaveId) {
            const saved = snLoad().find(x => x.id === _dlActiveSaveId);
            if (saved && saved.dlData) snUpdate(_dlActiveSaveId, { dlData: { ...saved.dlData, worn: true } });
            _pdSyncSaved(_dlActiveSaveId);
          }
          // The look may be anchored to a past (or future) date — the toast
          // must describe the wear it actually logged, never assume "today".
          const anchor = (window.__lastDlData && window.__lastDlData.anchor_date) || null;
          const todayISO = window._pdLocalISO ? window._pdLocalISO(new Date()) : null;
          let wearToast = 'On you today — Robes logged the wear ✓';
          if (anchor && todayISO && anchor !== todayISO) {
            const wd = new Date(anchor + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long' });
            wearToast = anchor < todayISO
              ? `Logged — the ${wd} wear counts ✓`
              : `Noted for ${wd} — Robes will count the wear ✓`;
          }
          _waShowToast(wearToast);
          const wb = document.getElementById('dl-wear-btn');
          if (wb) { wb.textContent = 'Worn ✓'; wb.style.opacity = '.55'; wb.style.pointerEvents = 'none'; }
        } catch (e) {
          _dlWorn = false;
          console.warn('[robes] wear log failed:', e);
          _waShowToast('Couldn’t log the wear — try again');
        }
      };

      // Styled to the live platform design system (matches the Moodboard
      // header + the cream/white, rounded-pill language used everywhere).
      const _DL_CSS = `
#dl-result-page{color:var(--ink);font-weight:300}
#dl-result-page .dlm-wrap{max-width:var(--shell,1440px);margin:0 auto;padding:34px var(--s6,36px) 28px;box-sizing:border-box}
#dl-result-page .dlm-eyebrow{font-size:10px;font-weight:500;letter-spacing:.24em;text-transform:uppercase;color:var(--rose);margin-bottom:8px}
#dl-result-page .dlm-title{font-family:var(--font-serif);font-weight:300;font-style:italic;font-size:clamp(30px,4vw,42px);line-height:1.05;color:var(--ink);margin:0}
#dl-result-page .dlm-kws{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:12px}
#dl-result-page .dlm-kws .kw{font-size:9.5px;font-weight:500;letter-spacing:.06em;color:var(--ink-faint)}
#dl-result-page .dlm-kws .dot{color:var(--mauve)}
#dl-result-page .dlm-meta-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:16px}
#dl-result-page .dlm-wx{display:inline-flex;align-items:center;gap:10px;padding:8px 14px;background:#fff;border:0.5px solid var(--rule-mid);border-radius:100px;font-size:11.5px;color:var(--ink-soft)}
#dl-result-page .dlm-wx strong{font-weight:500;color:var(--ink)}
#dl-result-page .dlm-wx .div{width:1px;height:11px;background:var(--rule-mid)}
#dl-result-page .dlm-tag{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:100px;background:var(--sage-bg);border:0.5px solid rgba(126,124,90,0.2)}
#dl-result-page .dlm-tag .lab{font-size:9px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint)}
#dl-result-page .dlm-tag .val{font-size:11.5px;font-weight:500;color:var(--sage)}
#dl-result-page .dlm-rule{height:0.5px;background:var(--rule);margin:22px 0 28px}
#dl-result-page .dlm-console{display:grid;grid-template-columns:360px minmax(0,1fr);gap:34px;align-items:start}
#dl-result-page .dlm-look{position:sticky;top:18px;display:flex;flex-direction:column;gap:13px}




























































@media(max-width:900px){
#dl-result-page .dlm-console{grid-template-columns:1fr;gap:26px}
#dl-result-page .dlm-look{position:static}
#dl-result-page .dlm-wrap{padding:28px 20px 20px}
}
@media(max-width:520px){


}`;

      window.__dlRenderResult = function(data, promptText, opts) {
        if (!data || !Array.isArray(data.steps) || !data.steps.length) {
          _waShowToast('Could not build today’s look — please try again');
          return;
        }
        _dlStopPolling();
        window.__lastDlData = data;
        window.__lastDlPrompt = promptText || data.prompt || '';
        _dlWorn = false;
        const serif = "'Cormorant',Georgia,serif";
        const sans = "-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif";
        const ctx = data.context || null;
        const flat = [];
        data.steps.forEach(s => (s.items || []).forEach(it => flat.push(it)));
        window.__dlCurrentItems = flat;
        // The rack reads in wardrobe order — top, bottom (or dress), shoes,
        // bag, accessories, layer — while fi stays the flat steps index so
        // swap / persist / imagery all keep working.
        const ordered = flat.map((it, fi) => ({ it, fi, slot: _dlSlot(it) })).sort((a, b) => a.slot.o - b.slot.o);
        const owned = flat.filter(it => it.wardrobe_match).length;
        const total = flat.length;
        const images = Array.isArray(data.generatedImages) ? data.generatedImages : [];
        const imagesPending = !!data.jobId && !images.some(Boolean);
        const hexOk = h => typeof h === 'string' && /^#[0-9A-Fa-f]{6}$/.test(h);
        const palette = (Array.isArray(data.palette) ? data.palette : []).filter(hexOk).slice(0, 3);
        const headline = data.headline || 'A look for today.';
        // The look belongs to its anchor date, not to whenever it renders —
        // a Friday look scoped from the rail must read Friday everywhere.
        const weekday = (data.anchor_date ? new Date(data.anchor_date + 'T00:00:00') : new Date()).toLocaleDateString('en-GB', { weekday: 'long' });
        const provenance = owned === total && total > 0
          ? 'All ' + total + ' pieces from your wardrobe'
          : owned > 0 ? owned + ' of ' + total + ' from your wardrobe' : total + ' pieces · an editorial build';

        // Stylist summary reads as plain prose — the framework step names are
        // no longer emphasised as jargon labels (bug report 4.7). The rack
        // itself now labels each piece by its garment slot, not its role.
        const summaryHtml = _waEsc(data.stylist_summary || '');

        if (!dlResultPage) {
          dlResultPage = document.createElement('div');
          dlResultPage.id = 'dl-result-page';
          dlResultPage.style.cssText = 'position:fixed;left:0;top:var(--nav-h,60px);right:0;bottom:0;width:100%;z-index:40;background:#FAF8F5;overflow-y:auto;font-family:' + sans;
          document.body.appendChild(dlResultPage);
        }
        let dlStyleEl = document.getElementById('dl-style');
        if (!dlStyleEl) {
          dlStyleEl = document.createElement('style');
          dlStyleEl.id = 'dl-style';
          document.head.appendChild(dlStyleEl);
        }
        dlStyleEl.textContent = _DL_CSS;
        _rbHideResultPages('dl');

        const restyleSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>`;
        const phSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C8BCAE" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;

        // Frame source: an owned piece shows its real wardrobe photo; the
        // original AI piece shows its generated still (patched in by the
        // poller); a flicked-in alternate has no imagery yet → mono tile.
        const frameBits = (it) => {
          const wmImg = it.wardrobe_match && it.wardrobe_match.image_url;
          const altered = _dlAltered(it);
          const genOk = !altered && Number.isInteger(it.image_index);
          const src = wmImg || (genOk ? images[it.image_index] : null);
          const pollAttr = (!wmImg && genOk) ? ' data-dlimg="' + it.image_index + '"' : '';
          const pulse = !src && !wmImg && genOk && imagesPending;
          const phInner = pulse
            ? `<span style="font-family:${serif};font-style:italic;font-size:12px;color:var(--ink-faint);text-align:center;padding:0 12px">Creating imagery…</span>`
            : (altered && !wmImg)
              ? `<span class="rbc-mono" style="font-family:${serif};font-size:30px;font-weight:300;color:var(--ink-faint)">${_waEsc((it.name || '?').charAt(0).toUpperCase())}</span>`
              : phSvg;
          const inner = src && typeof src === 'string'
            ? `<img src="${_waEsc(src)}" style="width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0" alt="">`
            : `<div class="dl-img-ph" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;${pulse ? 'animation:kpPhPulse 1.8s ease-in-out infinite' : ''}">${phInner}</div>`;
          return { pollAttr, inner };
        };

        // The Look — a single moodboard in the stylist-Instagram register
        const quoteParts = {};
        ordered.forEach(x => { const l = x.slot.l; if (!quoteParts[l]) quoteParts[l] = _dlShort(x.it.name); });
        const cap1 = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
        let quote = '';
        const base = quoteParts.Top || quoteParts.Dress || quoteParts.Layer || quoteParts.Piece;
        if (base) {
          quote = cap1(base);
          if (quoteParts.Top && (quoteParts.Bottom || quoteParts.Dress)) quote += ' with the ' + (quoteParts.Bottom || quoteParts.Dress);
          if (quoteParts.Shoes) quote += ' — ' + quoteParts.Shoes + ' at the foot';
          if (quoteParts.Accessory || quoteParts.Bag) quote += ', the ' + (quoteParts.Accessory || quoteParts.Bag) + ' to finish';
          quote += '.';
        }

        const fabricsHtml = _rbcFabricsHtml(ordered.map(x => x.it), palette);

        // The console renders through the shared template (_rbConsole) —
        // this adapter only supplies frames, provenance and handlers.
        const conItems = ordered.map(x => {
          const { it, fi, slot } = x;
          const list = _dlOptions(it);
          return {
            idx: fi,
            frame: frameBits(it),
            slot: slot.l,
            shortName: _dlShort(it.name),
            name: it.name,
            owned: !!it.wardrobe_match,
            anchored: !!it.anchored,
            showAddTag: !it.wardrobe_match,
            count: { cur: _dlOptIndex(it, list), len: list.length },
            subHtml: _rbcProvenance(it),
            noteHtml: it.how ? `<div class="rbc-hownote">${_waEsc(it.how)}</div>` : '',
            thirdHtml: it.wardrobe_match ? '' : (it.wishlisted
              ? `<span class="rbc-act done">${_rbcCheckSvg} Saved</span>`
              : `<button class="rbc-act save" onclick="window.__dlSaveWishlist(${fi})">Save</button>`),
          };
        });
        // Day/Evening pair (evening rules 2026-07-24): the daily track's
        // two moments are two SAVED LOOKS at the same anchor date — the
        // switcher navigates between them, or invites dressing the empty
        // one (always an addition, never a restyle of this look).
        const dlEve = data.slot === 'evening';
        // Exclusion comes from opts, not _dlActiveSaveId — the module var
        // still points at the PREVIOUS look this early in the render.
        const dlSib = _dlSibling(data, (opts && opts.savedId) || data.id || null);
        const dlSeg = (label, oi, on) =>
          `<button onclick="window.__dlSetSlot(${oi})" style="border:none;border-radius:100px;padding:5px 13px;font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;font-family:inherit;background:${on ? '#202021' : 'transparent'};color:${on ? '#fff' : '#8A8078'};white-space:nowrap">${label}</button>`;
        const dlOccHtml = data.anchor_date
          ? `<div style="display:inline-flex;width:max-content;gap:2px;background:#F5F0E8;border:0.5px solid rgba(32,32,33,0.1);border-radius:100px;padding:2px;margin:2px 0 4px;align-self:flex-start">`
            + dlSeg('Day' + (!dlEve || dlSib ? '' : ' · free'), 0, !dlEve)
            + dlSeg('Evening' + (dlEve || dlSib ? '' : ' · free'), 1, dlEve)
            + `</div>`
          : '';
        const dlMomentLabel = weekday + (dlEve ? ' evening' : '');
        const con = _rbConsole({
          headLabel: `The look · ${_waEsc(dlMomentLabel)} · ${total} pieces`,
          occHtml: dlOccHtml,
          quoteHtml: summaryHtml || (quote ? '“' + _waEsc(quote) + '”' : ''),
          fabricsHtml,
          paletteHtml: palette.map(h => `<span style="background:${h}"></span>`).join(''),
          addChipLabel: _rbTrackCfg('daily').console.addVerb,
          rackLabel: `The rack · ${_waEsc(dlMomentLabel)}`,
          rackTitleHtml: data.occasion_label ? (() => {
            const t = cap1(data.occasion_label.toLowerCase());
            return `<h2>${_waEsc(t)}${!/[.!?]$/.test(t) ? '.' : ''}</h2>`;
          })() : '',
          headButtonsHtml: (data && data.worn)
            ? `<span class="rbc-hbtn" style="opacity:.55;pointer-events:none">Worn ✓</span><button class="rbc-hbtn" onclick="window.__dlRestyle()" title="A fresh look — anchored pieces stay">↻ Restyle this day</button>`
            : `<button class="rbc-hbtn" id="dl-wear-btn" onclick="window.__dlWear()" title="Log these pieces as worn — wear counts feed cost-per-wear">✓ Wore it</button><button class="rbc-hbtn" onclick="window.__dlRestyle()" title="A fresh look — anchored pieces stay">↻ Restyle this day</button>`,
          onFlip: '__dlFlip', onSwap: '__dlSwap', onAnchor: '__dlAnchor', onRemove: '__dlRemove',
          addPieceFn: '__dlAddPiece',
          lookActionHtml: `<button onclick="window.__rbShare&&window.__rbShare()">Share this look</button>`,
        }, conItems);

        // Header mirrors the live Moodboard: eyebrow → short serif title →
        // keyword row → meta row (weather-strip pill + occasion tag pill).
        window.rbSetCrumb && window.rbSetCrumb([{ label: 'Daily look' }]);
        try { dlResultPage.innerHTML = `
          <div class="dlm-wrap">
            <header>
              <div class="dlm-eyebrow">${_waEsc(_rbTrackCfg('daily').artifact.eyebrow)}</div>
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
                <h1 class="dlm-title">${_waEsc(headline)}</h1>
                <button class="rb-rename-tbtn" title="Rename" style="margin-top:6px" onclick="window.__rbRename&&window.__rbRename('dl')"><svg viewBox="0 0 24 24"><path d="M4 20h4L18 10l-4-4L4 16v4z"/><path d="M13 7l4 4"/></svg></button>
              </div>
              ${data.occasion_label ? `<div class="dlm-kws"><span class="kw">${_waEsc(cap1(data.occasion_label.toLowerCase()))}</span></div>` : ''}
              <div class="dlm-meta-row">
                ${ctx && (ctx.city || ctx.tempRange) ? `<div class="dlm-wx"><span>🌤</span><strong>${_waEsc([ctx.city, ctx.month].filter(Boolean).join(' · '))}</strong>${ctx.tempRange ? `<span class="div"></span><span>${_waEsc(ctx.tempRange)}</span>` : ''}${ctx.hint ? `<span class="div"></span><span>${_waEsc(ctx.hint)}</span>` : ''}</div>` : ''}
                ${data.occasion_label ? `<div class="dlm-tag"><span class="lab">Occasion</span><span class="val">${_waEsc(cap1(data.occasion_label.toLowerCase()))}</span></div>` : ''}
              </div>
            </header>
            ${data.fallback ? `<p style="font-size:12px;color:var(--ink-faint);font-style:italic;margin:12px 0 0">Robes couldn’t quite read your brief, so it’s dressed you for a lovely ordinary day instead.</p>` : ''}
            <div class="dlm-rule"></div>

            <div class="dlm-console">
              <div class="dlm-look">${con.lookHtml}</div>
              <div>${con.rackHtml}</div>
            </div>

            ${_rbFeedbackBlock('dl', { title: 'How is today’s look?', up: '👍 I’d wear it', down: 'Not quite' })}
          </div>`; } catch (e) {
          console.error('[Robes] dlResultPage render error:', e);
          dlResultPage.innerHTML = `<div style="padding:80px 24px;text-align:center;font-family:${sans};color:#6E6A64">Something went wrong rendering today’s look — please try again.</div>`;
        }

        dlResultPage.style.display = 'block';
        dlResultPage.scrollTo({ top: (opts && opts.keepScroll) || 0 });

        if (data.jobId) _dlPollImages(data.jobId, total);

        // Auto-save to the lookbook. jobId is stripped from the stored copy —
        // a reopened entry must never poll a dead job. Images land later via
        // _dlPersistImages as hosted URLs (base64 is never persisted).
        if (!opts || !opts.skipSave) {
          const persistable = images.map(s => (typeof s === 'string' && s.indexOf('http') === 0) ? s : null);
          const saveCopy = { ...data, jobId: undefined, generatedImages: persistable, prompt: promptText || data.prompt || '' };
          _dlActiveSaveId = snAdd({
            type: 'daily-look',
            title: data.headline || 'Today’s look',
            subtitle: 'Daily look · ' + weekday,
            img: persistable.find(Boolean) || null,
            dlData: saveCopy,
          });
          _rbTrack('look_generated', { track: 'daily', item: String(_dlActiveSaveId) });
          _pdSync('daily', _dlActiveSaveId, saveCopy);
        } else {
          _dlActiveSaveId = (opts && opts.savedId) || data.id || null;
        }

        _rbFeedbackArm('dl', () => ({
          prompt: promptText || '',
          looksOutput: JSON.stringify({ surface: 'daily-look', occasion: data.occasion_label || '', headline: data.headline || '', owned, total, context: ctx, ts: new Date().toISOString() }),
        }));
      };

      // ── Shared swap modal (PRD 3.B) — ONE implementation for the Daily,
      // Weekly and Travel racks. cfg: {id, applyName, snapName, idx} — the
      // apply/snap handlers stay per-surface, the modal itself never forks.
      function _rbSwapModal(item, cfg) {
        document.getElementById(cfg.id)?.remove();

        const catLower = (item.category || '').toLowerCase();
        const catMatch = wi => {
          const wiCat = (wi.category || '').toLowerCase();
          return wiCat === catLower || catLower.includes(wiCat) || wiCat.includes(catLower) || wiCat.replace(/s$/, '') === catLower.replace(/s$/, '');
        };
        // cfg.pool scopes the primary candidates (Phase 4: a trip day swaps
        // within its capsule); default is the full wardrobe. Each pool entry:
        // {id, label, image_url, category}.
        const scoped = Array.isArray(cfg.pool);
        const candidates = (scoped ? cfg.pool : _waItems).filter(catMatch);
        const retailer = item.retailer_hint || '';
        const price = item.price_point || '';

        let aiAlt = null;
        if (!scoped && !candidates.length && _waItems.length > 0) aiAlt = _waItems[0];

        const closeSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        const cameraSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
        const arrowSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;

        let wardrobeSection = '';
        if (candidates.length > 0) {
          const itemsHtml = candidates.slice(0, 8).map(wi => `
            <div onclick="window.${cfg.applyName}(${cfg.idx},'${_waEsc(wi.id)}')" style="cursor:pointer;border-radius:var(--rad-sm);overflow:hidden;background:#fff;border:0.5px solid rgba(32,32,33,0.08);transition:box-shadow .15s" onmouseenter="this.style.boxShadow='0 4px 12px rgba(32,32,33,0.12)'" onmouseleave="this.style.boxShadow='none'">
              ${wi.image_url
                ? `<img src="${_waEsc(wi.image_url)}" style="width:100%;aspect-ratio:1;object-fit:cover;display:block" alt="">`
                : `<div style="aspect-ratio:1;background:#EDE8E0;display:flex;align-items:center;justify-content:center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C8C0B8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`}
              <div style="padding:7px 8px;font-size:10.5px;color:#3A3733;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_waEsc(wi.label)}</div>
            </div>`).join('');
          wardrobeSection = `
            <div style="margin-bottom:24px">
              <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin:0 0 10px">${scoped ? 'From your case' : 'From your wardrobe'}</p>
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${itemsHtml}</div>
            </div>`;
        } else if (aiAlt) {
          wardrobeSection = `
            <div style="margin-bottom:24px;background:#F5F2EE;border-radius:var(--rad);padding:14px">
              <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin:0 0 6px">Robes’ suggestion</p>
              <p style="font-family:'Cormorant',Georgia,serif;font-size:15px;font-weight:300;color:#202021;margin:0 0 10px;line-height:1.5">You don’t have a ${_waEsc((item.category || 'piece').toLowerCase())}, but your <em>${_waEsc(aiAlt.label)}</em> creates a similar outline.</p>
              <button onclick="window.${cfg.applyName}(${cfg.idx},'${_waEsc(aiAlt.id)}')" style="font-size:10px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:#202021;background:#EDE8E0;border:none;border-radius:20px;padding:6px 14px;cursor:pointer">Use this instead</button>
            </div>`;
        }

        // Adoption (Phase 4 §4.2): a scoped (capsule) swap can still reach
        // the rest of her wardrobe — but picking one ADDS it to the case
        // (membership, counters, pack progress) and restyles this day only.
        // The one-line note IS the inline confirmation. COPY: needs sign-off
        let adoptSection = '';
        if (cfg.adopt && scoped) {
          const inPool = new Set(cfg.pool.map(p => String(p.wid != null ? p.wid : '')));
          ((cfg.adopt.exclude || [])).forEach(id => inPool.add(String(id)));
          const outside = _waItems.filter(wi => catMatch(wi) && !inPool.has(String(wi.id))).slice(0, 8);
          if (outside.length) {
            const adoptItems = outside.map(wi => `
              <div onclick="window.${cfg.adopt.applyName}(${cfg.idx},'${_waEsc(wi.id)}')" style="cursor:pointer;border-radius:var(--rad-sm);overflow:hidden;background:#fff;border:0.5px dashed rgba(32,32,33,0.2)">
                ${wi.image_url
                  ? `<img src="${_waEsc(wi.image_url)}" style="width:100%;aspect-ratio:1;object-fit:cover;display:block" alt="">`
                  : `<div style="aspect-ratio:1;background:#EDE8E0"></div>`}
                <div style="padding:7px 8px;font-size:10.5px;color:#3A3733;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_waEsc(wi.label)}</div>
              </div>`).join('');
            adoptSection = `
              <div style="margin-bottom:24px">
                <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin:0 0 4px">From the rest of your wardrobe</p>
                <p style="font-size:11px;color:var(--ink-faint);margin:0 0 10px">Picking one adds it to your case and restyles this day only.</p>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${adoptItems}</div>
              </div>`;
          }
        }

        const modal = document.createElement('div');
        modal.id = cfg.id;
        modal.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:24px';
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
        modal.innerHTML = `
          <div style="background:#FAF8F5;border-radius:20px;width:100%;max-width:480px;max-height:80vh;overflow-y:auto;box-sizing:border-box;box-shadow:0 24px 60px -12px rgba(32,32,33,0.28)">
            <div style="position:sticky;top:0;background:#FAF8F5;padding:20px 20px 0;z-index:2">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:2px">
                <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin:0">Swap this piece</p>
                <button onclick="document.getElementById('${cfg.id}').remove()" style="background:none;border:none;cursor:pointer;padding:2px;color:var(--ink-faint);line-height:1;margin-top:-2px">${closeSvg}</button>
              </div>
              <p style="font-family:'Cormorant',Georgia,serif;font-size:26px;font-weight:300;color:#202021;margin:0 0 2px;line-height:1.15">${_waEsc(item.name)}</p>
              ${(item.brand || retailer) ? `<p style="font-size:12px;color:var(--ink-faint);font-style:italic;margin:0 0 18px">${_waEsc(item.brand || retailer)}</p>` : `<div style="height:18px"></div>`}
              <div style="height:1px;background:rgba(32,32,33,0.08);margin:0 -20px 20px"></div>
            </div>
            <div style="padding:0 20px 32px">
              ${wardrobeSection}${adoptSection}
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:${(retailer || price) ? '10px' : '0'}">
                <button onclick="window.${cfg.snapName}()" style="display:inline-flex;align-items:center;justify-content:center;gap:7px;font-size:12px;font-weight:500;color:#202021;background:#EDE8E0;border:none;border-radius:100px;padding:14px 16px;cursor:pointer;letter-spacing:.01em">
                  ${cameraSvg} Snap mine
                </button>
                <button onclick="window.__rbAffiliateSoon('${cfg.id}')" style="display:inline-flex;align-items:center;justify-content:center;gap:7px;font-size:12px;font-weight:500;color:#202021;background:#fff;border:1px solid rgba(32,32,33,0.15);border-radius:100px;padding:14px 16px;cursor:pointer;letter-spacing:.01em">
                  Shop via Affiliate ${arrowSvg}
                </button>
              </div>
              ${(retailer || price) ? `<p style="text-align:center;font-size:11px;color:var(--ink-faint);margin:0">Opens ${_waEsc(retailer)}${price ? ' · ' + _waEsc(price) : ''}</p>` : ''}
            </div>
          </div>`;
        document.body.appendChild(modal);
      }

      // ── Daily Look swap — same PRD 3.B pattern as the moodboard modal ──
      let _dlSwapIdx = null; // item index the open swap modal is targeting
      window.__dlSnapMine = function() {
        // Arm the post-add hook so the piece the user is about to snap
        // lands straight into this look's slot, then swaps its thumbnail.
        const idx = _dlSwapIdx;
        _waAfterAdd = (newId) => window.__dlSwapApply(idx, newId);
        _waEditId = null;
        document.getElementById('dl-swap-modal')?.remove();
        if (window.WA && WA.open) WA.open();
      };

      window.__dlSwap = function(idx) {
        const item = (window.__dlCurrentItems || [])[idx];
        if (!item) return;
        _dlSwapIdx = idx;
        _rbSwapModal(item, { id: 'dl-swap-modal', applyName: '__dlSwapApply', snapName: '__dlSnapMine', idx });
      };

      window.__dlSwapApply = function(idx, wardrobeId) {
        _rbTrack('piece_swapped', { surface: 'daily', item: String(wardrobeId) });
        const wi = _waItems.find(i => i.id === wardrobeId);
        const item = window.__dlCurrentItems && window.__dlCurrentItems[idx];
        if (!wi || !item || !window.__lastDlData) return;
        item.wardrobe_match = { id: wi.id, label: wi.label, image_url: wi.image_url || null, color: wi.color || '' };
        item.name = wi.label;
        item.brand = wi.brand || '';
        item.retailer_hint = '';
        item.price_point = '';
        document.getElementById('dl-swap-modal')?.remove();
        // Items are references into __lastDlData.steps, so the re-render
        // picks up the swap and _dlRerender patches the saved entry.
        _dlRerender();
        window.__rbcAnimateTile(idx);
        _waShowToast(wi.label + ' swapped in');
      };

      // ── Weekly Plan (P0 simplification — the Weekly Plan View) ─────────
      // A chronological 5–7 day calendar strip routing wardrobe items
      // across the user's agenda. Deliberately lean: no imagery jobs —
      // owned pieces render their real wardrobe photos, new pieces a
      // serif monogram. Saved to the lookbook as type 'weekly-plan'.
      let _wkState = null; // { data, prompt, day }
      let _wkActiveSaveId = null; // lookbook id of the live weekly plan
      window.__lastWkData = null;

      // ── Step 1: the week planner modal (mirrors the Travel Edit day
      // planner) — she assigns activities to specific days ("Office",
      // "Dinner", "Pilates"), leaves days blank for Robes to plan, or
      // marks them "Leave free" (no outfit at all), BEFORE anything
      // generates. Defaults to the upcoming Mon–Sun; "+ Plan next week
      // too" extends the calendar to 14 days.
      let _wkPlan = null; // { brief, days: [{label, date, activity, free}] }
      let _wkPlanFocus = 0;

      function _wkWeekDays(count, startOffset) {
        const now = new Date();
        const dow = (now.getDay() + 6) % 7; // 0 = Monday
        const start = new Date(now);
        start.setDate(now.getDate() + (dow === 0 ? 0 : 7 - dow) + (startOffset || 0));
        const out = [];
        for (let i = 0; i < count; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          out.push({
            label: d.toLocaleDateString('en-GB', { weekday: 'long' }),
            date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            // Real ISO date alongside the display strings — the display
            // never round-trips back into a date (migration 12 needs the
            // local calendar date, and "14 Jul" has no year).
            iso: _pdLocalISO(d),
          });
        }
        return out;
      }

      window.__wkOpen = function(opts) {
        if (!_wkPlan) {
          _wkPlan = { brief: '', days: _wkWeekDays(7).map(d => ({ ...d, activity: '', free: false })) };
        }
        if (opts && opts.brief) _wkPlan.brief = opts.brief;
        _wkPlanFocus = 0;
        _wkPlanPaint();
      };

      window.__wkPlanFree = function(i) {
        _wkPlanSync();
        _wkPlan.days[i].free = !_wkPlan.days[i].free;
        _wkPlanPaint();
      };
      window.__wkPlanChip = function(txt) {
        _wkPlanSync();
        const day = _wkPlan.days[_wkPlanFocus];
        if (day && !day.free) { day.activity = txt; }
        _wkPlanPaint();
        const el = document.getElementById('wk-plan-' + _wkPlanFocus);
        if (el) el.focus();
      };
      window.__wkPlanFocusSet = function(i) { _wkPlanFocus = i; };
      window.__wkPlanExtend = function() {
        _wkPlanSync();
        const more = _wkWeekDays(7, _wkPlan.days.length);
        more.forEach(d => _wkPlan.days.push({ ...d, activity: '', free: false }));
        _wkPlanPaint();
      };
      function _wkPlanSync() {
        if (!_wkPlan) return;
        const b = document.getElementById('wk-brief');
        if (b) _wkPlan.brief = b.value;
        _wkPlan.days.forEach((d, i) => {
          const el = document.getElementById('wk-plan-' + i);
          if (el && !d.free) d.activity = el.value;
        });
      }

      function _wkPlanPaint() {
        document.getElementById('wk-plan-modal')?.remove();
        const serif = "'Cormorant',Georgia,serif";
        const inputCss = 'width:100%;box-sizing:border-box;border:1px solid rgba(32,32,33,0.15);border-radius:var(--rad-sm);padding:11px 12px;font-size:13.5px;color:#202021;background:#fff;outline:none;font-family:inherit';
        const ph = ['Office day', 'Client dinner', 'WFH + errands', 'Pilates, then lunch out', 'School run + meetings', 'Date night', 'Slow morning, drinks later'];
        const chips = ['Office', 'WFH', 'Big meeting', 'Dinner out', 'Date night', 'Pilates', 'School run', 'Drinks'];
        const modal = document.createElement('div');
        modal.id = 'wk-plan-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(32,32,33,0.45);display:flex;align-items:center;justify-content:center;padding:20px';
        modal.onclick = function(e) { if (e.target === modal) { _wkPlanSync(); modal.remove(); } };
        const rows = _wkPlan.days.map((d, i) => `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">
            <div style="flex-shrink:0;width:96px">
              <div style="font-family:${serif};font-size:15px;color:#202021;line-height:1.1">${_waEsc(d.label)}</div>
              <div style="font-size:10px;color:var(--ink-faint)">${_waEsc(d.date)}</div>
            </div>
            <input id="wk-plan-${i}" value="${_waEsc(d.free ? '' : d.activity)}"${d.free ? ' disabled' : ''} placeholder="${_waEsc(d.free ? 'Left free — no outfit this day' : ph[i % ph.length])}" onfocus="window.__wkPlanFocusSet(${i})" style="${inputCss}${d.free ? ';opacity:.5;background:#F0EDE8' : ''}">
            <button onclick="window.__wkPlanFree(${i})" style="flex-shrink:0;background:none;border:0.5px solid rgba(32,32,33,0.18);border-radius:100px;padding:7px 12px;font-size:10px;letter-spacing:.06em;cursor:pointer;color:${d.free ? '#fff' : '#6E6A64'};background:${d.free ? '#202021' : '#fff'};font-family:inherit;white-space:nowrap">${d.free ? 'Freed' : 'Leave free'}</button>
          </div>`).join('');
        const chipsHtml = chips.map(c =>
          `<button onclick="window.__wkPlanChip('${_waEsc(c)}')" style="flex-shrink:0;background:#FAF8F5;border:0.5px solid rgba(32,32,33,0.14);border-radius:100px;padding:7px 13px;font-size:11px;cursor:pointer;color:#202021;font-family:inherit;white-space:nowrap">${_waEsc(c)}</button>`).join('');
        const nActive = _wkPlan.days.filter(d => !d.free).length;
        modal.innerHTML = `
          <div style="background:#FAF8F5;border-radius:20px;width:100%;max-width:560px;max-height:86vh;overflow-y:auto;box-sizing:border-box;box-shadow:0 24px 60px -12px rgba(32,32,33,0.28);padding:26px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px">
              <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin:0">The weekly plan</p>
              <button onclick="(function(){document.getElementById('wk-plan-modal').remove()})()" style="background:none;border:none;cursor:pointer;padding:2px;color:var(--ink-faint);font-size:16px;line-height:1">×</button>
            </div>
            <p style="font-family:${serif};font-size:26px;font-weight:300;color:#202021;margin:0 0 6px;line-height:1.15">What does the week hold?</p>
            <p style="font-size:12.5px;color:var(--ink-soft);line-height:1.5;margin:0 0 16px">Tell Robes each day's plan, leave it blank and Robes reads the week, or leave the day free — free days get no outfit.</p>
            <input id="wk-brief" value="${_waEsc(_wkPlan.brief)}" placeholder="The week's mood — smart, comfortable, no repeats…" style="${inputCss};margin-bottom:16px">
            <div style="display:flex;gap:6px;overflow-x:auto;padding:2px 0 14px">${chipsHtml}</div>
            ${rows}
            ${_wkPlan.days.length < 14 ? `<button onclick="window.__wkPlanExtend()" style="width:100%;margin-top:4px;background:none;border:1px dashed rgba(32,32,33,0.22);border-radius:var(--rad-sm);padding:10px;font-size:11.5px;color:#6E6A64;cursor:pointer;font-family:inherit">+ Plan next week too</button>` : ''}
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:18px;flex-wrap:wrap">
              <button onclick="window.__wkPlanGo(true)" style="background:none;border:none;cursor:pointer;font-size:11.5px;color:var(--ink-faint);text-decoration:underline;font-family:inherit;padding:4px 0">Skip — let Robes plan the days</button>
              <button onclick="window.__wkPlanGo()" style="background:#202021;color:#fff;border:none;border-radius:100px;padding:13px 24px;font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;font-family:inherit">Create my week · ${nActive} days →</button>
            </div>
          </div>`;
        document.body.appendChild(modal);
      }

      window.__wkPlanGo = function(skip) {
        _wkPlanSync();
        const days = _wkPlan.days;
        const dayPlan = days.map(d => d.free ? null : (skip ? '' : (d.activity || '').trim()));
        if (!dayPlan.some(p => p !== null)) { _waShowToast('Every day is left free — keep at least one dressed'); return; }
        const weekDays = days.map(d => d.label + ' · ' + d.date);
        const weekIso = days.map(d => d.iso || null);
        document.getElementById('wk-plan-modal')?.remove();
        _wkGenerate(_wkPlan.brief, dayPlan, weekDays, weekIso);
      };

      // Routing entry — the weekly track always goes through the planner
      // (Trip-style plan-first flow: days are hers before anything renders)
      window.__wkSubmit = function(prompt) {
        window.__wkOpen({ brief: prompt || '' });
      };

      async function _wkGenerate(prompt, dayPlan, weekDays, weekIso, extra) {
        let overlay = document.getElementById('kp-loading-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'kp-loading-overlay';
          overlay.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(250,248,245,0.92);backdrop-filter:blur(6px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px';
          overlay.innerHTML = `
            <div id="kp-load-title" style="font-family:'Cormorant',Georgia,serif;font-size:28px;font-weight:300;color:#202021;text-align:center"></div>
            <div style="font-size:12px;color:var(--ink-faint);letter-spacing:.06em" id="kp-load-msg"></div>
            <div style="width:120px;height:1px;background:rgba(32,32,33,0.1);position:relative;overflow:hidden;margin-top:8px">
              <div id="kp-load-bar" style="position:absolute;inset:0;background:#202021;transform:translateX(-100%);animation:kpLoadBar 2.5s ease-in-out infinite"></div>
            </div>`;
          document.body.appendChild(overlay);
        }
        const loadTitle = document.getElementById('kp-load-title');
        if (loadTitle) loadTitle.innerHTML = 'Planning your<br><em>week…</em>';
        overlay.style.display = 'flex';
        const msgs = ['Reading the week’s agenda', 'Routing your wardrobe across the days…', 'Balancing the repeats…', 'Almost ready…'];
        let mi = 0;
        const msgEl0 = document.getElementById('kp-load-msg');
        if (msgEl0) msgEl0.textContent = msgs[0];
        const msgInterval = setInterval(() => {
          mi = Math.min(mi + 1, msgs.length - 1);
          const el = document.getElementById('kp-load-msg');
          if (el) el.textContent = msgs[mi];
        }, 8000);
        if (window.__rbWeatherAsk && !(window.__rbCtx && window.__rbCtx.city)) {
          try { await Promise.race([window.__rbWeatherAsk(), new Promise(r => setTimeout(r, 6000))]); } catch (e) {}
        }
        // The weekly promise is "routed through your own wardrobe" — an
        // immediate submit after boot must not race the async wardrobe load
        // and read an empty closet (the server would go fully aspirational).
        for (let w = 0; w < 16 && !_waLoaded && _waUid(); w++) await new Promise(r => setTimeout(r, 250));
        const rc = window.__rbCtx || {};
        const context = {
          city: rc.city || '',
          month: new Date().toLocaleDateString('en-GB', { month: 'long' }),
          tempRange: rc.tempRange || (rc.tempC != null ? rc.tempC + '°C' : ''),
          condition: rc.condition || '',
          hint: rc.hint || '',
        };
        const guard = _rbOverlayGuard(overlay);
        const genId = _rbGenId();
        try {
          const res = await fetch('/api/weekly', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: guard.signal,
            body: JSON.stringify({
              prompt,
              name,
              dayPlan,
              weekDays,
              anchorItemIds: (extra && Array.isArray(extra.anchorItemIds) && extra.anchorItemIds.length) ? extra.anchorItemIds : undefined,
              userId: _waUid() || undefined,
              genId,
              styleDna: _rbStyleDna(), styleIcons: _rbStyleIcons(), gender: _rbGender(),
              wardrobeItems: _waItems.map(i => ({ id: i.id, label: i.label, category: i.category, color: i.color, brand: i.brand, image_url: i.image_url, times_worn: i.times_worn, hero: i.hero_position != null || undefined, seasons: (Array.isArray(i.seasons) && i.seasons.length) ? i.seasons : undefined })),
              context,
            }),
          });
          guard.done();
          clearInterval(msgInterval);
          overlay.style.display = 'none';
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          // The server generates positionally against the calendar, so
          // week_iso[i] is days[i]'s real date — carried in the render data
          // (and therefore the save) for the planned_days index. The intake's
          // pinned moments + evening moments ride the blob the same way
          // (blob-first: the index rows re-derive from them on every sync).
          window.__wkRenderResult({
            ...data, context, genId,
            week_iso: Array.isArray(weekIso) ? weekIso : undefined,
            pinned_days: (extra && Array.isArray(extra.pinnedDays) && extra.pinnedDays.length) ? extra.pinnedDays : undefined,
            evenings: (extra && Array.isArray(extra.evenings) && extra.evenings.length) ? extra.evenings : undefined,
          }, prompt);
        } catch (err) {
          guard.done();
          clearInterval(msgInterval);
          overlay.style.display = 'none';
          console.error('[Robes] /api/weekly error:', err.message);
          if (guard.userCancelled) return;
          _waShowToast(guard.timedOut
            ? 'That took longer than it should — please try again.'
            : 'Robes couldn’t finish that plan — please try again in a moment.');
        }
      };

      function _wkDayName(d) { return String(d.day_label || '').split('·')[0].trim(); }
      function _wkDayDate(d) { const p = String(d.day_label || '').split('·'); return p.length > 1 ? p[1].trim() : ''; }

      function _wkPatchSaved() {
        if (!_wkActiveSaveId || !_wkState) return;
        const saved = snLoad().find(x => x.id === _wkActiveSaveId);
        if (saved) {
          snUpdate(_wkActiveSaveId, { wkData: { ...(saved.wkData || {}), days: _wkState.data.days, evenings: _wkState.data.evenings, stylist_summary: _wkState.data.stylist_summary } });
          _pdSyncSaved(_wkActiveSaveId);
        }
      }

      // ── Weekly imagery (2026-07-22) — the /api/weekly still-life job.
      // Same contract as Daily/Travel: frames appear in two places (board
      // tile + rack viewport), so wraps carry data-wkimg="i" and the poller
      // patches every instance; hosted URLs persist into the saved entry so
      // a reopened plan keeps its frames even if she navigates away mid-job.
      let _wkPollTimer = null;
      function _wkStopPolling() { if (_wkPollTimer) { clearTimeout(_wkPollTimer); _wkPollTimer = null; } }

      function _wkPersistImages() {
        if (!_wkActiveSaveId || !window.__lastWkData) return;
        const urls = (window.__lastWkData.generatedImages || []).map(s => (typeof s === 'string' && s.indexOf('http') === 0) ? s : null);
        if (!urls.some(Boolean)) return;
        const it = snLoad().find(x => x.id === _wkActiveSaveId);
        if (!it) return;
        snUpdate(_wkActiveSaveId, {
          img: it.img || urls.find(Boolean) || null,
          wkData: { ...(it.wkData || {}), generatedImages: urls },
        });
        _pdSyncSaved(_wkActiveSaveId);
      }

      function _wkSetImage(i, src) {
        document.querySelectorAll('[data-wkimg="' + i + '"]').forEach(wrap => {
          if (wrap.querySelector('img')) return;
          const img = document.createElement('img');
          img.alt = '';
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0;opacity:0;transition:opacity .5s ease';
          img.onload = () => {
            const ph = wrap.querySelector('.wk-img-ph');
            if (ph) ph.remove();
            requestAnimationFrame(() => { img.style.opacity = '1'; });
          };
          img.onerror = () => { img.remove(); _wkSettlePlaceholder(i); };
          img.src = src;
          wrap.insertBefore(img, wrap.firstChild);
        });
      }

      // A frame that never landed settles into the monogram treatment —
      // "an empty card reads as broken; a monogram reads as pending".
      function _wkSettlePlaceholder(i) {
        const serif = "'Cormorant',Georgia,serif";
        const days = (window.__lastWkData && Array.isArray(window.__lastWkData.days)) ? window.__lastWkData.days : [];
        let name = '?';
        for (const d of days) { const hit = (d.items || []).find(it => it.image_index === i); if (hit) { name = hit.name || '?'; break; } }
        const letter = _waEsc(String(name).charAt(0).toUpperCase());
        let settled = false;
        document.querySelectorAll('[data-wkimg="' + i + '"]').forEach(wrap => {
          if (wrap.querySelector('img')) return;
          const ph = wrap.querySelector('.wk-img-ph');
          if (ph) {
            ph.style.animation = 'none';
            ph.innerHTML = `<span style="font-family:${serif};font-size:28px;font-weight:300;color:var(--ink-faint)">${letter}</span>`;
            settled = true;
          }
        });
        return settled;
      }

      function _wkPollImages(jobId, count) {
        _wkStopPolling();
        const t0 = Date.now();
        function settleAll() {
          let failed = 0;
          for (let i = 0; i < count; i++) { if (_wkSettlePlaceholder(i)) failed++; }
          if (failed) _rbTrack('image_fallback', { surface: 'weekly-plan', failed, of: count });
        }
        function tick() {
          fetch('/api/images/' + jobId)
            .then(r => r.ok ? r.json() : null)
            .then(job => {
              if (job && Array.isArray(job.images)) {
                let changed = false;
                job.images.forEach((src, i) => {
                  if (src) {
                    _wkSetImage(i, src);
                    if (window.__lastWkData) {
                      if (!Array.isArray(window.__lastWkData.generatedImages)) window.__lastWkData.generatedImages = [];
                      if (window.__lastWkData.generatedImages[i] !== src) { window.__lastWkData.generatedImages[i] = src; changed = true; }
                    }
                  }
                });
                if (changed) _wkPersistImages();
                if (job.done) { settleAll(); return; }
              } else if (!job) { settleAll(); return; }
              if (Date.now() - t0 < 300000) _wkPollTimer = setTimeout(tick, 4000);
              else settleAll();
            })
            .catch(() => {
              if (Date.now() - t0 < 300000) _wkPollTimer = setTimeout(tick, 6000);
              else settleAll();
            });
        }
        _wkPollTimer = setTimeout(tick, 3000);
      }

      window.__wkSelectDay = function(di) {
        if (!_wkState) return;
        _wkState.day = di;
        _wkActiveSlot = 0;
        _wkPaintStrip();
        _wkPaintConsole();
      };

      function _wkPaintStrip() {
        const strip = document.getElementById('wk-strip');
        if (!strip || !_wkState) return;
        if (_rbDayCardOn() && _wkStripV2(strip)) return;
        strip.innerHTML = _rbDayStrip(_wkState.data.days.map((d, di) => {
          const owned = d.items.filter(it => it.wardrobe_match).length;
          return {
            dow: _wkDayName(d),
            date: _wkDayDate(d),
            dim: !!d.rest,
            event: d.rest ? 'Left free' : (d.occasion || ''),
            meta: d.rest
              ? 'left free'
              : `${d.items.length} pieces${owned ? ' · ' + owned + ' yours' : ''}${d.user_activity ? ' <span style="color:var(--rose)">· your plan</span>' : ''}`,
            thumbs: d.rest ? [] : d.items.slice(0, 4).map(it =>
              (it.wardrobe_match && it.wardrobe_match.image_url) ||
              ((!_dlAltered(it) && Number.isInteger(it.image_index)) ? ((_wkState.data.generatedImages || [])[it.image_index] || null) : null)),
            onclick: `window.__wkSelectDay(${di})`,
          };
        }), _wkState.day);
      }

      // DayCard path (spec v2.0): the LIVE blob through the SAME row
      // builder the planned_days index uses (_pdRowsWk, §6.4) — one
      // shape, no freshness gap. Old saves without week_iso can't emit
      // dated rows → legacy strip (return false). The card gains the
      // evening line and loses the "your plan" meta flag (provenance, not
      // state — spec §9); membership chips stay off INSIDE the artifact
      // (the masthead carries it at the right altitude).
      function _wkStripV2(strip) {
        const data = _wkState.data;
        const built = _pdRowsWk(_wkActiveSaveId || 'live', data);
        if (!built) return false;
        const today = _pdLocalISO();
        const byIdx = {};
        built.rows.forEach(r => { (byIdx[r.day_index] = byIdx[r.day_index] || {})[r.slot === 'evening' ? 'eve' : 'day'] = r; });
        strip.innerHTML = data.days.map((d, di) => {
          const rows = byIdx[di] || {};
          const date = (data.week_iso || [])[di] || null;
          const ey = date
            ? new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }).toUpperCase()
            : _wkDayName(d).toUpperCase();
          const dc = _dcMoments(rows.day || null, rows.eve || null, { date, today, eyebrow: ey, blob: data });
          dc.chip = null;
          // No ring on the strips (Annie, 2026-07-24 live pass): body-tap
          // already lands the console on the day, so a second "Focus day"
          // control read as a different action. The ring survives on the
          // home rail, where it genuinely differs from the body (peek).
          return _dcCard(dc, {
            density: 'full',
            body: `window.__wkOpenDay(${di})`,
            focus: di === _wkState.day,
          });
        }).join('');
        return true;
      }
      // Body = open (spec §6). Inside the artifact, the console below IS
      // the day's open view — landing on it is the open, without a full
      // artifact re-render.
      window.__wkOpenDay = function(di) {
        if (window.__wkSelectDay) window.__wkSelectDay(di);
      };

      // ── Weekly evening moments (Stage 5 / handoff §3.3): a day holding
      // two moments gets a Day/Evening switcher; every console mutation
      // applies to the SELECTED moment only. The evening's look generates
      // lazily through the existing /api/weekly/day endpoint on first open
      // — no schema change — and lands in d.evening_look (rides the blob,
      // so it persists and enriches the evening's planned_days row).
      var _wkActiveSlot = 0; // 0 = day, 1 = evening
      function _wkEveningFor(di) {
        const evs = _wkState && _wkState.data && Array.isArray(_wkState.data.evenings) ? _wkState.data.evenings : [];
        return evs.find(e => e && e.day_index === di) || null;
      }
      // The active moment's item array — the ONE reference every console
      // mutation targets (flick/anchor/swap/remove/add/save).
      function _wkConItems() {
        const d = _wkState && _wkState.data.days[_wkState.day];
        if (!d) return null;
        if (_wkActiveSlot === 1) {
          return (d.evening_look && Array.isArray(d.evening_look.items)) ? d.evening_look.items : null;
        }
        return d.items;
      }
      window.__wkSetSlot = function(oi) {
        _wkActiveSlot = oi ? 1 : 0;
        _wkPaintConsole();
      };
      // Dress the evening — an ADDITION, never a restyle of the day
      // (Annie, 2026-07-24: evening looks are consistent across all three
      // tracks — left free by default, populated on request). An activity
      // passed in (or typed in the invitation input) creates/updates the
      // evening MOMENT in wkData.evenings, then generates its look.
      window.__wkDressEvening = async function(activity) {
        if (!_wkState) return;
        const di = _wkState.day;
        const d = _wkState.data.days[di];
        if (!d || d.rest) return;
        const typed = (typeof activity === 'string' && activity.trim())
          || ((document.getElementById('wk-eve-act') || {}).value || '').trim();
        let ev = _wkEveningFor(di);
        if (!ev && !typed) { const el = document.getElementById('wk-eve-act'); if (el) el.focus(); return; }
        if (!ev) {
          if (!Array.isArray(_wkState.data.evenings)) _wkState.data.evenings = [];
          ev = { day_index: di, activity: typed, pinned: false };
          _wkState.data.evenings.push(ev);
        } else if (typed) ev.activity = typed;
        const host = document.getElementById('wk-day');
        if (host) host.style.opacity = '0.5';
        try {
          const fresh = await _wkDayFetch(di, (ev.activity || 'An evening out')
            + ' — the EVENING of this day only (the daytime plan, already dressed separately and NOT to be changed: '
            + (d.user_activity || d.occasion || 'the day') + '). One evening look.');
          d.evening_look = { occasion: fresh.occasion || ev.activity || 'The evening', note: fresh.note || '', items: Array.isArray(fresh.items) ? fresh.items : [] };
          _wkActiveSlot = 1;
          _wkPaintConsole();
          _wkPatchSaved();
          _rbTrack('day_planned', { source_type: 'weekly', day_index: di });
        } catch (e) {
          console.error('[Robes] /api/weekly/day (evening) error:', e.message);
          _waShowToast('Robes couldn’t dress that evening — please try again.');
        } finally {
          const h = document.getElementById('wk-day');
          if (h) h.style.opacity = '';
        }
      };

      // ── The day console — Daily Match parity: LEFT "The Look" stylist
      // moodboard (tiles with hover flick), RIGHT "The Rack" (per-card
      // flick-through, Anchor, day restyle). Flicking reuses the Daily
      // helpers (_dlOptions/_dlOptIndex/_dlApplyOption): the option set is
      // the served original + owned same-category pieces (travel precedent —
      // weekly generates no AI alternates, so flicks stay instant + truthful).
      function _wkPaintConsole() {
        const host = document.getElementById('wk-day');
        if (!host || !_wkState) return;
        const serif = "'Cormorant',Georgia,serif";
        const d = _wkState.data.days[_wkState.day];
        if (!d) { host.innerHTML = ''; return; }
        const ev = _wkEveningFor(_wkState.day);
        if (d.rest) _wkActiveSlot = 0;
        const slotEv = _wkActiveSlot === 1;
        // Every dressed day carries the Day/Evening pair — the evening is
        // simply "left free" until she asks for it. Compact segmented
        // control matching the travel console's register.
        // COPY: needs sign-off (switcher labels)
        const segBtn = (label, oi, on) =>
          `<button onclick="window.__wkSetSlot(${oi})" style="border:none;border-radius:100px;padding:5px 13px;font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;font-family:inherit;background:${on ? '#202021' : 'transparent'};color:${on ? '#fff' : '#8A8078'};white-space:nowrap">${label}</button>`;
        const occHtml = d.rest ? '' :
          `<div style="display:inline-flex;width:max-content;gap:2px;background:#F5F0E8;border:0.5px solid rgba(32,32,33,0.1);border-radius:100px;padding:2px;margin:2px 0 4px;align-self:flex-start">`
          + segBtn('Day', 0, !slotEv)
          + segBtn('Evening' + (d.evening_look || ev ? '' : ' · free'), 1, slotEv)
          + `</div>`;
        // Evening selected but not yet dressed → the invitation (with her
        // typed occasion when the moment exists), never a restyled day
        if (slotEv && !(d.evening_look && Array.isArray(d.evening_look.items) && d.evening_look.items.length)) {
          host.innerHTML = `
            <div style="margin-top:18px">${occHtml}</div>
            <div style="background:#fff;border:0.5px dashed rgba(32,32,33,0.2);border-radius:16px;padding:40px 24px;margin-top:10px;text-align:center">
              <div style="font-family:${serif};font-size:26px;font-weight:300;color:#202021;margin-bottom:6px">${_waEsc(_wkDayName(d))} evening${ev && ev.activity ? ` — <em style="font-style:italic">${_waEsc(ev.activity)}.</em>` : ', <em style="font-style:italic">left free.</em>'}</div>
              <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:16px">${ev ? 'Its own look, styled to follow the day.' : 'Add a plan and the evening gets its own look — the day stays exactly as it is.'}</div>
              ${ev && ev.activity ? '' : `<input id="wk-eve-act" placeholder="Date night, drinks, a dinner out…" style="width:100%;max-width:320px;box-sizing:border-box;border:0.5px solid rgba(32,32,33,0.16);border-radius:100px;padding:11px 16px;font-size:13px;font-family:inherit;color:#202021;background:#FAF8F5;outline:none;margin:0 auto 14px;display:block" onkeydown="if(event.key==='Enter')window.__wkDressEvening()">`}
              <button onclick="window.__wkDressEvening()" style="background:#202021;color:#fff;border:none;border-radius:100px;padding:12px 22px;font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;font-family:inherit">✦ Dress the evening →</button>
            </div>`;
          return;
        }

        if (d.rest) {
          host.innerHTML = `
            <div style="background:#fff;border:0.5px dashed rgba(32,32,33,0.2);border-radius:16px;padding:44px 24px;margin-top:18px;text-align:center">
              <div style="font-family:${serif};font-size:26px;font-weight:300;color:#202021;margin-bottom:6px">${_waEsc(_wkDayName(d))}, <em style="font-style:italic">left free.</em></div>
              <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:18px">No outfit planned — a deliberately blank page in the week.</div>
              <button onclick="window.__wkEditDay(${_wkState.day})" style="background:#202021;color:#fff;border:none;border-radius:100px;padding:12px 22px;font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;font-family:inherit">✎ Dress this day</button>
            </div>`;
          return;
        }

        // Thin adapter over the shared console template (_rbConsole) —
        // frame source mirrors Daily/Travel: wardrobe photo first, generated
        // still (patched in by the poller via data-wkimg) second, monogram
        // last. A flicked-in piece must never wear the original's still.
        const items = slotEv ? d.evening_look.items : d.items;
        const conOccasion = slotEv ? (d.evening_look.occasion || ev.activity || 'The evening') : d.occasion;
        const conNote = slotEv ? d.evening_look.note : d.note;
        const dayLabel = _wkDayName(d) + (slotEv ? ' evening' : '');
        const owned = items.filter(it => it.wardrobe_match).length;
        const wkImages = Array.isArray(_wkState.data.generatedImages) ? _wkState.data.generatedImages : [];
        const wkPending = !!_wkState.data.jobId && !wkImages.some(Boolean);
        const wkPhSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C8BCAE" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
        const wkFrame = (it) => {
          const wmImg = it.wardrobe_match && it.wardrobe_match.image_url;
          const genOk = !_dlAltered(it) && Number.isInteger(it.image_index);
          const src = wmImg || (genOk ? wkImages[it.image_index] : null);
          const pollAttr = (!wmImg && genOk) ? ' data-wkimg="' + it.image_index + '"' : '';
          const pulse = !src && !wmImg && genOk && wkPending;
          const mono = `<span class="rbc-mono" style="font-family:${serif};font-size:30px;font-weight:300;color:var(--ink-faint)">${_waEsc((it.name || '?').charAt(0).toUpperCase())}</span>`;
          const phInner = pulse
            ? `<span style="font-family:${serif};font-style:italic;font-size:12px;color:var(--ink-faint);text-align:center;padding:0 12px">Creating imagery…</span>`
            : (genOk && _wkState.data.jobId) ? wkPhSvg : mono;
          return {
            pollAttr,
            inner: src && typeof src === 'string'
              ? `<img src="${_waEsc(src)}" style="width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0" alt="">`
              : `<div class="wk-img-ph" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;${pulse ? 'animation:kpPhPulse 1.8s ease-in-out infinite' : ''}">${phInner}</div>`,
          };
        };
        const palette = (Array.isArray(_wkState.data.palette) ? _wkState.data.palette : []).filter(h => /^#[0-9A-Fa-f]{6}$/.test(String(h || ''))).slice(0, 3);
        const fabricsHtml = _rbcFabricsHtml(items, palette);
        const conItems = items.map((it, ii) => {
          const list = _dlOptions(it, { aiFirst: false });
          return {
            idx: ii,
            frame: wkFrame(it),
            slot: _dlSlot(it).l,
            shortName: _dlShort(it.name),
            name: it.name,
            owned: !!it.wardrobe_match,
            anchored: !!it.anchored,
            showAddTag: !it.wardrobe_match,
            count: { cur: _dlOptIndex(it, list), len: list.length },
            subHtml: _rbcProvenance(it, '<span class="addtag">Worth adding</span>'),
            noteHtml: it.how ? `<div class="rbc-hownote">${_waEsc(it.how)}</div>` : '',
            thirdHtml: it.wardrobe_match ? '' : (it.wishlisted
              ? `<span class="rbc-act done">${_rbcCheckSvg} Saved</span>`
              : `<button class="rbc-act save" onclick="window.__wkSaveWishlist(${ii})">Save</button>`),
          };
        });
        const con = _rbConsole({
          headLabel: `The look · ${_waEsc(dayLabel)} · ${items.length} pieces`,
          occHtml,
          quoteHtml: conNote ? _waEsc(conNote) : '',
          fabricsHtml,
          paletteHtml: palette.map(h => `<span style="background:${h}"></span>`).join(''),
          addChipLabel: _rbTrackCfg('weekly').console.addVerb,
          rackLabel: `The rack · ${_waEsc(dayLabel)}`,
          rackTitleHtml: conOccasion ? `<h2>${_waEsc(conOccasion)}${!/[.!?]$/.test(conOccasion) ? '.' : ''}</h2>` : '',
          headButtonsHtml: slotEv
            ? `<button class="rbc-hbtn" onclick="window.__wkDressEvening()" title="A fresh evening look">↻ Restyle the evening</button>`
            : `<button class="rbc-hbtn" id="wk-wear-btn" onclick="window.__wkWear()" title="Log today’s pieces as worn — wear counts feed cost-per-wear">✓ Wore it today</button><button class="rbc-hbtn" onclick="window.__wkRestyleDay()" title="A fresh look — anchored pieces stay">↻ Restyle this day</button><button class="rbc-hbtn" onclick="window.__wkEditDay(${_wkState.day})">✎ The real plan</button>`,
          onFlip: '__wkFlip', onSwap: '__wkSwap', onAnchor: '__wkAnchor', onRemove: '__wkRemove',
          addPieceFn: '__wkAddPiece',
          lookActionHtml: `<button onclick="window.__rbShare&&window.__rbShare()">Share this look</button>`,
        }, conItems);

        host.innerHTML = `
          <div class="wk-con">
            <div>${con.lookHtml}</div>
            <div>${con.rackHtml}</div>
          </div>`;

        // Build 2 — prefetch alternates for the visible moment only, in the
        // background, so a later flick/swap is usually already warm.
        _rbPrefetchAlternates(items, 'weekly', _wkPaintConsole);
      }

      window.__wkFlip = function(ii, dir) {
        if (!_wkState) return;
        const arr = _wkConItems();
        const it = arr && arr[ii];
        if (!it) return;
        const list = _dlOptions(it, { aiFirst: false });
        if (list.length < 2) { _waShowToast('Nothing else fits this slot yet — snap more pieces'); return; }
        _dlApplyOption(it, list[(_dlOptIndex(it, list) + dir + list.length) % list.length]);
        _wkPaintConsole();
        _wkPaintStrip();
        _wkPatchSaved();
        window.__rbcAnimateTile(ii);
      };

      window.__wkAnchor = function(ii) {
        if (!_wkState) return;
        const arr = _wkConItems();
        const it = arr && arr[ii];
        if (!it) return;
        it.anchored = !it.anchored;
        _wkPaintConsole();
        _wkPatchSaved();
        _waShowToast(it.anchored ? 'Anchored — restyles build around it' : 'Anchor released');
      };

      // Remove a piece she doesn't need from the day's look.
      window.__wkRemove = function(ii) {
        const d = _wkState && _wkState.data.days[_wkState.day];
        const arr = _wkConItems();
        const it = arr && arr[ii];
        if (!it || !d) return;
        if (arr.length <= 2) { _waShowToast('A look needs at least two pieces'); _wkPaintConsole(); return; }
        arr.splice(ii, 1);
        _wkPaintConsole();
        _wkPaintStrip();
        _wkPatchSaved();
        _waShowToast(it.name + ' removed from ' + _wkDayName(d));
      };

      // Swap — the same shared PRD 3.B modal as the Daily and Travel racks.
      let _wkSwapIdx = null;
      window.__wkSwap = function(ii) {
        if (!_wkState) return;
        const arr = _wkConItems();
        const item = arr && arr[ii];
        if (!item) return;
        _wkSwapIdx = ii;
        _rbSwapModal(item, { id: 'wk-swap-modal', applyName: '__wkSwapApply', snapName: '__wkSnapMine', idx: ii });
        // Build 2 — Swap is the explicit trigger for on-demand alternates;
        // a no-op if the visible-day prefetch already warmed this piece.
        _rbFetchAlternates(item, 'weekly', arr.map(i => i.name).filter(n => n && n !== item.name));
      };
      window.__wkSwapApply = function(ii, wardrobeId) {
        _rbTrack('piece_swapped', { surface: 'weekly', item: String(wardrobeId) });
        const wi = _waItems.find(i => i.id === wardrobeId);
        const arr = _wkConItems();
        const item = arr && arr[ii];
        if (!wi || !item) return;
        item.wardrobe_match = { id: wi.id, label: wi.label, image_url: wi.image_url || null, color: wi.color || '' };
        item.name = wi.label;
        item.brand = wi.brand || '';
        item.retailer_hint = '';
        item.price_point = '';
        document.getElementById('wk-swap-modal')?.remove();
        _wkPaintConsole();
        _wkPaintStrip();
        _wkPatchSaved();
        window.__rbcAnimateTile(ii);
        _waShowToast(wi.label + ' swapped in');
      };
      window.__wkSnapMine = function() {
        const ii = _wkSwapIdx;
        _waAfterAdd = (newId) => window.__wkSwapApply(ii, newId);
        _waEditId = null;
        document.getElementById('wk-swap-modal')?.remove();
        if (window.WA && WA.open) WA.open();
      };

      // Add a piece to the selected day's look — chooser offers her
      // wardrobe, the camera or an upload; the piece joins the rack (and
      // the board) on repaint.
      window.__wkAddOwned = function(id) {
        const wi = _waItems.find(i => String(i.id) === String(id));
        const d = _wkState && _wkState.data.days[_wkState.day];
        const arr = _wkConItems();
        if (!wi || !d || d.rest || !arr) return;
        arr.push({
          name: wi.label, category: wi.category || 'Other', brand: wi.brand || '', description: '',
          wardrobe_index: -1, retailer_hint: '', price_point: '',
          wardrobe_match: { id: wi.id, label: wi.label, image_url: wi.image_url || null, color: wi.color || '' },
        });
        _wkPaintConsole();
        _wkPaintStrip();
        _wkPatchSaved();
        _waShowToast(wi.label + ' added to ' + _wkDayName(d));
      };
      window.__wkAddPiece = function() {
        if (!_wkState) return;
        window.__rbcAddMenu('__wkAddOwned');
      };

      // Save — the account-scoped acquisition verb for an unowned Weekly
      // piece (Build 1, amended). Writes wishlist_items via _wlSaveFromItem;
      // never touches wardrobe_items.
      window.__wkSaveWishlist = async function(ii) {
        const arr = _wkConItems();
        const it = arr && arr[ii];
        if (!it || it.wardrobe_match) return;
        await _wlSaveFromItem(it);
        _wkPaintConsole();
        _wkPaintStrip();
        _wkPatchSaved();
      };

      // "Wear today" — logs times_worn on today's owned pieces (the weekly
      // counterpart of the Daily payoff's wear logging).
      let _wkWorn = false;
      window.__wkWear = async function() {
        if (!_wkState) return;
        const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        const d = _wkState.data.days.find(x => _wkDayDate(x) === today);
        if (!d) { _waShowToast('Today isn’t in this plan yet — it starts ' + (_wkDayDate(_wkState.data.days[0]) || 'soon')); return; }
        if (d.rest) { _waShowToast(_wkDayName(d) + ' is left free — nothing to log'); return; }
        if (_wkWorn) { _waShowToast('Already logged for today'); return; }
        const ownedIds = d.items.filter(it => it.wardrobe_match).map(it => it.wardrobe_match.id);
        if (!ownedIds.length) { _waShowToast('Nothing owned in today’s look yet — snap your pieces to log wears'); return; }
        _wkWorn = true;
        try {
          for (const id of ownedIds) {
            const wi = _waItems.find(w => String(w.id) === String(id));
            if (wi) await _waFetch('PATCH', 'wardrobe_items?id=eq.' + id, { times_worn: (Number(wi.times_worn) || 0) + 1 });
          }
          _waLoad();
          _waShowToast('On you today — Robes logged the wear ✓');
          const wb = document.getElementById('wk-wear-btn');
          if (wb) { wb.textContent = 'Worn ✓'; wb.style.opacity = '.55'; wb.style.pointerEvents = 'none'; }
        } catch (e) {
          _wkWorn = false;
          console.warn('[robes] wear log failed:', e);
          _waShowToast('Couldn’t log the wear — try again');
        }
      };

      // Surgical day re-mix (POST /api/weekly/day): anchored pieces held
      // fixed, the rest of the week untouched, same saved plan evolved.
      async function _wkDayFetch(di, activity) {
        const d = _wkState.data.days[di];
        const anchors = d.items.filter(it => it.anchored).map(it => ({
          name: it.name, category: it.category || '', brand: it.brand || '',
          wardrobe_id: it.wardrobe_match ? it.wardrobe_match.id : null,
        }));
        const weekSummary = _wkState.data.days
          .filter((x, k) => k !== di && !x.rest && x.items.length)
          .map(x => `${_wkDayName(x)}: ${x.occasion || ''} — ${x.items.map(i => i.name).join(', ')}`)
          .join('; ');
        const rc = window.__rbCtx || {};
        return _rbDayPost('/api/weekly/day', {
          activity,
          dayLabel: d.day_label,
          brief: _wkState.prompt || '',
          anchors,
          weekSummary,
          name,
          styleDna: _rbStyleDna(), styleIcons: _rbStyleIcons(), gender: _rbGender(),
          wardrobeItems: _waItems.map(i => ({ id: i.id, label: i.label, category: i.category, color: i.color, brand: i.brand, image_url: i.image_url, times_worn: i.times_worn, hero: i.hero_position != null || undefined, seasons: (Array.isArray(i.seasons) && i.seasons.length) ? i.seasons : undefined })),
          context: rc.city ? { city: rc.city, month: new Date().toLocaleDateString('en-GB', { month: 'long' }), tempRange: rc.tempRange || '', condition: rc.condition || '', hint: rc.hint || '' } : null,
        });
      }

      function _wkApplyDay(di, activity, fresh) {
        const d = _wkState.data.days[di];
        const anchored = d.items.filter(it => it.anchored);
        // The single-day call generates no imagery — collect the week's
        // existing stills (by name, across all days incl. this one's
        // outgoing items) so an unchanged piece keeps its frame.
        const stillByName = new Map();
        _wkState.data.days.forEach(dd => (dd.items || []).forEach(it => {
          if (Number.isInteger(it.image_index) && !(it.wardrobe_match && it.wardrobe_match.image_url)) stillByName.set((it.name || '').toLowerCase(), it.image_index);
        }));
        d.occasion = fresh.occasion || activity || d.occasion;
        d.note = fresh.note || d.note;
        d.rest = false;
        if (activity) d.user_activity = activity;
        d.items = Array.isArray(fresh.items) ? fresh.items : [];
        d.items.forEach(it => {
          const key = (it.name || '').toLowerCase();
          if (!(it.wardrobe_match && it.wardrobe_match.image_url) && stillByName.has(key)) it.image_index = stillByName.get(key);
        });
        // The masthead summary is refreshed by the server on every day
        // restyle (audit D2) so it can never describe a look that's since
        // changed — patch it in place rather than re-rendering the header.
        if (fresh.stylist_summary) {
          _wkState.data.stylist_summary = fresh.stylist_summary;
          const sumEl = document.getElementById('wk-summary');
          if (sumEl) sumEl.textContent = fresh.stylist_summary;
        }
        // Re-mark anchors on the fresh items (by wardrobe id, then name) and
        // restore a wardrobe_match the model may have dropped.
        anchored.forEach(a => {
          const m = d.items.find(it => !it.anchored && (
            (a.wardrobe_match && it.wardrobe_match && String(it.wardrobe_match.id) === String(a.wardrobe_match.id)) ||
            (it.name || '').toLowerCase() === (a.name || '').toLowerCase()));
          if (m) {
            m.anchored = true;
            if (!m.wardrobe_match && a.wardrobe_match) { m.wardrobe_match = a.wardrobe_match; m.retailer_hint = ''; m.price_point = ''; }
          }
        });
        _wkPaintStrip();
        _wkPaintConsole();
        _wkPatchSaved();
        if (activity) _rbTrack('day_planned', { source_type: 'weekly', day_index: di });
      }

      let _wkRestyling = false;
      window.__wkRestyleDay = async function() {
        if (!_wkState || _wkRestyling) return;
        _wkRestyling = true;
        const di = _wkState.day;
        const d = _wkState.data.days[di];
        const btnHost = document.getElementById('wk-day');
        if (btnHost) btnHost.style.opacity = '0.5';
        try {
          const fresh = await _wkDayFetch(di, d.user_activity || d.occasion || '');
          _wkApplyDay(di, d.user_activity || '', fresh);
          _waShowToast(_wkDayName(d) + ' restyled' + (d.items.some(i => i.anchored) ? ' around your anchors' : ''));
        } catch (e) {
          console.error('[Robes] /api/weekly/day error:', e.message);
          _waShowToast('Robes couldn’t restyle that day — please try again.');
        } finally {
          _wkRestyling = false;
          const h = document.getElementById('wk-day');
          if (h) h.style.opacity = '';
        }
      };

      // "✎ The real plan" / "Dress this day" — re-plan one day after
      // generation (same modal register as the Travel Edit day editor).
      window.__wkEditDay = function(di) {
        if (!_wkState) return;
        document.getElementById('wk-day-modal')?.remove();
        const serif = "'Cormorant',Georgia,serif";
        const d = _wkState.data.days[di];
        const chips = ['Office', 'WFH', 'Big meeting', 'Dinner out', 'Date night', 'Pilates', 'School run', 'Drinks'];
        const chipsHtml = chips.map(c =>
          `<button onclick="document.getElementById('wk-day-input').value='${_waEsc(c)}'" style="background:#FAF8F5;border:0.5px solid rgba(32,32,33,0.14);border-radius:100px;padding:7px 13px;font-size:11px;cursor:pointer;color:#202021;font-family:inherit">${_waEsc(c)}</button>`).join('');
        const modal = document.createElement('div');
        modal.id = 'wk-day-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(32,32,33,0.45);display:flex;align-items:center;justify-content:center;padding:20px';
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
        modal.innerHTML = `
          <div style="background:#FAF8F5;border-radius:20px;width:100%;max-width:460px;box-sizing:border-box;box-shadow:0 24px 60px -12px rgba(32,32,33,0.28);padding:26px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px">
              <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin:0">${_waEsc(d.day_label)}</p>
              <button onclick="document.getElementById('wk-day-modal').remove()" style="background:none;border:none;cursor:pointer;padding:2px;color:var(--ink-faint);font-size:16px;line-height:1">×</button>
            </div>
            <p style="font-family:${serif};font-size:24px;font-weight:300;color:#202021;margin:0 0 14px;line-height:1.15">What are you actually doing?</p>
            <input id="wk-day-input" value="${_waEsc(d.user_activity || '')}" placeholder="Client presentation, then drinks" style="width:100%;box-sizing:border-box;border:1px solid rgba(32,32,33,0.15);border-radius:var(--rad-sm);padding:12px 13px;font-size:13.5px;color:#202021;background:#fff;outline:none;font-family:inherit;margin-bottom:14px">
            <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:20px">${chipsHtml}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
              ${d.rest ? '<span></span>' : `<button onclick="window.__wkFreeDay(${di})" style="background:none;border:none;cursor:pointer;font-size:11.5px;color:var(--ink-faint);text-decoration:underline;font-family:inherit;padding:4px 0">Leave this day free</button>`}
              <button id="wk-day-go" onclick="window.__wkDayApply(${di})" style="background:#202021;color:#fff;border:none;border-radius:100px;padding:12px 22px;font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;font-family:inherit">Dress this day →</button>
            </div>
          </div>`;
        document.body.appendChild(modal);
        setTimeout(() => { const i = document.getElementById('wk-day-input'); if (i) i.focus(); }, 60);
      };

      window.__wkFreeDay = function(di) {
        document.getElementById('wk-day-modal')?.remove();
        const d = _wkState && _wkState.data.days[di];
        if (!d) return;
        d.rest = true;
        d.occasion = 'Left free';
        d.note = '';
        d.user_activity = null;
        d.items = [];
        _wkPaintStrip();
        _wkPaintConsole();
        _wkPatchSaved();
        _waShowToast(_wkDayName(d) + ' left free');
      };

      window.__wkDayApply = async function(di) {
        const input = document.getElementById('wk-day-input');
        const activity = ((input && input.value) || '').trim();
        if (!activity) { if (input) input.focus(); return; }
        const go = document.getElementById('wk-day-go');
        if (go) { go.disabled = true; go.textContent = 'Dressing…'; }
        try {
          const fresh = await _wkDayFetch(di, activity);
          document.getElementById('wk-day-modal')?.remove();
          _wkApplyDay(di, activity, fresh);
        } catch (e) {
          console.error('[Robes] /api/weekly/day error:', e.message);
          if (go) { go.disabled = false; go.textContent = 'Dress this day →'; }
          _waShowToast('Robes couldn’t dress that day — please try again.');
        }
      };

      window.__wkGoBack = function() {
        if (wkResultPage) wkResultPage.style.display = 'none';
        window.rbClearCrumb && window.rbClearCrumb();
        window._rbNav && window._rbNav('/dashboard');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };

      window.__wkRenderResult = function(data, promptText, opts) {
        const serif = "'Cormorant',Georgia,serif";
        if (!data || !Array.isArray(data.days) || !data.days.length) { _waShowToast('That plan didn’t load — try planning the week again.'); return; }
        _rbHideResultPages('wk');
        // A stale poller from an earlier plan must not patch its frames
        // into this one — __lastWkData is about to point at new data.
        _wkStopPolling();
        window.__lastWkData = data;
        _wkState = { data, prompt: promptText || '', day: 0 };
        _wkActiveSlot = 0;
        _wkWorn = false;

        if (!wkResultPage) {
          wkResultPage = document.createElement('div');
          wkResultPage.id = 'wk-result-page';
          wkResultPage.style.cssText = 'display:none;position:fixed;top:var(--nav-h,60px);left:0;right:0;bottom:0;z-index:40;background:#FAF8F5;overflow-y:auto';
          document.body.appendChild(wkResultPage);
        }
        if (!document.getElementById('wk-style')) {
          const ws = document.createElement('style');
          ws.id = 'wk-style';
          ws.textContent =
            '#wk-day .wk-con{display:grid;grid-template-columns:360px minmax(0,1fr);gap:34px;margin-top:18px;align-items:start}' +
            '@media(max-width:900px){#wk-day .wk-con{grid-template-columns:1fr}}';
          document.head.appendChild(ws);
        }

        const owned = data.days.reduce((s, d) => s + d.items.filter(it => it.wardrobe_match).length, 0);
        const total = data.days.reduce((s, d) => s + d.items.length, 0);
        const ctx = data.context || {};
        const pill = [ctx.city, ctx.month].filter(Boolean).join(' · ') + (ctx.tempRange ? ' | ' + ctx.tempRange : '') + (ctx.hint ? ' | ' + ctx.hint : '');

        wkResultPage.innerHTML = `
          <div style="max-width:var(--shell,1440px);margin:0 auto;padding:36px var(--s6,24px) 0;min-height:calc(100% - 72px);box-sizing:border-box">
            <div style="font-size:10px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:#8E7077;margin-bottom:10px">${_waEsc(_rbTrackCfg('weekly').artifact.eyebrow)}</div>
            <div style="display:flex;align-items:flex-start;gap:12px;margin:0 0 12px;max-width:780px">
              <h1 id="wk-headline" style="font-family:${serif};font-size:clamp(28px,4.5vw,42px);font-weight:300;font-style:italic;color:#202021;line-height:1.12;margin:0;max-width:720px;min-width:0;flex:1">${_waEsc(data.headline || 'The week ahead.')}</h1>
              <button class="rb-rename-tbtn" title="Rename" style="margin-top:6px" onclick="window.__rbRename&&window.__rbRename('wk')"><svg viewBox="0 0 24 24"><path d="M4 20h4L18 10l-4-4L4 16v4z"/><path d="M13 7l4 4"/></svg></button>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">
              ${data.week_label ? `<span style="font-size:10px;font-weight:500;letter-spacing:.04em;color:#6A5E54;background:#fff;border:0.5px solid rgba(32,32,33,0.12);border-radius:100px;padding:6px 13px">${_waEsc(data.week_label.charAt(0).toUpperCase() + data.week_label.slice(1).toLowerCase())}</span>` : ''}
              ${pill ? `<span style="font-size:11px;color:var(--ink-soft);background:#fff;border:0.5px solid rgba(32,32,33,0.12);border-radius:100px;padding:6px 13px">🌤 ${_waEsc(pill)}</span>` : ''}
            </div>
            ${data.stylist_summary ? `<p id="wk-summary" style="font-family:${serif};font-style:italic;font-size:15.5px;color:#6E6A64;line-height:1.6;margin:0 0 24px;max-width:640px">${_waEsc(data.stylist_summary)}</p>` : ''}
            <div id="wk-strip" class="rbd-strip"></div>
            <div id="wk-day"></div>
            ${_rbFeedbackBlock('wk', { title: 'How does this week feel?', up: '👍 I’d wear it', down: 'Not quite' })}
            <div style="height:36px"></div>
          </div>`;

        wkResultPage.style.display = 'block';
        wkResultPage.scrollTop = 0;
        // Land on the first dressed day, not a free one
        const firstDressed = data.days.findIndex(d => !d.rest);
        if (firstDressed > 0) _wkState.day = firstDressed;
        _wkPaintStrip();
        _wkPaintConsole();
        window.rbSetCrumb && window.rbSetCrumb([{ label: 'Plan the week' }]);
        if (data.jobId) _wkPollImages(data.jobId, data.imageCount || 0);

        if (opts && opts.skipSave) {
          _wkActiveSaveId = (opts && opts.savedId) || null;
        } else {
          const firstImg = (function() {
            for (const d of data.days) for (const it of d.items) {
              if (it.wardrobe_match && it.wardrobe_match.image_url && String(it.wardrobe_match.image_url).indexOf('http') === 0) return it.wardrobe_match.image_url;
            }
            return null;
          })();
          // jobId is stripped so a reopened entry never polls a dead job;
          // hosted stills are patched in later by _wkPersistImages.
          const persistable = (data.generatedImages || []).map(s => (typeof s === 'string' && s.indexOf('http') === 0) ? s : null);
          const wkSave = { ...data, jobId: undefined, generatedImages: persistable, prompt: promptText || '' };
          _wkActiveSaveId = snAdd({
            type: 'weekly-plan',
            title: data.headline || 'Your week, planned',
            subtitle: data.days.filter(d => !d.rest).length + ' days · ' + (data.week_label || '').toLowerCase(),
            img: firstImg,
            wkData: wkSave,
          });
          _rbTrack('weekly_generated', { item: String(_wkActiveSaveId), days: data.days.filter(d => !d.rest).length });
          _pdSync('weekly', _wkActiveSaveId, wkSave);
        }

        _rbFeedbackArm('wk', () => ({
          prompt: promptText || '',
          looksOutput: JSON.stringify({ surface: 'weekly-plan', week_label: data.week_label || '', headline: data.headline || '', days: data.days.length, owned, total, context: ctx, ts: new Date().toISOString() }),
        }));
      };

      // ── Travel Edit — Capsule Packing & Lookbook (PRD: AI-Powered Capsule Packing) ──
      // A trip brief (destination + dates + vibe) becomes a 12–15 piece
      // high-yield capsule in three functional tiers plus a Day/Evening
      // lookbook across the trip. Every outfit is a 4-step formula that
      // references capsule items by index, which is what makes the 1:3
      // matrix interactive: tapping a piece lights up every look it earns.
      let _tvPollTimer = null;
      let _tvActiveSaveId = null; // lookbook id of the live travel edit
      let _tvSelected = null;     // capsule index highlighted in the 1:3 matrix
      let _tvSwapIdx = null;
      window.__lastTvData = null;
      function _tvStopPolling() { if (_tvPollTimer) { clearTimeout(_tvPollTimer); _tvPollTimer = null; } }

      function _tvPersistImages() {
        if (!_tvActiveSaveId || !window.__lastTvData) return;
        const urls = (window.__lastTvData.generatedImages || []).map(s => (typeof s === 'string' && s.indexOf('http') === 0) ? s : null);
        if (!urls.some(Boolean)) return;
        const it = snLoad().find(x => x.id === _tvActiveSaveId);
        if (!it) return;
        snUpdate(_tvActiveSaveId, {
          img: urls[0] || it.img || null,
          tvData: { ...(it.tvData || {}), generatedImages: urls },
        });
        _pdSyncSaved(_tvActiveSaveId);
      }

      // Generated frames appear in several places (day console board, rack
      // viewport, edit cards), so frames carry data-tvimg="i" and the poller
      // patches every instance. onerror falls back to the monogram treatment
      // too (brief 2026-07-22 §B.3) — a broken/expired image URL used to
      // leave a dead <img> (reads as an empty card); the placeholder isn't
      // removed until the image actually loads, so _tvSettlePlaceholder can
      // still find and monogram it.
      function _tvSetImage(i, src) {
        document.querySelectorAll('[data-tvimg="' + i + '"]').forEach(wrap => {
          if (wrap.querySelector('img')) return;
          const img = document.createElement('img');
          img.alt = '';
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0;opacity:0;transition:opacity .5s ease';
          img.onload = () => {
            const ph = wrap.querySelector('.tv-img-ph');
            if (ph) ph.remove();
            requestAnimationFrame(() => { img.style.opacity = '1'; });
          };
          img.onerror = () => { img.remove(); _tvSettlePlaceholder(i); };
          img.src = src;
          wrap.insertBefore(img, wrap.firstChild);
        });
      }

      // A frame that never landed (generation failure, timeout, or a broken
      // URL via the onerror path above) settles into the same monogram
      // treatment the design pass uses everywhere else — "an empty card
      // reads as broken; a monogram reads as pending" (brief §B.3). Returns
      // whether anything was settled, so the poller can count the rate.
      function _tvSettlePlaceholder(i) {
        const cap = window.__lastTvData && Array.isArray(window.__lastTvData.capsule) ? window.__lastTvData.capsule : [];
        const it = cap.find(c => c.image_index === i);
        // Frame 0 is the trip hero, not a capsule item — monogram it with
        // the destination's initial, not '?'.
        const name = (it && it.name) || (i === 0 && window.__lastTvData && window.__lastTvData.destination) || '?';
        const letter = _waEsc(String(name).charAt(0).toUpperCase());
        let settled = false;
        document.querySelectorAll('[data-tvimg="' + i + '"]').forEach(wrap => {
          if (wrap.querySelector('img')) return;
          const ph = wrap.querySelector('.tv-img-ph');
          if (ph) {
            ph.style.animation = 'none';
            ph.innerHTML = `<span style="font-family:${_tvSerif};font-size:28px;font-weight:300;color:var(--ink-faint)">${letter}</span>`;
            settled = true;
          }
        });
        return settled;
      }

      function _tvPollImages(jobId, count) {
        _tvStopPolling();
        const t0 = Date.now();
        // Logs the fallback rate once per trip (brief §B.3) — three of eight
        // in one grid is a pipeline signal, not isolated bad rows.
        function settleAll() {
          let failed = 0;
          for (let i = 0; i < count; i++) { if (_tvSettlePlaceholder(i)) failed++; }
          if (failed) _rbTrack('image_fallback', { surface: 'travel-edit', failed, of: count });
        }
        function tick() {
          fetch('/api/images/' + jobId)
            .then(r => r.ok ? r.json() : null)
            .then(job => {
              if (job && Array.isArray(job.images)) {
                let changed = false;
                job.images.forEach((src, i) => {
                  if (src) {
                    _tvSetImage(i, src);
                    if (window.__lastTvData) {
                      if (!Array.isArray(window.__lastTvData.generatedImages)) window.__lastTvData.generatedImages = [];
                      if (window.__lastTvData.generatedImages[i] !== src) { window.__lastTvData.generatedImages[i] = src; changed = true; }
                    }
                  }
                });
                if (changed) _tvPersistImages();
                if (job.done) { settleAll(); return; }
              } else if (!job) { settleAll(); return; }
              if (Date.now() - t0 < 300000) _tvPollTimer = setTimeout(tick, 4000);
              else settleAll();
            })
            .catch(() => {
              if (Date.now() - t0 < 300000) _tvPollTimer = setTimeout(tick, 6000);
              else settleAll();
            });
        }
        _tvPollTimer = setTimeout(tick, 3000);
      }

      window.__tvGoBack = function() {
        if (tvResultPage) tvResultPage.style.display = 'none';
        _waAfterAdd = null; // leaving the edit cancels any armed snap-mine swap
        window.rbClearCrumb && window.rbClearCrumb();
        window._rbNav && window._rbNav('/dashboard');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };

      // Brief-modal state — survives the "snap a new piece" round trip
      // through the wardrobe add modal (growth PRD epic 1).
      let _tvBrief = null;

      function _tvCaptureBrief() {
        if (!document.getElementById('tv-brief-modal')) return;
        _tvBrief = {
          dest: ((document.getElementById('tv-dest') || {}).value || '').trim(),
          dateFrom: (document.getElementById('tv-from') || {}).value || '',
          dateTo: (document.getElementById('tv-to') || {}).value || '',
          brief: ((document.getElementById('tv-brief-ta') || {}).value || '').trim(),
          anchors: (_tvBrief && _tvBrief.anchors) || [],
          plan: (_tvBrief && _tvBrief.plan) || [],
          suggested: (_tvBrief && _tvBrief.suggested) || [],
        };
      }

      // Curatorial revision (wardrobe-first PRD): she multi-selects a
      // realistic shortlist — everything she's tempted to bring — and Robes
      // edits it down. Two pieces is the floor for an edit to mean anything.
      const _TV_MIN_ANCHORS = 2;

      // Destination weather for the "weather-ready" browser filter — the
      // same Open-Meteo pair the server uses (live forecast inside 16 days,
      // else last year's dates as a seasonal read). Purely advisory: any
      // failure hides the checkbox and the full wardrobe shows.
      let _tvWx = null;
      let _tvWxOnly = false;
      let _tvCat = 'All';
      let _tvWxSeq = 0;

      async function _tvFetchWx() {
        const st = _tvBrief || {};
        const seq = ++_tvWxSeq;
        try {
          const dest = (st.dest || '').trim();
          if (!dest) throw new Error('no dest');
          const from = new Date((st.dateFrom || '') + 'T00:00:00Z');
          const to = new Date((st.dateTo || '') + 'T00:00:00Z');
          if (isNaN(from) || isNaN(to) || to < from) throw new Error('no dates');
          const geo = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(dest) + '&count=1&language=en').then(r => r.json());
          const loc = geo && geo.results && geo.results[0];
          if (!loc) throw new Error('no geo');
          const daysAhead = Math.round((to - Date.now()) / 86400000);
          const daily = 'temperature_2m_max,temperature_2m_min';
          let url, seasonal = false;
          if (daysAhead >= 0 && daysAhead <= 14 && from >= new Date(Date.now() - 86400000)) {
            url = 'https://api.open-meteo.com/v1/forecast?latitude=' + loc.latitude + '&longitude=' + loc.longitude + '&daily=' + daily + '&start_date=' + st.dateFrom + '&end_date=' + st.dateTo;
          } else {
            seasonal = true;
            const shift = d => { const x = new Date(d); x.setUTCFullYear(x.getUTCFullYear() - 1); return x.toISOString().slice(0, 10); };
            url = 'https://archive-api.open-meteo.com/v1/archive?latitude=' + loc.latitude + '&longitude=' + loc.longitude + '&daily=' + daily + '&start_date=' + shift(from) + '&end_date=' + shift(to);
          }
          const data = await fetch(url).then(r => r.json());
          const fmax = (((data || {}).daily || {}).temperature_2m_max || []).filter(Number.isFinite);
          const fmin = (((data || {}).daily || {}).temperature_2m_min || []).filter(Number.isFinite);
          if (seq !== _tvWxSeq) return;
          _tvWx = fmax.length && fmin.length
            ? { minC: Math.round(Math.min(...fmin)), maxC: Math.round(Math.max(...fmax)), seasonal }
            : null;
        } catch (e) { if (seq === _tvWxSeq) _tvWx = null; }
        if (seq === _tvWxSeq) _tvWxPaint();
      }

      window.__tvWxRefetch = function() { _tvCaptureBrief(); _tvFetchWx(); };

      // Light packability heuristic from the item's own words — a modal
      // convenience filter only, never sent to the server.
      function _tvWxFit(it) {
        if (!_tvWxOnly || !_tvWx || !Number.isFinite(_tvWx.maxC)) return true;
        const txt = ((it.label || '') + ' ' + (it.notes || '') + ' ' + (it.category || '')).toLowerCase();
        if (_tvWx.maxC >= 22) return !/wool|cashmere|puffer|down|parka|overcoat|fleece|shearling|turtleneck|beanie|glove|corduroy|quilted|boot/.test(txt);
        if (_tvWx.maxC < 12) return !/linen|swim|bikini|sandal|shorts|crochet|espadrille/.test(txt);
        return !/puffer|down|parka|swim|bikini/.test(txt);
      }

      function _tvWxPaint() {
        const row = document.getElementById('tv-wx-row');
        if (!row) return;
        const lbl = document.getElementById('tv-wx-label');
        if (_tvWx && Number.isFinite(_tvWx.minC)) {
          row.style.display = 'flex';
          if (lbl) lbl.textContent = 'Weather-ready for ' + _tvWx.minC + '–' + _tvWx.maxC + '°C only' + (_tvWx.seasonal ? ' · seasonal read' : '');
        } else {
          row.style.display = 'none';
          _tvWxOnly = false;
          const box = document.getElementById('tv-wx-box');
          if (box) box.checked = false;
        }
        _tvGridPaint();
      }

      window.__tvWxToggle = function(el) {
        _tvWxOnly = !!(el && el.checked);
        _tvGridPaint();
      };

      window.__tvCatSet = function(cat) {
        _tvCat = cat;
        document.querySelectorAll('[data-tvcat]').forEach(b => {
          const on = b.dataset.tvcat === cat;
          b.style.background = on ? '#202021' : '#fff';
          b.style.color = on ? '#fff' : '#202021';
          b.style.borderColor = on ? '#202021' : 'rgba(32,32,33,0.15)';
        });
        _tvGridPaint();
      };

      // The wardrobe browser grid — full catalogue, filterable by category
      // and weather-suitability, multi-select. Snap-new leads so a thin
      // wardrobe can grow mid-flow.
      function _tvGridPaint() {
        const grid = document.getElementById('tv-anchor-row');
        if (!grid) return;
        const serif = "'Cormorant',Georgia,serif";
        const cameraSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
        const items = _waItems.slice(0, 60).filter(wi =>
          (_tvCat === 'All' || wi.category === _tvCat) && _tvWxFit(wi));
        const tiles = items.map(wi => `
          <div data-anc="${_waEsc(String(wi.id))}" onclick="window.__tvAnchorToggle('${_waEsc(String(wi.id))}')" style="cursor:pointer;border-radius:10px;overflow:hidden;background:#fff;outline:1px solid rgba(32,32,33,0.1);outline-offset:-1px;position:relative">
            <span class="tv-anc-chk" style="display:none;position:absolute;top:6px;right:6px;width:18px;height:18px;border-radius:50%;background:#202021;color:#fff;font-size:10px;align-items:center;justify-content:center;z-index:2;line-height:1">✓</span>
            ${wi.image_url
              ? `<img src="${_waEsc(wi.image_url)}" style="width:100%;aspect-ratio:1/1;object-fit:cover;display:block" alt="">`
              : `<div style="width:100%;aspect-ratio:1/1;background:#EDE8E0;display:flex;align-items:center;justify-content:center;font-family:${serif};font-size:26px;color:var(--ink-faint)">${_waEsc((wi.label || '?').charAt(0).toUpperCase())}</div>`}
            <div style="padding:6px 8px 7px">
              <div style="font-size:10px;color:#3A3733;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_waEsc(wi.label)}</div>
              ${wi.category ? `<div style="font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint);margin-top:1px">${_waEsc(wi.category)}</div>` : ''}
            </div>
          </div>`).join('');
        grid.innerHTML = `
          <div onclick="window.__tvAnchorSnap()" style="cursor:pointer;border-radius:10px;background:#F0EAE0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:120px;color:#8A7B62">
            ${cameraSvg}
            <span style="font-size:9px;font-weight:500;letter-spacing:.08em;text-transform:uppercase">Snap new</span>
          </div>
          ${tiles}
          ${!items.length && _waItems.length ? `<div style="grid-column:1/-1;padding:14px 4px;font-size:12px;color:var(--ink-faint);font-style:italic">Nothing in this filter — try another category${_tvWxOnly ? ' or untick the weather filter' : ''}.</div>` : ''}`;
        _tvAnchorPaint();
      }

      function _tvAnchorPaint() {
        const sel = (_tvBrief && _tvBrief.anchors) || [];
        document.querySelectorAll('[data-anc]').forEach(el => {
          const on = sel.indexOf(el.dataset.anc) !== -1;
          el.style.outline = on ? '2px solid #202021' : '1px solid rgba(32,32,33,0.1)';
          const chk = el.querySelector('.tv-anc-chk');
          if (chk) chk.style.display = on ? 'flex' : 'none';
        });
        const hint = document.getElementById('tv-anchor-hint');
        if (hint) {
          hint.textContent = sel.length === 0
            ? (_waItems.length
              ? 'Select everything you’re tempted to bring — Robes shows how each piece earns its place, and what’s genuinely missing.'
              : 'Snap the pieces you’re thinking of bringing — they start your digital wardrobe.')
            : sel.length < _TV_MIN_ANCHORS
              ? '1 piece selected — add the rest of your maybes.'
              : sel.length + ' selected — Robes maps the wears each piece earns across the trip.';
        }
        const cta = document.getElementById('tv-cta');
        if (cta) {
          const suggestedN = ((_tvBrief && _tvBrief.suggested) || []).length;
          const ready = sel.length >= _TV_MIN_ANCHORS || suggestedN > 0;
          cta.disabled = !ready;
          cta.style.opacity = ready ? '1' : '0.45';
          cta.style.cursor = ready ? 'pointer' : 'default';
          cta.textContent = ready
            ? 'Next · Plan your days — ' + (sel.length + suggestedN) + ' selected →'
            : 'Select at least ' + _TV_MIN_ANCHORS + ' pieces to start';
        }
      }

      window.__tvAnchorToggle = function(id) {
        if (!_tvBrief) _tvBrief = { anchors: [] };
        if (!Array.isArray(_tvBrief.anchors)) _tvBrief.anchors = [];
        id = String(id);
        const a = _tvBrief.anchors;
        const i = a.indexOf(id);
        if (i !== -1) a.splice(i, 1);
        else a.push(id);
        _tvAnchorPaint();
      };

      // "Snap new" inside the anchor row — the wardrobe add flow runs, the
      // fresh piece lands back here already selected as an anchor.
      window.__tvAnchorSnap = function() {
        _tvCaptureBrief();
        document.getElementById('tv-brief-modal')?.remove();
        _waEditId = null;
        _waAfterAdd = function(newId) {
          window.__tvOpen({ restore: true });
          setTimeout(function() { window.__tvAnchorToggle(newId); }, 150);
        };
        if (window.WA && WA.open) WA.open();
      };

      // The Natural Language Destination Brief (PRD step 1) — a structured
      // modal rather than pure chat so destination + dates are never fuzzy.
      // Curatorial revision: the old 2-3 tile core picker + item-limit
      // stepper are gone — she browses her FULL wardrobe (category +
      // weather-ready filters) and multi-selects the realistic shortlist;
      // the pack count comes back from the engine.
      window.__tvOpen = function(opts) {
        document.getElementById('tv-brief-modal')?.remove();
        const serif = "'Cormorant',Georgia,serif";
        const iso = d => d.toISOString().slice(0, 10);
        const rawBrief = (opts && opts.brief) || '';
        const restore = !!(opts && opts.restore && _tvBrief);
        if (!restore) {
          // Light heuristic prefill — the user reviews everything in the modal
          const destGuess = (rawBrief.match(/\b(?:to|in|for)\s+([A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){0,2})/) || [])[1] || '';
          _tvBrief = {
            // The Diary intake hands over classifier-read crumbs she has
            // already reviewed — they outrank the regex guess. Never a
            // place or date she didn't give us.
            dest: (opts && opts.dest) || destGuess,
            dateFrom: (opts && opts.dateFrom) || iso(new Date(Date.now() + 14 * 86400000)),
            dateTo: (opts && opts.dateTo) || iso(new Date(Date.now() + 21 * 86400000)),
            brief: rawBrief,
            anchors: (opts && Array.isArray(opts.anchors) ? opts.anchors.map(String) : []),
            plan: (opts && Array.isArray(opts.plan)) ? opts.plan : [],
            suggested: (opts && Array.isArray(opts.suggested) ? opts.suggested : []),
          };
          _tvCat = 'All';
          _tvWxOnly = false;
        }
        const st = _tvBrief;
        const inputCss = 'width:100%;box-sizing:border-box;border:1px solid rgba(32,32,33,0.15);border-radius:var(--rad-sm);padding:11px 13px;font-size:13.5px;color:#202021;background:#fff;outline:none;font-family:inherit';
        const labelCss = 'font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin:0 0 8px';
        const closeSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

        // Category pills — only the categories she actually owns, plus All
        const cats = ['All'].concat(WA_CATS.slice(1).filter(c => _waItems.some(w => w.category === c)));
        const catPills = cats.map(c =>
          `<button data-tvcat="${_waEsc(c)}" onclick="window.__tvCatSet('${_waEsc(c)}')" style="padding:6px 13px;border:0.5px solid ${c === _tvCat ? '#202021' : 'rgba(32,32,33,0.15)'};border-radius:40px;background:${c === _tvCat ? '#202021' : '#fff'};color:${c === _tvCat ? '#fff' : '#202021'};font-size:11px;cursor:pointer;font-family:inherit;white-space:nowrap">${_waEsc(c)}</button>`
        ).join('');

        const browser = `
          <p style="${labelCss}">What’s tempting you?</p>
          ${(st.suggested || []).length ? `<p style="font-size:11px;color:#6E6A64;font-style:italic;margin:0 0 10px">✦ ${st.suggested.length} piece${st.suggested.length === 1 ? '' : 's'} from your moodboard will join the edit under Worth Adding.</p>` : ''}
          <p id="tv-anchor-hint" style="font-size:11px;color:var(--ink-faint);font-style:italic;margin:0 0 10px"></p>
          <div style="display:flex;gap:6px;overflow-x:auto;padding:2px 0 10px">${catPills}</div>
          <label id="tv-wx-row" style="display:none;align-items:center;gap:8px;font-size:11.5px;color:#6E6A64;cursor:pointer;margin:0 0 10px">
            <input id="tv-wx-box" type="checkbox" onchange="window.__tvWxToggle(this)" style="accent-color:#202021;margin:0"${_tvWxOnly ? ' checked' : ''}>
            <span id="tv-wx-label">Weather-ready pieces only</span>
          </label>
          <div id="tv-anchor-row" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;max-height:296px;overflow-y:auto;padding:2px;margin-bottom:20px"></div>`;

        const modal = document.createElement('div');
        modal.id = 'tv-brief-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:24px';
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
        modal.innerHTML = `
          <div style="background:#FAF8F5;border-radius:20px;width:100%;max-width:480px;max-height:86vh;overflow-y:auto;box-sizing:border-box;box-shadow:0 24px 60px -12px rgba(32,32,33,0.28);padding:24px 24px 28px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:2px">
              <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin:0">Travel edit</p>
              <button onclick="document.getElementById('tv-brief-modal').remove()" style="background:none;border:none;cursor:pointer;padding:2px;color:var(--ink-faint);line-height:1;margin-top:-2px">${closeSvg}</button>
            </div>
            <p style="font-family:${serif};font-size:26px;font-weight:300;color:#202021;margin:0 0 4px;line-height:1.15">Where are we packing for?</p>
            <p style="font-size:12px;color:var(--ink-faint);font-style:italic;margin:0 0 20px">Select everything you’re tempted to bring — Robes tells you what earns its place.</p>
            <p style="${labelCss}">Destination</p>
            <input id="tv-dest" value="${_waEsc(st.dest || '')}" placeholder="Ibiza, Spain" onchange="window.__tvWxRefetch()" style="${inputCss};margin-bottom:16px">
            <p style="${labelCss}">Dates</p>
            <div style="display:flex;gap:10px;margin-bottom:16px">
              <input id="tv-from" type="date" value="${_waEsc(st.dateFrom || '')}" onchange="window.__tvWxRefetch()" style="${inputCss}">
              <input id="tv-to" type="date" value="${_waEsc(st.dateTo || '')}" onchange="window.__tvWxRefetch()" style="${inputCss}">
            </div>
            <p style="${labelCss}">The brief</p>
            <textarea id="tv-brief-ta" rows="3" placeholder="Staying at Six Senses — refined Mediterranean minimalism. Think Loewe’s Paula’s Ibiza, Rosie Huntington-Whiteley." style="${inputCss};resize:none;margin-bottom:16px;line-height:1.55">${_waEsc(st.brief || '')}</textarea>
            ${browser}
            <button id="tv-cta" onclick="window.__tvSubmit()" style="width:100%;padding:14px 24px;border:none;border-radius:40px;background:#202021;font-size:12px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#fff;font-family:inherit;transition:opacity .2s">Next · Plan your days →</button>
          </div>`;
        document.body.appendChild(modal);
        _tvGridPaint();
        _tvFetchWx();
        setTimeout(() => { const el = document.getElementById('tv-dest'); if (el && !el.value) el.focus(); }, 60);
      };

      // Same day-count rule as the server: min(10, inclusive span), 7 when
      // the dates don't parse — the planner and the lookbook must agree.
      function _tvTripDays(st) {
        const from = new Date(((st && st.dateFrom) || '') + 'T00:00:00Z');
        const to = new Date(((st && st.dateTo) || '') + 'T00:00:00Z');
        if (isNaN(from) || isNaN(to) || to < from) return { n: 7, from: null };
        return { n: Math.min(10, Math.round((to - from) / 86400000) + 1), from };
      }

      window.__tvSubmit = function() {
        _tvCaptureBrief();
        const st = _tvBrief || {};
        if (!st.dest) { _waShowToast('Tell us where you’re going first'); return; }
        // A moodboard-fed brief already carries pieces — the shortlist floor
        // only applies when she's packing purely from her own wardrobe.
        if ((st.anchors || []).length < _TV_MIN_ANCHORS && !(st.suggested || []).length) {
          _waShowToast('Select at least ' + _TV_MIN_ANCHORS + ' pieces you’re considering first');
          return;
        }
        document.getElementById('tv-brief-modal')?.remove();
        _tvShowPlanModal();
      };

      // Step 2 of the brief — the day planner (Trip > pick pieces > plan
      // days > outfits). She accepts, edits or clears each day BEFORE any
      // looks are generated; a blank day means "Robes reads the trip"; the
      // "Leave free" toggle marks a day that needs NO looks (plan entry
      // null). With {forTrip: true} the same modal plans outfits for an
      // already-generated deferred trip (window.__lastTvData) instead of
      // the brief in progress.
      let _tvPlanFocus = 0;
      function _tvShowPlanModal(opts) {
        document.getElementById('tv-plan-modal')?.remove();
        const forTrip = !!(opts && opts.forTrip);
        const data = forTrip ? window.__lastTvData : null;
        if (forTrip && !data) return;
        const st = forTrip ? { dateFrom: data.dateFrom, dateTo: data.dateTo } : (_tvBrief || {});
        const { n, from } = _tvTripDays(st);
        const plan = forTrip
          ? (Array.isArray(data.trip_day_plan) ? data.trip_day_plan : [])
          : (Array.isArray(st.plan) ? st.plan : []);
        _tvPlanFocus = 0;
        const serif = "'Cormorant',Georgia,serif";
        const inputCss = 'width:100%;box-sizing:border-box;border:1px solid rgba(32,32,33,0.15);border-radius:var(--rad-sm);padding:10px 12px;font-size:13px;color:#202021;background:#fff;outline:none;font-family:inherit';
        const closeSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        const sugg = ['Arrival — settle in, dinner nearby', 'Beach or pool, then a dressy dinner', 'Exploring the town, casual lunch', 'Boat day', 'A big night out', 'Slow morning, shopping, aperitivo', 'A day trip', 'Brunch, then rooftop drinks', 'Departure — travel comfortable'];
        const ph = i => i === 0 ? sugg[0] : i === n - 1 ? sugg[sugg.length - 1] : sugg[1 + ((i - 1) % (sugg.length - 2))];
        const fmtDay = i => {
          if (!from) return '';
          const d = new Date(from.getTime() + i * 86400000);
          return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
        };
        const rows = Array.from({ length: n }, (_, i) => {
          const free = plan[i] === null;
          return `
          <div id="tv-plan-row-${i}" data-free="${free ? '1' : ''}">
            <label for="tv-plan-${i}" style="display:flex;align-items:baseline;gap:8px;margin-bottom:5px">
              <span style="font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#202021">Day ${i + 1}</span>
              ${fmtDay(i) ? `<span style="font-size:10px;color:var(--ink-faint)">${_waEsc(fmtDay(i))}</span>` : ''}
              <button type="button" id="tv-plan-freebtn-${i}" onclick="window.__tvPlanFree(${i})" style="margin-left:auto;padding:3px 10px;border:0.5px solid ${free ? '#202021' : 'rgba(32,32,33,0.16)'};border-radius:40px;background:${free ? '#202021' : '#fff'};color:${free ? '#fff' : '#A89880'};font-size:9px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;font-family:inherit">${free ? '✓ Left free' : 'Leave free'}</button>
            </label>
            <input id="tv-plan-${i}" value="${_waEsc(free ? '' : (plan[i] || ''))}"${free ? ' disabled' : ''} placeholder="${_waEsc(free ? 'Left free — no outfits this day' : ph(i))}" onfocus="window.__tvPlanFocusSet(${i})" style="${inputCss}${free ? ';opacity:.5;background:#F0EDE8' : ''}" data-ph="${_waEsc(ph(i))}">
          </div>`;
        }).join('');
        const chips = ['Beach club', 'Dressy dinner', 'Boat day', 'City wandering', 'Formal wedding', 'Active / hiking', 'Big night out'];
        const chipsHtml = chips.map(c =>
          `<button onclick="window.__tvPlanChip('${_waEsc(c)}')" style="padding:6px 13px;border:0.5px solid rgba(32,32,33,0.16);border-radius:40px;background:#fff;font-size:11px;cursor:pointer;color:#202021;font-family:inherit;white-space:nowrap">${_waEsc(c)}</button>`
        ).join('');
        const go = forTrip ? 'window.__tvOutfitsGo()' : 'window.__tvPlanGo()';
        const goSkip = forTrip ? 'window.__tvOutfitsGo(true)' : 'window.__tvPlanGo(true)';
        const modal = document.createElement('div');
        modal.id = 'tv-plan-modal';
        modal.className = 'tv-sheet-wrap';
        modal.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:24px';
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
        modal.innerHTML = `
          <div class="tv-sheet" style="background:#FAF8F5;border-radius:20px;width:100%;max-width:480px;max-height:86vh;overflow-y:auto;box-sizing:border-box;box-shadow:0 24px 60px -12px rgba(32,32,33,0.28);padding:24px 24px 28px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:2px">
              ${forTrip
                ? `<p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin:0">${_waEsc(data.destination || 'Your trip')}</p>`
                : `<button onclick="window.__tvPlanBack()" style="background:none;border:none;cursor:pointer;padding:0;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint);font-family:inherit">← Your pieces</button>`}
              <button onclick="document.getElementById('tv-plan-modal').remove()" style="background:none;border:none;cursor:pointer;padding:2px;color:var(--ink-faint);line-height:1;margin-top:-2px">${closeSvg}</button>
            </div>
            <p style="font-family:${serif};font-size:26px;font-weight:300;color:#202021;margin:8px 0 4px;line-height:1.15">What’s the plan, day by day?</p>
            <p style="font-size:12px;color:var(--ink-faint);font-style:italic;margin:0 0 18px">Every outfit gets built around what you’re actually doing. Leave a day blank and Robes reads the trip; “Leave free” means no outfits that day.</p>
            <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:14px">${rows}</div>
            <div style="display:flex;gap:6px;overflow-x:auto;padding:2px 0 16px">${chipsHtml}</div>
            <button onclick="${go}" style="width:100%;padding:14px 24px;border:none;border-radius:40px;background:#202021;font-size:12px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#fff;font-family:inherit">Create my outfits · ${n} day${n > 1 ? 's' : ''} →</button>
            ${forTrip ? '' : `<button onclick="window.__tvPlanGo('defer')" style="width:100%;margin-top:9px;padding:13px 24px;border:1px solid rgba(32,32,33,0.18);border-radius:40px;background:#fff;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;color:#202021;font-family:inherit">Still gathering pieces? Get the edit first →</button>`}
            <button onclick="${goSkip}" style="display:block;margin:12px auto 0;background:none;border:none;padding:4px;cursor:pointer;font-size:11px;color:var(--ink-faint);text-decoration:underline;text-underline-offset:3px;font-family:inherit">Skip — let Robes plan the days</button>
          </div>`;
        document.body.appendChild(modal);
        setTimeout(() => { const el = document.getElementById('tv-plan-0'); if (el && !el.disabled) el.focus(); }, 60);
      }

      window.__tvPlanFocusSet = function(i) { _tvPlanFocus = i; };
      window.__tvPlanChip = function(text) {
        const el = document.getElementById('tv-plan-' + _tvPlanFocus);
        if (el && !el.disabled) { el.value = text; el.focus(); }
      };
      // "Leave free" toggle — a deliberately blank diary day (plan = null):
      // no outfits get generated for it, distinct from blank = Robes plans.
      window.__tvPlanFree = function(i) {
        const row = document.getElementById('tv-plan-row-' + i);
        const el = document.getElementById('tv-plan-' + i);
        const btn = document.getElementById('tv-plan-freebtn-' + i);
        if (!row || !el || !btn) return;
        const free = row.dataset.free !== '1';
        row.dataset.free = free ? '1' : '';
        el.disabled = free;
        if (free) el.value = '';
        el.placeholder = free ? 'Left free — no outfits this day' : (el.dataset.ph || '');
        el.style.opacity = free ? '.5' : '';
        el.style.background = free ? '#F0EDE8' : '#fff';
        btn.textContent = free ? '✓ Left free' : 'Leave free';
        btn.style.background = free ? '#202021' : '#fff';
        btn.style.color = free ? '#fff' : '#A89880';
        btn.style.borderColor = free ? '#202021' : 'rgba(32,32,33,0.16)';
      };
      // Reads the modal into a plan array: string = her plan, '' = Robes
      // plans the day, null = deliberately left free.
      function _tvPlanRead(n) {
        const plan = [];
        for (let i = 0; i < n; i++) {
          const row = document.getElementById('tv-plan-row-' + i);
          const el = document.getElementById('tv-plan-' + i);
          plan.push(row && row.dataset.free === '1' ? null : ((el && el.value) || '').trim().slice(0, 140));
        }
        return plan;
      }
      function _tvPlanCapture() {
        const st = _tvBrief || {};
        const plan = _tvPlanRead(_tvTripDays(st).n);
        if (_tvBrief) _tvBrief.plan = plan;
        return plan;
      }
      window.__tvPlanBack = function() {
        _tvPlanCapture();
        document.getElementById('tv-plan-modal')?.remove();
        window.__tvOpen({ restore: true });
      };
      window.__tvPlanGo = function(mode) {
        const skip = mode === true;
        const plan = skip ? [] : _tvPlanCapture();
        document.getElementById('tv-plan-modal')?.remove();
        const send = plan.some(p => p === null || p) ? plan : [];
        _tvGenerate(send, mode === 'defer');
      };

      async function _tvGenerate(dayPlan, editOnly) {
        const st = _tvBrief || {};
        const dest = st.dest || '';
        const shortlistIds = st.anchors || [];
        const dateFrom = st.dateFrom || '';
        const dateTo = st.dateTo || '';
        const brief = st.brief || '';

        let overlay = document.getElementById('kp-loading-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'kp-loading-overlay';
          overlay.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(250,248,245,0.92);backdrop-filter:blur(6px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px';
          overlay.innerHTML = `
            <div id="kp-load-title" style="font-family:'Cormorant',Georgia,serif;font-size:28px;font-weight:300;color:#202021;text-align:center"></div>
            <div style="font-size:12px;color:var(--ink-faint);letter-spacing:.06em" id="kp-load-msg">Composing your looks</div>
            <div style="width:120px;height:1px;background:rgba(32,32,33,0.1);position:relative;overflow:hidden;margin-top:8px">
              <div id="kp-load-bar" style="position:absolute;inset:0;background:#202021;transform:translateX(-100%);animation:kpLoadBar 2.5s ease-in-out infinite"></div>
            </div>`;
          document.body.appendChild(overlay);
        }
        const loadTitle = document.getElementById('kp-load-title');
        if (loadTitle) loadTitle.innerHTML = 'Packing you for<br><em>' + _waEsc(dest) + '…</em>';
        overlay.style.display = 'flex';
        const msgs = ['Reading the destination & forecast', 'Deciding what earns its place…', 'Counting the wears each piece earns…', 'Mapping every look, day by evening…', 'Almost ready…'];
        let mi = 0;
        const msgEl0 = document.getElementById('kp-load-msg');
        if (msgEl0) msgEl0.textContent = msgs[0];
        const msgInterval = setInterval(() => {
          mi = Math.min(mi + 1, msgs.length - 1);
          const el = document.getElementById('kp-load-msg');
          if (el) el.textContent = msgs[mi];
        }, 9000);
        const genId = _rbGenId();
        try {
          const res = await fetch('/api/travel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              destination: dest,
              dateFrom,
              dateTo,
              brief,
              shortlistIds,
              suggestedItems: st.suggested || [],
              dayPlan,
              editOnly: !!editOnly,
              userId: _waUid() || undefined,
              genId,
              name,
              styleDna: _rbStyleDna(), styleIcons: _rbStyleIcons(), gender: _rbGender(),
              wardrobeItems: _waItems.map(i => ({ id: i.id, label: i.label, category: i.category, color: i.color, brand: i.brand, image_url: i.image_url, times_worn: i.times_worn, hero: i.hero_position != null || undefined, seasons: (Array.isArray(i.seasons) && i.seasons.length) ? i.seasons : undefined })),
            }),
          });
          clearInterval(msgInterval);
          overlay.style.display = 'none';
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          data.genId = genId;
          data.brief = brief;
          data.shortlist_size = shortlistIds.length;
          // A deferred trip keeps her typed plan so the later outfit
          // planner can prefill it.
          if (editOnly && Array.isArray(dayPlan) && dayPlan.length) data.trip_day_plan = dayPlan;
          _tvBrief = null;
          window.__tvRenderResult(data);
        } catch (err) {
          clearInterval(msgInterval);
          overlay.style.display = 'none';
          console.error('[Robes] /api/travel error:', err.message);
          _waShowToast(err.message && err.message.length < 120 ? err.message : 'Something went wrong — please try again');
        }
      }

      // ── Travel Edit render (Packing Edit redesign, amendments 2026-07) ──
      // The calendar (day strip) leads the page: tapping a day opens its
      // look in a console that emulates the Daily experience — a stylist
      // moodboard on the left (with the trip's editorial hero as the mood
      // tile), "The Rack" on the right, and a Day/Evening flick. The Edit
      // (Keep / Worth adding, packed tags, all metadata)
      // sits below as before, and a sticky payoff bar closes the page.
      let _tvActiveDay = 0;   // day the console is reading
      let _tvActiveOcc = 0;   // 0 = Day slot, 1 = Evening slot
      let _tvActiveTab = 'edit'; // 'edit' (pieces) | 'outfits' (calendar)

      // Tab switch — splits the dense page into The Edit (pieces) and
      // Outfits (calendar + console) so it never overwhelms at once.
      window.__tvSetTab = function(tab) {
        _tvActiveTab = (tab === 'outfits') ? 'outfits' : 'edit';
        const paneE = document.getElementById('tv-pane-edit');
        const paneO = document.getElementById('tv-pane-outfits');
        const btnE = document.getElementById('tv-tab-edit');
        const btnO = document.getElementById('tv-tab-outfits');
        if (paneE) paneE.style.display = _tvActiveTab === 'edit' ? 'block' : 'none';
        if (paneO) paneO.style.display = _tvActiveTab === 'outfits' ? 'block' : 'none';
        if (btnE) btnE.classList.toggle('on', _tvActiveTab === 'edit');
        if (btnO) btnO.classList.toggle('on', _tvActiveTab === 'outfits');
        if (tvResultPage) tvResultPage.scrollTo({ top: 0 });
      };

      // Styled to the live platform design system (Moodboard header + the
      // cream/white, rounded-pill language used everywhere else).
      const _TV_CSS = `
#tv-result-page{color:var(--ink);font-weight:300}
#tv-result-page .tvm-wrap{max-width:var(--shell,1440px);margin:0 auto;padding:34px var(--s6,36px) 28px;box-sizing:border-box}\n#tv-result-page .tvm-capgrid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:16px}\n@media(max-width:1199px){#tv-result-page .tvm-capgrid{grid-template-columns:repeat(4,minmax(0,1fr))}}\n@media(max-width:767px){#tv-result-page .tvm-capgrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}}
#tv-result-page .tvm-eyebrow{font-size:10px;font-weight:500;letter-spacing:.24em;text-transform:uppercase;color:var(--rose);margin-bottom:8px}
#tv-result-page .tvm-mast{display:flex;justify-content:space-between;align-items:flex-end;gap:28px}
#tv-result-page .tvm-title{font-family:var(--font-serif);font-weight:300;font-style:italic;font-size:clamp(30px,4vw,44px);line-height:1.05;margin:0;color:var(--ink);max-width:18ch}
#tv-result-page .tvm-progress{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;padding-bottom:4px}
#tv-result-page .tvm-mpcount{font-family:var(--font-serif);font-weight:300;font-size:28px;line-height:1;color:var(--ink)}
#tv-result-page .tvm-mpcount .of{font-size:13px;color:var(--ink-faint)}
#tv-result-page .tvm-mpbar{width:180px;height:4px;border-radius:100px;background:var(--cream-200);overflow:hidden}
#tv-result-page .tvm-mpbar span{display:block;height:100%;width:0%;background:var(--sage);border-radius:100px;transition:width .4s}
#tv-result-page .tvm-mplab{font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint)}
#tv-result-page .tvm-meta-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
#tv-result-page .tvm-wx{display:inline-flex;align-items:center;gap:10px;padding:8px 14px;background:#fff;border:0.5px solid var(--rule-mid);border-radius:100px;font-size:11.5px;color:var(--ink-soft)}
#tv-result-page .tvm-wx strong{font-weight:500;color:var(--ink)}
#tv-result-page .tvm-wx .div{width:1px;height:11px;background:var(--rule-mid)}
#tv-result-page .tvm-tag{display:inline-flex;align-items:center;padding:8px 14px;border-radius:100px;background:var(--rose-bg);border:0.5px solid rgba(142,112,119,0.2);font-family:var(--font-serif);font-style:italic;font-size:14px;color:var(--rose)}
#tv-result-page .tvm-rule{height:0.5px;background:var(--rule);margin:22px 0 24px}
#tv-result-page .tvm-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;background:var(--cream-100);border:0.5px solid var(--rule-mid);border-radius:var(--rad);padding:6px;margin-bottom:26px;max-width:600px}
#tv-result-page .tvm-tab{display:flex;flex-direction:column;align-items:flex-start;gap:3px;padding:13px 18px;border:none;border-radius:calc(var(--rad) - 5px);background:transparent;cursor:pointer;font-family:inherit;text-align:left;transition:all .15s}
#tv-result-page .tvm-tab .tt{font-family:var(--font-serif);font-weight:400;font-size:19px;line-height:1.1;color:var(--ink)}
#tv-result-page .tvm-tab .ts{font-size:10px;letter-spacing:.06em;color:var(--ink-faint)}
#tv-result-page .tvm-tab:hover:not(.on){background:#fff}
#tv-result-page .tvm-tab.on{background:var(--ink)}
#tv-result-page .tvm-tab.on .tt{color:#fff}
#tv-result-page .tvm-tab.on .ts{color:rgba(255,255,255,0.62)}
#tv-result-page .tvm-crosscta{display:inline-flex;align-items:center;gap:8px;border:none;border-radius:100px;padding:13px 24px;font-size:12px;letter-spacing:.02em;background:var(--ink);color:#fff;cursor:pointer;transition:opacity .15s;font-family:inherit}
#tv-result-page .tvm-crosscta:hover{opacity:.85}
#tv-result-page .tvm-weekhead{display:flex;align-items:baseline;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-bottom:14px}
#tv-result-page .tvm-weekhead h2{font-family:var(--font-serif);font-weight:300;font-style:italic;font-size:23px;margin:0;color:var(--ink)}
#tv-result-page .tvm-weekhead .hint{font-size:11px;color:var(--ink-faint);letter-spacing:.02em}

#tv-result-page .tvm-console{display:grid;grid-template-columns:360px minmax(0,1fr);gap:34px;align-items:start}
#tv-result-page .tvm-look{position:sticky;top:18px;display:flex;flex-direction:column;gap:13px}
#tv-result-page .tvm-panel{background:#fff;border:0.5px solid var(--rule-mid);border-radius:var(--rad-lg);padding:18px}
#tv-result-page .tvm-lhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
#tv-result-page .tvm-lhead .lab{font-size:9px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-faint)}
#tv-result-page .tvm-lhead .robes{font-size:9px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--rose)}
#tv-result-page .tvm-occ{display:inline-flex;border:0.5px solid var(--rule-mid);border-radius:100px;overflow:hidden;margin-bottom:14px}
#tv-result-page .tvm-occ button{padding:6px 16px;font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-soft);background:transparent;border:none;cursor:pointer;transition:all .18s;font-family:inherit}
#tv-result-page .tvm-occ button.on{background:var(--ink);color:#fff}
#tv-result-page .tvm-quote{font-family:var(--font-serif);font-style:italic;font-weight:300;font-size:15px;line-height:1.42;color:var(--ink-soft);margin-bottom:14px;padding-left:13px;border-left:2px solid var(--rose-mid)}






























#tv-result-page .tvm-rackhead{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px;flex-wrap:wrap}
#tv-result-page .tvm-rackhead .ey{font-size:10px;font-weight:500;letter-spacing:.24em;text-transform:uppercase;color:var(--rose)}
#tv-result-page .tvm-rackhead h2{font-family:var(--font-serif);font-weight:300;font-style:italic;font-size:25px;line-height:1.05;margin:6px 0 0;color:var(--ink)}
#tv-result-page .tvm-hbtn{display:inline-flex;align-items:center;gap:7px;border:0.5px solid var(--rule-mid);border-radius:100px;padding:9px 15px;font-size:11.5px;color:var(--ink-soft);background:#fff;cursor:pointer;transition:all .15s;white-space:nowrap;font-family:inherit}
#tv-result-page .tvm-hbtn:hover{border-color:rgba(32,32,33,0.22);color:var(--ink)}






















#tv-result-page .tvm-act{display:inline-flex;align-items:center;gap:6px;border:0.5px solid var(--rule-mid);border-radius:100px;padding:8px 13px;font-size:11px;letter-spacing:.01em;background:#fff;color:var(--ink-soft);cursor:pointer;transition:all .15s;font-family:inherit}
#tv-result-page .tvm-act:hover{border-color:rgba(32,32,33,0.22);color:var(--ink)}
#tv-result-page .tvm-act.on{background:var(--sage);color:#fff;border-color:var(--sage)}
#tv-result-page .tvm-act.add{background:var(--ink);color:#fff;border-color:var(--ink)}
#tv-result-page .tvm-act.add:hover{opacity:.85;color:#fff;border-color:var(--ink)}
#tv-result-page .tvm-act.anch.on{background:var(--ink);color:#fff;border-color:var(--ink)}





#tv-result-page .tvm-packbox{display:inline-flex;align-items:center;gap:7px;background:none;border:none;padding:6px 4px;cursor:pointer;font-size:11px;letter-spacing:.01em;color:var(--ink-soft);font-family:inherit;transition:color .15s}
#tv-result-page .tvm-packbox.on{color:var(--ink)}
#tv-result-page .tvm-packbox .box{width:16px;height:16px;border-radius:4px;border:1.5px solid rgba(32,32,33,0.3);background:#fff;display:inline-flex;align-items:center;justify-content:center;color:#fff;box-sizing:border-box}
#tv-result-page .tvm-packbox.on .box{border-color:var(--ink);background:var(--ink)}
#tv-result-page .tvm-packbox .box svg{width:10px;height:10px;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
@media(max-width:900px){
#tv-result-page .tvm-console{grid-template-columns:1fr;gap:26px}
#tv-result-page .tvm-look{position:static}
#tv-result-page .tvm-wrap{padding:28px 20px 20px}
#tv-result-page .tvm-mast{flex-direction:column;align-items:flex-start;gap:16px}
#tv-result-page .tvm-progress{align-items:flex-start}

}
@media(max-width:520px){



}
@media(max-width:900px){
.tv-sheet-wrap{align-items:flex-end !important;padding:0 !important}
.tv-sheet{border-radius:20px 20px 0 0 !important;max-width:none !important}
}`;

      const _tvCheckSvg = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
      const _tvChevL = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
      const _tvChevR = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
      const _tvSwapSvg = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>`;
      const _tvLockSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
      const _tvPhSvg = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C8BCAE" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
      const _tvSerif = "'Cormorant',Georgia,serif";

      // Frame for one capsule item — real wardrobe photo first, generated
      // still (patched in by the poller via data-tvimg) second, mono tile last.
      // A flicked-in piece (name differs from the served original) must never
      // wear the original's generated still — same rule as the daily rack.
      function _tvFrame(it) {
        const data = window.__lastTvData || {};
        const images = Array.isArray(data.generatedImages) ? data.generatedImages : [];
        const imagesPending = !!data.jobId && !images.some(Boolean);
        const wmImg = it.wardrobe_match && it.wardrobe_match.image_url;
        const genOk = !_dlAltered(it) && Number.isInteger(it.image_index);
        const src = wmImg || (genOk ? images[it.image_index] : null);
        const pollAttr = (!wmImg && genOk) ? ' data-tvimg="' + it.image_index + '"' : '';
        const pulse = !src && !wmImg && genOk && imagesPending;
        const phInner = pulse
          ? `<span style="font-family:${_tvSerif};font-style:italic;font-size:12px;color:var(--ink-faint);text-align:center;padding:0 12px">Creating imagery…</span>`
          : (!genOk && !wmImg)
            ? `<span class="rbc-mono" style="font-family:${_tvSerif};font-size:28px;font-weight:300;color:var(--ink-faint)">${_waEsc((it.name || '?').charAt(0).toUpperCase())}</span>`
            : _tvPhSvg;
        const inner = src && typeof src === 'string'
          ? `<img src="${_waEsc(src)}" style="width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0" alt="">`
          : `<div class="tv-img-ph" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;${pulse ? 'animation:kpPhPulse 1.8s ease-in-out infinite' : ''}">${phInner}</div>`;
        return { pollAttr, inner };
      }

      function _tvLookState() {
        const data = window.__lastTvData;
        if (!data || !Array.isArray(data.days) || !data.days.length) return null;
        if (_tvActiveDay >= data.days.length) _tvActiveDay = 0;
        const d = data.days[_tvActiveDay];
        const slots = (d && d.slots) || [];
        // s is null for a deliberately free day — the console renders its
        // rest state instead of a look.
        if (!slots.length) return { data, d, slots, s: null };
        // Every dressed day carries the Day/Evening pair; the evening slot
        // may simply not exist yet ("left free") — eveFree tells the
        // console to render the invitation, never to snap back to Day.
        const eveS = slots.find(x => String(x.slot || '').toLowerCase() === 'evening') || null;
        const dayS = slots.find(x => String(x.slot || '').toLowerCase() !== 'evening') || slots[0] || null;
        if (_tvActiveOcc === 1) return { data, d, slots, s: eveS, eveFree: !eveS };
        return { data, d, slots, s: dayS };
      }

      // Dress a trip day's evening as an ADDITION: /api/travel/day runs with
      // an evening-only brief and ONLY its Evening slot is taken — the
      // existing Day slot is never replaced.
      window.__tvDressEvening = async function(activity) {
        const data = window.__lastTvData;
        const di = _tvActiveDay;
        const d = data && data.days[di];
        if (!d || d.rest) return;
        const typed = (typeof activity === 'string' && activity.trim())
          || ((document.getElementById('tv-eve-act') || {}).value || '').trim();
        if (!typed) { const el = document.getElementById('tv-eve-act'); if (el) el.focus(); return; }
        const host = document.getElementById('tv-rackwrap');
        if (host) host.style.opacity = '0.5';
        try {
          const dayPlanTxt = d.user_activity || ((d.day_label || '').split('·')[1] || '').trim() || 'the day as planned';
          const out = await _tvDayRequest(di, 'The day itself stays EXACTLY as planned (' + dayPlanTxt + ') — do not restyle it. Dress ONLY the EVENING: ' + typed);
          const outSlots = Array.isArray(out.slots) ? out.slots : [];
          const eveSlot = outSlots.find(s => String(s.slot || '').toLowerCase() === 'evening') || outSlots[1] || outSlots[0];
          if (!eveSlot) throw new Error('no evening slot returned');
          if (out.new_item) data.capsule.push({ ...out.new_item, wardrobe_match: null });
          eveSlot.slot = 'Evening';
          const k = (d.slots || []).findIndex(s => String(s.slot || '').toLowerCase() === 'evening');
          if (k === -1) d.slots.push(eveSlot); else d.slots[k] = eveSlot;
          if (!d.user_activity) d.user_activity = dayPlanTxt === 'the day as planned' ? undefined : d.user_activity;
          _tvActiveOcc = 1;
          _tvDayRerender();
          _rbTrack('day_planned', { source_type: 'travel', day_index: di });
          _waShowToast('The evening gets its own look — the day is untouched');
        } catch (e) {
          console.error('[Robes] /api/travel/day (evening) error:', e.message);
          _waShowToast('Robes couldn’t dress that evening — please try again.');
        } finally {
          const h = document.getElementById('tv-rackwrap');
          if (h) h.style.opacity = '';
        }
      };

      window.__tvSelectDay = function(di) {
        _tvActiveDay = di;
        _tvActiveOcc = 0;
        _tvPaintWeek();
        _tvPaintConsole();
      };
      window.__tvSetOcc = function(oi) {
        _tvActiveOcc = oi;
        _tvPaintConsole();
      };

      // The calendar strip — the lookbook, as navigator (packing edit PRD)
      function _tvPaintWeek() {
        const el = document.getElementById('tv-weekstrip');
        const data = window.__lastTvData;
        if (!el || !data) return;
        if (_rbDayCardOn() && _tvWeekV2(el, data)) return;
        el.innerHTML = _rbDayStrip(data.days.map((d, di) => {
          const slots = d.slots || [];
          const label = (d.day_label || 'Day ' + (di + 1));
          const parts = label.split('·');
          const pieceIdx = [];
          slots.forEach(s => (s.formula || []).forEach(f => {
            if (pieceIdx.indexOf(f.item_index) === -1 && data.capsule[f.item_index]) pieceIdx.push(f.item_index);
          }));
          const allPacked = pieceIdx.length > 0 && pieceIdx.every(ci => data.capsule[ci].packed);
          return {
            dow: (parts[0] || '').trim(),
            dot: allPacked,
            dim: !slots.length,
            event: (parts[1] || '').trim() || (slots[0] && slots[0].title) || '',
            meta: slots.length ? slots.length + ' look' + (slots.length > 1 ? 's' : '') + (d.user_activity ? ' <span style="color:var(--rose)">· your plan</span>' : '') : 'left free',
            thumbs: pieceIdx.slice(0, 4).map(ci => {
              const it = data.capsule[ci];
              return (it.wardrobe_match && it.wardrobe_match.image_url) ||
                ((!_dlAltered(it) && Number.isInteger(it.image_index)) ? (data.generatedImages || [])[it.image_index] : null);
            }),
            onclick: `window.__tvSelectDay(${di})`,
          };
        }), _tvActiveDay);
      }

      // DayCard path (spec v2.0): live blob → _pdRowsTv → cards. The trip
      // eyebrow is DAY N, no calendar date (a trip is day-indexed — spec
      // §4.1); the "2 looks" count is gone, replaced by the evening line
      // (spec §9); Packed ✓ is the Travel-only modifier (spec §8.3). Old
      // saves without a parseable dateFrom → legacy strip.
      function _tvWeekV2(el, data) {
        if (!Array.isArray(data.days) || !data.days.length) return false;
        const built = _pdRowsTv(_tvActiveSaveId || 'live', data);
        if (!built) return false;
        const today = _pdLocalISO();
        const byIdx = {};
        built.rows.forEach(r => { (byIdx[r.day_index] = byIdx[r.day_index] || {})[r.slot === 'evening' ? 'eve' : 'day'] = r; });
        el.innerHTML = data.days.map((d, di) => {
          const rows = byIdx[di] || {};
          const date = _pdAddISO(data.dateFrom, di);
          const dc = _dcMoments(rows.day || null, rows.eve || null, { date, today, eyebrow: 'DAY ' + (di + 1), blob: data });
          dc.chip = null;
          if (!dc.modifier) {
            const pieceIdx = [];
            (d.slots || []).forEach(s => (s.formula || []).forEach(f => {
              if (pieceIdx.indexOf(f.item_index) === -1 && (data.capsule || [])[f.item_index]) pieceIdx.push(f.item_index);
            }));
            if (pieceIdx.length && pieceIdx.every(ci => data.capsule[ci].packed)) dc.modifier = 'packed';
          }
          return _dcCard(dc, {
            density: 'full',
            body: `window.__tvOpenDay(${di})`,
            focus: di === _tvActiveDay,
          });
        }).join('');
        return true;
      }
      window.__tvOpenDay = function(di) {
        if (window.__tvSetTab) window.__tvSetTab('outfits');
        if (window.__tvSelectDay) window.__tvSelectDay(di);
      };

      // The console — this day's look, read piece by piece (emulates Daily)
      function _tvPaintConsole() {
        const st = _tvLookState();
        const panel = document.getElementById('tv-look-panel');
        const rackWrap = document.getElementById('tv-rackwrap');
        if (!st || !panel || !rackWrap) return;
        const { data, d, slots, s } = st;
        const usage = data._usage || [];
        const hexOk = h => typeof h === 'string' && /^#[0-9A-Fa-f]{6}$/.test(h);
        const palette = (Array.isArray(data.palette) ? data.palette : []).filter(hexOk).slice(0, 3);
        const dayName = ((d.day_label || 'Day ' + (_tvActiveDay + 1)).split('·')[0] || '').trim();

        // Evening selected but left free (the default) — the invitation to
        // ADD an evening look; the Day slot stays exactly as dressed either
        // way. Mirrors the weekly console's evening-empty state.
        if (!s && st.eveFree) {
          const occPair = ['Day', 'Evening · free'].map((lab, oi) =>
            `<button class="${oi === 1 ? 'on' : ''}" onclick="window.__tvSetOcc(${oi})">${lab}</button>`
          ).join('');
          panel.innerHTML = `
            <div class="tvm-panel">
              <div class="tvm-lhead">
                <span class="lab">The look · ${_waEsc(dayName)}</span>
                <span class="robes">Robes</span>
              </div>
              <div class="tvm-occ">${occPair}</div>
              <div class="tvm-quote">“The evening is a blank page — the day is already dressed.”</div>
              <p style="font-size:12.5px;line-height:1.6;color:var(--ink-faint);margin:0">Tell Robes the evening's plan and it gets its own look from the case — the day's outfit stays exactly as it is.</p>
            </div>`;
          rackWrap.innerHTML = `
            <div class="tvm-rackhead">
              <div style="min-width:0">
                <span class="ey">The rack · ${_waEsc(dayName)} evening</span>
                <h2>Left free.</h2>
              </div>
            </div>
            <div style="background:#fff;border:0.5px dashed rgba(32,32,33,0.2);border-radius:16px;padding:36px 24px;text-align:center">
              <div style="font-size:12.5px;color:var(--ink-faint);margin-bottom:14px">Add a plan and the evening gets its own look.</div>
              <input id="tv-eve-act" placeholder="Date night, drinks, a dinner out…" style="width:100%;max-width:320px;box-sizing:border-box;border:0.5px solid rgba(32,32,33,0.16);border-radius:100px;padding:11px 16px;font-size:13px;font-family:inherit;color:var(--ink);background:#FAF8F5;outline:none;margin:0 auto 14px;display:block" onkeydown="if(event.key==='Enter')window.__tvDressEvening()">
              <button class="tvm-hbtn" style="background:var(--ink);color:#fff;border-color:var(--ink)" onclick="window.__tvDressEvening()">✦ Dress the evening →</button>
            </div>`;
          return;
        }

        // A deliberately free day — no look to read, just the rest state
        // and the door back in (✎ dresses it via the reactive restyle).
        if (!s) {
          panel.innerHTML = `
            <div class="tvm-panel">
              <div class="tvm-lhead">
                <span class="lab">The look · ${_waEsc(dayName)}</span>
                <span class="robes">Robes</span>
              </div>
              <div class="tvm-quote">“A day off the lookbook — nothing to plan, nothing to pack.”</div>
              <p style="font-size:12.5px;line-height:1.6;color:var(--ink-faint);margin:0">You left this day free. If plans appear, tell Robes and it dresses the day from the capsule you’ve already packed.</p>
            </div>`;
          rackWrap.innerHTML = `
            <div class="tvm-rackhead">
              <div style="min-width:0">
                <span class="ey">The rack · ${_waEsc(dayName)}</span>
                <h2>Left free.</h2>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="tvm-hbtn" onclick="window.__tvEditDay(${_tvActiveDay})" title="Give this day a plan after all">✎ Dress this day</button>
              </div>
            </div>`;
          return;
        }
        const entries = (s.formula || []).map(f => ({ f, it: data.capsule[f.item_index], ci: f.item_index })).filter(x => x.it);

        // The pair is ALWAYS Day + Evening (evening "· free" until dressed)
        const hasEve = slots.some(x => String(x.slot || '').toLowerCase() === 'evening');
        const occHtml = ['Day', 'Evening' + (hasEve ? '' : ' · free')].map((lab, oi) =>
          `<button class="${oi === _tvActiveOcc ? 'on' : ''}" onclick="window.__tvSetOcc(${oi})">${lab}</button>`
        ).join('');

        // No "The mood" hero tile here — the trip hero is static across days
        // and read as the day's look (beta feedback); the first piece tile
        // takes the wide slot instead, like the Daily board. Rendering runs
        // through the shared console template (_rbConsole) — this adapter
        // only supplies frames, provenance and the pack third action.
        const fabricsHtml = _rbcFabricsHtml(entries.map(x => x.it), palette);

        const conItems = entries.map(x => {
          const { it, ci } = x;
          const wears = (usage[ci] || []).length;
          // Capsule constraint (Phase 4): on a trip you dress from the CASE
          // — flick candidates are the trip's other capsule members in this
          // slot, never the wardrobe at large.
          const pool = _tvCapsulePool(data, ci);
          const list = { length: pool.length };
          return {
            idx: ci,
            frame: _tvFrame(it),
            slot: _dlSlot(it).l,
            shortName: _dlShort(it.name),
            name: it.name,
            owned: !!it.wardrobe_match,
            anchored: !!it.anchored,
            isNew: !it.wardrobe_match,
            showAddTag: !it.wardrobe_match && !it.added,
            rowClass: it.packed ? ' packed' : '',
            count: { cur: Math.max(0, pool.indexOf(ci)), len: pool.length },
            wearsHtml: wears ? `<span class="vlooks">× ${wears} looks</span>` : '',
            subHtml: _rbcProvenance(it, `<span class="addtag">${it.added ? 'Added to the pack' : 'Worth adding'}</span>`),
            noteHtml: x.f.note ? `<div class="rbc-hownote">${_waEsc(x.f.note)}</div>` : '',
            thirdHtml: (it.wardrobe_match || it.added)
              ? `<button class="tvm-packbox${it.packed ? ' on' : ''}" onclick="window.__tvPackToggle(${ci})"><span class="box">${it.packed ? _tvCheckSvg : ''}</span>${it.packed ? 'Packed' : 'Pack'}</button>`
              : `<button class="tvm-act add" onclick="window.__tvAddOwn(${ci})">+ Add</button>`,
          };
        });

        const readHtml = (() => {
          const inCase = entries.filter(x => x.it.packed);
          const gaps = entries.filter(x => !x.it.wardrobe_match && !x.it.added);
          const toPack = entries.filter(x => !x.it.packed);
          // The score counts what's packed — Travel's real question — but the
          // verdict still names what's owned (audit F2/§3.1): the highest
          // buying-intent surface shouldn't stop showing wardrobe position
          // just because it measures packing.
          const ownedN = entries.filter(x => x.it.wardrobe_match).length;
          const ownedLine = `${ownedN} of ${entries.length} pieces are already yours.`;
          let verdict;
          if (gaps.length) verdict = `Nearly there — the ${_waEsc(gaps[0].it.name.toLowerCase())} is the gap worth adding, then this look is complete. ${ownedLine}`;
          else if (toPack.length) verdict = `Everything’s chosen — just pack the ${_waEsc(toPack[0].it.name.toLowerCase())} and it’s ready. ${ownedLine}`;
          else verdict = `Every piece is packed and accounted for — this look travels as it is. ${ownedLine}`;
          return _rbcReadBlock({ score: inCase.length, total: entries.length, unit: 'in the case', clean: gaps.length === 0, verdict });
        })();

        const con = _rbConsole({
          headLabel: `The look · ${_waEsc(dayName)} · ${entries.length} pieces`,
          occHtml: `<div class="tvm-occ">${occHtml}</div>`,
          quoteHtml: s.how ? _waEsc(s.how) : '',
          fabricsHtml,
          paletteHtml: palette.map(h => `<span style="background:${h}"></span>`).join(''),
          panelExtraHtml: readHtml,
          addChipLabel: _rbTrackCfg('travel').console.addVerb,
          rackLabel: `The rack · ${_waEsc(dayName)}`,
          // The hint names MEMBERSHIP, not packing (decision 4 — the packed
          // checklist never constrains generation). COPY: needs sign-off
          rackHintHtml: `<div style="font-size:11px;color:var(--ink-faint);background:#F5F0E8;border:0.5px solid rgba(32,32,33,0.08);border-radius:var(--rad-sm);padding:8px 12px;margin:8px 0 14px">Styled from your case — the ${data.capsule.length} pieces this trip is built from. Swapping in anything else adds it to the case.</div>`,
          rackTitleHtml: `<h2>${_waEsc(s.title || 'The look')}${s.title && !/[.!?]$/.test(s.title) ? '.' : ''}</h2>`,
          headButtonsHtml: `<button class="rbc-hbtn" onclick="window.__tvRestyleDay()" title="A fresh day — anchored pieces stay">↻ Restyle this day</button><button class="rbc-hbtn" onclick="window.__tvEditDay(${_tvActiveDay})" title="Tell Robes this day’s real plan">✎ The real plan</button><button class="rbc-hbtn" onclick="window.__tvPackLook()">${_tvCheckSvg} Pack this look</button>`,
          onFlip: '__tvFlip', onSwap: '__tvDaySwap', onAnchor: '__tvAnchor', onRemove: '__tvRemoveFromLook',
          addPieceFn: '__tvAddPieceToLook',
          lookActionHtml: `<button onclick="window.__rbShare&&window.__rbShare()">Share this look</button>`,
        }, conItems);

        panel.innerHTML = con.lookHtml;

        rackWrap.innerHTML = con.rackHtml;
        // (Build 2's travel alternates prefetch is retired — a trip day's
        // candidates are capsule members now, so AI alternates never render
        // on this surface and the tokens are saved.)
      }

      // Capsule constraint (Phase 4): on a trip you dress from a CASE, not
      // a wardrobe. A day-console flick cycles this slot through the trip's
      // OTHER capsule members in the category — re-pointing THIS day's
      // formula reference only, never mutating membership and never
      // touching other days. (The pre-Phase-4 flick offered owned wardrobe
      // pieces and applied trip-wide; membership changes now live on the
      // Edit tab and the adopt path.)
      function _tvCatNorm(c) { return String(c || '').toLowerCase().replace(/s$/, ''); }
      function _tvCapsulePool(data, ci) {
        const member = data.capsule[ci];
        if (!member) return [ci];
        const catL = _tvCatNorm(member.category);
        const pool = [];
        data.capsule.forEach((c, k) => { if (_tvCatNorm(c.category) === catL) pool.push(k); });
        return pool.length ? pool : [ci];
      }
      function _tvRepointDay(ci, targetCi) {
        const st = _tvLookState();
        if (!st || !st.s) return false;
        let hit = false;
        (st.s.formula || []).forEach(f => { if (f.item_index === ci) { f.item_index = Number(targetCi); hit = true; } });
        return hit;
      }
      function _tvDayRerender(animateCi) {
        const savedId = _tvActiveSaveId;
        const scroll = tvResultPage ? tvResultPage.scrollTop : 0;
        window.__tvRenderResult(window.__lastTvData, { skipSave: true, savedId });
        if (tvResultPage) tvResultPage.scrollTo({ top: scroll });
        _tvPatchSaved();
        if (animateCi != null) window.__rbcAnimateTile(animateCi);
      }
      window.__tvFlip = function(ci, dir) {
        const data = window.__lastTvData;
        if (!data || !data.capsule[ci]) return;
        const pool = _tvCapsulePool(data, ci);
        if (pool.length < 2) { _waShowToast('Nothing else in the case fits this slot — Swap to bring a piece in'); return; }
        const cur = Math.max(0, pool.indexOf(ci));
        const next = pool[(cur + dir + pool.length) % pool.length];
        if (!_tvRepointDay(ci, next)) return;
        _tvDayRerender(next);
      };

      // Anchor — the Daily/Weekly lock: an anchored capsule piece is held
      // fixed through day restyles. Capsule items are shared references, so
      // the anchor carries across every day that wears the piece.
      window.__tvAnchor = function(ci) {
        const data = window.__lastTvData;
        const it = data && data.capsule[ci];
        if (!it) return;
        it.anchored = !it.anchored;
        const savedId = _tvActiveSaveId;
        const scroll = tvResultPage ? tvResultPage.scrollTop : 0;
        window.__tvRenderResult(data, { skipSave: true, savedId });
        if (tvResultPage) tvResultPage.scrollTo({ top: scroll });
        _tvPatchSaved();
        _waShowToast(it.anchored ? 'Anchored — restyles build around it' : 'Anchor released');
      };

      // Remove a piece from THIS look only — the capsule (and the packing
      // edit) keep it; other days that wear it are untouched.
      window.__tvRemoveFromLook = function(ci) {
        const st = _tvLookState();
        if (!st || !st.s) return;
        const f = st.s.formula || [];
        const keep = f.filter(x => x.item_index !== ci);
        if (keep.length === f.length) return;
        if (keep.length < 2) { _waShowToast('A look needs at least two pieces'); _tvPaintConsole(); return; }
        st.s.formula = keep;
        const it = st.data.capsule[ci];
        const savedId = _tvActiveSaveId;
        const scroll = tvResultPage ? tvResultPage.scrollTop : 0;
        window.__tvRenderResult(st.data, { skipSave: true, savedId });
        if (tvResultPage) tvResultPage.scrollTo({ top: scroll });
        _tvPatchSaved();
        _waShowToast((it ? it.name : 'Piece') + ' removed from this look' + (it && (it.wardrobe_match || it.added) ? ' — still in your case' : ''));
      };

      // Add a piece to THIS look (the Daily rack's + button, travel
      // flavour): the piece joins the capsule as an owned Keep, then this
      // slot's formula, wearing its own wardrobe photo.
      window.__tvAddOwnedToLook = function(id) {
        const data = window.__lastTvData;
        const wi = _waItems.find(i => String(i.id) === String(id));
        if (!wi || !data) return;
        const d = data.days[_tvActiveDay];
        const slot = d && (d.slots || [])[_tvActiveOcc];
        if (!slot) return;
        let ci = data.capsule.findIndex(c => c.wardrobe_match && String(c.wardrobe_match.id) === String(wi.id));
        if (ci === -1) {
          data.capsule.push({
            name: wi.label, tier: 'Foundations & Tailoring', category: wi.category || 'Other', brand: wi.brand || '',
            description: '', reason: 'Added by you', wardrobe_index: -1, retailer_hint: '', price_point: '',
            wardrobe_match: { id: wi.id, label: wi.label, image_url: wi.image_url || null, color: wi.color || '' },
          });
          ci = data.capsule.length - 1;
        }
        if (!Array.isArray(slot.formula)) slot.formula = [];
        if (!slot.formula.some(x => x.item_index === ci)) {
          slot.formula.push({ role: 'The Canvas', item_index: ci, note: '' });
        }
        const savedId = _tvActiveSaveId;
        const scroll = tvResultPage ? tvResultPage.scrollTop : 0;
        window.__tvRenderResult(data, { skipSave: true, savedId });
        if (tvResultPage) tvResultPage.scrollTo({ top: scroll });
        _tvPatchSaved();
        _waShowToast(wi.label + ' added to this look');
      };
      window.__tvAddPieceToLook = function() {
        const st = _tvLookState();
        if (!st || !st.s) return;
        window.__rbcAddMenu('__tvAddOwnedToLook');
      };

      // Pack every capsule piece this look uses
      window.__tvPackLook = function() {
        const st = _tvLookState();
        if (!st || !st.s) return;
        let changed = 0;
        (st.s.formula || []).forEach(f => {
          const it = st.data.capsule[f.item_index];
          if (it && !it.packed) { it.packed = true; changed++; }
        });
        _tvPaintConsole();
        _tvPaintWeek();
        _tvPaintPackProgress();
        _tvPaintEditCards();
        _tvPatchSaved();
        _waShowToast(changed ? 'Look packed — ' + changed + ' piece' + (changed === 1 ? '' : 's') + ' into the case' : 'This look is already packed');
      };

      // Sync every Packed checkbox in The Edit's cards without a re-render
      function _tvPaintEditCards() {
        const data = window.__lastTvData;
        if (!data) return;
        data.capsule.forEach((it, ci) => {
          const btn = document.getElementById('tv-pack-' + ci);
          if (!btn) return;
          const box = btn.querySelector('.tv-pack-box');
          if (box) {
            box.style.border = '1.5px solid ' + (it.packed ? '#202021' : 'rgba(32,32,33,0.3)');
            box.style.background = it.packed ? '#202021' : '#fff';
            box.textContent = it.packed ? '✓' : '';
          }
          const lbl = btn.querySelector('.tv-pack-lbl');
          if (lbl) lbl.textContent = it.packed ? 'Packed' : 'Pack';
          btn.style.color = it.packed ? '#202021' : '#6E6A64';
        });
      }

      window.__tvRenderResult = function(data, opts) {
        // days may be legitimately empty — a deferred trip (edit first,
        // outfits planned later, as she packs).
        if (!data || !Array.isArray(data.capsule) || !data.capsule.length || !Array.isArray(data.days)) {
          _waShowToast('Could not build this trip — please try again');
          return;
        }
        const deferred = !data.days.length;
        _tvStopPolling();
        _tvSelected = null;
        window.__lastTvData = data;
        if (!opts || !opts.skipSave) { _tvActiveDay = 0; _tvActiveOcc = 0; _tvActiveTab = 'edit'; }
        if (_tvActiveDay >= data.days.length) _tvActiveDay = 0;
        const serif = _tvSerif;
        const sans = "-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif";
        const wx = data.weather || null;
        const images = Array.isArray(data.generatedImages) ? data.generatedImages : [];
        const hexOk = h => typeof h === 'string' && /^#[0-9A-Fa-f]{6}$/.test(h);
        const palette = (Array.isArray(data.palette) ? data.palette : []).filter(hexOk).slice(0, 3);

        // The 1:3 matrix — which looks each capsule item appears in.
        // Rebuilt on every render, never persisted.
        const usage = data.capsule.map(() => []);
        data.days.forEach((d, di) => (d.slots || []).forEach((s, si) => {
          const seen = new Set();
          (s.formula || []).forEach(f => {
            if (Number.isInteger(f.item_index) && usage[f.item_index] && !seen.has(f.item_index)) {
              seen.add(f.item_index);
              usage[f.item_index].push([di, si]);
            }
          });
        }));
        data._usage = usage;

        const owned = data.capsule.filter(it => it.wardrobe_match).length;
        const total = data.capsule.length;
        // "Leave behind" is deprecated (beta feedback: cutting her own picks
        // read as illogical without a real packing-restriction engine) —
        // saved entries may still carry left_behind data; it's never rendered.
        const lookCount = data.days.reduce((acc, d) => acc + (d.slots || []).length, 0);

        if (!tvResultPage) {
          tvResultPage = document.createElement('div');
          tvResultPage.id = 'tv-result-page';
          tvResultPage.style.cssText = 'position:fixed;left:0;top:var(--nav-h,60px);right:0;bottom:0;width:100%;z-index:40;background:#FAF8F5;overflow-y:auto;font-family:' + sans;
          document.body.appendChild(tvResultPage);
        }
        let tvStyleEl = document.getElementById('tv-style');
        if (!tvStyleEl) {
          tvStyleEl = document.createElement('style');
          tvStyleEl.id = 'tv-style';
          document.head.appendChild(tvStyleEl);
        }
        tvStyleEl.textContent = _TV_CSS;
        _rbHideResultPages('tv');
        window.__mbCloseResult && window.__mbCloseResult();

        const swapSvg = _tvSwapSvg;
        const checkSvg = _tvCheckSvg;

        // The Edit — Keep / Worth Adding cards (unchanged
        // curatorial section; ids stay tv-cap-${ci} / tv-pack-${ci} so the
        // 1:3 selection, packed checklist and swap keep working).
        const capCard = ({ it, ci }) => {
          const wears = (usage[ci] || []).length;
          const f = _tvFrame(it);
          // Retailer/price goes through the shared helper (audit F4, brief
          // §B.1) — this is the one place the "ZARA · ZARA · €60" bug
          // survived; the card renders brand separately above, so only the
          // deduped retailer+price is needed here, not the full brand+price
          // provenance line _rbcProvenance builds for Rack rows.
          const retailPrice = _rbcRetailPrice(it);
          const badge = it.wardrobe_match
            ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:9.5px;font-weight:500;color:#4A7C59;background:rgba(74,124,89,0.10);border-radius:20px;padding:2px 7px;white-space:nowrap;flex-shrink:0">${checkSvg} Yours</span>`
            : retailPrice
              ? `<span style="font-size:10px;color:var(--ink-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;display:inline-block;vertical-align:bottom">${_waEsc(retailPrice)}</span>`
              : '';
          // Actions pinned to the card's bottom (brief §B.2) — metadata above
          // (brand line, badge row) absorbs height variation instead of
          // pushing the action pair out of baseline alignment with its row
          // neighbours. Badge row no longer wraps to a second line; the
          // retailer/price span shrinks + ellipsizes instead.
          return `<div id="tv-cap-${ci}" onclick="window.__tvSelectItem(${ci})" style="display:flex;flex-direction:column;height:100%;background:#fff;border:0.5px solid var(--rule-mid);border-radius:var(--rad);overflow:hidden;cursor:pointer;transition:opacity .2s,outline-color .2s;outline:2px solid transparent;outline-offset:-2px">
            <div${f.pollAttr} style="position:relative;background:var(--cream-200);overflow:hidden;aspect-ratio:1/1;flex-shrink:0">${f.inner}</div>
            <div style="padding:10px 12px 11px;display:flex;flex-direction:column;flex:1;min-height:0">
              <div style="font-size:12.5px;font-weight:500;color:#202021;line-height:1.35">${_waEsc(it.name)}</div>
              ${it.brand ? `<div style="font-family:${serif};font-style:italic;font-size:12px;color:var(--ink-faint);margin-top:1px">${_waEsc(it.brand)}</div>` : ''}
              <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:7px;flex-wrap:nowrap;min-width:0">
                <span style="display:inline-flex;align-items:center;gap:6px;min-width:0;overflow:hidden">${badge}</span>
                ${wears ? `<span style="font-size:9.5px;font-weight:500;letter-spacing:.08em;color:#8A7B62;background:#F0EAE0;border-radius:20px;padding:2px 8px;white-space:nowrap;flex-shrink:0">× ${wears} looks</span>` : ''}
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto;padding-top:11px">
                ${(it.wardrobe_match || it.added)
                  ? `<button id="tv-pack-${ci}" onclick="event.stopPropagation();window.__tvPackToggle(${ci})" style="display:inline-flex;align-items:center;gap:6px;background:none;border:none;padding:0;cursor:pointer;font-size:9px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:${it.packed ? '#202021' : '#6E6A64'};font-family:${sans}">
                    <span class="tv-pack-box" style="width:15px;height:15px;border-radius:4px;border:1.5px solid ${it.packed ? '#202021' : 'rgba(32,32,33,0.3)'};background:${it.packed ? '#202021' : '#fff'};display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:9px;line-height:1;box-sizing:border-box">${it.packed ? '✓' : ''}</span>
                    <span class="tv-pack-lbl">${it.packed ? 'Packed' : 'Pack'}</span>
                  </button>`
                  : `<button onclick="event.stopPropagation();window.__tvAddOwn(${ci})" style="display:inline-flex;align-items:center;gap:4px;padding:6px 13px;border:none;border-radius:100px;background:#202021;font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;color:#fff;font-family:${sans}"><span style="font-size:13px;line-height:1;margin-top:-1px">+</span> Add</button>`}
                <button onclick="event.stopPropagation();window.__tvSwap(${ci})" style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border:0.5px solid var(--rule-mid);border-radius:100px;background:#fff;font-size:9px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;color:var(--ink-soft);font-family:${sans}">${swapSvg} Swap</button>
              </div>
            </div>
          </div>`;
        };
        const indexed = data.capsule.map((it, ci) => ({ it, ci }));
        const keptCards = indexed.filter(x => x.it.wardrobe_match || x.it.added);
        const addCards = indexed.filter(x => !x.it.wardrobe_match && !x.it.added);
        const sectionHead = (title, sub, count) => `
          <div style="display:flex;align-items:baseline;gap:10px;margin:0 0 4px">
            <span style="font-family:${serif};font-size:20px;font-weight:400;color:#202021">${title}</span>
            <span style="font-size:10.5px;color:var(--ink-faint);letter-spacing:.06em">${count} ${count === 1 ? 'piece' : 'pieces'}</span>
          </div>
          <div style="font-size:11.5px;color:var(--ink-faint);font-style:italic;margin-bottom:12px">${sub}</div>`;
        const tiersHtml = [
          keptCards.length ? `<div style="margin-bottom:28px">
            ${sectionHead('Keep', 'Packed for this trip — each one earns its place.', keptCards.length)}
            <div class="tvm-capgrid">${keptCards.map(capCard).join('')}</div>
          </div>` : '',
          addCards.length ? `<div style="margin-bottom:28px">
            ${sectionHead('Worth adding', 'Genuine gaps only — each new piece must bridge what you already own.', addCards.length)}
            <div class="tvm-capgrid">${addCards.map(capCard).join('')}</div>
          </div>` : '',
        ].join('');

        // The hero editorial shot (frame 0) — generated since day one but
        // orphaned when the day console's "The mood" tile was removed
        // (2026-07-10: sitting per-day, it read as the day's look). It
        // surfaces ONCE at trip level here instead, beside the stylist
        // summary — the per-day confusion can't recur, and the thumbnail +
        // share OG usage stays unchanged. The tile only renders when the
        // frame exists or a live job can still deliver it (data-tvimg="0"
        // lets the poller patch it); an old save with no stored hero simply
        // shows no tile.
        const heroSrc = (Array.isArray(data.generatedImages) && typeof data.generatedImages[0] === 'string' && data.generatedImages[0].indexOf('http') === 0) ? data.generatedImages[0] : null;
        const heroPending = !heroSrc && !!data.jobId;
        const heroHtml = (heroSrc || heroPending) ? `
              <div style="width:200px;flex-shrink:0">
                <div style="font-size:9.5px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--rose);margin-bottom:6px">The mood · ${_waEsc((wx && wx.city) || data.destination || 'the trip')}</div>
                <div${heroSrc ? '' : ' data-tvimg="0"'} style="position:relative;aspect-ratio:3/4;border-radius:var(--rad);overflow:hidden;background:var(--cream-200)">
                  ${heroSrc
                    ? `<img src="${_waEsc(heroSrc)}" style="width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0" alt="">`
                    : `<div class="tv-img-ph" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;animation:kpPhPulse 1.8s ease-in-out infinite"><span style="font-family:${serif};font-style:italic;font-size:12px;color:var(--ink-faint);text-align:center;padding:0 12px">Creating imagery…</span></div>`}
                </div>
              </div>` : '';

        // Weather emoji so the pill reads like the other looks' weather-strip
        const _tvWxEmoji = (() => {
          const c = ((wx && wx.condition) || '').toLowerCase();
          if (/rain|drizzle|shower/.test(c)) return '🌧';
          if (/snow/.test(c)) return '❄️';
          if (/thunder|storm/.test(c)) return '⛈';
          if (/cloud|overcast|fog/.test(c)) return '☁️';
          if (/clear|sun/.test(c)) return '☀️';
          return '🌤';
        })();
        window.rbSetCrumb && window.rbSetCrumb([{ label: 'Travel edit' }]);
        try { tvResultPage.innerHTML = `
          <div class="tvm-wrap">
            <header class="tvm-mast">
              <div style="min-width:0">
                <div class="tvm-eyebrow">${_waEsc(_rbTrackCfg('travel').artifact.eyebrow)}</div>
                <div style="display:flex;align-items:flex-start;gap:10px;min-width:0">
                  <h1 class="tvm-title" id="tv-headline" style="min-width:0;flex:1">${_waEsc(data.headline || ('A trip to ' + (data.destination || 'somewhere lovely') + '.'))}</h1>
                  <button class="rb-rename-tbtn" title="Rename" style="margin-top:6px" onclick="window.__rbRename&&window.__rbRename('tv')"><svg viewBox="0 0 24 24"><path d="M4 20h4L18 10l-4-4L4 16v4z"/><path d="M13 7l4 4"/></svg></button>
                </div>
              </div>
              ${_rbTrackCfg('travel').artifact.hasPackProgress ? `<div class="tvm-progress">
                <span class="tvm-mpcount"><b id="tv-mp-n">0</b><span class="of"> / ${total} packed</span></span>
                <div class="tvm-mpbar"><span id="tv-mp-fill"></span></div>
                <span class="tvm-mplab">${total} pieces · ${deferred ? 'outfits to plan' : lookCount + ' looks'}</span>
              </div>` : ''}
            </header>
            <div class="tvm-meta-row">
              <div class="tvm-wx"><span>${_tvWxEmoji}</span><strong>${_waEsc([wx && wx.city ? wx.city + (wx.country ? ', ' + wx.country : '') : data.destination, data.dateLine].filter(Boolean).join(' · ')) || 'Your trip'}</strong>${wx && wx.tempRange ? `<span class="div"></span><span>${_waEsc(wx.tempRange)}</span>` : ''}${wx && wx.condition ? `<span class="div"></span><span style="font-style:italic">${_waEsc(wx.condition)}${wx.seasonal ? ' · seasonal read' : ''}</span>` : ''}</div>
              ${data.location_vibe ? `<div class="tvm-tag">${_waEsc(data.location_vibe)}</div>` : ''}
            </div>
            ${data.fallback ? `<p style="font-size:12px;color:var(--ink-faint);font-style:italic;margin:12px 0 0">Robes couldn’t quite read the brief, so it’s packed you for a lovely week away instead.</p>` : ''}
            <div class="tvm-rule"></div>

            ${_rbTrackCfg('travel').artifact.hasCapsuleTab ? `<div class="tvm-tabs">
              <button class="tvm-tab" id="tv-tab-edit" onclick="window.__tvSetTab('edit')">
                <span class="tt">01 · The Edit</span>
                <span class="ts">What to pack · ${total} pieces</span>
              </button>
              <button class="tvm-tab" id="tv-tab-outfits" onclick="window.__tvSetTab('outfits')">
                <span class="tt">02 · Outfits</span>
                <span class="ts">${deferred ? 'Not planned yet — plan as you pack' : `Day by day · ${data.days.length} days · ${lookCount} looks`}</span>
              </button>
            </div>` : ''}

            <div id="tv-pane-edit">
              <div style="font-family:${serif};font-weight:300;font-style:italic;font-size:clamp(24px,3vw,34px);color:var(--ink);line-height:1.05;margin-bottom:6px">The edit.</div>
              <div style="display:flex;gap:22px;align-items:flex-start;flex-wrap:wrap;margin-bottom:2px">
                <div style="flex:1;min-width:260px">
                  <div style="font-size:12.5px;color:var(--ink-faint);margin-bottom:8px;line-height:1.5;max-width:900px">${_waEsc(data.stylist_summary || '')}</div>
                  <div id="tv-matrix-note" style="font-size:12px;color:var(--ink-faint);font-style:italic;margin-bottom:18px;min-height:18px">Tap any piece to see how it multiplies across the trip.</div>
                </div>
                ${heroHtml}
              </div>
              ${tiersHtml}
              <button onclick="window.__tvAddPieceToTrip()" style="width:100%;max-width:640px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px dashed var(--rule-mid);border-radius:var(--rad);padding:13px;font-size:12px;letter-spacing:.02em;background:transparent;color:var(--ink-soft);cursor:pointer;font-family:inherit;margin-bottom:16px"><span style="font-size:16px;line-height:1;margin-top:-1px">+</span> Add a piece to this trip</button>
              <div style="margin:4px 0 10px">
                <button class="tvm-crosscta" onclick="${deferred ? 'window.__tvPlanOutfits()' : `window.__tvSetTab('outfits')`}">${deferred ? 'Plan your outfits, day by day →' : 'See your outfits, day by day →'}</button>
              </div>
            </div>

            <div id="tv-pane-outfits" style="display:none">
              ${deferred ? `
              <div style="padding:38px 26px;background:#fff;border:0.5px solid var(--rule-mid);border-radius:var(--rad-lg);text-align:center;max-width:640px">
                <div style="font-size:10px;font-weight:500;letter-spacing:.24em;text-transform:uppercase;color:var(--rose);margin-bottom:10px">Outfits</div>
                <div style="font-family:${serif};font-size:24px;font-weight:300;font-style:italic;color:var(--ink);line-height:1.2;margin-bottom:8px">Plan the days when you’re ready.</div>
                <p style="font-size:13px;line-height:1.65;color:var(--ink-faint);margin:0 0 20px">Your edit is saved — keep gathering and swapping pieces as the trip takes shape. When it’s time to pack, Robes dresses every day from exactly what you’re bringing.</p>
                <button class="tvm-crosscta" onclick="window.__tvPlanOutfits()">Plan my days →</button>
              </div>` : `
              <div class="tvm-weekhead">
                <h2>The ${data.days.length > 6 ? 'trip' : 'week'}${wx && wx.city ? ' in ' + _waEsc(wx.city) : (data.destination ? ' in ' + _waEsc(data.destination) : '')}</h2>
                <span class="hint">Tap a day — the console reads its look, piece by piece.</span>
              </div>
              <div class="rbd-strip" id="tv-weekstrip"></div>
              <div class="tvm-console">
                <div class="tvm-look" id="tv-look-panel"></div>
                <div id="tv-rackwrap"></div>
              </div>`}
            </div>

            <div>${_rbFeedbackBlock('tv', { title: 'How is this edit?', up: '👍 I’d pack it', down: 'Not quite' })}</div>
          </div>`; } catch (e) {
          console.error('[Robes] tvResultPage render error:', e);
          tvResultPage.innerHTML = `<div style="padding:80px 24px;text-align:center;font-family:${sans};color:#6E6A64">Something went wrong rendering this trip — please try again.</div>`;
        }

        _tvPaintWeek();
        _tvPaintConsole();
        window.__tvSetTab(_tvActiveTab);
        tvResultPage.style.display = 'block';
        tvResultPage.scrollTo({ top: 0 });
        _tvPaintPackProgress();

        if (data.jobId) _tvPollImages(data.jobId, data.imageCount || 1);

        // Auto-save (the PRD §6 offline cache — localStorage + lookbook_items).
        // jobId is stripped so a reopened entry never polls a dead job; the
        // computed usage matrix is rebuilt on every render, never stored.
        if (!opts || !opts.skipSave) {
          const persistable = images.map(s => (typeof s === 'string' && s.indexOf('http') === 0) ? s : null);
          const ownedThumb = data.capsule.filter(c => c.wardrobe_match && c.wardrobe_match.image_url)[0];
          const saveCopy = { ...data, jobId: undefined, _usage: undefined, generatedImages: persistable };
          _tvActiveSaveId = snAdd({
            type: 'travel-edit',
            title: data.headline || ('Travel edit — ' + (data.destination || '')),
            subtitle: [data.destination, data.dateLine].filter(Boolean).join(' · ') || 'Travel edit',
            img: persistable[0] || (ownedThumb ? ownedThumb.wardrobe_match.image_url : null),
            tvData: saveCopy,
          });
          _rbTrack('travel_generated', { item: String(_tvActiveSaveId), destination: data.destination || '', pieces: data.capsule.length });
          _pdSync('travel', _tvActiveSaveId, saveCopy);
        } else {
          _tvActiveSaveId = (opts && opts.savedId) || null;
        }

        _rbFeedbackArm('tv', () => ({
          prompt: [data.destination, data.dateLine, data.brief].filter(Boolean).join(' · '),
          looksOutput: JSON.stringify({ surface: 'travel-edit', destination: data.destination || '', trip_label: data.trip_label || '', owned: data.capsule.filter(c => c.wardrobe_match).length, total, packed: data.capsule.filter(c => c.packed).length, looks: lookCount, ts: new Date().toISOString() }),
        }));
      };

      // "+ Add a piece to this trip" — the gather-over-days loop: the
      // wardrobe add flow runs over the result page and the fresh piece
      // joins the capsule as a kept, owned piece.
      window.__tvAddPieceToTrip = function() {
        _waEditId = null;
        _waAfterAdd = function(newId) {
          const wi = _waItems.find(i => String(i.id) === String(newId));
          const data = window.__lastTvData;
          if (!wi || !data || !Array.isArray(data.capsule)) return;
          data.capsule.push({
            name: wi.label, category: wi.category || 'Other', brand: wi.brand || '',
            tier: 'Foundations & Tailoring', description: '', reason: 'Added by you.',
            wardrobe_index: -1, retailer_hint: '', price_point: '',
            wardrobe_match: { id: wi.id, label: wi.label, image_url: wi.image_url || null, color: wi.color || '' },
          });
          const savedId = _tvActiveSaveId;
          const scroll = tvResultPage ? tvResultPage.scrollTop : 0;
          window.__tvRenderResult(data, { skipSave: true, savedId });
          if (tvResultPage) tvResultPage.scrollTo({ top: scroll });
          _tvPatchSaved();
          _waShowToast(wi.label + ' added to the trip');
        };
        if (window.WA && WA.open) WA.open();
      };

      // ── Reactive day restyle (growth PRD — Reactive Personalization) ──
      // The LLM-guessed itinerary is only the baseline: tapping a day's
      // title captures the real plan and surgically re-dresses that day
      // from the capsule already packed.
      window.__tvEditDay = function(di) {
        const data = window.__lastTvData;
        const d = data && data.days[di];
        if (!d) return;
        document.getElementById('tv-day-modal')?.remove();
        const serif = "'Cormorant',Georgia,serif";
        const dayName = (d.day_label || 'Day ' + (di + 1)).split('·')[0].trim();
        const chips = ['Formal wedding', 'Dressy dinner', 'Beach club', 'Boat day', 'City wandering', 'Active / hiking', 'Business day', 'Big night out'];
        const chipsHtml = chips.map(c =>
          `<button onclick="window.__tvDayChip('${_waEsc(c)}')" style="padding:7px 14px;border:0.5px solid rgba(32,32,33,0.16);border-radius:40px;background:#fff;font-size:11.5px;cursor:pointer;color:#202021;font-family:inherit">${_waEsc(c)}</button>`
        ).join('');
        const closeSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        const modal = document.createElement('div');
        modal.id = 'tv-day-modal';
        modal.className = 'tv-sheet-wrap';
        modal.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:24px';
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
        modal.innerHTML = `
          <div class="tv-sheet" style="background:#FAF8F5;border-radius:20px;width:100%;max-width:440px;box-sizing:border-box;box-shadow:0 24px 60px -12px rgba(32,32,33,0.28);padding:24px 24px 28px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:2px">
              <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin:0">${_waEsc(dayName)}</p>
              <button onclick="document.getElementById('tv-day-modal').remove()" style="background:none;border:none;cursor:pointer;padding:2px;color:var(--ink-faint);line-height:1;margin-top:-2px">${closeSvg}</button>
            </div>
            <p style="font-family:${serif};font-size:25px;font-weight:300;color:#202021;margin:0 0 6px;line-height:1.15">What are you actually doing?</p>
            <p style="font-size:12px;color:var(--ink-faint);font-style:italic;margin:0 0 16px">Robes re-mixes the capsule you’ve packed — a new piece only appears if the plan truly needs it.</p>
            <input id="tv-day-input" value="${_waEsc(d.user_activity || '')}" placeholder="Attending a formal sunset wedding reception" style="width:100%;box-sizing:border-box;border:1px solid rgba(32,32,33,0.15);border-radius:var(--rad-sm);padding:12px 13px;font-size:13.5px;color:#202021;background:#fff;outline:none;font-family:inherit;margin-bottom:14px">
            <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:20px">${chipsHtml}</div>
            <button id="tv-day-apply" onclick="window.__tvDayApply(${di})" style="width:100%;padding:14px 24px;border:none;border-radius:40px;background:#202021;font-size:12px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#fff;font-family:inherit">Update day</button>
          </div>`;
        document.body.appendChild(modal);
        setTimeout(() => { const el = document.getElementById('tv-day-input'); if (el) el.focus(); }, 60);
      };

      window.__tvDayChip = function(text) {
        const el = document.getElementById('tv-day-input');
        if (el) { el.value = text; el.focus(); }
      };

      // One surgical day call for both entry points ("✎ The real plan"
      // modal and the one-tap "↻ Restyle this day") — anchored capsule
      // pieces ride along so the server holds them fixed. 75s hard abort.
      async function _tvDayRequest(di, act) {
        const data = window.__lastTvData;
        const out = await _rbDayPost('/api/travel/day', {
          destination: data.destination || '',
          brief: data.brief || '',
          dayIndex: di,
          activity: act,
          weather: data.weather || null,
          name,
          styleDna: _rbStyleDna(), styleIcons: _rbStyleIcons(), gender: _rbGender(),
          capsule: data.capsule.map(c => ({ name: c.name, category: c.category, brand: c.brand, tier: c.tier, owned: !!c.wardrobe_match })),
          anchors: data.capsule.map((c, i) => c.anchored ? { item_index: i, name: c.name } : null).filter(Boolean),
        });
        if (!Array.isArray(out.slots) || !out.slots.length) throw new Error('empty day');
        return out;
      }

      function _tvApplyDayResult(di, out, userActivity) {
        const data = window.__lastTvData;
        const d = data.days[di];
        if (out.new_item) data.capsule.push({ ...out.new_item, wardrobe_match: null });
        data.days[di] = { day_label: out.day_label || d.day_label, user_activity: userActivity || d.user_activity || undefined, slots: out.slots };
        const savedId = _tvActiveSaveId;
        const scroll = tvResultPage ? tvResultPage.scrollTop : 0;
        _tvActiveDay = di;
        _tvActiveOcc = 0;
        window.__tvRenderResult(data, { skipSave: true, savedId });
        if (tvResultPage) tvResultPage.scrollTo({ top: scroll });
        _tvPatchSaved();
        if (userActivity) _rbTrack('day_planned', { source_type: 'travel', day_index: di });
      }

      window.__tvDayApply = async function(di) {
        const data = window.__lastTvData;
        const d = data && data.days[di];
        if (!d) return;
        const act = ((document.getElementById('tv-day-input') || {}).value || '').trim();
        if (!act) { _waShowToast('Tell us the plan first'); return; }
        const btn = document.getElementById('tv-day-apply');
        if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; btn.textContent = 'Restyling the day…'; }
        try {
          const out = await _tvDayRequest(di, act);
          document.getElementById('tv-day-modal')?.remove();
          _tvApplyDayResult(di, out, act);
          _waShowToast(out.new_item ? 'Day restyled — one gap piece joined the capsule' : 'Day restyled from your capsule');
        } catch (e) {
          console.error('[Robes] /api/travel/day error:', e.message);
          if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.textContent = 'Update day'; }
          _waShowToast('Couldn’t restyle the day — please try again');
        }
      };

      // "↻ Restyle this day" — the Daily/Weekly one-tap re-mix: fresh looks
      // for the same plan, anchored pieces held fixed.
      let _tvRestyling = false;
      window.__tvRestyleDay = async function() {
        const data = window.__lastTvData;
        const d = data && data.days[_tvActiveDay];
        if (!d || _tvRestyling) return;
        const di = _tvActiveDay;
        const act = d.user_activity || ((d.day_label || '').split('·')[1] || '').trim() || 'The same plan — a fresh mix of this day';
        _tvRestyling = true;
        const host = document.getElementById('tv-rackwrap');
        if (host) host.style.opacity = '0.5';
        try {
          const out = await _tvDayRequest(di, act);
          // Without a user-typed plan the label must not mutate to the
          // synthetic activity — keep the served one.
          if (!d.user_activity) out.day_label = d.day_label || out.day_label;
          _tvApplyDayResult(di, out, d.user_activity || null);
          _waShowToast(data.capsule.some(c => c.anchored) ? 'Day restyled around your anchors' : 'Day restyled from your capsule');
        } catch (e) {
          console.error('[Robes] /api/travel/day error:', e.message);
          _waShowToast('Robes couldn’t restyle that day — please try again.');
        } finally {
          _tvRestyling = false;
          const h = document.getElementById('tv-rackwrap');
          if (h) h.style.opacity = '';
        }
      };

      // Masthead progress (x / N packed + bar) and the payoff-bar mirror.
      function _tvPaintPackProgress() {
        const data = window.__lastTvData;
        if (!data || !Array.isArray(data.capsule)) return;
        const packedN = data.capsule.filter(it => it.packed).length;
        const totalN = data.capsule.length;
        const n = document.getElementById('tv-mp-n');
        const bar = document.getElementById('tv-mp-fill');
        const pm = document.getElementById('tv-pm-count');
        if (n) n.textContent = packedN;
        if (bar) bar.style.width = (totalN ? Math.round((packedN / totalN) * 100) : 0) + '%';
        if (pm) pm.textContent = totalN > 0 && packedN === totalN
          ? 'Suitcase closed'
          : packedN + ' of ' + totalN;
      }

      // The "Packed It" checkbox (growth PRD epic 3). The toggle now lives in
      // three surfaces (day-console rack, The Edit cards, day-strip status),
      // so the paint helpers sync them all; page scroll and the 1:3
      // selection survive because nothing re-renders the whole page.
      // Packing a curated (unowned) piece is the conversion moment: she owns
      // it in the real world, so invite the record.
      window.__tvPackToggle = function(ci) {
        const data = window.__lastTvData;
        const it = data && data.capsule[ci];
        if (!it) return;
        it.packed = !it.packed;
        _tvPaintEditCards();
        _tvPaintConsole();
        _tvPaintWeek();
        _tvPaintPackProgress();
        _tvPatchSaved();
      };

      // "Add" on a Worth-adding piece → it joins the pack (moves into Keep,
      // Pack checkbox appears) WITHOUT touching the wardrobe — she doesn't
      // own it yet, she's just decided to bring it (beta feedback: the old
      // auto-wardrobe-insert wrongly assumed ownership). She can still record
      // it for real later via the swap modal's "Snap mine". _tvShowOwnPrompt /
      // __tvOwnSnap / __tvQuickOwn are kept for that conversion path.
      // Also writes silently to wishlist_items (Build 1, amended 2026-07-22)
      // — invisible plumbing, not a second confirmation. Confirmation stays
      // trip-scoped ("added to the pack"), never "Saved to your wishlist."
      window.__tvAddOwn = function(ci) {
        const data = window.__lastTvData;
        const it = data && data.capsule[ci];
        if (!it || it.added) return;
        it.added = true;
        const savedId = _tvActiveSaveId;
        const scroll = tvResultPage ? tvResultPage.scrollTop : 0;
        window.__tvRenderResult(data, { skipSave: true, savedId });
        if (tvResultPage) tvResultPage.scrollTo({ top: scroll });
        _tvPatchSaved();
        _waShowToast(it.name + ' added to the pack');
        _wlSaveFromItem(it, { silent: true }).then(() => _tvPatchSaved());
      };
      function _tvShowOwnPrompt(ci) {
        const data = window.__lastTvData;
        const it = data && data.capsule[ci];
        if (!it) return;
        document.getElementById('tv-own-modal')?.remove();
        const serif = "'Cormorant',Georgia,serif";
        const modal = document.createElement('div');
        modal.id = 'tv-own-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:24px';
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
        modal.innerHTML = `
          <div style="background:#FAF8F5;border-radius:20px;width:100%;max-width:420px;box-sizing:border-box;box-shadow:0 24px 60px -12px rgba(32,32,33,0.28);padding:28px 26px;text-align:center">
            <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin:0 0 8px">Add to wardrobe</p>
            <p style="font-family:${serif};font-size:25px;font-weight:300;color:#202021;margin:0 0 8px;line-height:1.2">Add the ${_waEsc(it.name)}?</p>
            <p style="font-size:12.5px;color:#6E6A64;line-height:1.65;margin:0 0 20px">It moves into <em>Keep</em> and joins your wardrobe — ready to pack, and every future look can style it.</p>
            <div style="display:flex;flex-direction:column;gap:9px">
              <button onclick="window.__tvOwnSnap(${ci})" style="width:100%;padding:13px 20px;border:none;border-radius:100px;background:#202021;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#fff;font-family:inherit">📷 Snap it now</button>
              <button onclick="window.__tvQuickOwn(${ci})" style="width:100%;padding:13px 20px;border:1px solid rgba(32,32,33,0.18);border-radius:100px;background:#fff;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#202021;font-family:inherit">Add without a photo</button>
              <button onclick="document.getElementById('tv-own-modal').remove()" style="background:none;border:none;padding:6px;cursor:pointer;font-size:11px;color:var(--ink-faint);text-decoration:underline;text-underline-offset:3px;font-family:inherit">Not now</button>
            </div>
          </div>`;
        document.body.appendChild(modal);
      }

      window.__tvOwnSnap = function(ci) {
        document.getElementById('tv-own-modal')?.remove();
        _waAfterAdd = (newId) => window.__tvSwapApply(ci, newId);
        _waEditId = null;
        if (window.WA && WA.open) WA.open();
      };

      // Zero-friction capture: the curated piece becomes a real
      // wardrobe_items row from the capsule's own metadata — photo can
      // follow later via the wardrobe edit flow.
      window.__tvQuickOwn = async function(ci) {
        const data = window.__lastTvData;
        const it = data && data.capsule[ci];
        if (!it) return;
        document.getElementById('tv-own-modal')?.remove();
        try {
          const created = await _waFetch('POST', 'wardrobe_items', {
            user_id: _waUid(),
            label: it.name,
            category: it.category === 'Swim' ? 'Swimwear' : (it.category || 'Other'),
            color: null,
            brand: it.brand || null,
            notes: 'Packed for ' + (data.destination || 'a trip') + ' — add a photo when you can.',
            image_url: null,
            item_dna: { display: { title: it.name }, ai_generated_notes: it.description || '' },
          });
          const newId = Array.isArray(created) && created[0] ? created[0].id : null;
          if (newId == null) throw new Error('no id returned');
          await _waLoad();
          it.wardrobe_match = { id: newId, label: it.name, image_url: null, color: '' };
          it.retailer_hint = '';
          it.price_point = '';
          const savedId = _tvActiveSaveId;
          const scroll = tvResultPage ? tvResultPage.scrollTop : 0;
          window.__tvRenderResult(data, { skipSave: true, savedId });
          if (tvResultPage) tvResultPage.scrollTo({ top: scroll });
          _tvPatchSaved();
          _waShowToast(it.name + ' added to your wardrobe');
        } catch (e) {
          console.warn('[robes] quick-own failed:', e);
          _waShowToast('Couldn’t add it — try again');
        }
      };

      // The Interactive Multiplier (PRD §5) — tapping an item maps its
      // versatility: the looks it appears in and the pieces it pairs with.
      window.__tvSelectItem = function(ci) {
        const data = window.__lastTvData;
        if (!data || !data.capsule[ci]) return;
        _tvSelected = _tvSelected === ci ? null : ci;
        const sel = _tvSelected;
        const usage = data._usage || [];
        const related = new Set();
        if (sel != null) {
          (usage[sel] || []).forEach(u => {
            (((data.days[u[0]] || {}).slots || [])[u[1]] || { formula: [] }).formula.forEach(f => related.add(f.item_index));
          });
        }
        data.capsule.forEach((it, i) => {
          const el = document.getElementById('tv-cap-' + i);
          if (!el) return;
          if (sel == null) { el.style.opacity = '1'; el.style.outlineColor = 'transparent'; }
          else if (i === sel) { el.style.opacity = '1'; el.style.outlineColor = '#202021'; }
          else if (related.has(i)) { el.style.opacity = '1'; el.style.outlineColor = '#C9BCA6'; }
          else { el.style.opacity = '.3'; el.style.outlineColor = 'transparent'; }
        });
        data.days.forEach((d, di) => (d.slots || []).forEach((s, si) => {
          const el = document.getElementById('tv-slot-' + di + '-' + si);
          if (!el) return;
          const active = sel != null && (usage[sel] || []).some(u => u[0] === di && u[1] === si);
          if (sel == null) { el.style.opacity = '1'; el.style.outlineColor = 'transparent'; }
          else if (active) { el.style.opacity = '1'; el.style.outlineColor = '#202021'; }
          else { el.style.opacity = '.3'; el.style.outlineColor = 'transparent'; }
        }));
        const noteEl = document.getElementById('tv-matrix-note');
        if (noteEl) {
          if (sel == null) {
            noteEl.innerHTML = 'Tap any piece to see how it multiplies across the week.';
          } else {
            const labels = (usage[sel] || []).map(u => {
              const day = data.days[u[0]] || {};
              const slot = ((day.slots || [])[u[1]]) || {};
              return _waEsc(((day.day_label || 'Day ' + (u[0] + 1)).split('·')[0] || '').trim() + ' ' + (slot.slot === 'Evening' ? 'evening' : 'day'));
            });
            noteEl.innerHTML = `<strong style="color:#202021;font-style:normal">${_waEsc(data.capsule[sel].name)}</strong> earns ${labels.length} wear${labels.length === 1 ? '' : 's'}${labels.length ? ' — ' + labels.join(', ') : ''} · <button onclick="window.__tvSelectItem(${sel})" style="background:none;border:none;padding:0;cursor:pointer;font-size:12px;color:var(--ink-faint);text-decoration:underline;text-underline-offset:2px;font-family:inherit;font-style:italic">clear</button>`;
          }
        }
      };

      // ── Travel Edit swap — same PRD 3.B pattern as daily look/moodboard ──
      window.__tvSnapMine = function() {
        const idx = _tvSwapIdx;
        _waAfterAdd = (newId) => window.__tvSwapApply(idx, newId);
        _waEditId = null;
        document.getElementById('tv-swap-modal')?.remove();
        if (window.WA && WA.open) WA.open();
      };

      // Capsule-level swap (Edit tab): a MEMBERSHIP change — the piece's
      // identity changes everywhere it's worn. Never silently regenerates:
      // __tvSwapApply reports how many days wear the slot and offers ONE
      // batched restyle (Phase 4 §4.2).
      window.__tvSwap = function(idx) {
        const item = window.__lastTvData && window.__lastTvData.capsule[idx];
        if (!item) return;
        _tvSwapIdx = idx;
        _rbSwapModal(item, { id: 'tv-swap-modal', applyName: '__tvSwapApply', snapName: '__tvSnapMine', idx });
      };

      // Day-console swap (Phase 4): candidates are the CASE — other capsule
      // members in the slot re-point this day's formula; the rest of her
      // wardrobe appears as the adoption section (joins the case, restyles
      // this day only).
      window.__tvDaySwap = function(ci) {
        const data = window.__lastTvData;
        const item = data && data.capsule[ci];
        if (!item) return;
        const pool = _tvCapsulePool(data, ci)
          .filter(k => k !== ci)
          .map(k => {
            const c = data.capsule[k];
            return {
              id: k, wid: c.wardrobe_match ? c.wardrobe_match.id : null,
              label: c.name, category: c.category || item.category || '',
              image_url: (c.wardrobe_match && c.wardrobe_match.image_url) || null,
            };
          });
        _rbSwapModal(item, {
          id: 'tv-swap-modal', idx: ci,
          applyName: '__tvDaySwapApply', snapName: '__tvSnapMine',
          pool,
          adopt: {
            applyName: '__tvAdoptApply',
            // never offer the slot's own piece for adoption
            exclude: item.wardrobe_match ? [item.wardrobe_match.id] : [],
          },
        });
      };
      window.__tvDaySwapApply = function(ci, poolId) {
        const target = Number(poolId);
        if (!Number.isInteger(target) || target === ci) { document.getElementById('tv-swap-modal')?.remove(); return; }
        if (!_tvRepointDay(ci, target)) return;
        _rbTrack('piece_swapped', { surface: 'travel-day', item: String(target) });
        document.getElementById('tv-swap-modal')?.remove();
        _tvDayRerender(target);
        const c = window.__lastTvData.capsule[target];
        _waShowToast((c ? c.name : 'That piece') + ' takes this slot today');
      };
      // Adoption: an out-of-capsule wardrobe piece joins the case (membership
      // + counters + pack progress) and restyles the CURRENT day only.
      window.__tvAdoptApply = function(ci, wardrobeId) {
        const data = window.__lastTvData;
        const wi = _waItems.find(i => String(i.id) === String(wardrobeId));
        const old = data && data.capsule[ci];
        if (!data || !wi || !old) return;
        data.capsule.push({
          name: wi.label, category: wi.category || old.category || '', brand: wi.brand || '',
          tier: old.tier || 'Foundations & Tailoring',
          reason: 'Adopted from your wardrobe mid-trip',
          wardrobe_index: -1,
          wardrobe_match: { id: wi.id, label: wi.label, image_url: wi.image_url || null, color: wi.color || '' },
          retailer_hint: '', price_point: '',
        });
        const newCi = data.capsule.length - 1;
        _tvRepointDay(ci, newCi);
        _rbTrack('capsule_adopted', { from: 'console' });
        document.getElementById('tv-swap-modal')?.remove();
        _tvDayRerender(newCi);
        _waShowToast(wi.label + ' joins the case — today wears it');
      };

      // The one batched restyle after a membership swap: re-mixes every day
      // from the updated case in ONE /api/travel/outfits call, keeping her
      // per-day plans.
      var _tvStaleDays = 0;
      window.__tvRestyleAllDays = function() {
        const data = window.__lastTvData;
        if (!data || !Array.isArray(data.capsule) || !data.capsule.length) return;
        document.getElementById('tv-stale-bar')?.remove();
        _rbTrack('capsule_swap_restyle', { days_affected: _tvStaleDays });
        window.__tvOutfitsGo((data.days || []).map(d => d.rest ? null : (d.user_activity || '')));
      };

      window.__tvSwapApply = function(idx, wardrobeId) {
        _rbTrack('piece_swapped', { surface: 'travel', item: String(wardrobeId) });
        const wi = _waItems.find(i => i.id === wardrobeId);
        const item = window.__lastTvData && window.__lastTvData.capsule[idx];
        if (!wi || !item) return;
        item.wardrobe_match = { id: wi.id, label: wi.label, image_url: wi.image_url || null, color: wi.color || '' };
        item.name = wi.label;
        item.brand = wi.brand || '';
        item.retailer_hint = '';
        item.price_point = '';
        document.getElementById('tv-swap-modal')?.remove();
        // Capsule items are shared references — re-render picks up the swap
        // everywhere (capsule card, lookbook chips, 4-step details).
        const savedId = _tvActiveSaveId;
        const scroll = tvResultPage ? tvResultPage.scrollTop : 0;
        window.__tvRenderResult(window.__lastTvData, { skipSave: true, savedId });
        if (tvResultPage) tvResultPage.scrollTo({ top: scroll });
        _tvPatchSaved();
        window.__rbcAnimateTile(idx);
        _waShowToast(wi.label + ' packed instead');
        // Membership changed — report the blast radius and offer ONE
        // batched restyle instead of silently regenerating N days
        // (Phase 4 §4.2). COPY: needs sign-off
        const affected = (window.__lastTvData.days || []).filter(d => !d.rest && (d.slots || []).some(s => (s.formula || []).some(f => f.item_index === idx))).length;
        if (affected > 0) {
          _tvStaleDays = affected;
          const pane = document.getElementById('tv-pane-edit');
          if (pane) {
            document.getElementById('tv-stale-bar')?.remove();
            const bar = document.createElement('div');
            bar.id = 'tv-stale-bar';
            bar.className = '';
            bar.style.cssText = 'display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:#F5F0E8;border:0.5px solid rgba(32,32,33,0.1);border-radius:10px;padding:10px 14px;margin:0 0 16px;font-size:12px;color:#6E6A64';
            bar.innerHTML = `<span><b>${_waEsc(wi.label)}</b> now packs — ${affected} day${affected === 1 ? '' : 's'} wear this slot.</span>` +
              `<button onclick="window.__tvRestyleAllDays()" style="margin-left:auto;background:#202021;color:#fff;border:none;border-radius:100px;padding:8px 16px;font-size:10px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;font-family:inherit">↻ Restyle those days</button>` +
              `<button onclick="document.getElementById('tv-stale-bar').remove()" aria-label="Dismiss" style="background:none;border:none;color:var(--ink-faint);font-size:15px;cursor:pointer;padding:2px">×</button>`;
            pane.insertBefore(bar, pane.firstChild);
          }
        }
      };

      // The moodboard's "Pack this trip" CTA feeds the real Travel Edit —
      // the board's mood becomes the brief (the bundle's mock pack-sheet
      // is bypassed entirely).
      if (window.App && App.packFromBoard) {
        App.packFromBoard = function() {
          const t = document.getElementById('mb-out-title');
          const boardTitle = t && t.textContent ? t.textContent.trim() : '';
          // The whole board travels (beta feedback): owned pieces pre-select
          // in the shortlist browser (→ Keep), unowned pieces ride along as
          // suggestedItems (→ Worth Adding on the server).
          const look = Array.isArray(window.__mbCurrentLook) ? window.__mbCurrentLook : [];
          const anchors = look.filter(i => i && i.wardrobe_match && i.wardrobe_match.id != null).map(i => i.wardrobe_match.id);
          const suggested = look.filter(i => i && !i.wardrobe_match && i.name).map(i => ({
            name: i.name, category: i.category || '', brand: i.brand || '',
            retailer_hint: i.retailer_hint || '', price_point: i.price_point || '',
          }));
          window.__tvOpen({
            brief: boardTitle ? 'Channel the mood of my “' + boardTitle + '” board.' : '',
            anchors,
            suggested,
          });
        };
      }

      // ── Real share flow (moodboards + lookbook) ──────────────────────
      // Replaces the bundle's mock share-sheet: the saved entry is flipped
      // is_public + given a share_id (owner-JWT PATCH, RLS enforced), and the
      // permanent public page lives at /board/<share_id>. The modal mirrors
      // byrobes.com's "Can we share your look?" — IG handle capture + copy link.
      // Reconstruct a lookbook-shaped entry from a surface's live render data,
      // so a visible result can always be shared even if its auto-save id was
      // lost (e.g. a cloud-pull rewrote the local cache).
      function _shareBuild(kind, data) {
        data = data || {};
        if (kind === 'moodboard') {
          const { mb_job_id, jobId, ...rest } = data;
          const grid = (data.grid_images || []).filter(g => g && typeof g.url === 'string' && g.url.indexOf('http') === 0);
          const hero = (typeof data.hero_image === 'string' && data.hero_image.indexOf('http') === 0) ? data.hero_image : null;
          return { ...rest, type: 'moodboard', title: data.title || 'Moodboard', subtitle: data.location_context || '', img: hero || (grid[0] && grid[0].url) || null, hero_image: hero, grid_images: grid };
        }
        if (kind === 'travel-edit') {
          return { type: 'travel-edit', title: data.destination || data.title || 'Travel edit', subtitle: '', img: null, tvData: data };
        }
        if (kind === 'weekly-plan') {
          return { type: 'weekly-plan', title: data.headline || 'Weekly plan', subtitle: '', img: null, wkData: data };
        }
        if (kind === 'daily-look') {
          return { type: 'daily-look', title: data.occasion || 'Daily look', subtitle: '', img: null, dlData: data };
        }
        const gi = (data.generatedImages || []).filter(s => typeof s === 'string' && s.indexOf('http') === 0);
        return { type: 'key-piece', title: (data.ways && data.ways[0] && data.ways[0].title) || 'Your look', subtitle: 'Worn three ways', img: gi[0] || data.photoUrl || null, kpData: { ways: data.ways, fallback: data.fallback, photoUrl: data.photoUrl, generatedImages: gi, intent: data.intent, context: data.context } };
      }

      // Find the saved entry for a visible surface; if the id is missing or the
      // local cache dropped it, lazily mint / thinly rebuild one so share never
      // dead-ends with "style something first".
      function _shareFindOrMake(id, kind, data) {
        const store = kind === 'moodboard' ? _mbLoad() : snLoad();
        if (id) {
          const found = store.find(i => i.id === id);
          if (found) return found;
          // The row was cloud-pushed under this id but is absent locally — a
          // thin entry keyed by id lets the DB PATCH still target it.
          return data ? { id, ..._shareBuild(kind, data) } : { id };
        }
        if (!data) return null;
        const entry = _shareBuild(kind, data);
        const newId = kind === 'moodboard' ? _mbAdd(entry) : snAdd(entry);
        if (kind === 'moodboard') { const p = document.getElementById('moodboard-panel'); if (p) p._savedId = newId; }
        else if (kind === 'key-piece') _kpActiveSaveId = newId;
        else if (kind === 'daily-look') _dlActiveSaveId = newId;
        else if (kind === 'travel-edit') _tvActiveSaveId = newId;
        else if (kind === 'weekly-plan') _wkActiveSaveId = newId;
        return store.find(x => x.id === newId) || { ...entry, id: newId };
      }

      // ── Shared rename for the lookbook result surfaces (key piece /
      // travel edit). Renames the saved entry (+ cloud via snUpdate) and
      // updates the live headline/footer meta. Moodboard keeps its own
      // bundle rename sheet (App.openRename → patched App.saveRename).
      window.__rbRename = function(kind) {
        let id = null, cur = '', applyLive = null;
        if (kind === 'tv') {
          id = _tvActiveSaveId;
          cur = (window.__lastTvData && window.__lastTvData.headline) || '';
          applyLive = (v) => {
            const h = document.getElementById('tv-headline'); if (h) h.textContent = v;
            if (window.__lastTvData) window.__lastTvData.headline = v;
          };
        } else if (kind === 'kp') {
          id = _kpActiveSaveId;
          const saved = id && snLoad().find(x => x.id === id);
          cur = (saved && saved.title) || (window.__lastKpData && window.__lastKpData.headline) || '';
          applyLive = (v) => {
            const h = document.getElementById('kp-headline'); if (h) h.textContent = v;
            if (window.__lastKpData) window.__lastKpData.headline = v;
          };
        } else if (kind === 'dl') {
          id = _dlActiveSaveId;
          cur = (window.__lastDlData && window.__lastDlData.headline) || '';
          applyLive = (v) => {
            const h = document.querySelector('#dl-result-page .dlm-title'); if (h) h.textContent = v;
            if (window.__lastDlData) window.__lastDlData.headline = v;
          };
        } else if (kind === 'wk') {
          id = _wkActiveSaveId;
          cur = (window.__lastWkData && window.__lastWkData.headline) || '';
          applyLive = (v) => {
            const h = document.getElementById('wk-headline'); if (h) h.textContent = v;
            if (window.__lastWkData) window.__lastWkData.headline = v;
          };
        } else return;
        if (!id) { _waShowToast('Save it first, then you can rename it'); return; }

        document.getElementById('rb-rename-modal')?.remove();
        const serif = "'Cormorant',Georgia,serif";
        const closeSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        const modal = document.createElement('div');
        modal.id = 'rb-rename-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:960;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:24px';
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
        modal.innerHTML = `
          <div style="background:#FAF8F5;border-radius:20px;width:100%;max-width:420px;box-sizing:border-box;box-shadow:0 24px 60px -12px rgba(32,32,33,0.28);padding:24px 24px 26px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:2px">
              <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin:0">Rename</p>
              <button onclick="document.getElementById('rb-rename-modal').remove()" style="background:none;border:none;cursor:pointer;padding:2px;color:var(--ink-faint);line-height:1;margin-top:-2px">${closeSvg}</button>
            </div>
            <p style="font-family:${serif};font-size:25px;font-weight:300;font-style:italic;color:#202021;margin:0 0 16px;line-height:1.15">Give it a name.</p>
            <input id="rb-rename-input" value="${_waEsc(cur)}" placeholder="A name you’ll recognise" style="width:100%;box-sizing:border-box;border:0.5px solid rgba(32,32,33,0.18);border-radius:var(--rad-sm);padding:12px 13px;font-size:14px;color:#202021;background:#fff;outline:none;font-family:inherit;margin-bottom:16px">
            <button onclick="window.__rbRenameSave()" style="width:100%;padding:13px 20px;border:none;border-radius:100px;background:#202021;font-size:12px;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;color:#fff;font-family:inherit">Save name</button>
          </div>`;
        document.body.appendChild(modal);
        setTimeout(() => { const el = document.getElementById('rb-rename-input'); if (el) { el.focus(); el.select(); el.onkeydown = e => { if (e.key === 'Enter') window.__rbRenameSave(); }; } }, 60);
        window.__rbRenameSave = function() {
          const v = ((document.getElementById('rb-rename-input') || {}).value || '').trim();
          if (!v) { _waShowToast('Type a name first'); return; }
          // Persist the name into the saved entry's render data (its headline)
          // as well as the card title, so a reopen shows the rename on the
          // result page too — not just in the lookbook grid.
          const patch = { title: v };
          const saved = snLoad().find(x => x.id === id);
          if (saved) {
            if (kind === 'kp' && saved.kpData) patch.kpData = { ...saved.kpData, headline: v };
            else if (kind === 'dl' && saved.dlData) patch.dlData = { ...saved.dlData, headline: v };
            else if (kind === 'tv' && saved.tvData) patch.tvData = { ...saved.tvData, headline: v };
            else if (kind === 'wk' && saved.wkData) patch.wkData = { ...saved.wkData, headline: v };
          }
          snUpdate(id, patch);
          if (applyLive) applyLive(v);
          document.getElementById('rb-rename-modal')?.remove();
          _waShowToast('Renamed to “' + v + '”');
        };
      };

      function _shareActiveEntry() {
        const panel = document.getElementById('moodboard-panel');
        if (panel && panel.classList.contains('visible')) {
          return _shareFindOrMake(panel._savedId, 'moodboard', panel._currentData);
        }
        if (tvResultPage && tvResultPage.style.display !== 'none') {
          return _shareFindOrMake(_tvActiveSaveId, 'travel-edit', window.__lastTvData);
        }
        if (wkResultPage && wkResultPage.style.display !== 'none') {
          return _shareFindOrMake(_wkActiveSaveId, 'weekly-plan', window.__lastWkData);
        }
        if (dlResultPage && dlResultPage.style.display !== 'none') {
          return _shareFindOrMake(_dlActiveSaveId, 'daily-look', window.__lastDlData);
        }
        if (kpResultPage && kpResultPage.style.display !== 'none') {
          return _shareFindOrMake(_kpActiveSaveId, 'key-piece', window.__lastKpData);
        }
        return null;
      }

      function _shareMarkLocal(id, sid) {
        const sn = snLoad(); const a = sn.find(i => i.id === id);
        if (a) { a.share_id = sid; a.is_public = true; snSave(sn); return; }
        const mb = _mbLoad(); const b = mb.find(i => i.id === id);
        if (b) { b.share_id = sid; b.is_public = true; _mbSave(mb); }
      }

      async function _shareEnsurePublic(entry) {
        if (entry.share_id) return entry.share_id;
        const sid = Array.from(crypto.getRandomValues(new Uint8Array(5))).map(b => b.toString(16).padStart(2, '0')).join('');
        const q = 'lookbook_items?id=eq.' + entry.id + '&user_id=eq.' + _waUid();
        let rows = await _waFetch('PATCH', q, { share_id: sid, is_public: true });
        if (!rows || !rows.length) {
          // Row hasn't reached the cloud yet (fresh save / offline) — push and retry once
          _lbCloudPush(entry);
          await new Promise(r => setTimeout(r, 1200));
          rows = await _waFetch('PATCH', q, { share_id: sid, is_public: true });
          if (!rows || !rows.length) throw new Error('share row missing');
        }
        _shareMarkLocal(entry.id, sid);
        entry.share_id = sid;
        _rbTrack('share_created', { item: String(entry.id), share_id: sid });
        return sid;
      }

      window.__rbShare = async function() {
        const entry = _shareActiveEntry();
        document.getElementById('rb-share-modal')?.remove();
        if (!entry) { _waShowToast('Style something first — then share it'); return; }

        const modal = document.createElement('div');
        modal.id = 'rb-share-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:960;background:rgba(32,32,33,0.5);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:24px';
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
        const thumb = entry.img
          ? `<img src="${_waEsc(entry.img)}" style="width:52px;height:64px;object-fit:cover;border-radius:var(--rad-sm);flex:none" alt="">`
          : `<div style="width:52px;height:64px;border-radius:var(--rad-sm);background:#EDE8E0;flex:none"></div>`;
        modal.innerHTML = `
          <div style="position:relative;background:#FAF8F5;border-radius:var(--rad-lg);width:100%;max-width:440px;padding:34px 32px 30px;box-shadow:0 24px 60px -12px rgba(32,32,33,0.3)">
            <button onclick="document.getElementById('rb-share-modal').remove()" style="position:absolute;top:14px;right:14px;width:32px;height:32px;background:none;border:none;cursor:pointer;color:var(--ink-faint);font-size:20px;line-height:1">×</button>
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
              ${thumb}
              <div><p style="font-size:9px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin:0 0 4px">Share</p>
              <p style="font-family:'Cormorant',Georgia,serif;font-size:19px;font-weight:300;color:#202021;margin:0;line-height:1.2">${_waEsc(entry.title || 'Your look')}</p></div>
            </div>
            <h3 style="font-family:'Cormorant',Georgia,serif;font-size:27px;font-weight:300;color:#202021;margin:0 0 8px;line-height:1.1">Can we share your look?</h3>
            <p style="font-size:12.5px;color:var(--ink-faint);line-height:1.6;margin:0 0 18px">Add your Instagram handle and we’ll tag you when we showcase this week’s best looks.</p>
            <div style="display:flex;align-items:center;gap:8px;border:1px solid rgba(32,32,33,0.15);border-radius:10px;padding:12px 14px;background:#fff;margin-bottom:12px">
              <span style="color:var(--ink-faint);font-size:14px">@</span>
              <input id="rb-share-ig" type="text" placeholder="yourhandle" autocomplete="off" style="flex:1;min-width:0;border:none;outline:none;background:none;font-size:16px;font-family:inherit;color:#202021">
            </div>
            <button id="rb-share-go" style="width:100%;padding:15px;background:#202021;color:#FAF8F5;border:none;border-radius:10px;font-size:11px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;margin-bottom:14px">Share my look</button>
            <div id="rb-share-copyrow" style="display:flex;align-items:center;gap:10px;border:0.5px solid rgba(32,32,33,0.12);border-radius:10px;padding:11px 14px;background:rgba(32,32,33,0.03);cursor:pointer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A89880" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              <span id="rb-share-url" style="flex:1;min-width:0;font-size:12px;color:#6E6A64;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Preparing your link…</span>
              <button id="rb-share-copy" style="background:none;border:none;cursor:pointer;font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#202021" disabled>Copy</button>
            </div>
            <p id="rb-share-note" style="font-size:11px;color:var(--ink-faint);text-align:center;margin:12px 0 0">Anyone with the link can view this look — no account details are shown.</p>
          </div>`;
        document.body.appendChild(modal);

        const igInput = modal.querySelector('#rb-share-ig');
        const prof = window.__robes_profile || {};
        if (prof.instagram_handle) igInput.value = prof.instagram_handle;

        let shareUrl = null;
        try {
          const sid = await _shareEnsurePublic(entry);
          shareUrl = window.location.origin + '/board/' + sid;
          const u = modal.querySelector('#rb-share-url');
          if (u) u.textContent = shareUrl.replace(/^https?:\/\//, '');
          const cp = modal.querySelector('#rb-share-copy');
          if (cp) cp.disabled = false;
        } catch (e) {
          console.warn('[robes] share publish failed:', String(e.message || e).slice(0, 140));
          const u = modal.querySelector('#rb-share-url');
          if (u) u.textContent = 'Couldn’t publish this look — try again shortly';
        }

        function saveHandle() {
          const clean = igInput.value.trim().replace(/^@+/, '');
          if (!clean) return;
          if (prof.instagram_handle !== clean) {
            prof.instagram_handle = clean;
            _waFetch('PATCH', 'profiles?id=eq.' + _waUid(), { instagram_handle: clean }).catch(() => {});
            const email = (window.__robes_session && window.__robes_session.user && window.__robes_session.user.email) || '';
            fetch('/api/instagram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, handle: clean }) }).catch(() => {});
          }
        }

        const copyLink = () => {
          if (!shareUrl) return;
          (navigator.clipboard ? navigator.clipboard.writeText(shareUrl) : Promise.reject()).then(
            () => _waShowToast('Link copied'),
            () => { try { window.prompt('Copy your link', shareUrl); } catch (e) {} }
          );
        };
        modal.querySelector('#rb-share-copyrow').onclick = () => { saveHandle(); copyLink(); };
        modal.querySelector('#rb-share-go').onclick = async () => {
          saveHandle();
          if (!shareUrl) { _waShowToast('Link isn’t ready yet'); return; }
          if (navigator.share) {
            try { await navigator.share({ title: (entry.title || 'My look') + ' — styled by Robes', url: shareUrl }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
          }
          copyLink();
        };
      };

      // Every bundle Share button (moodboard, key-piece, daily look views)
      // runs through the real flow instead of the mock sheet.
      if (window.App && App.openShare) {
        App.openShare = function() { window.__rbShare(); };
      }

      // "+New" from a board view-switches UNDER the fixed panel — close the
      // board (and the list page) first so the concierge is actually visible.
      if (window.App && App.chooseInspire) {
        const _origChooseInspire = App.chooseInspire.bind(App);
        App.chooseInspire = function() {
          const panel = document.getElementById('moodboard-panel');
          if (panel && panel.classList.contains('visible')) window.__mbCloseResult && window.__mbCloseResult();
          window.__mbCloseList && window.__mbCloseList();
          return _origChooseInspire.apply(this, arguments);
        };
      }

      // Bundle's saveRename only rewrites the DOM title — persist it into the
      // live board data + the saved entry, refresh the crumb and the URL.
      if (window.App && App.saveRename) {
        const _origSaveRename = App.saveRename.bind(App);
        App.saveRename = function() {
          const input = document.getElementById('rename-input');
          const v = input && input.value ? input.value.trim() : '';
          _origSaveRename.apply(this, arguments);
          if (!v) return;
          const panel = document.getElementById('moodboard-panel');
          if (!panel || !panel.classList.contains('visible') || !panel._currentData) return;
          panel._currentData.title = v;
          if (panel._savedId) _mbUpdate(panel._savedId, { title: v });
          if (window._mbOpenedFromList) {
            window.rbSetCrumb && window.rbSetCrumb([
              { label: 'Your Moodboards', action: function() { window.__mbCloseResult(); window._mbOpenedFromList = false; if (window._mbShowAllPage) window._mbShowAllPage(); } },
              { label: v },
            ]);
          } else {
            window.rbSetCrumb && window.rbSetCrumb([{ label: v }]);
          }
          window._rbNav && window._rbNav('/moodboard/' + _mbSlug(v));
        };
      }

      // ── Legacy snOnPieceResult removed — auto-save + feedback now in __kpRenderResult ──
      function snOnPieceResult() {
        // no-op — kept to avoid errors if called from old MutationObserver path
        return;

        // Auto-save once, inside the wired guard
        const pieceName = document.querySelector('#pyp-name');
        const kpData = window.__lastKpData;
        // Use photoUrl (a small Cloudinary URL) as thumbnail — never store base64 images in localStorage
        const thumbImg = (kpData && kpData.photoUrl) || null;
        // Strip generatedImages before saving — each is ~500KB and blows localStorage quota
        const kpDataToSave = kpData ? { ways: kpData.ways, fallback: kpData.fallback, photoUrl: kpData.photoUrl } : null;
        snAdd({
          type: 'key-piece',
          title: pieceName ? pieceName.textContent.trim() : 'Key piece',
          subtitle: 'Worn three ways · ' + new Date().toLocaleDateString('en-GB', { weekday: 'long' }),
          img: thumbImg,
          kpData: kpDataToSave,
        });
        actionsEl.innerHTML = `
          <div id="sn-fb" style="width:100%;background:rgba(32,32,33,0.03);border-radius:var(--rad);padding:28px 24px;text-align:center;margin-bottom:8px">
            <div style="font-family:'Cormorant',Georgia,serif;font-size:20px;font-weight:300;color:#202021;margin-bottom:6px">How were these looks?</div>
            <div id="sn-fb-prompt">
              <div style="font-size:12px;color:var(--ink-faint);margin-bottom:18px;font-style:italic">Tell us — your taste shapes what comes next.</div>
              <div style="display:flex;gap:10px;justify-content:center">
                <button id="sn-fb-up" onclick="window.__snFbRate(1)" style="display:flex;align-items:center;gap:8px;padding:10px 22px;border:1px solid rgba(32,32,33,0.15);border-radius:40px;background:#fff;font-size:12px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#202021;transition:all .15s">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"></path><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                  Loved them
                </button>
                <button id="sn-fb-dn" onclick="window.__snFbRate(0)" style="display:flex;align-items:center;gap:8px;padding:10px 22px;border:1px solid rgba(32,32,33,0.15);border-radius:40px;background:#fff;font-size:12px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#202021;transition:all .15s">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"></path><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>
                  Not quite
                </button>
              </div>
            </div>
            <div id="sn-fb-expand" hidden style="margin-top:16px">
              <textarea id="sn-fb-text" placeholder="What would have made them better?" rows="3" style="width:100%;border:1px solid rgba(32,32,33,0.15);border-radius:var(--rad-sm);padding:12px 14px;font-size:13px;color:#202021;resize:none;outline:none;box-sizing:border-box;font-family:inherit"></textarea>
              <button onclick="window.__snFbSubmit()" style="margin-top:10px;padding:10px 28px;background:#202021;color:#fff;border:none;border-radius:40px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer">Send feedback</button>
            </div>
            <div id="sn-fb-done" hidden style="font-size:13px;color:#7E7C5A;margin-top:12px">Thank you — noted.</div>
          </div>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="mb-btn" onclick="App.openShare()"><svg viewBox="0 0 24 24"><polygon points="3 3 21 12 3 21 3 3"></polygon><line x1="3" y1="12" x2="21" y2="12"></line></svg>Share my look</button>
            <button class="mb-btn mb-btn-primary" onclick="KP.openKeyPiece ? KP.openKeyPiece() : App.chooseInspire()"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="5 12 12 5 19 12"></polyline></svg>Style another</button>
          </div>`;

        let snFbRating = null;
        window.__snFbRate = function(val) {
          snFbRating = val;
          document.getElementById('sn-fb-up').style.background = val === 1 ? '#F0EDE8' : '#fff';
          document.getElementById('sn-fb-dn').style.background = val === 0 ? '#F0EDE8' : '#fff';
          document.getElementById('sn-fb-expand').hidden = false;
          document.getElementById('sn-fb-done').hidden = true;
          setTimeout(() => { const t = document.getElementById('sn-fb-text'); if (t) t.focus(); }, 60);
        };
        window.__snFbSubmit = function() {
          const comment = (document.getElementById('sn-fb-text').value || '').trim();
          fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: (window.__robes_session && window.__robes_session.user && window.__robes_session.user.email) || '',
              rating: snFbRating,
              comment,
              prompt: document.getElementById('kp-input') ? document.getElementById('kp-input').value : '',
            }),
          }).catch(() => {});
          _rbFbCloud('look', null, snFbRating, comment);
          document.getElementById('sn-fb-prompt').hidden = true;
          document.getElementById('sn-fb-expand').hidden = true;
          document.getElementById('sn-fb-done').hidden = false;
        };
      }

      // "Wear this today" on the look bar — auto-save + feedback
      function snOnLookResult() {
        const titleEl = document.querySelector('#gd-hero-title');
        const imgEl = document.querySelector('#look-board img');
        snAdd({
          type: 'look',
          title: titleEl ? titleEl.textContent.trim() : "Today's look",
          subtitle: new Date().toLocaleDateString('en-GB', { weekday: 'long' }) + ' · Today',
          img: imgEl ? imgEl.src : null,
        });
        _waShowToast('Look saved to your style notes');
      }

      // Watch piece-panel element directly for class changes
      const snPanelObserver = new MutationObserver(() => {
        const piecePanel = document.getElementById('piece-panel');
        if (piecePanel && piecePanel.classList.contains('visible')) snOnPieceResult();
      });
      setTimeout(() => {
        const piecePanel = document.getElementById('piece-panel');
        if (piecePanel) snPanelObserver.observe(piecePanel, { attributes: true, attributeFilter: ['class'] });
      }, 600);

      // "Wear this today" — delegated click
      document.addEventListener('click', function(e) {
        const btn = e.target.closest('.lb-btn.lb-primary');
        if (btn) snOnLookResult();
      }, true);

      // Render the row on load (in case there are already saved items)
      snRefreshRow();

      // ── v2 Dashboard Layout ──────────────────────────────────────────
      // Inject CSS matching the Claude Design system from the uploaded prototype
      (function _rbInjectStyles() {
        if (document.getElementById('rb-v2-styles')) return;
        const s = document.createElement('style');
        s.id = 'rb-v2-styles';
        s.textContent = `
          /* Tokens come from /css/tokens.css — do not redeclare here. */

          .rb-section { margin-bottom: 52px; }
          .rb-sec-head { display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px; }
          .rb-sec-ey { font-size:10px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint); }
          .rb-sec-meta { font-size:11px;color:var(--ink-faint);letter-spacing:.03em; }
          .rb-sec-link { background:none;border:none;cursor:pointer;font-size:11px;color:var(--ink-faint);letter-spacing:.04em;padding:0;text-decoration:underline;text-underline-offset:3px; }
          .rb-sec-h { font-family:'Cormorant',Georgia,serif;font-weight:300;font-size:clamp(22px,2.6vw,28px);color:var(--ink);line-height:1.15;margin:0 0 16px; }
          .rb-sec-h em { font-style:italic; }

          /* ES card — shared art+body layout (matches .es-card in uploaded design) */
          .rb-es-card { display:flex;width:100%;text-align:left;cursor:pointer;overflow:hidden;
            border:0.5px solid var(--rule-mid);border-radius:var(--rad-card);background:#fff;
            transition:border-color .22s,box-shadow .22s; }
          .rb-es-card:hover { border-color:rgba(32,32,33,0.2);box-shadow:0 22px 54px -30px rgba(32,32,33,0.24); }
          .rb-es-art { flex:1 1 46%;min-width:0;min-height:248px;padding:20px;display:grid;gap:10px;
            background:linear-gradient(150deg,var(--cream-100),var(--cream)); }

          /* Moodboard art: 2-col grid, hero spans 2 rows */
          .rb-es-art-board { grid-template-columns:1.35fr 1fr;grid-template-rows:1fr 1fr; }
          .rb-es-art-board .rb-esb { border-radius:9px;border:0.5px solid var(--rule); }
          .rb-es-art-board .rb-esb-hero { grid-row:1 / span 2;background:var(--mauve); }
          .rb-es-art-board .rb-esb-2 { background:var(--sage-mid); }
          .rb-es-art-board .rb-esb-3 { background:var(--rose-mid); }

          /* Style-notes art: 3 staggered frames */
          .rb-es-art-ways { grid-template-columns:repeat(3,1fr);align-items:start; }
          .rb-es-frame { border-radius:9px;border:0.5px solid var(--rule);aspect-ratio:3/4;padding:13px; }
          .rb-es-frame.f1 { background:var(--rose-bg); }
          .rb-es-frame.f2 { background:var(--sage-bg);margin-top:18px; }
          .rb-es-frame.f3 { background:var(--rose-mid);margin-top:36px; }
          .rb-es-frame-num { font-family:'Cormorant',Georgia,serif;font-weight:300;font-size:23px;line-height:1;color:rgba(32,32,33,0.46); }

          /* ES body (text panel) */
          .rb-es-body { flex:1 1 54%;min-width:0;padding:38px 42px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center; }
          .rb-es-eyebrow { font-size:10px;font-weight:500;letter-spacing:.24em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:16px; }
          .rb-es-eyebrow.sage { color:#616F5C; }
          .rb-es-h { font-family:'Cormorant',Georgia,serif;font-weight:400;font-size:33px;line-height:1.04;color:var(--ink);margin:0; }
          .rb-es-h em { font-style:italic;color:var(--ink-soft); }
          .rb-es-sub { font-size:13.5px;line-height:1.62;color:var(--ink-soft);margin-top:14px;max-width:38ch; }
          .rb-es-cta { margin-top:26px;display:inline-flex;align-items:center;gap:9px;padding:12px 22px;
            border-radius:100px;background:var(--ink);color:var(--cream);font-size:11px;font-weight:500;
            letter-spacing:.16em;text-transform:uppercase;border:none;cursor:pointer;
            transition:opacity .18s,transform .18s; }
          .rb-es-card:hover .rb-es-cta { opacity:.9;transform:translateY(-1px); }
          .rb-es-cta svg { width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round; }

          /* Populated: moodboard 4-up grid (2×2) */
          .rb-mb-grid { display:grid;grid-template-columns:1fr 1fr;gap:16px; }
          .rb-mb-card { cursor:pointer;border-radius:var(--rad-card);overflow:hidden;background:#fff;border:0.5px solid var(--rule);transition:border-color .2s,box-shadow .2s; }
          .rb-mb-card:hover { border-color:rgba(32,32,33,0.2);box-shadow:0 12px 32px -16px rgba(32,32,33,0.18); }
          .rb-mb-imgs { display:grid;grid-template-columns:1.35fr 1fr;grid-template-rows:1fr 1fr;gap:3px;min-height:200px;background:var(--cream-100); }
          .rb-mb-img-main { grid-row:1/3;width:100%;height:100%;object-fit:cover;display:block; }
          .rb-mb-img-ph-main { grid-row:1/3;background:var(--mauve); }
          .rb-mb-img-ph-sm { background:var(--sage-mid); }
          .rb-mb-img-ph-sm:nth-child(3) { background:var(--rose-mid); }
          .rb-mb-foot { padding:14px 16px 16px;position:relative; }
          .rb-mb-foot-title { font-family:'Cormorant',Georgia,serif;font-weight:300;font-size:16px;color:var(--ink);line-height:1.25;margin-bottom:3px; }
          .rb-mb-foot-meta { font-size:10px;color:var(--ink-faint);letter-spacing:.02em; }
          .rb-mb-new { position:absolute;top:14px;right:16px;font-size:9px;font-weight:600;letter-spacing:.14em;color:var(--ink-faint);text-transform:uppercase; }

          /* Populated: style notes 4-up grid */
          .rb-sn-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:12px; }
          .rb-sn-card { cursor:pointer;border-radius:10px;overflow:hidden;background:#fff;border:0.5px solid var(--rule);transition:border-color .2s; }
          .rb-sn-card:hover { border-color:rgba(32,32,33,0.2); }
          .rb-sn-img { width:100%;aspect-ratio:3/4;object-fit:cover;display:block; }
          .rb-sn-img-ph { aspect-ratio:3/4;background:var(--cream-100); }
          .rb-sn-body { padding:11px 13px 13px; }
          .rb-sn-type { font-size:9px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:4px; }
          .rb-sn-title { font-family:'Cormorant',Georgia,serif;font-weight:300;font-size:15px;color:var(--ink);line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
          .rb-sn-meta { font-size:10px;color:var(--ink-faint);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }

          /* Daily outfit lock — matches .lock-pill in uploaded design */
          .rb-lock-pill { display:inline-flex;align-items:center;gap:5px;padding:5px 10px;
            background:rgba(250,248,245,0.88);backdrop-filter:blur(4px);
            border-radius:20px;font-size:9.5px;font-weight:500;letter-spacing:.1em;
            text-transform:uppercase;color:#6E6A64;border:0.5px solid rgba(32,32,33,0.12); }
          .rb-lock-pill svg { width:10px;height:10px;stroke:currentColor;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round; }
          .rb-lock-wrap { position:absolute;top:10px;left:12px;z-index:2;pointer-events:none; }

          @media(max-width:760px){
            .rb-es-card { flex-direction:column; }
            .rb-es-art { flex-basis:auto;min-height:210px; }
            .rb-es-body { padding:28px 26px 32px; }
            .rb-sn-grid { grid-template-columns:repeat(2,1fr); }
            .rb-mb-grid { grid-template-columns:1fr; }
          }
          #mb-result-page .mb-main-grid { grid-template-columns:1fr !important; }
          @media(max-width:860px){
            #mb-result-page .mb-two-col { grid-template-columns:1fr !important; }
            #mb-result-page .mb-sidebar { position:static !important; }
          }
          /* Rail: prevent bundle clipping the swap buttons */
          #mb-rail-pieces { overflow:visible !important; }
          .mb-sidebar { overflow:visible !important; }
          .mb-rail { overflow:visible !important; }
        `;
        document.head.appendChild(s);
      })();

      // ── Global breadcrumb system ──────────────────────────────────────
      // Renders ROBES / Parent / Current in the nav, replacing the bundle's
      // single back-button with independently clickable segments.
      (function _rbInitBreadcrumb() {
        // Suppress bundle's single back-button permanently
        const bundleCrumb = document.getElementById('nav-breadcrumb');
        if (bundleCrumb) bundleCrumb.style.display = 'none';

        // Inject our container into nav-l after the wordmark
        const navL = document.querySelector('.nav-l');
        if (!navL) return;
        const sep = ' / '; // " / "
        const container = document.createElement('span');
        container.id = 'rb-crumb';
        container.style.cssText = 'display:none;align-items:center;font-size:12px;font-family:var(--font-sans,inherit);letter-spacing:.01em;gap:0';
        navL.appendChild(container);

        // Ensure wordmark always routes home
        const wm = document.getElementById('nav-wordmark');
        if (wm) wm.onclick = function() {
          window.rbClearCrumb();
          window.__mbCloseResult && window.__mbCloseResult();
          window.__mbCloseList && window.__mbCloseList();
          window.__snClose && window.__snClose();
          if (kpResultPage) kpResultPage.style.display = 'none';
          if (dlResultPage) dlResultPage.style.display = 'none';
          if (tvResultPage) tvResultPage.style.display = 'none';
          if (wkResultPage) wkResultPage.style.display = 'none';
          const wp = document.querySelector('.wardrobe-panel');
          if (wp && wp.classList.contains('visible')) {
            // Bundle's showWardrobe does a view-switch (hides main content).
            // Click the nav wardrobe toggle to properly reverse it.
            const wbtnCount = document.querySelector('.nav-wbtn-count');
            const wbtn = wbtnCount ? wbtnCount.closest('button') : null;
            if (wbtn) { wbtn.click(); } else { wp.classList.remove('visible'); }
            // The toggle tracks its own state — when the panel was opened
            // programmatically (direct /wardrobe load) the click can no-op.
            // If the panel survived the toggle, hard-route to the dashboard.
            if (wp.classList.contains('visible')) { window.location.assign('/dashboard'); return; }
          }
          if (window.location.pathname !== '/dashboard') window._rbNav && window._rbNav('/dashboard');
          // Always land back on the dashboard home view
          if (window.App && App.goHome) { try { App.goHome(); } catch (e) {} }
          window.scrollTo(0, 0);
        };

        window.rbSetCrumb = function(segments) {
          // segments: [{label, action}] — last item has no action (current page)
          container.style.display = 'inline-flex';
          container.innerHTML = segments.map(function(seg, i) {
            const isLast = i === segments.length - 1;
            const sepHtml = `<span style="color:rgba(32,32,33,0.3);margin:0 1px">${sep}</span>`;
            const labelHtml = isLast
              ? `<span style="color:rgba(32,32,33,0.4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px" title="${seg.label.replace(/"/g,'&quot;')}">${seg.label}</span>`
              : `<button onclick="(${seg.action.toString()})()" style="background:none;border:none;padding:0;cursor:pointer;font-size:12px;font-family:inherit;color:rgba(32,32,33,0.65);white-space:nowrap;transition:color .15s" onmouseenter="this.style.color='#202021'" onmouseleave="this.style.color='rgba(32,32,33,0.65)'">${seg.label}</button>`;
            return sepHtml + labelHtml;
          }).join('');
        };

        window.rbClearCrumb = function() {
          container.style.display = 'none';
          container.innerHTML = '';
          const wm = document.getElementById('nav-wordmark');
          if (wm) wm.style.display = '';
        };
      })();

      // ── Nav architecture v2 (2026-07): anchored destinations ──────────
      // Desktop: Wardrobe + Lookbook sit inline beside the wordmark (ink
      // underline = you are here; the wordmark carries Home). Mobile: a
      // fixed bottom dock carries the same three destinations, and detail
      // overlays swap the wordmark line for a "‹ Lookbook" back pill.
      // Detail screens keep their parent (Lookbook) lit — every result
      // page is a saved lookbook entry. The breadcrumb and the old
      // "Wardrobe · N" pill are retired in CSS only: rbSetCrumb still runs
      // (hidden), and the pill stays in the DOM because the panel-close
      // paths click it programmatically.
      (function _rbNavArch() {
        function _wardrobeOpen() {
          const wp = document.querySelector('.wardrobe-panel');
          return !!(wp && wp.classList.contains('visible'));
        }
        function _detailOpen() {
          return [kpResultPage, dlResultPage, tvResultPage, wkResultPage]
            .some(function(p) { return p && p.style.display !== 'none'; });
        }
        function _closeOverlays() {
          window.__mbCloseResult && window.__mbCloseResult();
          window.__mbCloseList && window.__mbCloseList();
          if (kpResultPage) kpResultPage.style.display = 'none';
          if (dlResultPage) dlResultPage.style.display = 'none';
          if (tvResultPage) tvResultPage.style.display = 'none';
          if (wkResultPage) wkResultPage.style.display = 'none';
          const snEl = document.getElementById('sn-page');
          if (snEl) snEl.style.display = 'none';
        }
        function _closeWardrobe() {
          const wp = document.querySelector('.wardrobe-panel');
          if (wp && wp.classList.contains('visible')) {
            // App.showWardrobe never toggles closed (verified: repeat calls
            // keep .visible) — goHome is the one call that reverses the
            // bundle's view-switch cleanly without a hard navigation.
            if (window.App && App.goHome) { try { App.goHome(); } catch (e) {} }
            if (wp.classList.contains('visible')) wp.classList.remove('visible');
          }
        }
        window.__rbNavGo = function(dest) {
          if (dest === 'home') {
            const wm = document.getElementById('nav-wordmark');
            if (wm && wm.onclick) wm.onclick();
          } else if (dest === 'back' || dest === 'lookbook') {
            // Back climbs to the list the detail lives in — the Lookbook.
            _closeOverlays();
            _closeWardrobe(); // its patched open would re-hide sn-page, so close first
            window.__snOpen && window.__snOpen();
          } else if (dest === 'wardrobe') {
            _closeOverlays();
            if (!_wardrobeOpen() && window.App && App.showWardrobe) App.showWardrobe();
            if (window.__waSetView) window.__waSetView('all');
          }
          _rbNavSync();
        };
        const tnW = document.getElementById('rb-tn-wardrobe');
        const tnL = document.getElementById('rb-tn-lookbook');
        const dkH = document.getElementById('rb-dock-home');
        const dkW = document.getElementById('rb-dock-wardrobe');
        const dkL = document.getElementById('rb-dock-lookbook');
        const backPill = document.getElementById('rb-backpill');
        function _rbNavSync() {
          const snEl = document.getElementById('sn-page');
          const snOpen = !!(snEl && snEl.style.display === 'block');
          const wOpen = _wardrobeOpen();
          const detail = _detailOpen();
          const active = wOpen ? 'wardrobe' : (snOpen || detail) ? 'lookbook' : 'home';
          if (tnW) tnW.classList.toggle('active', active === 'wardrobe');
          if (tnL) tnL.classList.toggle('active', active === 'lookbook');
          if (dkH) dkH.classList.toggle('active', active === 'home');
          if (dkW) dkW.classList.toggle('active', active === 'wardrobe');
          if (dkL) dkL.classList.toggle('active', active === 'lookbook');
          // Mobile detail screens: the back pill replaces the wordmark line,
          // and Share rises into the header (the footer copy hides ≤640px).
          const showPill = detail && window.matchMedia('(max-width:767px)').matches;
          if (backPill) backPill.style.display = showPill ? 'inline-flex' : 'none';
          const shareBtn = document.getElementById('rb-share-btn');
          if (shareBtn) {
            // The console surfaces (Daily/Weekly/Travel) carry their own
            // "Share this look" button inside The Look, so the mobile nav
            // share icon is redundant there — drop it and let the in-Look
            // action own sharing. Key-piece has no console Share, so it keeps
            // the nav icon.
            const consoleShare = [dlResultPage, wkResultPage, tvResultPage].some(p => p && p.style.display !== 'none');
            shareBtn.style.display = (showPill && !consoleShare) ? 'inline-flex' : 'none';
          }
          const wm = document.getElementById('nav-wordmark');
          if (wm) {
            if (showPill) wm.style.setProperty('display', 'none', 'important');
            // The wardrobe observer owns the wordmark while the panel is
            // open (force-inline defence) — leave it alone in that state.
            else if (!wOpen && wm.style.getPropertyValue('display') === 'none') wm.style.removeProperty('display');
          }
          // The nav weather pill shows her CURRENT city, geolocated — over a
          // live trip it reads as wrong even though it isn't (audit
          // C-Weather/§3.3). Suppress it only while a real trip result is on
          // screen; removeProperty lets the pill's own responsive rules
          // (incl. its <768px media query) resume the moment it's gone.
          const wxEl = document.getElementById('nav-weather');
          if (wxEl) {
            const tvOpen = !!(tvResultPage && tvResultPage.style.display !== 'none' && window.__lastTvData && window.__lastTvData.destination);
            if (tvOpen) wxEl.style.setProperty('display', 'none');
            else if (wxEl.style.display === 'none') wxEl.style.removeProperty('display');
          }
        }
        window._rbNavSync = _rbNavSync;
        _rbNavSync();
        // Poll — views open/close through many independent paths (chips,
        // popstate, observers, bundle toggles); a cheap visibility poll is
        // the one hook that covers them all (same idiom as _waInit).
        setInterval(_rbNavSync, 350);
        window.addEventListener('resize', _rbNavSync);
      })();

      // Patch App.setSubtab to wire breadcrumbs for subtab sub-panels
      (function _rbPatchSubtabs() {
        function _tryPatch() {
          if (!window.App || !App.setSubtab) return false;
          const _origSetSubtab = App.setSubtab.bind(App);
          App.setSubtab = function(tab) {
            _origSetSubtab(tab);
            if (tab === 'today') {
              window.rbSetCrumb && window.rbSetCrumb([
                { label: 'Recent looks', action: function() { App.setSubtab('today'); } },
                { label: 'Your look' }
              ]);
            } else if (tab === 'trip') {
              window.rbSetCrumb && window.rbSetCrumb([{ label: 'Pack a trip' }]);
            } else if (tab === 'week') {
              window.rbSetCrumb && window.rbSetCrumb([{ label: 'Plan the week' }]);
            } else {
              window.rbClearCrumb && window.rbClearCrumb();
            }
          };
          return true;
        }
        if (!_tryPatch()) {
          const t = setInterval(function() { if (_tryPatch()) clearInterval(t); }, 250);
        }
      })();

      function _rbTimeAgo(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        const mins = Math.floor((Date.now() - d) / 60000);
        if (mins < 2) return 'Just now';
        if (mins < 60) return mins + 'm ago';
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return hrs === 1 ? '1 hour ago' : hrs + ' hours ago';
        const days = Math.floor(hrs / 24);
        if (days === 1) return 'Yesterday';
        if (days < 7) return days + ' days ago';
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      }

      // MutationObserver: set crumb whenever wardrobe panel becomes visible
      (function _rbObserveWardrobe() {
        function _tryObserve() {
          const panel = document.querySelector('.wardrobe-panel');
          if (!panel) return false;
          let _wmObserver = null;
          function _rbForceWordmark() {
            const wm = document.getElementById('nav-wordmark');
            if (!wm) return;
            wm.style.setProperty('display', 'inline', 'important');
            if (!_wmObserver) {
              _wmObserver = new MutationObserver(function() {
                if (panel.classList.contains('visible')) {
                  wm.style.setProperty('display', 'inline', 'important');
                }
              });
              _wmObserver.observe(wm, { attributes: true, attributeFilter: ['style'] });
            }
          }
          new MutationObserver(function(mutations) {
            mutations.forEach(function(m) {
              if (m.type === 'attributes' && m.attributeName === 'class') {
                if (panel.classList.contains('visible')) {
                  setTimeout(_rbForceWordmark, 50);
                  setTimeout(_rbForceWordmark, 200);
                  window.rbSetCrumb && window.rbSetCrumb([{ label: 'Wardrobe' }]);
                  window._rbNav && window._rbNav('/wardrobe');
                } else {
                  if (_wmObserver) { _wmObserver.disconnect(); _wmObserver = null; }
                  const wm = document.getElementById('nav-wordmark');
                  if (wm) wm.style.removeProperty('display');
                  window.rbClearCrumb && window.rbClearCrumb();
                  // A closed panel always reopens on "All pieces"
                  _waView = 'all';
                  const _wpPath = window.location.pathname;
                  if (_wpPath === '/wardrobe' || _wpPath === '/wishlist') window._rbNav && window._rbNav('/dashboard');
                }
              }
            });
          }).observe(panel, { attributes: true, attributeFilter: ['class'] });
          return true;
        }
        if (!_tryObserve()) {
          const t = setInterval(function() { if (_tryObserve()) clearInterval(t); }, 300);
        }
      })();

      function _rbRenderMoodboards() {
        const el = document.getElementById('rb-mb');
        if (_RB_MB_HIDDEN) { if (el) el.remove(); return; }
        if (!el) return;
        const items = _mbLoad().slice(0, 4);
        const arrowSvg = `<svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
        if (!items.length) {
          // The first-run empty card only belongs on a genuinely empty page.
          // A styled key piece already saved to the lookbook is real, high-value
          // content — its presence alone suppresses this prompt, so the row
          // simply doesn't paint until she has a moodboard of her own.
          if (snLoad().length > 0) { el.style.display = 'none'; el.innerHTML = ''; return; }
          el.style.display = '';
          el.innerHTML = `
            <div class="rb-sec-head">
              <span class="rb-sec-ey">Moodboards for you</span>
            </div>
            <button class="rb-es-card" onclick="window.__rbStartMoodboard()">
              <div class="rb-es-art rb-es-art-board" aria-hidden="true">
                <div class="rb-esb rb-esb-hero"></div>
                <div class="rb-esb rb-esb-2"></div>
                <div class="rb-esb rb-esb-3"></div>
              </div>
              <div class="rb-es-body">
                <h3 class="rb-es-h">Create your first<br><em>moodboard.</em></h3>
                <p class="rb-es-sub">Describe a trip, a season, or a piece you love. Robes builds the board — and pulls in what you already own.</p>
                <span class="rb-es-cta">Start a moodboard${arrowSvg}</span>
              </div>
            </button>`;
          return;
        }
        el.style.display = '';
        el.innerHTML = `
          <div class="rb-sec-head">
            <span class="rb-sec-ey">Moodboards for you</span>
            <button class="rb-sec-link" onclick="window.__mbOpenList()">View all</button>
          </div>
          <h2 class="rb-sec-h">Dress the season,<br><em>before you dress the day.</em></h2>
          <div class="rb-mb-grid">
            ${items.map(item => `
              <div class="rb-mb-card" onclick="window.__mbOpenSaved(${item.id})">
                <div class="rb-mb-imgs">
                  ${item.img
                    ? `<img src="${_waEsc(item.img)}" class="rb-mb-img-main" alt="">`
                    : '<div class="rb-mb-img-ph-main"></div>'}
                  <div class="rb-mb-img-ph-sm"></div>
                  <div class="rb-mb-img-ph-sm"></div>
                </div>
                <div class="rb-mb-foot">
                  <div class="rb-mb-foot-title">${_waEsc(item.title)}</div>
                  <div class="rb-mb-foot-meta">${_rbTimeAgo(item.saved_at)}</div>
                  ${!item.saved_at || (Date.now() - new Date(item.saved_at)) < 86400000 ? '<div class="rb-mb-new">New</div>' : ''}
                </div>
              </div>`).join('')}
          </div>`;
      }

      function _rbRenderStyleNotes() {
        const el = document.getElementById('rb-sn');
        if (!el) return;
        const items = snLoad().slice(0, 4);
        const arrowSvg = `<svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
        if (!items.length) {
          el.innerHTML = `
            <div class="rb-sec-head">
              <span class="rb-sec-ey">Lookbook</span>
              <span class="rb-sec-meta">A little gift to begin</span>
            </div>
            <button class="rb-es-card" onclick="window.KP && KP.openKeyPiece ? KP.openKeyPiece() : void 0">
              <div class="rb-es-art rb-es-art-ways" aria-hidden="true">
                <div class="rb-es-frame f1"><span class="rb-es-frame-num">01</span></div>
                <div class="rb-es-frame f2"><span class="rb-es-frame-num">02</span></div>
                <div class="rb-es-frame f3"><span class="rb-es-frame-num">03</span></div>
              </div>
              <div class="rb-es-body">
                <span class="rb-es-eyebrow sage">Style a piece</span>
                <h3 class="rb-es-h">Your piece,<br><em>worn three ways.</em></h3>
                <p class="rb-es-sub">Show Robes one piece you love. You'll get three ways to wear it — none of them the obvious one, each styled around your wardrobe.</p>
                <span class="rb-es-cta">Style a key piece${arrowSvg}</span>
              </div>
            </button>`;
          return;
        }
        el.innerHTML = `
          <div class="rb-sec-head">
            <span class="rb-sec-ey">Lookbook</span>
            <button class="rb-sec-link" onclick="window.__snOpen()">View all</button>
          </div>
          <div class="rb-sn-grid">
            ${items.map(item => `
              <div class="rb-sn-card" onclick="window.__snOpenItem(${item.id})">
                ${item.img
                  ? `<img src="${_waEsc(item.img)}" class="rb-sn-img" alt="">`
                  : '<div class="rb-sn-img-ph"></div>'}
                <div class="rb-sn-body">
                  <div class="rb-sn-type">${_snTypeLabel(item.type)}</div>
                  <div class="rb-sn-title">${_waEsc(item.title)}</div>
                  <div class="rb-sn-meta">${_waEsc(item.subtitle || '')}</div>
                </div>
              </div>`).join('')}
          </div>`;
      }

      function _rbUpdateDailyOutfitLock() {
        const grid = document.querySelector('.services-grid');
        if (!grid) return;
        const dailyCard = grid.querySelector('.svc-daily') || grid.querySelector('.svc');
        if (!dailyCard) return;
        const svcImg = dailyCard.querySelector('.svc-img');
        const svcCta = dailyCard.querySelector('.svc-cta');
        if (!svcImg) return;
        const growing = _waItems.length < _WA_TARGET;

        // Progress pill in the image area — informational, never a lock:
        // the Daily Look works from day one (fully editorial on an empty
        // closet, hybrid while growing, closet-first at 15).
        let pill = svcImg.querySelector('.rb-lock-wrap');
        if (growing) {
          if (!pill) {
            pill = document.createElement('div');
            pill.className = 'rb-lock-wrap';
            svcImg.appendChild(pill);
          }
          // No trailing count fraction — "n/15" reads as an item limit
          // (learning-meter reframe 2026-07-29).
          pill.innerHTML = `<span class="rb-lock-pill">✦ ${Math.max(1, _WA_TARGET - _waItems.length)} more pieces and every look is closet-only</span>`;
        } else if (pill) {
          pill.remove();
        }

        if (svcCta) {
          svcCta.classList.remove('svc-cta-locked');
          svcCta.innerHTML = `Style today<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
        }
        dailyCard.onclick = () => { if (typeof _cbSetIntent === 'function') _cbSetIntent('dress-me'); };

        // Chip is always live — clear any legacy count badge
        const dressChip = document.getElementById('chip-dress');
        if (dressChip) {
          dressChip.style.opacity = '1';
          const countSpan = dressChip.querySelector('span');
          if (countSpan) countSpan.remove();
        }
      }

      // ── Moodboard system ─────────────────────────────────────────────

      // Storage (localStorage, mirrors snLoad pattern but keyed separately, per user)
      function MB_KEY() { const u = _waUid(); return u ? 'robes_moodboards__' + u : null; }
      // /moodboard/[name] slug — populated boards get their own URL
      function _mbSlug(t) {
        return String(t || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'board';
      }
      window._mbFindBySlug = function(slug) {
        return _mbLoad().find(i => _mbSlug(i.title) === slug);
      };
      function _mbLoad() { const k = MB_KEY(); if (!k) return []; try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } }
      function _mbSave(items) {
        const k = MB_KEY(); if (!k) return;
        try { localStorage.setItem(k, JSON.stringify(items)); }
        catch (e) { if (items.length > 1) _mbSave(items.slice(0, items.length - 1)); }
      }
      function _mbAdd(item) {
        const items = _mbLoad();
        const rec = { ...item, id: Date.now(), saved_at: new Date().toISOString(), type: 'moodboard' };
        items.unshift(rec);
        _mbSave(items);
        _rbRenderMoodboards();
        _lbCloudPush(rec);
        return rec.id;
      }
      function _mbUpdate(id, patch) {
        const items = _mbLoad();
        const it = items.find(i => i.id === id);
        if (!it) return;
        Object.assign(it, patch);
        _mbSave(items);
        _rbRenderMoodboards();
        _lbCloudPatch(it);
      }
      function _mbRemove(id) {
        _mbSave(_mbLoad().filter(i => i.id !== id));
        _rbRenderMoodboards();
        _mbRenderPage();
        _lbCloudDelete(id);
      }

      const _CB_PLACEHOLDER = "Tell Robes where you're going, or the look you're after…";

      // ── Intent system (P0: pills stripped — cards + NL extraction only) ──
      // The rotating prompt examples live in the bundle's typewriter
      // (PROMPT_EXAMPLES in dashboard-assets/144529f6….js) — that is the
      // sole placeholder mechanism.
      let _cbIntent = null; // null | 'style' | 'dress-me' | 'weekly'
      let _cbPhotoData = null;
      let _cbSeedPrefix = null; // static prefix of a card-injected scaffold

      const _CHIP_DEFS = [
        { id: 'chip-style',  label: 'Style a key piece',
          cta: 'STYLE IT',
          inject: 'Style my [cream blazer] three ways',
          placeholder: 'Describe your key piece…',
          intent: 'style' },
        { id: 'chip-dress',  label: 'Dress me today',
          cta: 'DRESS ME',
          inject: 'An outfit for [Sunday brunch]',
          placeholder: 'Describe your occasion or mood…',
          intent: 'dress-me' },
        { id: 'chip-week',   label: 'Plan my week',
          cta: 'PLAN MY WEEK',
          inject: 'A weekly plan for [my upcoming work week]',
          placeholder: 'Describe your week — meetings, dinners, plans…',
          intent: 'weekly' },
        // No chip renders this one — it exists so _cbSetIntent('travel') can
        // arm the prompt from a concierge card (the empty Lookbook routes
        // every card back here). _cbResolve already routes 'travel'.
        { id: 'chip-travel', label: 'Pack a trip',
          cta: 'PACK MY TRIP',
          inject: 'A travel edit for [five days in Lisbon]',
          placeholder: 'Where are you going, and when?',
          intent: 'travel' },
      ];

      function _cbGetSendBtn() { return document.querySelector('.cb-send'); }

      // Swap only the label span — btn.textContent used to destroy the
      // arrow SVG permanently on the first intent change (review finding).
      function _cbLabelEl(btn) {
        let l = btn.querySelector('.cb-send-lbl');
        if (!l) {
          l = document.createElement('span');
          l.className = 'cb-send-lbl';
          l.textContent = (btn.textContent || 'Send').trim();
          btn.insertBefore(l, btn.firstChild);
          Array.from(btn.childNodes).forEach(n => { if (n.nodeType === 3) n.remove(); });
        }
        return l;
      }
      function _cbSetCta(text) {
        const btn = _cbGetSendBtn();
        if (!btn) return;
        const l = _cbLabelEl(btn);
        if (!btn.dataset.origText) btn.dataset.origText = l.textContent || 'Send';
        l.textContent = text;
      }

      function _cbResetCta() {
        const btn = _cbGetSendBtn();
        if (btn && btn.dataset.origText) _cbLabelEl(btn).textContent = btn.dataset.origText;
      }

      // "Add from Wardrobe" (beta feedback) — anchor a styling prompt to a
      // piece she already owns. Picking an item injects its exact label into
      // the prompt and attaches its wardrobe photo (as the same dataURL the
      // photo path uses, so /api/style sees it identically).
      window.__cbWardrobePick = function() {
        document.getElementById('cb-wa-pick')?.remove();
        if (!_waItems.length) { _waShowToast('Nothing catalogued yet — add a piece to your wardrobe first'); return; }
        const serif = "'Cormorant',Georgia,serif";
        const modal = document.createElement('div');
        modal.id = 'cb-wa-pick';
        modal.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:24px';
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
        const tiles = _waItems.slice(0, 60).map(wi => `
          <button onclick="window.__cbWardrobeApply('${_waEsc(String(wi.id))}')" style="background:#fff;border:0.5px solid rgba(32,32,33,0.12);border-radius:10px;padding:0;overflow:hidden;cursor:pointer;text-align:left;font-family:inherit">
            <div style="aspect-ratio:3/4;background:#F0EDE8;display:flex;align-items:center;justify-content:center;overflow:hidden">${wi.image_url
              ? `<img src="${_waEsc(wi.image_url)}" style="width:100%;height:100%;object-fit:cover;display:block" alt="">`
              : `<span style="font-family:${serif};font-size:22px;color:#C8B8A2">${_waEsc((wi.label || '?').charAt(0).toUpperCase())}</span>`}</div>
            <div style="padding:7px 9px 9px;font-size:11px;color:#202021;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_waEsc(wi.label)}</div>
          </button>`).join('');
        modal.innerHTML = `
          <div style="background:#FAF8F5;border-radius:20px;width:100%;max-width:480px;max-height:80vh;overflow-y:auto;box-sizing:border-box;box-shadow:0 24px 60px -12px rgba(32,32,33,0.28);padding:24px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:4px">
              <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin:0">From your wardrobe</p>
              <button onclick="document.getElementById('cb-wa-pick').remove()" style="background:none;border:none;cursor:pointer;padding:2px;color:var(--ink-faint);font-size:16px;line-height:1">×</button>
            </div>
            <p style="font-family:${serif};font-size:24px;font-weight:300;color:#202021;margin:0 0 16px;line-height:1.2">Which piece are we styling?</p>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px">${tiles}</div>
          </div>`;
        document.body.appendChild(modal);
      };
      window.__cbWardrobeApply = async function(id) {
        document.getElementById('cb-wa-pick')?.remove();
        const wi = _waItems.find(w => String(w.id) === String(id));
        if (!wi) return;
        const ta = document.getElementById('cb-ta');
        if (ta) {
          const cur = ta.value;
          const br = cur.match(/\[[^\]]*\]/);
          ta.value = br
            ? cur.replace(br[0], wi.label)
            : (cur.trim() ? cur : 'Style my ' + wi.label + ' three ways');
          ta.dispatchEvent(new Event('input'));
          _cbAutoGrow(ta);
        }
        if (wi.image_url) {
          try {
            _cbPhotoData = await _rbUrlToDataUrl(wi.image_url);
            const box = document.getElementById('cb-attached');
            if (box) {
              box.innerHTML =
                `<div class="hp-chip"><img src="${_waEsc(wi.image_url)}" alt="">` +
                `<span class="hp-chip-label">${_waEsc(wi.label)}</span>` +
                `<button class="hp-chip-x" onclick="window.__cbClearPhoto&&window.__cbClearPhoto()" aria-label="Remove piece">` +
                `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></div>`;
              box.hidden = false;
            }
          } catch (e) { _cbPhotoData = null; }
        }
        _rbTrack('wardrobe_pick', { item: String(wi.id), label: wi.label || '' });
        _waShowToast(wi.label + ' anchored to your prompt');
      };

      // Clear the attached photo/piece — state + the bundle's #cb-attached
      // chip. (P0: the old always-visible attach row is gone; attachment
      // lives in the + menu alongside Upload / Take a picture.)
      function _cbClearPhoto() {
        _cbPhotoData = null;
        const box = document.getElementById('cb-attached');
        if (box) { box.innerHTML = ''; box.hidden = true; }
        const inp = document.getElementById('cb-file');
        if (inp) inp.value = '';
      }
      window.__cbClearPhoto = _cbClearPhoto;

      // Grow the textarea to fit its content so injected template text never
      // clips off the top (bug report 4.7 — mobile prompt bleed).
      function _cbAutoGrow(ta) {
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 240) + 'px';
      }

      function _cbSetIntent(intent) {
        _cbHideClarify();
        const ta = document.getElementById('cb-ta');
        const def = _CHIP_DEFS.find(c => c.intent === intent);
        // Only arm intents that have a scaffold — assigning before this
        // guard left a stale unroutable intent (e.g. legacy 'moodboard')
        // permanently bypassing NL detection.
        if (!def || !ta) return;
        _cbIntent = intent;
        // Remember the scaffold's static prefix — if the user later rewrites
        // the prompt wholesale, _cbSubmit re-detects instead of trusting the
        // now-invisible card intent (no chips = no deselect affordance).
        _cbSeedPrefix = def.inject.split('[')[0].trim().toLowerCase();
        ta.value = def.inject;
        ta.placeholder = def.placeholder;
        ta.dispatchEvent(new Event('input'));
        _cbAutoGrow(ta);
        ta.scrollTop = 0;
        _cbSetCta(def.cta);
        if (intent !== 'style') _cbClearPhoto();
        ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Put the caret on the first bracket so she can edit it straight away
        // instead of hunting through the line on mobile.
        setTimeout(() => {
          ta.focus();
          const b = ta.value.indexOf('[');
          if (b >= 0) { const e = ta.value.indexOf(']', b); ta.setSelectionRange(b, e > b ? e + 1 : ta.value.length); }
          else ta.setSelectionRange(ta.value.length, ta.value.length);
        }, 300);
      }

      function _cbReset() {
        _cbIntent = null;
        _cbSeedPrefix = null;
        _cbAnchorDate = null;
        const ta = document.getElementById('cb-ta');
        if (ta) { ta.value = ''; ta.placeholder = _CB_PLACEHOLDER; ta.style.height = 'auto'; ta.dispatchEvent(new Event('input')); }
        _cbResetCta();
        _cbClearPhoto();
      }

      // Reusable inline style overlay — shared between chip 'style', 'dress-me', and KP card
      async function _cbStyleSubmit(prompt, photoData, meta) {
        const intent = (meta && meta.intent) || 'style';
        const daily = intent === 'dress-me';
        let overlay = document.getElementById('kp-loading-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'kp-loading-overlay';
          overlay.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(250,248,245,0.92);backdrop-filter:blur(6px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px';
          overlay.innerHTML = `
            <div id="kp-load-title" style="font-family:'Cormorant',Georgia,serif;font-size:28px;font-weight:300;color:#202021;text-align:center">Styling your piece<br><em>three ways…</em></div>
            <div style="font-size:12px;color:var(--ink-faint);letter-spacing:.06em" id="kp-load-msg">Composing your looks</div>
            <div style="width:120px;height:1px;background:rgba(32,32,33,0.1);position:relative;overflow:hidden;margin-top:8px">
              <div id="kp-load-bar" style="position:absolute;inset:0;background:#202021;transform:translateX(-100%);animation:kpLoadBar 2.5s ease-in-out infinite"></div>
            </div>`;
          document.body.appendChild(overlay);
        }
        const loadTitle = document.getElementById('kp-load-title');
        if (loadTitle) loadTitle.innerHTML = daily
          ? 'One prompt.<br><em>Dressed for anything.</em>'
          : 'Styling your piece<br><em>three ways…</em>';
        overlay.style.display = 'flex';
        const msgs = ['Generating editorial looks', 'Composing outfits…', 'Creating images…', 'Almost ready…'];
        let mi = 0;
        const msgInterval = setInterval(() => {
          mi = Math.min(mi + 1, msgs.length - 1);
          const el = document.getElementById('kp-load-msg');
          if (el) el.textContent = msgs[mi];
        }, 8000);
        // Daily Look track carries the real-time context captured by _rbWeather
        // (asked for lazily — see the deferred location note in _rbWeather)
        if (daily && window.__rbWeatherAsk && !(window.__rbCtx && window.__rbCtx.city)) {
          try { await Promise.race([window.__rbWeatherAsk(), new Promise(r => setTimeout(r, 6000))]); } catch (e) {}
        }
        const rc = window.__rbCtx || {};
        const context = daily ? {
          city: rc.city || '',
          month: new Date().toLocaleDateString('en-GB', { month: 'long' }),
          tempRange: rc.tempRange || (rc.tempC != null ? rc.tempC + '°C' : ''),
          condition: rc.condition || '',
          hint: rc.hint || '',
        } : null;
        const guard = _rbOverlayGuard(overlay);
        const genId = _rbGenId();
        try {
          const res = await fetch('/api/style', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: guard.signal,
            body: JSON.stringify({
              prompt,
              photo: photoData || null,
              userId: _waUid() || undefined,
              genId,
              styleDna: _rbStyleDna(), styleIcons: _rbStyleIcons(), gender: _rbGender(),
              wardrobeCount: _waItems.length,
              wardrobeItems: _waItems.map(i => ({ label: i.label, category: i.category, color: i.color, times_worn: i.times_worn })),
              intent,
              context,
            }),
          });
          guard.done();
          clearInterval(msgInterval);
          overlay.style.display = 'none';
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          data.genId = genId;
          window.__kpRenderResult(data, prompt, { intent, context });
        } catch (err) {
          guard.done();
          clearInterval(msgInterval);
          overlay.style.display = 'none';
          if (guard.userCancelled) return;
          _waShowToast(guard.timedOut
            ? 'That took longer than it should — please try again.'
            : 'Robes couldn’t finish those looks — please try again in a moment.');
        }
      }

      // ── Post-add fork modal (P0) ─────────────────────────────────────
      // The moment a piece lands in the wardrobe, offer the instant payoff:
      // "Style 3 ways for instant inspiration, or build a daily look
      // around it?" — the cataloguing loop's reward, on every add.
      window.__rbAddFork = function(row) {
        if (!row || !row.label) return;
        // Below the 15-piece threshold she is cataloguing, not styling — a
        // modal on every add taxes the exact behaviour the product needs
        // most. The fork returns once the wardrobe is built.
        if (_waItems.length < 15) return;
        document.getElementById('rb-addfork')?.remove();
        const serif = "'Cormorant',Georgia,serif";
        const modal = document.createElement('div');
        modal.id = 'rb-addfork';
        modal.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(32,32,33,0.45);display:flex;align-items:center;justify-content:center;padding:24px';
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
        const thumb = row.image_url
          ? `<img src="${_waEsc(row.image_url)}" style="width:64px;height:82px;border-radius:var(--rad-sm);object-fit:cover;flex-shrink:0" alt="">`
          : `<div style="width:64px;height:82px;border-radius:var(--rad-sm);background:#F0EDE8;display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="font-family:${serif};font-size:24px;color:#C8B8A2">${_waEsc((row.label || '?').charAt(0).toUpperCase())}</span></div>`;
        modal.innerHTML = `
          <div style="background:#FAF8F5;border-radius:20px;width:100%;max-width:420px;box-sizing:border-box;box-shadow:0 24px 60px -12px rgba(32,32,33,0.28);padding:26px 26px 22px">
            <div style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:14px">In your wardrobe ✓</div>
            <div style="display:flex;gap:16px;align-items:center;margin-bottom:20px">
              ${thumb}
              <div style="flex:1;min-width:0">
                <div style="font-family:${serif};font-size:24px;font-weight:300;color:#202021;line-height:1.15">Your ${_waEsc(row.label.toLowerCase())} is filed.</div>
                <div style="font-size:12px;color:var(--ink-faint);font-style:italic;margin-top:4px">Want it styled straight away?</div>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:9px">
              <button id="rb-fork-ways" style="width:100%;padding:13px 20px;border-radius:100px;border:none;background:#202021;color:#fff;font-size:12px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;font-family:inherit">Style it 3 ways</button>
              <button id="rb-fork-daily" style="width:100%;padding:13px 20px;border-radius:100px;border:0.5px solid rgba(32,32,33,0.2);background:#fff;color:#202021;font-size:12px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;font-family:inherit">Build today's look around it</button>
              <button id="rb-fork-skip" style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--ink-faint);text-decoration:underline;font-family:inherit;padding:6px">Not now — keep cataloguing</button>
            </div>
          </div>`;
        document.body.appendChild(modal);
        modal.querySelector('#rb-fork-ways').onclick = async function() {
          modal.remove();
          const pd = row.image_url ? await _rbUrlToDataUrl(row.image_url).catch(() => null) : null;
          _cbStyleSubmit('Style my ' + row.label + ' three ways', pd, { intent: 'style' });
        };
        modal.querySelector('#rb-fork-daily').onclick = function() {
          modal.remove();
          window.__dlSubmit('An outfit for today built around my ' + row.label);
        };
        modal.querySelector('#rb-fork-skip').onclick = function() { modal.remove(); };
      };

      // ── Conversational intent extraction (PRD §2) ────────────────────
      // A chip is an explicit override; free-typed prompts are classified
      // from natural language. Ambiguous prompts get a clarifying question.
      const _GARMENT_RE = /(blazer|coat|jacket|trench|dress|gown|skirt|jeans|denim|trousers?|pants|shorts|shirt|blouse|top|tee|t-shirt|knit|sweater|jumper|cardigan|waistcoat|vest|suit|boots?|loafers?|heels?|sneakers?|trainers|flats|sandals|mules|pumps|slingbacks?|bag|tote|clutch|scarf|belt)/;

      function _cbDetectIntent(text, hasPhoto) {
        // A photo attachment always means the key-piece track (PRD rule) —
        // no other track consumes the photo, so it must never be outranked
        // by a travel/weekly keyword and silently dropped.
        if (hasPhoto) return 'style';
        const t = ' ' + (text || '').toLowerCase().replace(/[^\w\s'’-]/g, ' ') + ' ';
        const piece =
          /\bstyle (my|this|these)\b/.test(t) || /\bways to wear\b/.test(t) || /\b(three|3) ways\b/.test(t) ||
          /\bhow (should|do|can|would) i (wear|style)\b/.test(t) ||
          (/\b(my|this|these)\b/.test(t) && _GARMENT_RE.test(t));
        const daily = /\bdress me\b/.test(t) || /\bwhat (should|do|can) i wear\b/.test(t) ||
          /\b(outfit|look) for\b/.test(t) || /\bwear (to|for)\b/.test(t) ||
          /\b(today|tonight|tomorrow|this (morning|afternoon|evening|weekend))\b/.test(t) ||
          /\b(brunch|dinner|lunch|meeting|wedding|date night|office|workday|interview|party|drinks|gallery|school run)\b/.test(t);
        const travel = /\b(pack(ing)?|suitcase|luggage|trip|travel(ling|ing)?|holiday|vacation|getaway|city break|honeymoon|weekend away|nights? in)\b/.test(t);
        // Multi-day agendas → the Weekly Plan track. "weekend" never
        // matches \bweek\b, so daily "this weekend" prompts stay daily; a
        // bare adjectival "weekly" ("my weekly team meeting") is deliberately
        // NOT a trigger — it describes one recurring occasion, not a week.
        const weekly = /\b(work ?week|week ahead|next week|whole week|full week|school week|monday (to|through|until) friday)\b/.test(t) ||
          /\bweekly (plan(ner)?|wardrobe|outfits|schedule|agenda|edit)\b/.test(t) ||
          /\bplan\b[\s\S]*\bweek\b/.test(t) || /\bweek\b[\s\S]*\b(plan|schedule|agenda|calendar|outfits)\b/.test(t) ||
          /\b(for|of) the week\b/.test(t);
        const hits = [piece && 'style', daily && 'dress-me', travel && 'travel', weekly && 'weekly'].filter(Boolean);
        if (hits.length === 1) return hits[0];
        // A named piece beats the day's occasion around it (PRD: "my Prada
        // shoes to the office today" is Key Piece, not Daily Look) — but a
        // trip or a week span outranks the piece packed inside it.
        if (piece && !travel && !weekly) return 'style';
        // A trip beats the occasions (and weekdays) inside it
        if (travel) return 'travel';
        if (weekly) return 'weekly';
        if (daily) return 'dress-me';
        return null;
      }

      function _cbHideClarify() {
        const el = document.getElementById('cb-clarify');
        if (el) el.remove();
      }

      function _cbShowClarify(prompt) {
        _cbHideClarify();
        const anchor = document.querySelector('.concierge-box');
        if (!anchor || !anchor.parentNode) { _cbReset(); window.__dlSubmit(prompt); return; }
        const row = document.createElement('div');
        row.id = 'cb-clarify';
        row.style.cssText = 'margin:12px 0 0;padding:16px 18px;background:#fff;border:0.5px solid rgba(32,32,33,0.12);border-radius:var(--rad)';
        row.innerHTML = `
          <div style="font-family:'Cormorant',Georgia,serif;font-style:italic;font-size:15px;color:#6E6A64;margin-bottom:10px">Lovely — a look for your day, your week planned, a trip packed, or one piece three ways?</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button data-intent="dress-me" style="padding:8px 16px;border:1px solid rgba(32,32,33,0.18);border-radius:40px;background:#FAF8F5;font-size:12px;cursor:pointer;color:#202021;font-family:inherit">An outfit for my day</button>
            <button data-intent="weekly" style="padding:8px 16px;border:1px solid rgba(32,32,33,0.18);border-radius:40px;background:#FAF8F5;font-size:12px;cursor:pointer;color:#202021;font-family:inherit">Plan my week</button>
            <button data-intent="travel" style="padding:8px 16px;border:1px solid rgba(32,32,33,0.18);border-radius:40px;background:#FAF8F5;font-size:12px;cursor:pointer;color:#202021;font-family:inherit">Pack for a trip</button>
            <button data-intent="style" style="padding:8px 16px;border:1px solid rgba(32,32,33,0.18);border-radius:40px;background:#FAF8F5;font-size:12px;cursor:pointer;color:#202021;font-family:inherit">Style one piece 3 ways</button>
          </div>`;
        anchor.parentNode.insertBefore(row, anchor.nextSibling);
        row.querySelectorAll('button').forEach(b => {
          b.onclick = function() { _cbHideClarify(); _cbResolve(b.dataset.intent, prompt); };
        });
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // Armed by a rail-card tap: the next dress-me submit dresses THAT
      // calendar date, not today (the pre-scope-chip bridge to the Diary's
      // "dress this day" — Stage 3 replaces this with the real scope state).
      var _cbAnchorDate = null;
      function _cbResolve(intent, prompt) {
        _rbTrack('prompt_submitted', { track: intent || '', has_photo: !!_cbPhotoData, length: (prompt || '').length });
        if (intent === 'travel') {
          // The Travel Edit needs a structured brief (destination + dates) —
          // the typed prompt lands in the modal's notes field
          _cbReset();
          window.__tvOpen({ brief: prompt });
          return;
        }
        if (intent === 'dress-me') {
          // The Daily Look track works at every wardrobe count — fully
          // aspirational when the closet is empty, closet-first at ≥15
          // (cold-start handled server-side, swap-in gamification on-page)
          if (_waItems.length < 15 && _waItems.length > 0) {
            _waShowToast(`Your closet is growing (${_waItems.length}/15) — Robes will mix what you own with editorial finds.`);
          }
          const anchorDate = _cbAnchorDate;
          _cbReset();
          window.__dlSubmit(prompt, anchorDate ? { anchorDate } : undefined);
          return;
        }
        if (intent === 'weekly') {
          // The Weekly Plan View — a chronological calendar strip routing
          // wardrobe pieces across the week's agenda
          _cbReset();
          window.__wkSubmit(prompt);
          return;
        }
        if (intent === 'style') {
          if (!prompt && !_cbPhotoData) { _waShowToast('Describe your piece or upload a photo first'); return; }
          const photo = _cbPhotoData;
          _cbReset();
          _cbStyleSubmit(prompt, photo, { intent });
        } else {
          // No P0 track matched (e.g. a legacy 'moodboard' intent) — never
          // render blindly; drop the stale intent and fall back to the
          // clarifying loop (an armed unroutable intent would otherwise
          // bypass NL detection on every subsequent send).
          _cbIntent = null;
          _cbSeedPrefix = null;
          _cbResetCta();
          if (!prompt) { _cbReset(); return; }
          _cbShowClarify(prompt);
        }
      }

      // Central submit handler — chip override or NL intent extraction
      function _cbSubmit() {
        const ta = document.getElementById('cb-ta');
        let prompt = (ta && ta.value.trim()) || '';
        _cbHideClarify();
        // Chip templates inject "[Sunday brunch]"-style placeholders. Beta
        // feedback: blocking the submit on them left users stuck — so run
        // with the bracketed default instead (the brackets are just editable
        // suggestions, not gates).
        if (/\[[^\]]*\]/.test(prompt)) {
          prompt = prompt.replace(/\[([^\]]*)\]/g, '$1').replace(/\s{2,}/g, ' ').trim();
          if (ta) { ta.value = prompt; _cbAutoGrow(ta); }
        }
        // Diary prompt (flag diary_prompt_intake): the field becomes the
        // single entry point — scope-aware routing + the unfurl intake
        // replace chip detection entirely while the flag is on.
        if (typeof _rbDiaryOn === 'function' && _rbDiaryOn()) { _ikSubmit(prompt); return; }
        let intent = _cbIntent;
        // A card-armed intent is invisible (no chips) — only trust it while
        // the prompt still descends from the injected scaffold. A wholesale
        // rewrite re-runs detection so "Style my blazer three ways" typed
        // over the weekly template doesn't post to /api/weekly.
        if (intent && _cbSeedPrefix && prompt.toLowerCase().indexOf(_cbSeedPrefix) !== 0) {
          intent = _cbDetectIntent(prompt, !!_cbPhotoData) || intent;
        }
        if (!intent) {
          if (!prompt && !_cbPhotoData) return;
          intent = _cbDetectIntent(prompt, !!_cbPhotoData);
          if (!intent) { _cbShowClarify(prompt); return; }
        }
        _cbResolve(intent, prompt);
      }

      // Legacy helper kept for _mbInlineBtn.onclick compat
      function _mbHideInlineBtn() {}
      function _mbShowInlineBtn() {}
      function _mbFireFromTextarea() { _cbSubmit(); }

      // P0 concierge chrome: the prompt box is a bare text entry — no pills,
      // no attach row. Photo + wardrobe attachment live in the + menu
      // (#cb-addmenu) alongside Upload / Take a picture; the bundle's
      // typewriter placeholder (PROMPT_EXAMPLES in the dashboard-assets
      // concierge script) is the sole intent guide.
      setTimeout(() => {
        const ta = document.getElementById('cb-ta');
        if (!ta) return;
        const sendBtn = document.querySelector('.cb-send');
        if (sendBtn && !sendBtn.dataset.origText) sendBtn.dataset.origText = sendBtn.textContent || 'Send';

        document.querySelectorAll('.cb-pills').forEach(el => el.remove());

        // "From wardrobe" joins the + menu
        const addMenu = document.getElementById('cb-addmenu');
        if (addMenu && !document.getElementById('cb-addopt-wa')) {
          const waOpt = document.createElement('button');
          waOpt.id = 'cb-addopt-wa';
          waOpt.className = 'hp-addopt';
          waOpt.innerHTML = `<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="18" rx="2"></rect><line x1="12" y1="3" x2="12" y2="21"></line></svg>From wardrobe`;
          waOpt.onclick = function() { window.__cbWardrobePick && window.__cbWardrobePick(); };
          addMenu.appendChild(waOpt);
        }
      }, 1000);

      // The bundle's + menu photo path (#cb-file → Dash.onPhoto renders the
      // attached chip) must also feed _cbPhotoData. Capture phase on
      // document so the file is read before Dash.onPhoto clears the input.
      document.addEventListener('change', function(e) {
        if (!e.target || e.target.id !== 'cb-file') return;
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        // Downscale before upload — a raw 8MB camera photo inside the
        // styling request is a long cellular hang behind the overlay.
        _rbDownscale(file).then(function(dataUrl) {
          _cbPhotoData = dataUrl;
          _rbTrack('photo_attached', {});
        }).catch(function() {
          _waShowToast('Couldn’t read that image — try another photo.');
        });
      }, true);
      // The bundle chip's × calls Dash.removePhoto (clears the chip only) —
      // clear our attachment state alongside it.
      document.addEventListener('click', function(e) {
        if (e.target && e.target.closest && e.target.closest('#cb-attached .hp-chip-x')) _cbPhotoData = null;
      }, true);

      // Intercept send button click and Enter key — routes via _cbSubmit
      document.addEventListener('click', function(e) {
        if (e.target.closest('.cb-send')) {
          e.preventDefault();
          e.stopImmediatePropagation();
          e.stopPropagation();
          _cbSubmit();
        }
      }, true);

      document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey && e.target && e.target.id === 'cb-ta') {
          e.preventDefault();
          e.stopImmediatePropagation();
          e.stopPropagation();
          _cbSubmit();
        }
      }, true);

      // Grow the prompt box as she types so nothing scrolls out of view.
      document.addEventListener('input', function(e) {
        if (e.target && e.target.id === 'cb-ta') _cbAutoGrow(e.target);
      });

      // P0: chokepoint gates — every moodboard entry global no-ops while
      // hidden, so no un-audited caller (crumb actions, bundle patches,
      // future buttons) can reach the surface. Restoring moodboards needs
      // _RB_MB_HIDDEN = false PLUS the moodboard routing entries that were
      // removed from _CHIP_DEFS/_cbDetectIntent/_cbResolve (see git history).
      window.__rbStartMoodboard = function() {
        if (_RB_MB_HIDDEN) return;
        _cbSetIntent('moodboard');
      };

      window.__mbRunGeneration = async function(prompt) {
        if (_RB_MB_HIDDEN) return;
        _mbShowGenerating(prompt);
        try {
          const token = _waToken();
          const wardrobeItems = _waItems.map(i => ({ id: i.id, label: i.label, category: i.category, color: i.color, image_url: i.image_url }));
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const controller = new AbortController();
          const clientTimeout = setTimeout(() => controller.abort(), 90000);
          const genId = _rbGenId();
          const res = await fetch('/api/moodboard', {
            method: 'POST',
            headers,
            body: JSON.stringify({ prompt, wardrobeItems, userId: _waUid() || undefined, genId, styleDna: _rbStyleDna(), styleIcons: _rbStyleIcons(), gender: _rbGender() }),
            signal: controller.signal,
          });
          clearTimeout(clientTimeout);
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Server error ${res.status}`);
          }
          let data;
          try {
            data = await res.json();
          } catch (_) {
            // ok status but the body was cut off (gateway timeout / truncated
            // stream) — surface a clean retry rather than a raw JSON error.
            throw new Error('Moodboard response was cut off — please try again');
          }
          _mbShowResult({ ...data, prompt, genId });
          // Poll for background images if server returned a job id
          if (data.mb_job_id) _mbPollImages(data.mb_job_id);
        } catch (e) {
          _mbHideGenerating();
          const msg = e.name === 'AbortError' ? 'Moodboard timed out — please try again' : (e.message && e.message !== 'Failed to fetch' ? e.message : 'Could not build moodboard — please try again');
          _waShowToast(msg);
          console.error('[moodboard] client error:', e.message, e.stack);
        }
      };

      // ── Moodboard image polling ───────────────────────────────────────
      function _mbPollImages(jobId) {
        let attempts = 0;
        const maxAttempts = 90; // 7.5 min ceiling — staggered gen takes longer
        function tick() {
          if (attempts++ >= maxAttempts) return;
          fetch(`/api/images/${jobId}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (!data || !Array.isArray(data.images)) return;
              // data.images is an array of {type, url} from the moodboard background job
              const panel = document.getElementById('moodboard-panel');
              if (!panel || !panel._currentData) return;
              const currentGridImages = panel._currentData.grid_images || [];
              let updated = false;
              data.images.forEach(img => {
                if (!img?.url) return;
                const already = currentGridImages.find(g => g.type === img.type && g.url === img.url);
                if (!already) { currentGridImages.push(img); updated = true; }
              });
              if (updated) {
                panel._currentData.grid_images = currentGridImages;
                panel._currentData.hero_image = panel._currentData.hero_image || currentGridImages.find(g => g.type === 'hero_look' && g.url)?.url || null;
                // Persist into the saved moodboard so the board keeps its
                // imagery when reopened later (tile + list card too)
                if (panel._savedId) _mbUpdate(panel._savedId, {
                  grid_images: currentGridImages,
                  hero_image: panel._currentData.hero_image,
                  img: currentGridImages.find(g => g.type === 'hero_look' && g.url)?.url || panel._currentData.hero_image || null,
                });
                // Re-render mosaic with new images without closing panel
                const mosaicEl = document.getElementById('mb-mosaic');
                if (mosaicEl) {
                  const byType = { hero_look: [], flat_lay: [], atmosphere: [] };
                  currentGridImages.forEach(g => { if (g?.url && byType[g.type]) byType[g.type].push(g.url); });
                  const heroUrl = panel._currentData.hero_image;
                  const title = panel._currentData.title || '';
                  const editorial_direction = panel._currentData.editorial_direction || '';
                  const heroHtml = heroUrl
                    ? `<img id="mb-mosaic-hero" class="mme-hero" alt="${_mbEsc(title)}" style="width:100%;height:100%;object-fit:cover">`
                    : `<div class="mme-hero" style="display:flex;align-items:flex-end;padding:24px;box-sizing:border-box;background:var(--cream-200)"><p style="font-family:var(--font-serif);font-size:22px;font-weight:300;color:var(--ink-faint);line-height:1.3;margin:0">${_mbEsc(title)}</p></div>`;
                  const editorialHtml = editorial_direction
                    ? `<div style="background:var(--cream-100);padding:20px;display:flex;align-items:center;box-sizing:border-box"><p style="font-family:var(--font-serif);font-style:italic;font-size:15px;font-weight:300;color:var(--ink-soft);line-height:1.6;margin:0">${_mbEsc(editorial_direction)}</p></div>`
                    : `<div style="background:var(--cream-200)"></div>`;
                  const palette = ['var(--cream-200)', 'var(--sage-100,#D4E0D0)', 'var(--rose-100,#E8D8D4)', 'var(--cream-100)', 'var(--sage-100,#D4E0D0)', 'var(--rose-100,#E8D8D4)', 'var(--cream-200)'];
                  const extraUrls = [byType.hero_look[1], byType.flat_lay[0], byType.hero_look[2], byType.flat_lay[1], byType.atmosphere[0], byType.atmosphere[1], null];
                  const stillPending = !data.done;
                  const extras = extraUrls.map((url, i) =>
                    url
                      ? `<img src="${_mbEsc(url)}" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy" alt="">`
                      : `<div class="mb-ph-cell${stillPending ? ' rb-tile-loading' : ''}" style="background:${palette[i]};${stillPending ? 'animation:kpPhPulse 1.8s ease-in-out infinite;' : ''}">${stillPending ? '<div class="rb-spin"></div>' + (i === 0 ? '<span class="rb-cap">Creating imagery…</span>' : '') : ''}</div>`
                  ).join('');
                  mosaicEl.innerHTML = heroHtml + editorialHtml + extras;
                  if (heroUrl) { const h = document.getElementById('mb-mosaic-hero'); if (h) h.src = heroUrl; }
                }
              }
              if (!data.done) setTimeout(tick, 4000);
              else document.querySelectorAll('#mb-mosaic .mb-ph-cell, #mb-mosaic .mme-hero:not(img)').forEach(el => { el.style.animation = 'none'; el.classList.remove('rb-tile-loading'); el.querySelectorAll('.rb-spin, .rb-cap').forEach(n => n.remove()); const s = el.querySelector('span'); if (s && s.textContent === 'Creating imagery…') s.remove(); });
            })
            .catch(() => { if (attempts < maxAttempts) setTimeout(tick, 6000); });
        }
        setTimeout(tick, 5000); // first poll after 5s — let style image gen breathe
      }

      // ── Generating overlay ────────────────────────────────────────────
      const _mbGenOverlay = document.createElement('div');
      _mbGenOverlay.id = 'mb-gen-overlay';
      _mbGenOverlay.style.cssText = 'display:none;position:fixed;inset:0;z-index:880;background:#FAF8F5;align-items:center;justify-content:center;flex-direction:column;gap:20px';
      _mbGenOverlay.innerHTML = `
        <div style="text-align:center;max-width:340px">
          <div id="mb-gen-spinner" style="width:48px;height:48px;border:1.5px solid rgba(32,32,33,0.12);border-top-color:#202021;border-radius:50%;animation:mbSpin 0.9s linear infinite;margin:0 auto 28px"></div>
          <p style="font-size:10px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin:0 0 12px">Robes is building your board</p>
          <p id="mb-gen-prompt" style="font-family:'Cormorant',Georgia,serif;font-size:26px;font-weight:300;line-height:1.25;color:#202021;margin:0 0 16px"></p>
          <p style="font-size:13px;color:#B8B0A6;line-height:1.6;margin:0">Curating the look · matching your wardrobe<br>generating editorial images…</p>
        </div>`;
      document.head.insertAdjacentHTML('beforeend', '<style>@keyframes mbSpin{to{transform:rotate(360deg)}}</style>');
      document.body.appendChild(_mbGenOverlay);

      function _mbShowGenerating(prompt) {
        const el = document.getElementById('mb-gen-prompt');
        if (el) el.textContent = prompt;
        _mbGenOverlay.style.display = 'flex';
        window.rbClearCrumb && window.rbClearCrumb(); // wordmark alone during generation
      }
      function _mbHideGenerating() { _mbGenOverlay.style.display = 'none'; }

      // ── Result page ───────────────────────────────────────────────────

      function _mbEsc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
      window.__mbThumbErr = function(el) {
        el.outerHTML = '<div style="width:44px;height:44px;border-radius:7px;background:#EDE8E0;flex-shrink:0;display:flex;align-items:center;justify-content:center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C8C0B8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';
      };

      function _mbShowResult(data, opts) {
        _mbHideGenerating();
        const { title, aesthetic_tags, editorial_direction, the_look = [], hero_image, grid_images = [], prompt } = data;
        const location_context = data.location_context || data.subtitle || '';
        const heroUrl = hero_image || data.img || null;
        const tags = Array.isArray(aesthetic_tags) ? aesthetic_tags : [];
        const matchedCount = the_look.filter(i => i.wardrobe_match).length;
        const shopCount = the_look.length - matchedCount;
        window.__mbCurrentLook = the_look;
        console.log('[robes] _mbShowResult title:', title, 'tags:', tags.length, 'look:', the_look.length, 'hero:', !!heroUrl, 'grid:', grid_images.filter(g => g?.url).length);

        // ── Populate the bundle's native moodboard panel ─────────────────

        // Title: split into destination + place if comma-separated, else full title
        const titleEl = document.getElementById('mb-out-title');
        console.log('[robes] mb-out-title el:', !!titleEl);
        if (titleEl) titleEl.innerHTML = _mbEsc(title).replace(',', ',<br>');

        // Keyword tags
        const kwsEl = document.getElementById('mb-out-kws');
        if (kwsEl) {
          kwsEl.innerHTML = tags.map((t, i) =>
            `<span class="mb-kw">${_mbEsc(t)}</span>${i < tags.length - 1 ? '<span class="mb-kw-dot">·</span>' : ''}`
          ).join('');
        }

        // Weather / location strip — parse from location_context "Place · Month | temp | directive"
        const wxEl = document.getElementById('mb-wx');
        if (wxEl && location_context) {
          const parts = location_context.split('|').map(s => s.trim());
          const locPart = parts[0] || location_context;
          const tempPart = parts[1] || '';
          const directivePart = parts[2] || '';
          wxEl.innerHTML =
            `<span class="w-icon">🌤</span>` +
            `<span class="w-info"><strong>${_mbEsc(locPart)}</strong></span>` +
            (tempPart ? `<div class="w-divider"></div><span class="w-info">${_mbEsc(tempPart)}</span>` : '') +
            (directivePart ? `<div class="w-divider"></div><span class="w-info">${_mbEsc(directivePart)}</span>` : '');
        }

        // Aesthetic tag
        const aestheticEl = document.getElementById('mb-aesthetic');
        if (aestheticEl) aestheticEl.textContent = tags[0] || '';

        // Mosaic — hero image + editorial direction text tile
        const mosaicEl = document.getElementById('mb-mosaic');
        if (mosaicEl) {
          // Never bake heroUrl into innerHTML — set img.src via DOM to avoid base64 truncation errors
          const heroHtml = heroUrl
            ? `<img id="mb-mosaic-hero" class="mme-hero" alt="${_mbEsc(title)}" style="width:100%;height:100%;object-fit:cover">`
            : `<div class="mme-hero" style="display:flex;align-items:flex-end;padding:24px;box-sizing:border-box;background:var(--cream-200)"><p style="font-family:var(--font-serif);font-size:22px;font-weight:300;color:var(--ink-faint);line-height:1.3;margin:0">${_mbEsc(title)}</p></div>`;
          const editorialHtml = editorial_direction
            ? `<div style="background:var(--cream-100);padding:20px;display:flex;align-items:center;box-sizing:border-box"><p style="font-family:var(--font-serif);font-style:italic;font-size:15px;font-weight:300;color:var(--ink-soft);line-height:1.6;margin:0">${_mbEsc(editorial_direction)}</p></div>`
            : `<div style="background:var(--cream-200)"></div>`;
          // Map grid_images by type — fill extra mosaic cells with real images, fall back to palette
          const byType = { hero_look: [], flat_lay: [], atmosphere: [] };
          (Array.isArray(grid_images) ? grid_images : []).forEach(g => { if (g?.url && byType[g.type]) byType[g.type].push(g.url); });
          const palette = ['var(--cream-200)', 'var(--sage-100,#D4E0D0)', 'var(--rose-100,#E8D8D4)', 'var(--cream-100)', 'var(--sage-100,#D4E0D0)', 'var(--rose-100,#E8D8D4)', 'var(--cream-200)'];
          // Cell order mirrors the bundle's mosaic grid: look2, flat1, look3, flat2, atm1, atm2, spare
          const extraUrls = [byType.hero_look[1], byType.flat_lay[0], byType.hero_look[2], byType.flat_lay[1], byType.atmosphere[0], byType.atmosphere[1], null];
          // Fresh generation (mb_job_id set) — empty cells are loading, not
          // decorative: pulse them and label the first so blanks read as
          // "imagery on its way", not broken tiles
          const mbPending = !!data.mb_job_id;
          const extras = extraUrls.map((url, i) =>
            url
              ? `<img src="${_mbEsc(url)}" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy" alt="">`
              : `<div class="mb-ph-cell${mbPending ? ' rb-tile-loading' : ''}" style="background:${palette[i]};${mbPending ? 'animation:kpPhPulse 1.8s ease-in-out infinite;' : 'display:flex;align-items:center;justify-content:center;'}">${mbPending ? '<div class="rb-spin"></div>' + (i === 0 ? '<span class="rb-cap">Creating imagery…</span>' : '') : ''}</div>`
          ).join('');
          mosaicEl.innerHTML = heroHtml + editorialHtml + extras;
          if (heroUrl) {
            const heroImg = document.getElementById('mb-mosaic-hero');
            if (heroImg) heroImg.src = heroUrl;
          } else if (mbPending) {
            const heroPh = mosaicEl.querySelector('.mme-hero');
            if (heroPh && heroPh.tagName !== 'IMG') heroPh.style.animation = 'kpPhPulse 1.8s ease-in-out infinite';
          }
        }

        // The Look sidebar — compact thumbnail row design.
        // The "✓ Yours" reward shows on ANY genuine wardrobe match, at any
        // count — every catalogued piece earns visible proof it's being used,
        // instead of the reward staying hidden until the closet hits 15.
        const swapSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>`;
        const checkSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
        const chevL = `<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>`;
        const chevR = `<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>`;
        const railEl = document.getElementById('mb-rail-pieces');
        if (railEl) {
          // Card mirrors the Daily rack: thumbnail / label / brand / a SINGLE
          // provenance line (in-wardrobe OR retailer·price — no more duplicate)
          // + flick-through same-category pieces + Swap.
          railEl.innerHTML = the_look.map((item, idx) => {
            const match = item.wardrobe_match;
            const retailer = item.retailer_hint || '';
            const price = item.price_point || '';
            const brand = item.brand_name || (match ? '' : retailer) || '';
            const _mbInitial = (_mbEsc(item.name || '').trim().charAt(0) || '·').toUpperCase();
            const thumbHtml = match?.image_url
              ? `<img class="mbr-thumb" src="${_mbEsc(match.image_url)}" alt="" onerror="window.__mbThumbErr(this)">`
              : `<div class="mbr-mono">${_mbInitial}</div>`;

            let tag = '';
            if (match) {
              const waItem = _waItems.find(w => String(w.id) === String(match.id));
              const timesWorn = waItem?.times_worn || 0;
              tag = `<div class="mbr-tag"><span class="mbr-own">${checkSvg} In your wardrobe</span>${timesWorn > 0 ? `<span class="mbr-worn">Worn ${timesWorn}×</span>` : ''}</div>`;
            } else if (retailer || price) {
              tag = `<div class="mbr-tag"><span class="mbr-shoptag">${_mbEsc([retailer, price].filter(Boolean).join(' · '))}</span></div>`;
            }

            const opts = _mbOpts(item);
            const cur = _mbOptIdx(item, opts);
            const flick = opts.length > 1
              ? `<div class="mbr-flick"><button class="mbr-arrow" onclick="window.__mbFlip(${idx},-1)" aria-label="Previous">${chevL}</button><span class="mbr-count">${cur + 1}/${opts.length}</span><button class="mbr-arrow" onclick="window.__mbFlip(${idx},1)" aria-label="Next">${chevR}</button></div>`
              : `<span></span>`;

            return `<div class="mbr-card">
              <div class="mbr-top">
                ${thumbHtml}
                <div class="mbr-txt">
                  <div class="mbr-name">${_mbEsc(item.name)}</div>
                  ${brand ? `<div class="mbr-brand">${_mbEsc(brand)}</div>` : ''}
                  ${tag}
                </div>
              </div>
              <div class="mbr-acts">
                ${flick}
                <button class="mbr-swap" onclick="window.__mbSwap(${idx})">${swapSvg} Swap</button>
              </div>
            </div>`;
          }).join('') +
          `<button class="mbr-addpiece" onclick="window.__mbAddPiece()"><span style="font-size:15px;line-height:1;margin-top:-1px">+</span> Add a piece</button>`;

          // Force overflow:visible up the ancestor chain so buttons aren't clipped
          let el = railEl;
          for (let i = 0; i < 8 && el; i++) {
            el.style.setProperty('overflow', 'visible', 'important');
            el = el.parentElement;
          }
        }

        // Sidebar subtitle
        const railSubEl = document.getElementById('mb-rail-sub');
        const railSubText = matchedCount > 0
          ? `${the_look.length} pieces · ${matchedCount} from your wardrobe`
          : `${the_look.length} pieces`;
        if (railSubEl) railSubEl.textContent = railSubText;

        // Breadcrumb: ROBES / {title} when opened from dashboard,
        // or ROBES / Your Moodboards / {title} when opened from the full list
        if (window._mbOpenedFromList) {
          window.rbSetCrumb && window.rbSetCrumb([
            { label: 'Your Moodboards', action: function() { window.__mbCloseResult(); window._mbOpenedFromList = false; if (window._mbShowAllPage) window._mbShowAllPage(); } },
            { label: title },
          ]);
        } else {
          window.rbSetCrumb && window.rbSetCrumb([{ label: title }]);
        }

        // Panel is INSIDE home-body — use position:fixed to overlay instead of hiding parent
        document.querySelectorAll('.subpage').forEach(s => { s.classList.remove('visible'); s.style.cssText = ''; });
        const panel = document.getElementById('moodboard-panel');
        console.log('[robes] moodboard-panel el:', !!panel);
        if (panel) {
          panel.classList.add('visible');
          // z-index 40 — BELOW the nav (50) so the avatar dropdown stays
          // interactive, and below the rename/share sheets (200) so the
          // board's own modals render on top. 400 buried all of them.
          panel.style.cssText = 'position:fixed;inset:0;top:60px;z-index:40;background:var(--cream,#FAF8F5);overflow-y:auto';
          panel.scrollTop = 0;
        }
        window.scrollTo(0, 0);
        console.log('[robes] panel classes after:', panel?.className);

        // A populated board lives at its own address
        window._rbNav && window._rbNav('/moodboard/' + _mbSlug(title));

        // Store for save
        if (panel) panel._currentData = data;

        // Inline feedback loop — every generated board carries it (PRD §4)
        if (panel) _mbInjectFeedback(panel, data);

        // Auto-save immediately — no manual tap required. Skipped when
        // re-opening a saved board or re-rendering after a swap, else
        // every open/swap creates a duplicate entry. The saved id is kept
        // on the panel so _mbPollImages can patch images into the saved
        // entry once they finish generating.
        if (opts && opts.skipSave) {
          if (panel && data.id) panel._savedId = data.id;
          return;
        }
        const mbSavedId = _mbAdd({
          title: data.title || data.prompt || 'Moodboard',
          subtitle: data.location_context || '',
          img: grid_images.find(g => g?.type === 'hero_look' && g?.url)?.url || data.hero_image || null,
          prompt: data.prompt,
          the_look: data.the_look,
          aesthetic_tags: data.aesthetic_tags,
          location_context: data.location_context,
          editorial_direction: data.editorial_direction,
          grid_images: grid_images,
        });
        if (panel) panel._savedId = mbSavedId;
      }

      function _mbInjectFeedback(panel, data) {
        const old = panel.querySelector('#mb-fb');
        if (old) old.remove();
        const fb = document.createElement('div');
        fb.id = 'mb-fb';
        fb.style.cssText = 'margin:36px auto 40px;max-width:640px;padding:28px 24px;background:rgba(32,32,33,0.03);border-radius:var(--rad);text-align:center';
        fb.innerHTML = `
          <div style="font-family:'Cormorant',Georgia,serif;font-size:22px;font-weight:300;color:#202021;margin-bottom:6px">How is this board?</div>
          <div id="mb-fb-prompt">
            <div style="font-size:13px;color:var(--ink-faint);margin-bottom:18px;font-style:italic">Tell us — your taste shapes what comes next.</div>
            <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
              <button id="mb-fb-up" onclick="window.__mbFbRate(1)" style="display:flex;align-items:center;gap:8px;padding:10px 22px;border:1px solid rgba(32,32,33,0.15);border-radius:40px;background:#fff;font-size:12px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#202021;font-family:inherit">👍 Love it</button>
              <button id="mb-fb-dn" onclick="window.__mbFbRate(0)" style="display:flex;align-items:center;gap:8px;padding:10px 22px;border:1px solid rgba(32,32,33,0.15);border-radius:40px;background:#fff;font-size:12px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#202021;font-family:inherit">Not quite</button>
            </div>
          </div>
          <div id="mb-fb-expand" hidden style="margin-top:16px">
            <textarea id="mb-fb-text" placeholder="What would have made it better?" rows="3" style="width:100%;border:1px solid rgba(32,32,33,0.15);border-radius:var(--rad-sm);padding:12px 14px;font-size:13px;color:#202021;resize:none;outline:none;box-sizing:border-box;font-family:inherit"></textarea>
            <button onclick="window.__mbFbSubmit()" style="margin-top:10px;padding:10px 28px;background:#202021;color:#fff;border:none;border-radius:40px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;font-family:inherit">Send feedback</button>
          </div>
          <div id="mb-fb-done" hidden style="font-size:13px;color:#7E7C5A;margin-top:12px">Thank you — noted.</div>`;
        panel.appendChild(fb);
        let mbFbRating = null;
        window.__mbFbRate = function(val) {
          mbFbRating = val;
          document.getElementById('mb-fb-up').style.background = val === 1 ? '#F0EDE8' : '#fff';
          document.getElementById('mb-fb-dn').style.background = val === 0 ? '#F0EDE8' : '#fff';
          document.getElementById('mb-fb-expand').hidden = false;
          setTimeout(() => { const t = document.getElementById('mb-fb-text'); if (t) t.focus(); }, 60);
        };
        window.__mbFbSubmit = function() {
          const comment = (document.getElementById('mb-fb-text').value || '').trim();
          fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
            email: (window.__robes_session && window.__robes_session.user && window.__robes_session.user.email) || '',
            rating: mbFbRating,
            comment,
            prompt: data.prompt || data.title || '',
            looksOutput: JSON.stringify({ surface: 'moodboard', title: data.title || '', tags: data.aesthetic_tags || [], location_context: data.location_context || '', ts: new Date().toISOString() }),
          }) }).catch(() => {});
          _rbFbCloud('moodboard', (panel && panel._savedId) || data.id || null, mbFbRating, comment);
          document.getElementById('mb-fb-prompt').hidden = true;
          document.getElementById('mb-fb-expand').hidden = true;
          document.getElementById('mb-fb-done').hidden = false;
        };
      }

      window.__mbCloseResult = function() {
        const panel = document.getElementById('moodboard-panel');
        const wasOpen = panel && panel.classList.contains('visible');
        if (panel) { panel.classList.remove('visible'); panel.style.cssText = ''; }
        const fromList = window._mbOpenedFromList;
        window._mbOpenedFromList = false;
        _waAfterAdd = null; // leaving the board cancels any armed snap-mine swap
        window.rbClearCrumb && window.rbClearCrumb();
        if (wasOpen && window.location.pathname.indexOf('/moodboard/') === 0) {
          window._rbNav && window._rbNav(fromList ? '/moodboards' : '/dashboard');
        }
      };

      window.__mbSaveMoodboard = function() {
        // Auto-saved on generation — this is a no-op but kept for bundle compat
        _waShowToast('Saved to your moodboards');
      };

      // ── Snap Mine: open wardrobe add flow ────────────────────────────────
      let _mbSwapIdx = null; // item index the open swap modal is targeting
      window.__mbSnapMine = function() {
        // Arm the post-add hook so the snapped piece lands into this look's
        // slot (its rail thumbnail then shows the new item's photo).
        const idx = _mbSwapIdx;
        _waAfterAdd = (newId) => window.__mbSwapApply(idx, newId);
        _waEditId = null;
        document.getElementById('mb-swap-modal')?.remove();
        if (window.WA && WA.open) WA.open();
      };

      // ── Swap Modal: PRD 3.B — wardrobe grid + Snap Mine + Shop CTA ───────
      // Flick-through for the moodboard rack — cycles the piece's owned
      // same-category options (the served state is option 0). The editorial
      // item name stays; only which owned piece backs it changes, matching
      // the swap flow. Persist + re-render via _mbCommitLook.
      function _mbOpts(item) {
        if (!item._orig) item._orig = { match: item.wardrobe_match || null };
        const cat = (item.category || '').toLowerCase().replace(/s$/, '');
        const origId = item._orig.match ? String(item._orig.match.id) : null;
        const list = [{ match: item._orig.match }];
        _waItems
          .filter(wi => ((wi.category || '').toLowerCase().replace(/s$/, '') === cat) && String(wi.id) !== origId)
          .slice(0, 8)
          .forEach(wi => list.push({ match: { id: wi.id, label: wi.label, image_url: wi.image_url || null, color: wi.color || '' } }));
        return list;
      }
      function _mbOptIdx(item, list) {
        const cur = item.wardrobe_match ? String(item.wardrobe_match.id) : null;
        const i = list.findIndex(o => (o.match ? String(o.match.id) : null) === cur);
        return i === -1 ? 0 : i;
      }
      // Persist the current look + re-render the rail/mosaic (the rack update
      // is what a swap/flick/add reflects — the moodboard's editorial mosaic
      // is not per-piece imagery, so the collage itself is unchanged).
      function _mbCommitLook() {
        const panel = document.getElementById('moodboard-panel');
        if (panel && panel._currentData) {
          panel._currentData.the_look = window.__mbCurrentLook;
          _mbShowResult(panel._currentData, { skipSave: true });
          if (panel._savedId) _mbUpdate(panel._savedId, { the_look: window.__mbCurrentLook });
        }
      }
      window.__mbFlip = function(idx, dir) {
        const look = window.__mbCurrentLook || [];
        const item = look[idx];
        if (!item) return;
        const list = _mbOpts(item);
        if (list.length < 2) { _waShowToast('Nothing else in your wardrobe for this slot yet'); return; }
        const next = list[(_mbOptIdx(item, list) + dir + list.length) % list.length];
        item.wardrobe_match = next.match;
        _mbCommitLook();
      };
      // Add a piece to the look (+ button / rail nudge) — opens the wardrobe
      // add modal over the board; the new piece joins The Rack as an owned item.
      window.__mbAddPiece = function() {
        _waEditId = null;
        _waAfterAdd = (newId) => {
          const wi = _waItems.find(i => String(i.id) === String(newId));
          if (!wi) return;
          window.__mbCurrentLook = window.__mbCurrentLook || [];
          window.__mbCurrentLook.push({
            name: wi.label, brand_name: wi.brand || '', category: wi.category || 'Other',
            retailer_hint: '', price_point: '',
            wardrobe_match: { id: wi.id, label: wi.label, image_url: wi.image_url || null, color: wi.color || '' },
          });
          _mbCommitLook();
          _waShowToast(wi.label + ' added to the look');
        };
        if (window.WA && WA.open) WA.open();
      };

      window.__mbSwap = function(idx) {
        const look = window.__mbCurrentLook || [];
        const item = look[idx];
        if (!item) return;
        _mbSwapIdx = idx;
        document.getElementById('mb-swap-modal')?.remove();

        const catLower = (item.category || '').toLowerCase();
        const candidates = _waItems.filter(wi => {
          const wiCat = (wi.category || '').toLowerCase();
          return wiCat === catLower || catLower.includes(wiCat) || wiCat.includes(catLower) || wiCat.replace(/s$/,'') === catLower.replace(/s$/,'');
        });
        const retailer = item.retailer_hint || '';
        const price = item.price_point || '';

        // AI alternative: closest non-exact match when wardrobe has items but none in this category
        let aiAlt = null;
        if (!candidates.length && _waItems.length > 0) {
          aiAlt = _waItems[0];
        }

        const closeSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        const cameraSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
        const arrowSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;

        // Wardrobe section — 4-col grid or AI alternative
        let wardrobeSection = '';
        if (candidates.length > 0) {
          const itemsHtml = candidates.slice(0, 8).map(wi => `
            <div onclick="window.__mbSwapApply(${idx},'${_mbEsc(wi.id)}')" style="cursor:pointer;border-radius:var(--rad-sm);overflow:hidden;background:#fff;border:0.5px solid rgba(32,32,33,0.08);transition:box-shadow .15s" onmouseenter="this.style.boxShadow='0 4px 12px rgba(32,32,33,0.12)'" onmouseleave="this.style.boxShadow='none'">
              ${wi.image_url
                ? `<img src="${_mbEsc(wi.image_url)}" style="width:100%;aspect-ratio:1;object-fit:cover;display:block" alt="">`
                : `<div style="aspect-ratio:1;background:#EDE8E0;display:flex;align-items:center;justify-content:center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C8C0B8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`}
            </div>`).join('');
          wardrobeSection = `
            <div style="margin-bottom:24px">
              <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin:0 0 10px">From your wardrobe</p>
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${itemsHtml}</div>
            </div>`;
        } else if (aiAlt) {
          wardrobeSection = `
            <div style="margin-bottom:24px;background:#F5F2EE;border-radius:var(--rad);padding:14px">
              <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin:0 0 6px">Robes’ suggestion</p>
              <p style="font-family:'Cormorant',Georgia,serif;font-size:15px;font-weight:300;color:#202021;margin:0 0 10px;line-height:1.5">You don't have a ${_mbEsc(item.category.toLowerCase())}, but your <em>${_mbEsc(aiAlt.label)}</em> creates a similar outline.</p>
              <button onclick="window.__mbSwapApply(${idx},'${_mbEsc(aiAlt.id)}')" style="font-size:10px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:#202021;background:#EDE8E0;border:none;border-radius:20px;padding:6px 14px;cursor:pointer">Use this instead</button>
            </div>`;
        }

        const modal = document.createElement('div');
        modal.id = 'mb-swap-modal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:24px';
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
        modal.innerHTML = `
          <div style="background:#FAF8F5;border-radius:20px;width:100%;max-width:480px;max-height:80vh;overflow-y:auto;box-sizing:border-box;box-shadow:0 24px 60px -12px rgba(32,32,33,0.28)">
            <div style="position:sticky;top:0;background:#FAF8F5;padding:20px 20px 0;z-index:2">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:2px">
                <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-faint);margin:0">Swap this piece</p>
                <button onclick="document.getElementById('mb-swap-modal').remove()" style="background:none;border:none;cursor:pointer;padding:2px;color:var(--ink-faint);line-height:1;margin-top:-2px">${closeSvg}</button>
              </div>
              <p style="font-family:'Cormorant',Georgia,serif;font-size:26px;font-weight:300;color:#202021;margin:0 0 2px;line-height:1.15">${_mbEsc(item.name)}</p>
              ${retailer ? `<p style="font-size:12px;color:var(--ink-faint);font-style:italic;margin:0 0 18px">${_mbEsc(retailer)}</p>` : `<div style="height:18px"></div>`}
              <div style="height:1px;background:rgba(32,32,33,0.08);margin:0 -20px 20px"></div>
            </div>
            <div style="padding:0 20px 32px">
              ${wardrobeSection}
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:${(retailer || price) ? '10px' : '0'}">
                <button onclick="window.__mbSnapMine()" style="display:inline-flex;align-items:center;justify-content:center;gap:7px;font-size:12px;font-weight:500;color:#202021;background:#EDE8E0;border:none;border-radius:100px;padding:14px 16px;cursor:pointer;letter-spacing:.01em">
                  ${cameraSvg} Snap mine
                </button>
                <button onclick="window.__rbAffiliateSoon('mb-swap-modal')" style="display:inline-flex;align-items:center;justify-content:center;gap:7px;font-size:12px;font-weight:500;color:#202021;background:#fff;border:1px solid rgba(32,32,33,0.15);border-radius:100px;padding:14px 16px;cursor:pointer;letter-spacing:.01em">
                  Shop via Affiliate ${arrowSvg}
                </button>
              </div>
              ${(retailer || price) ? `<p style="text-align:center;font-size:11px;color:var(--ink-faint);margin:0">Opens ${_mbEsc(retailer)}${price ? ' · ' + _mbEsc(price) : ''}</p>` : ''}
            </div>
          </div>`;
        document.body.appendChild(modal);
      };

      window.__mbSwapApply = function(lookIdx, wardrobeId) {
        _rbTrack('piece_swapped', { surface: 'moodboard', item: String(wardrobeId) });
        const wi = _waItems.find(i => i.id === wardrobeId);
        if (!wi || !window.__mbCurrentLook?.[lookIdx]) return;
        window.__mbCurrentLook[lookIdx].wardrobe_match = { id: wi.id, label: wi.label, image_url: wi.image_url || null, color: wi.color || '' };
        document.getElementById('mb-swap-modal')?.remove();
        _mbCommitLook();
        _waShowToast(wi.label + ' swapped in');
      };

      // ── Moodboard full list page ─────────────────────────────────────
      const _mbListPage = document.createElement('div');
      _mbListPage.id = 'mb-list-page';
      // Under the main nav (top:60px, z below nav's 50) so weather /
      // wardrobe / avatar stay visible — no separate mini-nav of its own
      _mbListPage.style.cssText = 'display:none;position:fixed;left:0;right:0;bottom:0;top:60px;z-index:45;background:#FAF8F5;overflow-y:auto';
      _mbListPage.innerHTML = `
        <div style="padding:32px 24px 80px;max-width:960px;margin:0 auto">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
            <p style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint);margin:0">Your moodboards</p>
            <button onclick="window.__mbCloseList();window.__rbStartMoodboard()" style="display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:100px;background:#202021;color:#FAF8F5;font-size:10px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;border:none;cursor:pointer">+ New</button>
          </div>
          <div id="mb-list-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px"></div>
          <div id="mb-list-empty" style="display:none;padding:80px 0;text-align:center">
            <p style="font-family:'Cormorant',Georgia,serif;font-size:22px;font-weight:300;color:#202021;margin:0 0 10px">No moodboards yet.</p>
            <p style="font-size:13px;color:var(--ink-faint);line-height:1.6">Describe a trip or season and Robes<br>will build the board.</p>
          </div>
        </div>`;
      document.body.appendChild(_mbListPage);

      function _mbRenderPage() {
        const items = _mbLoad();
        const grid = document.getElementById('mb-list-grid');
        const empty = document.getElementById('mb-list-empty');
        if (!grid) return;
        if (!items.length) { grid.style.display = 'none'; empty.style.display = 'block'; return; }
        grid.style.display = 'grid'; empty.style.display = 'none';
        grid.innerHTML = items.map(item => `
          <div onclick="window.__mbOpenSaved(${item.id})" style="cursor:pointer;border-radius:var(--rad-card);overflow:hidden;background:#fff;border:0.5px solid rgba(32,32,33,0.1);transition:box-shadow .2s" onmouseenter="this.style.boxShadow='0 12px 32px -16px rgba(32,32,33,0.18)'" onmouseleave="this.style.boxShadow='none'">
            <div style="position:relative">
              ${item.img
                ? `<img src="${_mbEsc(item.img)}" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block" alt="">`
                : `<div style="width:100%;aspect-ratio:4/3;background:linear-gradient(135deg,#C8B8C8,#A8B8A0)"></div>`}
              <button onclick="event.stopPropagation();window.__mbRemoveSaved(${item.id})" style="position:absolute;top:10px;right:10px;opacity:0;transition:opacity .15s;background:rgba(32,32,33,0.55);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center" onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0'">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div style="padding:14px 16px 18px">
              <div style="font-family:'Cormorant',Georgia,serif;font-size:17px;font-weight:300;color:#202021;line-height:1.3;margin-bottom:4px">${_mbEsc(item.title)}</div>
              <div style="font-size:11px;color:var(--ink-faint)">${_mbEsc(item.subtitle || '')}</div>
            </div>
          </div>`).join('');
      }

      window._mbShowAllPage = function() {
        if (_RB_MB_HIDDEN) return;
        _mbListPage.style.display = 'block';
        _mbRenderPage();
        window.rbSetCrumb && window.rbSetCrumb([{ label: 'Your Moodboards' }]);
        window._rbNav && window._rbNav('/moodboards');
      };
      window.__mbOpenList = function() {
        window._mbShowAllPage();
      };
      window.__mbCloseList = function() {
        _mbListPage.style.display = 'none';
        window.rbClearCrumb && window.rbClearCrumb();
        window._rbNav && window._rbNav('/dashboard');
      };
      window.__mbRemoveSaved = function(id) {
        window._rbConfirmDelete('Delete this moodboard?', function() { _mbRemove(id); });
      };
      window.__mbOpenSaved = function(id) {
        if (_RB_MB_HIDDEN) return;
        const item = _mbLoad().find(i => i.id === id);
        if (!item) return;
        const fromList = _mbListPage.style.display !== 'none';
        _mbListPage.style.display = 'none';
        window._mbOpenedFromList = fromList;
        _mbShowResult(item, { skipSave: true });
      };

      // Patch snRefreshRow to also refresh v2 sections
      const _origSnRefreshRow = snRefreshRow;
      snRefreshRow = function() {
        _origSnRefreshRow();
        _rbRenderMoodboards();
        _rbRenderStyleNotes();
      };

      // Persona-aware masthead (Phase 3 — the returning-user home). The static
      // Masthead: one register for everyone — time-of-day greeting + the
      // static echo. (The returner-detection path was removed in the Wave 5
      // sweep: _rbUpdateMasthead stopped consuming it in bug report 4.7.)
      function _rbUpdateMasthead() {
        // One masthead for everyone (bug report 4.7): time-of-day greeting +
        // the static echo. The returner "Welcome back · N pieces catalogued …"
        // status line was dropped — it read as clutter above the prompt.
        const greetEl = document.getElementById('dash-greet');
        const p = window.__robes_profile || {};
        const nm = (p.first_name || '').trim().split(/\s+/)[0] || '';
        if (greetEl) {
          const h = new Date().getHours();
          const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
          greetEl.textContent = part + (nm ? ', ' + nm : '') + '.';
        }
      }
      _rbUpdateMasthead();

      // Apply layout restructure after bundle finishes rendering
      setTimeout(function _rbApplyLayout() {
        const dash = document.getElementById('dash');
        if (!dash) return;

        // Remove bundle's dual section (Today + Inspiration)
        const dual = document.getElementById('dual');
        if (dual) dual.remove();

        // Remove old sn-row (injected by snRefreshRow above) — we replace it
        const oldSn = document.getElementById('sn-row');
        if (oldSn) oldSn.remove();

        // Find insertion anchor
        const tracker = dash.querySelector('.tracker');
        const services = dash.querySelector('.services');
        const anchor = tracker || services;

        // Lookbook row sits ABOVE moodboards (wardrobe-first: her own styled
        // pieces outrank editorial inspiration).
        if (!document.getElementById('rb-sn')) {
          const snEl = document.createElement('section');
          snEl.id = 'rb-sn';
          snEl.className = 'rb-section';
          if (anchor) dash.insertBefore(snEl, anchor);
          else dash.appendChild(snEl);
        }
        if (!_RB_MB_HIDDEN && !document.getElementById('rb-mb')) {
          const mbEl = document.createElement('section');
          mbEl.id = 'rb-mb';
          mbEl.className = 'rb-section';
          const snEl = document.getElementById('rb-sn');
          const afterSn = snEl ? snEl.nextSibling : (anchor || null);
          if (afterSn) dash.insertBefore(mbEl, afterSn);
          else if (anchor) dash.insertBefore(mbEl, anchor);
          else dash.appendChild(mbEl);
        }

        // P0 stacked layout: prompt box → "Your piece, styled" (center
        // stage, temporary) → wardrobe tracker → lookbook. The tracker
        // still leads once the card collapses (elastic snap-up) — give it a
        // transition so the snap reads as movement, not a jump.
        const snSection = document.getElementById('rb-sn');
        if (tracker && snSection) dash.insertBefore(tracker, snSection);
        const styledCard = document.getElementById('rb-styled');
        if (styledCard && tracker) tracker.parentNode.insertBefore(styledCard, tracker);

        _rbRenderMoodboards();
        _rbRenderStyleNotes();
        _rbUpdateDailyOutfitLock();
        _rbFtueOrder(_waItems.length);
        _rbGateConcierge(_waItems.length);
      }, 900);

      // Also update lock state whenever wardrobe count changes
      const _origWaSyncCounts = _waSyncCounts;
      // Note: _waSyncCounts is a local function so we patch by wrapping _waLoad/_waRender instead
      // We hook _waSyncCounts in-place since it's in our closure scope
      const _rbOrigSyncCounts = _waSyncCounts;
      // Override via the already-defined function reference
      // The cleanest hook point is _waLoad (called after any wardrobe change)
      const _rbOrigWaLoad = _waLoad;
      // Cannot reassign `_waLoad` (const in some JS engines) — hook via _waSyncCounts call
      // Instead, patch the MutationObserver callback which fires after each render
      const _rbPostRenderObserver = new MutationObserver(function() {
        _rbUpdateDailyOutfitLock();
      });
      setTimeout(function() {
        const svcGrid = document.querySelector('.services-grid');
        if (svcGrid) _rbPostRenderObserver.observe(svcGrid, { childList: true, subtree: false });
      }, 1200);

      // ── URL routing — clean paths for wardrobe / lookbook / moodboards ──
      // pushState keeps the address bar honest and makes views shareable;
      // popstate makes the browser back button actually walk the views.
      let _rbRouting = false;
      window._rbNav = function(path) {
        if (_rbRouting) return;
        try { if (window.location.pathname !== path) history.pushState({ rb: path }, '', path); } catch (e) {}
      };
      window.addEventListener('popstate', function() {
        _rbRouting = true;
        try {
          const p = window.location.pathname;
          const snEl = document.getElementById('sn-page');
          if (snEl && p !== '/lookbook') { snEl.style.display = 'none'; }
          if (p !== '/moodboards') _mbListPage.style.display = 'none';
          window.__mbCloseResult && window.__mbCloseResult();
          if (kpResultPage) kpResultPage.style.display = 'none';
          if (dlResultPage) dlResultPage.style.display = 'none';
          if (tvResultPage) tvResultPage.style.display = 'none';
          if (wkResultPage) wkResultPage.style.display = 'none';
          const wp = document.querySelector('.wardrobe-panel');
          const wpOpen = wp && wp.classList.contains('visible');
          if (wpOpen && p !== '/wardrobe' && p !== '/wishlist') {
            const wbtnCount = document.querySelector('.nav-wbtn-count');
            const wbtn = wbtnCount ? wbtnCount.closest('button') : null;
            if (wbtn) wbtn.click(); else wp.classList.remove('visible');
          }
          if (p === '/lookbook') window.__snOpen && window.__snOpen();
          else if (p === '/moodboards' && !_RB_MB_HIDDEN) window._mbShowAllPage && window._mbShowAllPage();
          else if (p.indexOf('/moodboard/') === 0 && !_RB_MB_HIDDEN) {
            const item = window._mbFindBySlug && window._mbFindBySlug(p.slice('/moodboard/'.length));
            if (item && window.__mbOpenSaved) window.__mbOpenSaved(item.id);
          }
          else if (p === '/wardrobe') {
            if (!wpOpen && window.App && App.showWardrobe) App.showWardrobe();
            if (window.__waSetView) window.__waSetView('all');
          }
          else if (p === '/wishlist') {
            if (!wpOpen && window.App && App.showWardrobe) App.showWardrobe();
            if (window.__waSetView) setTimeout(() => window.__waSetView('wishlist'), 50);
          }
          else window.rbClearCrumb && window.rbClearCrumb();
        } catch (e) {} finally { _rbRouting = false; }
      });

      // Pull the durable lookbook/moodboards from Supabase — refreshes all
      // dashboard rows once the cloud copy lands (and syncs up any
      // local-only entries from before the migration).
      _lbCloudPull();

      // ── Style Notes, introduced at the last milestone ────────────────────
      // Onboarding deliberately asks for NO photos of her (the face scan was
      // the likeliest bail point — beta feedback 4.7 removed it entirely).
      // Style Notes is now framed as the advanced refinement it is: it does
      // not exist on the dashboard until the wardrobe is built out, then
      // arrives once as a dark card — the only dark surface on home, so the
      // introduction reads as an arrival rather than another nudge. Gated on
      // style_dna (already in the boot select) and dismissible per user.
      // Re-run from _waSyncCounts because the count lands async.
      setTimeout(_rbSilPrompt, 1200);
      function _rbSilPrompt() {
        try {
          const card0 = document.getElementById('rb-sil-prompt');
          if (_waItems.length < _MS_UNLOCKS[_MS_UNLOCKS.length - 1].at) {
            if (card0) card0.remove();
            return;
          }
          const prof = window.__robes_profile || {};
          const dna = prof.style_dna || {};
          const needsColour = !dna.color_harmony;
          const needsSil = !dna.silhouette_proportions;
          if (!needsColour && !needsSil) { if (card0) card0.remove(); return; }
          const uid = prof.id || _waUid() || '';
          if (!uid) return;
          if (localStorage.getItem('rb_sil_prompt_off__' + uid)) return;
          if (card0) return;
          const grid = document.querySelector('.services-grid');
          if (!grid) return;
          const both = needsColour && needsSil;
          const headline = both
            ? 'Your colours &amp; silhouette, <em style="font-style:italic;color:#C4B8A4">whenever suits.</em>'
            : (needsColour
              ? 'Your colour harmony, <em style="font-style:italic;color:#C4B8A4">whenever suits.</em>'
              : 'Your silhouette, <em style="font-style:italic;color:#C4B8A4">whenever suits.</em>');
          const cta = both ? 'Complete my style notes →' : (needsColour ? 'Complete my colours →' : 'Complete my silhouette →');
          const target = needsColour ? '/stylenotes' : '/stylenotes#silhouette';
          const host = grid.closest('section') || grid;
          const card = document.createElement('section');
          card.id = 'rb-sil-prompt';
          card.style.cssText = 'max-width:1140px;margin:26px auto;position:relative';
          card.innerHTML =
            '<div style="font-size:10px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--sage);margin-bottom:10px">Style notes · newly available</div>' +
            '<div style="background:#202021;border-radius:var(--rad-card);padding:24px 26px;display:flex;flex-direction:column;gap:16px;align-items:flex-start">' +
              '<div style="font-family:\'Cormorant\',Georgia,serif;font-size:23px;font-weight:300;line-height:1.2;color:#FAF8F5">' + headline + '</div>' +
              '<button id="rb-sil-go" style="background:#FAF8F5;color:#202021;border:none;border-radius:100px;padding:13px 22px;font-size:11px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;font-family:inherit">' + cta + '</button>' +
            '</div>' +
            '<button id="rb-sil-x" aria-label="Not now" style="position:absolute;top:28px;right:16px;background:none;border:none;cursor:pointer;color:rgba(250,248,245,0.55);font-size:16px;line-height:1;padding:4px">×</button>';
          host.parentNode.insertBefore(card, host);
          card.querySelector('#rb-sil-go').onclick = function() { window.location.href = target; };
          card.querySelector('#rb-sil-x').onclick = function() {
            try { localStorage.setItem('rb_sil_prompt_off__' + uid, '1'); } catch (e) {}
            card.remove();
          };
        } catch (e) { console.warn('[robes] style-note prompt:', e); }
      }

      // ── Onboarding handoff — "Your piece, styled" as an inline card ─────
      // /onboarding step 04 stores {prompt, photo} then lands here. The
      // wardrobe-first PRD relocated the wow moment: no full-screen overlay,
      // no gate — a card on the dashboard itself, loading → styled, sitting
      // right under the wardrobe progress module. Tapping through opens the
      // full three-look render (which also saves it to the lookbook).
      // ── The home calendar rail (Diary Stage 2 / handoff Phase 5) ───────
      // Seven cards across the top of home: yesterday, today, the next five
      // days — the read surface planned_days was built for. DATE-driven:
      // seven cards always, one per date, never one per moment (a date with
      // two moments shows the evening as a quiet second line). Empty states
      // are the cold-start surface: a user with nothing planned sees
      // invitations, never a blank strip. Card tap opens the day's plan;
      // empty cards aim the prompt at that date (the interim for the Stage 3
      // scope chip — when the chip ships, populated-card tap becomes scope
      // too and open moves fully onto the card CTA).
      (function _rbRail() {
        var _railSlots = null;
        var _railToday = null;

        // "Palette whisper" (design 1c, 2026-07-23 — supersedes the warm
        // frame): text-led calendar cells with NO imagery. Three small
        // swatches stand in for photos — the look's colour story in a
        // whisper, derived from the day's owned pieces (item_dna hex, then
        // the _ALL_SWATCHES name map). A dot-coded source tag identifies
        // the day's plan: cream = daily, sage = week, mauve = trip.
        //
        // GEOMETRY IS LOCKED: seven equal columns, today the same width
        // (color only), one card height — two title lines reserved, row
        // heights equalise via grid stretch. Home's height ladder:
        // week-ahead compact < concierge medium (.svc-img 16:9) < lookbook
        // tall hero (.rb-sn-img 3:4). Judge changes on the FULL homepage,
        // never the rail alone.
        const RAIL_CSS = `
#rb-rail{margin:6px 0 30px}
#rb-rail .rb-rail-head{display:flex;align-items:baseline;justify-content:space-between;margin:0 0 10px}
#rb-rail .rb-rail-ey{font-size:10px;font-weight:500;letter-spacing:.24em;text-transform:uppercase;color:var(--rose,#8E7077)}
#rb-rail .rb-rail-row{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:12px}
#rb-rail .rb-rc{position:relative;display:flex;flex-direction:column;padding:0;background:#fff;border:0.5px solid rgba(32,32,33,0.12);border-radius:var(--rad-card);cursor:pointer;box-sizing:border-box;overflow:hidden;transition:border-color .2s;text-align:left}
#rb-rail .rb-rc:hover{border-color:rgba(32,32,33,0.4)}
#rb-rail .rb-rc-body{flex:1;display:flex;flex-direction:column;gap:5px;padding:13px 14px 13px;min-width:0;min-height:172px}
#rb-rail .rb-rc-wk{font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#rb-rail .rb-rc-act{font-family:'Cormorant',Georgia,serif;font-size:16px;line-height:1.15;color:var(--ink,#202021);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;min-height:2.3em}
#rb-rail .rb-rc-eve{font-size:9.5px;color:var(--ink-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#rb-rail .rb-rc-eve b{font-weight:500;color:#6E6A64}
#rb-rail .rb-rc-tag{display:flex;align-items:center;gap:6px;font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
#rb-rail .rb-rc-tag i{flex:none;width:7px;height:7px;border-radius:50%;box-shadow:inset 0 0 0 0.5px rgba(32,32,33,0.15)}
#rb-rail .rb-rc-sw{display:flex;gap:6px;margin-top:auto;padding:10px 0 8px}
#rb-rail .rb-rc-sw i{width:12px;height:12px;border-radius:50%;box-shadow:inset 0 0 0 0.5px rgba(32,32,33,0.16)}
#rb-rail .rb-rc-sw + .rb-rc-cta{margin-top:0}
#rb-rail .rb-rc-cta{margin-top:auto;padding-top:5px;font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint);background:none;border:none;padding-left:0;padding-right:0;padding-bottom:0;cursor:pointer;text-align:left;font-family:inherit;transition:color .2s}
#rb-rail .rb-rc:hover .rb-rc-cta{color:var(--ink,#202021)}
#rb-rail .rb-rc.is-today{background:var(--ink,#202021);border-color:var(--ink,#202021)}
#rb-rail .rb-rc.is-today .rb-rc-body{background:var(--ink,#202021)}
#rb-rail .rb-rc.is-today .rb-rc-wk{color:var(--ink-faint)}
#rb-rail .rb-rc.is-today .rb-rc-act{color:#FAF8F5}
#rb-rail .rb-rc.is-today .rb-rc-eve{color:var(--ink-faint)}
#rb-rail .rb-rc.is-today .rb-rc-eve b{color:#E7E0CF}
#rb-rail .rb-rc.is-today .rb-rc-tag{color:var(--ink-faint)}
#rb-rail .rb-rc.is-today .rb-rc-sw i{box-shadow:inset 0 0 0 0.5px rgba(250,248,245,0.35)}
#rb-rail .rb-rc.is-today .rb-rc-cta{color:var(--ink-faint)}
#rb-rail .rb-rc.is-today:hover .rb-rc-cta{color:#FAF8F5}
#rb-rail .rb-rc.is-past{opacity:.78}
#rb-rail .rb-rc.is-past .rb-rc-body{background:#F5F0E8}
#rb-rail .rb-rc.is-free{background:transparent;border-style:dashed;border-color:rgba(32,32,33,0.2);background-image:repeating-linear-gradient(45deg,rgba(32,32,33,0.028) 0 6px,transparent 6px 13px)}
#rb-rail .rb-rc.is-free .rb-rc-act{font-style:italic;font-size:16px;color:var(--ink-faint)}
#rb-rail .rb-rc.is-empty-future{background:transparent;border-style:dashed;border-color:rgba(32,32,33,0.2)}
#rb-rail .rb-rc.is-empty-future .rb-rc-act{font-style:italic;font-size:15.5px;color:var(--ink-faint)}
#rb-rail .rb-rc.is-empty-today{background:transparent;border:1px dashed var(--ink,#202021)}
#rb-rail .rb-rc.is-empty-today .rb-rc-act{font-style:italic;font-size:16px;color:var(--ink,#202021)}
#rb-rail .rb-rc.is-empty-past{background:transparent;border-style:dashed;border-color:rgba(32,32,33,0.1);opacity:.45;cursor:default}
#rb-rail .rb-rc.is-pinned{border-color:var(--mauve,#D4C8C4);box-shadow:0 0 0 1px var(--mauve,#D4C8C4) inset}
#rb-rail .rb-rc-worn{font-size:10px;letter-spacing:.06em;color:#7E7C5A;margin-top:auto}
#rb-rail .rb-upnext{display:flex;align-items:center;gap:12px;width:100%;box-sizing:border-box;text-align:left;margin-top:10px;padding:8px 14px;background:rgba(212,200,196,0.16);border:0.5px solid rgba(32,32,33,0.1);border-radius:var(--rad);cursor:pointer;font-family:inherit;transition:border-color .2s}
#rb-rail .rb-upnext:hover{border-color:rgba(32,32,33,0.35)}
#rb-rail .rb-upnext .th{flex:none;width:36px;height:36px;border-radius:7px;overflow:hidden;background:#EFE9DC}
#rb-rail .rb-upnext .th img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(.55) sepia(.18) contrast(.95)}
#rb-rail .rb-upnext .k{flex:none;font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint)}
#rb-rail .rb-upnext .t{font-family:'Cormorant',Georgia,serif;font-size:16px;color:var(--ink,#202021);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#rb-rail .rb-upnext .m{font-size:10.5px;color:var(--ink-faint);white-space:nowrap}
#rb-rail .rb-upnext .cta{margin-left:auto;flex:none;font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint)}
#rb-rail .rb-upnext:hover .cta{color:var(--ink,#202021)}
@media(max-width:999px){
  #rb-rail .rb-rail-row{display:flex;overflow-x:auto;scroll-snap-type:x proximity;padding-bottom:6px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
  #rb-rail .rb-rail-row::-webkit-scrollbar{display:none}
  #rb-rail .rb-rc{flex:none;width:158px;scroll-snap-align:center}
  #rb-rail .rb-dc{flex:none;width:170px;scroll-snap-align:center}
  #rb-rail .rb-upnext{flex-wrap:wrap;gap:8px}
  #rb-rail .rb-upnext .cta{margin-left:0}
}`;

        function mount() {
          const dash = document.getElementById('dash');
          const conc = dash && dash.querySelector('.concierge');
          if (!conc) return false;
          if (!document.getElementById('rb-rail-style')) {
            const st = document.createElement('style');
            st.id = 'rb-rail-style';
            st.textContent = RAIL_CSS;
            document.head.appendChild(st);
          }
          if (!document.getElementById('rb-rail')) {
            const el = document.createElement('section');
            el.id = 'rb-rail';
            conc.parentNode.insertBefore(el, conc.nextSibling);
          }
          return true;
        }

        function fmtCard(iso) {
          const d = new Date(iso + 'T00:00:00');
          const now = new Date(_railToday + 'T00:00:00');
          const sameMonth = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          const dm = d.toLocaleDateString('en-GB', sameMonth ? { weekday: 'short', day: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short' });
          if (iso === _railToday) return 'Today · ' + dm;
          if (iso === _pdAddISO(_railToday, -1)) return 'Yesterday · ' + dm;
          if (iso === _pdAddISO(_railToday, 1)) return 'Tomorrow · ' + dm;
          return dm;
        }
        function fmtLong(iso) {
          const d = new Date(iso + 'T00:00:00');
          return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
        }
        function cardState(slot) {
          const past = slot.date < _railToday, today = slot.date === _railToday;
          if (!slot.moments.length) return past ? 'empty-past' : today ? 'empty-today' : 'empty-future';
          if (slot.moments.every(m => m.status === 'free')) return 'free';
          return past ? 'past' : today ? 'today' : 'planned';
        }
        // One glanceable fact, not a description: the destination for a
        // trip, the week's start for a plan, "Daily look" for a one-off.
        function srcFact(m) {
          const it = snLoad().find(x => String(x.id) === String(m.source_id));
          if (m.source_type === 'travel') {
            const dest = it && it.tvData && it.tvData.destination;
            return dest ? dest + ' trip' : 'Travel edit';
          }
          if (m.source_type === 'weekly') {
            const iso = (it && it.wkData && Array.isArray(it.wkData.week_iso)) ? it.wkData.week_iso[0] : null;
            return iso ? 'Week of ' + new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Weekly plan';
          }
          return 'Daily look';
        }
        // Dot-coded source identity: cream = daily, sage = week, mauve = trip
        function srcDot(type) { return type === 'travel' ? '#D4C8C4' : type === 'weekly' ? '#9BA17B' : '#E3D9C6'; }
        function tagHtml(m) {
          return `<div class="rb-rc-tag"><i style="background:${srcDot(m.source_type)}"></i>${_waEsc(srcFact(m))}</div>`;
        }
        // The look's colour story in a whisper: up to three swatches from
        // the day's owned pieces — item_dna hex first, then the palette
        // name map. No colours resolvable → no row (never placeholder dots).
        function dayColors(slot) {
          const out = [];
          slot.moments.forEach(m => (m.item_ids || []).forEach(id => {
            if (out.length >= 3) return;
            const wi = _waItems.find(w => String(w.id) === String(id));
            if (!wi) return;
            let hex = wi.item_dna && wi.item_dna.display && wi.item_dna.display.primary_color_hex;
            if (!hex || !/^#[0-9a-fA-F]{3,8}$/.test(String(hex))) {
              const sw = _ALL_SWATCHES.find(s => s.name.toLowerCase() === String(wi.color || '').toLowerCase());
              hex = sw ? sw.hex : null;
            }
            if (hex && out.indexOf(hex) === -1) out.push(hex);
          }));
          return out;
        }

        // DayCard path (spec v2.0): full density, wardrobe thumbnails
        // (§10.1 — replaces the palette-whisper swatches), membership-only
        // chip (a daily look carries none). Body-tap on a populated card
        // opens the day PEEK (Annie §6.2); on an empty/free card it aims
        // the prompt (the component folds free into empty — "Tap to dress
        // it"). The ring scopes the prompt to the date — the old
        // flag-dependent body branch (__rbRailTap) survives only for the
        // ?daycard=off path.
        function cardV2(slot, i) {
          const dayM = slot.moments.find(m => (m.slot || 'day') === 'day') || slot.moments[0] || null;
          const eveM = slot.moments.find(m => m.slot === 'evening') || null;
          const d = _dcMoments(dayM, eveM, { date: slot.date, today: _railToday, eyebrow: fmtCard(slot.date).toUpperCase() });
          const populated = d.state === 'past' || d.state === 'today' || d.state === 'planned';
          const body = d.state === 'empty-past' ? null
            : populated ? `window.__rbRailPeek(${i})` : `window.__rbRailScope(${i})`;
          return _dcCard(d, {
            density: 'full',
            body,
            ring: populated ? `window.__rbRailFocus(${i},event)` : null,
            ringTip: 'Refine the prompt for this day',
            ringTipShort: 'Refine prompt',
          });
        }

        function cardHtml(slot, i) {
          if (_rbDayCardOn()) return cardV2(slot, i);
          const state = cardState(slot);
          const dayMoment = slot.moments.find(m => (m.slot || 'day') === 'day') || slot.moments[0];
          const eveMoment = slot.moments.find(m => m.slot === 'evening');
          const pinned = slot.moments.some(m => m.pinned);
          const worn = slot.moments.some(m => m.status === 'worn');
          const wk = `<div class="rb-rc-wk">${_waEsc(fmtCard(slot.date))}</div>`;
          const cls = 'is-' + state + (pinned ? ' is-pinned' : '');
          if (state === 'empty-past') {
            return `<div class="rb-rc ${cls}"><div class="rb-rc-body">${wk}<div class="rb-rc-act" style="font-style:italic;color:#D8CFC0">—</div></div></div>`;
          }
          if (state === 'empty-today' || state === 'empty-future') {
            // COPY: needs sign-off
            return `<div class="rb-rc ${cls}" role="button" tabindex="0" onclick="window.__rbRailScope(${i})"><div class="rb-rc-body">${wk}` +
              `<div class="rb-rc-act">${state === 'empty-today' ? 'Nothing planned yet' : 'Nothing planned'}</div>` +
              `<span class="rb-rc-cta">${state === 'empty-today' ? 'Dress today →' : 'Dress this day →'}</span></div></div>`;
          }
          if (state === 'free') {
            // A deliberately free day has nothing to open — the CTA dresses
            // it. The tag still names the plan the free day belongs to.
            return `<div class="rb-rc ${cls}" role="button" tabindex="0" onclick="window.__rbRailScope(${i})"><div class="rb-rc-body">${wk}` +
              `<div class="rb-rc-act">Left free</div>${tagHtml(dayMoment)}<span class="rb-rc-cta">Dress it →</span></div></div>`;
          }
          // Palette whisper: the title once, the plan's dot-coded tag, then
          // up to three colour swatches from the day's owned pieces.
          const act = dayMoment.activity || dayMoment.headline || 'Planned';
          let body = wk + `<div class="rb-rc-act">${_waEsc(act)}</div>`;
          if (eveMoment && eveMoment.status !== 'free') {
            body += `<div class="rb-rc-eve">Evening · <b>${_waEsc(eveMoment.activity || eveMoment.headline || 'planned')}</b></div>`;
          }
          body += tagHtml(dayMoment);
          const colors = dayColors(slot);
          if (colors.length) body += '<div class="rb-rc-sw">' + colors.map(h => `<i style="background:${h}"></i>`).join('') + '</div>';
          let cta;
          if (state === 'past') {
            // COPY: needs sign-off
            cta = worn
              ? '<div class="rb-rc-worn"' + (colors.length ? ' style="margin-top:0"' : '') + '>Worn ✓</div>'
              : `<button class="rb-rc-cta" onclick="window.__rbRailWear(${i},event)">Wore it?</button>`;
          } else {
            // The CTA is its own hit target: it always OPENS. Under the
            // diary flag the card body scopes the prompt instead (§5.4).
            cta = `<button class="rb-rc-cta" onclick="window.__rbRailOpenCta(${i},event)">${state === 'today' ? 'Open the look →' : 'Open →'}</button>`;
          }
          return `<div class="rb-rc ${cls}" role="button" tabindex="0" onclick="window.__rbRailTap(${i})"><div class="rb-rc-body">${body}${cta}</div></div>`;
        }

        function paint(slots) {
          _railSlots = slots;
          if (!mount()) return;
          const host = document.getElementById('rb-rail');
          // COPY: needs sign-off (eyebrow + hint)
          host.innerHTML =
            '<div class="rb-rail-head"><span class="rb-rail-ey">The week ahead</span>' +
            '</div>' +
            '<div class="rb-rail-row">' + slots.map((s, i) => cardHtml(s, i)).join('') + '</div>' +
            '<div id="rb-rail-up"></div>';
          // Mobile: the strip only works if today is in view on mount
          const row = host.querySelector('.rb-rail-row');
          const t = host.querySelector('.rb-rc.is-today, .rb-rc.is-empty-today, .rb-dc.is-today');
          if (row && t && row.scrollWidth > row.clientWidth + 8) {
            row.scrollLeft = Math.max(0, t.offsetLeft - (row.clientWidth - t.offsetWidth) / 2);
          }
          comingUp();
        }

        // "Coming up" — the next plan starting OUTSIDE the rail window.
        // Renders only if one exists; real title, real dates.
        function comingUp() {
          const holder = document.getElementById('rb-rail-up');
          if (!holder || _pdDown || !_waUid() || !_waToken()) return;
          _waFetch('GET', 'planned_days?user_id=eq.' + _waUid() + '&day_date=gt.' + _pdAddISO(_railToday, 5)
            + '&order=day_date.asc&limit=60&select=source_id,source_type,day_date')
            .then(rows => {
              if (!Array.isArray(rows) || !rows.length) { holder.innerHTML = ''; return; }
              const first = rows[0];
              const mine = rows.filter(r => r.source_id === first.source_id).map(r => r.day_date);
              const item = snLoad().find(x => String(x.id) === String(first.source_id));
              const title = (item && item.title) || (first.source_type === 'travel' ? 'A trip' : 'A plan');
              const fmt = d => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
              const range = fmt(mine[0]) + (mine.length > 1 ? ' – ' + fmt(mine[mine.length - 1]) : '');
              // Counts are derived, never stored: capsule membership + look
              // count for a trip, dressed-day count for a week.
              let counts = '';
              if (item && item.tvData) {
                const pieces = (item.tvData.capsule || []).length;
                const looks = (item.tvData.days || []).reduce((n, d) => n + ((d.slots || []).length), 0);
                counts = (pieces ? ' · ' + pieces + ' pieces' : '') + (looks ? ' · ' + looks + ' looks' : '');
              } else if (item && item.wkData) {
                const nd = (item.wkData.days || []).filter(d => !d.rest).length;
                counts = nd ? ' · ' + nd + ' days' : '';
              }
              // The trip's editorial hero (the lookbook card thumbnail) leads
              const thumb = (item && item.img && String(item.img).indexOf('http') === 0)
                ? `<span class="th"><img src="${_waEsc(item.img)}" alt="" onerror="this.parentNode.style.display='none'"></span>` : '';
              const cta = first.source_type === 'travel' ? 'Open the trip →' : first.source_type === 'weekly' ? 'Open the week →' : 'Open →';
              holder.innerHTML =
                `<button class="rb-upnext" onclick="window.__snOpenItem(${Number(first.source_id)})">${thumb}` +
                `<span class="k">Coming up</span><span class="t">${_waEsc(title)}</span>` +
                `<span class="m">${_waEsc(range + counts)}</span><span class="cta">${cta}</span></button>`;
            })
            .catch(() => {});
        }

        function refresh() {
          _railToday = _pdLocalISO();
          _pdRail(_pdAddISO(_railToday, -1), _pdAddISO(_railToday, 5), paint);
        }
        window._rbRailPaint = refresh;
        // Soft repaint from the slots already in hand — the peek's
        // mark-worn mutates moments in place, and a refetch would revert
        // the stamp until the debounced planned_days upsert lands.
        window._rbRailRepaint = function() { if (_railSlots) paint(_railSlots); };

        // Populated-card body tap: diary flag on → scope the prompt to the
        // date (§5.4 — scoping is date-level, both moments); flag off →
        // open (the pre-scope-chip interim).
        window.__rbRailTap = function(i) {
          if (typeof _rbDiaryOn === 'function' && _rbDiaryOn() && typeof window._ikScopeDay === 'function') {
            const slot = _railSlots && _railSlots[i];
            if (!slot) return;
            _rbTrack('rail_day_scoped', { state: cardState(slot), offset_from_today: Math.round((new Date(slot.date + 'T00:00:00Z') - new Date(_railToday + 'T00:00:00Z')) / 86400000) });
            window._ikScopeDay(slot.date, slot);
            return;
          }
          window.__rbRailOpen(i);
        };
        window.__rbRailOpenCta = function(i, ev) {
          if (ev) { ev.stopPropagation(); ev.preventDefault(); }
          window.__rbRailOpen(i);
        };
        // DayCard handlers: body → peek, ring → scope (the §2.3 split;
        // the flag-dependent __rbRailTap branch is retired on this path)
        window.__rbRailPeek = function(i) {
          const slot = _railSlots && _railSlots[i];
          if (!slot || !slot.moments.length) return;
          window.__rbDayPeek(slot.date, slot.moments);
        };
        window.__rbRailFocus = function(i, ev) {
          if (ev) { ev.stopPropagation(); ev.preventDefault(); }
          const slot = _railSlots && _railSlots[i];
          if (!slot) return;
          _rbTrack('rail_day_scoped', { state: cardState(slot), offset_from_today: Math.round((new Date(slot.date + 'T00:00:00Z') - new Date(_railToday + 'T00:00:00Z')) / 86400000) });
          if (typeof _rbDiaryOn === 'function' && _rbDiaryOn() && typeof window._ikScopeDay === 'function') {
            window._rbSetFocus('home', { date: slot.date, slot });
            return;
          }
          window.__rbRailScope(i);
        };
        // Tap a populated card → open the day inside its parent plan
        window.__rbRailOpen = function(i) {
          const slot = _railSlots && _railSlots[i];
          if (!slot || !slot.moments.length) return;
          const m = slot.moments.find(x => (x.slot || 'day') === 'day') || slot.moments[0];
          _rbTrack('day_opened_from_rail', { source_type: m.source_type, state: cardState(slot) });
          window._rbOpenPlannedDay(m);
        };
        // ONE opener for a planned_days moment — rail card, month cell and
        // the ?d= deep link all land on the same console through this
        // (§6.4: a day is one identity; three openers is how they drift).
        window._rbOpenPlannedDay = function(m) {
          if (!m) return;
          // A pinned Look has no lookbook blob to open — its own detail IS the
          // day's open view (source_id is a looks uuid, never a numeric id).
          if (m.source_type === 'look') {
            if (window.__rbNavGo) window.__rbNavGo('wardrobe');
            setTimeout(() => { window.__lkOpen && window.__lkOpen(m.source_id); }, 260);
            return;
          }
          window.__snOpenItem(Number(m.source_id));
          // Land on the tapped day, not the plan's first day
          if (m.source_type === 'weekly') {
            setTimeout(() => { window.__wkSelectDay && window.__wkSelectDay(m.day_index); }, 300);
          } else if (m.source_type === 'travel') {
            setTimeout(() => {
              window.__tvSetTab && window.__tvSetTab('outfits');
              window.__tvSelectDay && window.__tvSelectDay(m.day_index);
            }, 300);
          }
        };

        // Tap an empty card → aim the prompt at that date (dress-me armed
        // with an anchor date; Stage 3's scope chip replaces this wiring)
        window.__rbRailScope = function(i) {
          const slot = _railSlots && _railSlots[i];
          if (!slot) return;
          const state = cardState(slot);
          const offset = Math.round((new Date(slot.date + 'T00:00:00Z') - new Date(_railToday + 'T00:00:00Z')) / 86400000);
          _rbTrack('rail_day_scoped', { state, offset_from_today: offset });
          if (typeof _rbDiaryOn === 'function' && _rbDiaryOn() && typeof window._ikScopeDay === 'function') {
            window._ikScopeDay(slot.date, slot);
            return;
          }
          const ta = document.getElementById('cb-ta');
          if (!ta) return;
          _cbAnchorDate = slot.date;
          _cbIntent = 'dress-me';
          _cbSeedPrefix = 'an outfit for';
          const label = slot.date === _railToday ? 'today' : fmtLong(slot.date);
          ta.value = 'An outfit for ' + label + ' — [the plan]';
          ta.dispatchEvent(new Event('input'));
          _cbAutoGrow(ta);
          const def = _CHIP_DEFS.find(c => c.intent === 'dress-me');
          if (def) _cbSetCta(def.cta);
          ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            ta.focus();
            const b = ta.value.indexOf('[');
            if (b >= 0) { const e = ta.value.indexOf(']', b); ta.setSelectionRange(b, e > b ? e + 1 : ta.value.length); }
          }, 300);
        };

        // Mark a past day worn: blob-first (so a resync can never revert),
        // then the wear count on every owned piece the day used — the
        // times_worn write path the rail exists to feed.
        window.__rbRailWear = function(i, ev) {
          if (ev) { ev.stopPropagation(); ev.preventDefault(); }
          const slot = _railSlots && _railSlots[i];
          if (!slot || !slot.moments.length) return;
          const ids = [];
          slot.moments.forEach(m => {
            const it = snLoad().find(x => String(x.id) === String(m.source_id));
            if (it) {
              if (it.type === 'weekly-plan' && it.wkData && it.wkData.days && it.wkData.days[m.day_index]) {
                it.wkData.days[m.day_index].worn = true;
                snUpdate(it.id, { wkData: it.wkData });
              } else if (it.type === 'travel-edit' && it.tvData && it.tvData.days && it.tvData.days[m.day_index]) {
                it.tvData.days[m.day_index].worn = true;
                snUpdate(it.id, { tvData: it.tvData });
              } else if (it.type === 'daily-look' && it.dlData) {
                it.dlData.worn = true;
                snUpdate(it.id, { dlData: it.dlData });
              }
              _pdSyncSaved(it.id);
            }
            (m.item_ids || []).forEach(id => { if (ids.indexOf(id) === -1) ids.push(id); });
            m.status = 'worn';
          });
          // Accrue the Look here too (brief B3) — a wear confirmed on the
          // ?daycard=off path must count exactly the same as on the flagged one.
          const acc = typeof window.__lkAccrue === 'function' ? window.__lkAccrue(ids, {
            date: slot.date, hint: _dcTitleOf(slot.moments[0]),
            source: (slot.moments[0] && slot.moments[0].source_type) || 'daily',
            sourceId: slot.moments[0] && slot.moments[0].source_id,
          }) : null;
          if (!acc || !acc.wear) {
            ids.forEach(id => {
              const wi = _waItems.find(w => String(w.id) === String(id));
              if (wi) _waFetch('PATCH', 'wardrobe_items?id=eq.' + id, { times_worn: (Number(wi.times_worn) || 0) + 1 }).catch(() => {});
            });
          }
          if (ids.length) setTimeout(_waLoad, 900);
          paint(_railSlots);
          _waShowToast('Logged — Robes remembers what you wore ✓');
        };

        // Boot: wait for the session (same lazy pattern as _waInit), then
        // paint — cache first via _pdRail's cb, fresh follows.
        let tries = 0;
        const t = setInterval(() => {
          if (_waUid()) { clearInterval(t); refresh(); }
          else if (++tries > 80) clearInterval(t);
        }, 250);
        // The rail is the heartbeat — re-read when she comes back to the tab
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden && _waUid()) refresh();
        });
      })();

      // ═══ The Diary month view (Stage 6 — Phase 6, the continuous spine) ═
      // Lives INSIDE the Lookbook (no /calendar route — out of scope §9):
      // a Grid | Calendar toggle in the lookbook header. A trip is ONE
      // event — it bands continuously across however many week rows it
      // crosses. Daily looks never band (decision 7): the cell is the only
      // place a standalone daily look appears, visually equal to a planned
      // day. Same-type supersession (_pdFreshest) applies per date before
      // anything renders, so a re-planned trip never paints twice.
      (function _rbMonthView() {
        var _mvView = 'grid';
        var _mvY = null, _mvM = null; // 1-based month
        var _mvRows = [];             // fetched grid±7d rows, freshest-filtered per date
        var _mvSources = {};
        var _mvHidden = [];           // per-week bands beyond the two lanes (+N reveal)
        const pad2 = n => String(n).padStart(2, '0');
        const dISO = iso => Date.parse(iso + 'T00:00:00Z');
        const diffD = (a, b) => Math.round((dISO(b) - dISO(a)) / 86400000);

        if (!document.getElementById('rb-mv-style')) {
          const st = document.createElement('style');
          st.id = 'rb-mv-style';
          st.textContent = `
#sn-viewseg{display:inline-flex;border:0.5px solid rgba(32,32,33,0.18);border-radius:100px;overflow:hidden}
#sn-viewseg button{border:none;background:transparent;padding:7px 15px;font-size:10px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);cursor:pointer;font-family:inherit;white-space:nowrap}
#sn-viewseg button.on{background:#202021;color:#fff}
#sn-cal{display:none}
#sn-page.rb-cal-on #sn-tabs{display:none!important}
#sn-page.rb-cal-on #sn-grid{display:none!important}
#sn-page.rb-cal-on #sn-empty{display:none!important}
.rb-mv-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:0 0 18px}
.rb-mv-title{font-family:'Cormorant',Georgia,serif;font-size:34px;font-weight:300;color:var(--ink,#202021);margin:0}
.rb-mv-nav{display:flex;gap:6px}
.rb-mv-nav button{width:32px;height:32px;border:0.5px solid rgba(32,32,33,0.18);border-radius:50%;background:#fff;color:#6E6A64;font-size:14px;cursor:pointer;line-height:1}
.rb-mv-nav button:hover{border-color:var(--ink,#202021);color:var(--ink,#202021)}
.rb-mv-dow{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;margin-bottom:8px}
.rb-mv-dow div{font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint);padding-left:2px}
.rb-mv-cal{display:flex;flex-direction:column;gap:8px}
.rb-mw{position:relative}
.rb-mcells{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}
.rb-mc{aspect-ratio:1.25;border:0.5px solid rgba(32,32,33,0.14);border-radius:10px;padding:8px;display:flex;flex-direction:column;background:#fff;min-width:0;box-sizing:border-box;text-align:left;font-family:inherit;position:relative}
.rb-mc[onclick]{cursor:pointer;transition:border-color .15s}
.rb-mc[onclick]:hover{border-color:var(--ink,#202021)}
.rb-mc .n{font-family:'Cormorant',Georgia,serif;font-size:17px;color:var(--ink,#202021);line-height:1}
.rb-mc-eve{position:absolute;top:8px;right:9px;font-size:9px;color:#8E7077}
.rb-mc.is-past{background:#F5F0E8}
.rb-mc.is-fut{border-style:dashed;border-color:rgba(32,32,33,0.22)}
.rb-mc.is-bare{border-color:rgba(32,32,33,0.07)}
.rb-mc.is-bare .n{color:#D8CFC0}
.rb-mc.is-free{border-style:dashed}
.rb-mc.is-free .tag{margin-top:auto;font-family:'Cormorant',Georgia,serif;font-style:italic;font-size:11px;color:var(--ink-faint)}
.rb-mc.is-today{border-color:var(--ink,#202021);box-shadow:0 0 0 1px var(--ink,#202021) inset}
.rb-mc.is-today .n{font-weight:500}
.rb-mc.is-pinned{border-color:#8E7077;box-shadow:0 0 0 1px #8E7077 inset}
.rb-mc .act{margin-top:auto;font-family:'Cormorant',Georgia,serif;font-size:12px;line-height:1.25;color:var(--ink,#202021);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.rb-mc.is-fut .act{color:var(--ink-soft)}
.rb-mc-strip{display:flex;gap:3px;margin-top:6px;flex:none}
.rb-mc-strip img{flex:1;min-width:0;height:16px;object-fit:cover;border-radius:2px;display:block}
.rb-mband{position:absolute;height:16px;border:none;border-radius:100px;display:flex;align-items:center;padding:0 10px;font-size:9px;font-weight:500;letter-spacing:.06em;white-space:nowrap;overflow:hidden;font-family:inherit;box-sizing:border-box;text-overflow:ellipsis;cursor:pointer}
.rb-mband.week{background:rgba(155,161,123,0.30);color:#5F6247}
.rb-mband.trip{background:rgba(212,200,196,0.60);color:#6A4F48}
.rb-mband.cont{opacity:.72;font-style:italic}
.rb-mv-more{position:absolute;right:0;top:0;font-size:9px;color:var(--ink-faint)}
button.rb-mv-morebtn{border:none;background:transparent;cursor:pointer;font-family:inherit;color:#8E6A7C;letter-spacing:.08em;text-transform:uppercase;padding:2px 4px}
button.rb-mv-morebtn:hover{color:var(--ink,#202021)}
#rb-mv-pop{position:fixed;inset:0;z-index:930}
#rb-mv-pop .veil{position:absolute;inset:0}
#rb-mv-pop .card{position:absolute;min-width:220px;max-width:320px;background:#FAF8F5;border:0.5px solid rgba(32,32,33,0.16);border-radius:10px;box-shadow:0 10px 34px rgba(32,32,33,0.16);padding:6px;display:flex;flex-direction:column}
#rb-mv-pop .card button{display:flex;align-items:center;gap:9px;border:none;background:transparent;padding:9px 11px;border-radius:7px;font-size:11.5px;color:var(--ink,#202021);cursor:pointer;font-family:inherit;text-align:left}
#rb-mv-pop .card button:hover{background:rgba(32,32,33,0.05)}
#rb-mv-pop .card button i{flex:none;width:8px;height:8px;border-radius:50%}
.rb-mcells .rb-dc.dc-compact{min-height:150px}
@media(max-width:1000px){.rb-mc-strip{display:none}}
@media(max-width:767px){.rb-mc{aspect-ratio:1;padding:5px;border-radius:var(--rad-sm)}.rb-mc .n{font-size:13px}.rb-mc .act{font-size:10px}.rb-mband{font-size:9px;padding:0 6px;height:14px}.rb-mv-title{font-size:26px}}`;
          document.head.appendChild(st);
        }

        // Mount: the toggle in the #sn-headrow, the calendar after #sn-tabs
        const headRow = snPage.querySelector('#sn-headrow');
        if (!headRow) return;
        const seg = document.createElement('div');
        seg.id = 'sn-viewseg';
        seg.innerHTML = `<button class="on" data-mv="grid">Grid</button><button data-mv="cal">Calendar</button>`;
        headRow.appendChild(seg);
        seg.addEventListener('click', e => {
          const b = e.target.closest('button[data-mv]');
          if (b) _mvSetView(b.dataset.mv);
        });
        const cal = document.createElement('div');
        cal.id = 'sn-cal';
        snPage.querySelector('#sn-tabs').parentNode.insertBefore(cal, snPage.querySelector('#sn-grid'));

        function _mvSetView(v) {
          _mvView = v;
          seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.mv === v));
          const calOn = v === 'cal';
          // Class, not inline styles — async repaints (snRenderPage after
          // _lbCloudPull) re-set the grid's inline display underneath us.
          snPage.classList.toggle('rb-cal-on', calOn);
          if (!calOn) snRenderPage();
          cal.style.display = calOn ? 'block' : 'none';
          if (calOn) {
            if (_mvY == null) { const t = _pdLocalISO(); _mvY = +t.slice(0, 4); _mvM = +t.slice(5, 7); }
            _mvLoad();
          }
        }
        window._mvSetView = _mvSetView;
        window.__mvNav = function(d) {
          _mvM += d;
          if (_mvM < 1) { _mvM = 12; _mvY--; }
          if (_mvM > 12) { _mvM = 1; _mvY++; }
          _mvLoad();
        };
        // The lookbook always reopens on the grid (wardrobe convention)
        const _snOpenPrev = window.__snOpen;
        window.__snOpen = function() { _snOpenPrev(); _mvSetView('grid'); };

        function _mvGrid() {
          const first = _mvY + '-' + pad2(_mvM) + '-01';
          const lastDay = new Date(Date.UTC(_mvY, _mvM, 0)).getUTCDate();
          const last = _mvY + '-' + pad2(_mvM) + '-' + pad2(lastDay);
          // Weeks start Monday — real weekday offsets, never a hardcoded col
          const startCol = (new Date(dISO(first)).getUTCDay() + 6) % 7;
          const gridStart = _pdAddISO(first, -startCol);
          const endCol = (new Date(dISO(last)).getUTCDay() + 6) % 7;
          const gridEnd = _pdAddISO(last, 6 - endCol);
          return { first, last, gridStart, gridEnd, weeks: (diffD(gridStart, gridEnd) + 1) / 7 };
        }
        function _mvFresh(rows) {
          rows = _pdSupersede(rows); // rescheduled plans never ghost-band (D-08)
          const byDate = {};
          rows.forEach(r => { (byDate[r.day_date] = byDate[r.day_date] || []).push(r); });
          return Object.keys(byDate).reduce((out, d) => out.concat(_pdFreshest(byDate[d])), []);
        }
        function _mvLoad() {
          const g = _mvGrid();
          _mvPaint(g, _mvRows, _mvSources); // last data first — no blank flash
          // ±7d beyond the grid so a band clipped by the boundary knows it
          _pdMonth(_pdAddISO(g.gridStart, -7), _pdAddISO(g.gridEnd, 7)).then(res => {
            _mvRows = _mvFresh(res.rows || []);
            _mvSources = res.sources || {};
            _mvPaint(g, _mvRows, _mvSources);
          }).catch(() => {});
        }

        // Bands: weekly + travel only (daily looks are cell content, never
        // a band — decision 7). Extent = the source's row dates; segments
        // computed per week row from real weekday offsets.
        function _mvBands(g, rows, sources) {
          const bySrc = {};
          rows.forEach(r => {
            if (r.source_type !== 'weekly' && r.source_type !== 'travel') return;
            (bySrc[r.source_id] = bySrc[r.source_id] || []).push(r.day_date);
          });
          const bands = [];
          Object.keys(bySrc).forEach(sid => {
            const dates = bySrc[sid].sort();
            const s = dates[0], e = dates[dates.length - 1];
            if (e < g.gridStart || s > g.gridEnd) return;
            const type = rows.find(r => r.source_id === sid).source_type;
            const parent = sources[sid] || _pdParent(sid);
            const title = (parent && parent.title) || (type === 'travel' ? 'Trip' : 'Weekly plan');
            const segs = [];
            for (let w = 0; w < g.weeks; w++) {
              const ws = _pdAddISO(g.gridStart, w * 7), we = _pdAddISO(ws, 6);
              if (e < ws || s > we) continue;
              const a = s > ws ? s : ws, b = e < we ? e : we;
              segs.push({ week: w, start_col: diffD(ws, a), span: diffD(a, b) + 1, is_start: a === s && s >= g.gridStart });
            }
            bands.push({ sid, type, title, segs });
          });
          return bands;
        }

        function _mvPaint(g, rows, sources) {
          const today = _pdLocalISO();
          const dcOn = _rbDayCardOn();
          const bands = _mvBands(g, rows, sources);
          // Lane assignment per week row (max two lanes + overflow).
          // Segments are SORTED by start column before the greedy pass
          // (audit D-08 latent gap: assignment used to run in source
          // discovery order, so a later-fetched early-starting band could
          // lose a lane it should have won).
          const laneEnd = [], weekLanes = [], weekMore = [], weekHidden = [];
          for (let w = 0; w < g.weeks; w++) { laneEnd.push([-1, -1]); weekLanes.push(0); weekMore.push(0); weekHidden.push([]); }
          const segList = [];
          bands.forEach(band => band.segs.forEach((sg, si) => segList.push({ band, sg, si })));
          segList.sort((a, b) => a.sg.week - b.sg.week || a.sg.start_col - b.sg.start_col || b.sg.span - a.sg.span);
          const placed = [];
          segList.forEach(p => {
            const sg = p.sg;
            const le = laneEnd[sg.week];
            let lane = le[0] < sg.start_col ? 0 : (le[1] < sg.start_col ? 1 : -1);
            if (lane === -1) {
              weekMore[sg.week]++;
              weekHidden[sg.week].push({ sid: p.band.sid, type: p.band.type, title: p.band.title });
              return;
            }
            le[lane] = sg.start_col + sg.span - 1;
            weekLanes[sg.week] = Math.max(weekLanes[sg.week], lane + 1);
            placed.push({ band: p.band, sg, si: p.si, lane });
          });
          _mvHidden = weekHidden;
          const monthName = new Date(dISO(g.first)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
          let html = `
            <div class="rb-mv-head">
              <h2 class="rb-mv-title">${_waEsc(monthName)}</h2>
              <div class="rb-mv-nav"><button onclick="window.__mvNav(-1)" aria-label="Previous month">‹</button><button onclick="window.__mvNav(1)" aria-label="Next month">›</button></div>
            </div>
            <div class="rb-mv-dow">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => '<div>' + d + '</div>').join('')}</div>
            <div class="rb-mv-cal">`;
          for (let w = 0; w < g.weeks; w++) {
            const lanes = weekLanes[w];
            // DayCard path: EVERY row reserves the same two band lanes, so
            // band-carrying weeks no longer sit taller than band-free ones
            // — the month grid holds vertical rhythm (spec §11.2; the
            // "blank hero slot" the audit dismissed was this reservation
            // varying per row).
            const padTop = dcOn ? 4 + 2 * 18 : (lanes ? 4 + lanes * 18 : 0);
            html += `<div class="rb-mw" style="padding-top:${padTop}px">`;
            placed.filter(p => p.sg.week === w).forEach(p => {
              // First VISIBLE segment carries the label only when the band
              // genuinely starts there; anything else is a continuation.
              const contHtml = '↳ ' + _waEsc(p.band.title) + ', continued';
              const label = (p.si === 0 && p.sg.is_start) ? _waEsc(p.band.title) : contHtml;
              const cont = !(p.si === 0 && p.sg.is_start);
              html += `<button class="rb-mband ${p.band.type === 'travel' ? 'trip' : 'week'}${cont ? ' cont' : ''}" style="left:${(p.sg.start_col / 7 * 100).toFixed(4)}%;width:${(p.sg.span / 7 * 100).toFixed(4)}%;top:${2 + p.lane * 18}px" onclick="window.__mvBand('${String(p.band.sid).replace(/'/g, '')}','${p.band.type}')">${label}</button>`;
            });
            if (weekMore[w]) {
              // +N more gets a designed reveal (spec §11.1) — a popover of
              // the hidden bands, each opening its artifact.
              html += dcOn
                ? `<button class="rb-mv-more rb-mv-morebtn" onclick="window.__mvMore(${w},event)">+${weekMore[w]} more</button>`
                : `<span class="rb-mv-more">+${weekMore[w]} more</span>`;
            }
            html += `<div class="rb-mcells">`;
            for (let c = 0; c < 7; c++) {
              const date = _pdAddISO(g.gridStart, w * 7 + c);
              const here = rows.filter(r => r.day_date === date);
              const dayW = _pdWinner(here.filter(r => (r.slot || 'day') === 'day'));
              const eveW = _pdWinner(here.filter(r => (r.slot || 'day') === 'evening'));
              const inMonth = date >= g.first && date <= g.last;
              if (dcOn) {
                // Compact DayCard cell: numeral eyebrow, evening line,
                // thumbnails, Worn ✓ (the §10.4 proposal, live). Void
                // (out-of-month) and past-empty are DISTINCT states now
                // (§7 — they used to collapse into one is-bare branch).
                const dc = _dcMoments(dayW, eveW, { date, today, eyebrow: inMonth ? String(+date.slice(8, 10)) : '' });
                if (!inMonth) dc.state = 'void';
                const populated = dc.state === 'past' || dc.state === 'today' || dc.state === 'planned';
                html += _dcCard(dc, {
                  density: 'compact',
                  body: populated ? `window.__mvCell('${date}')` : null,
                });
                continue;
              }
              const n = inMonth ? String(+date.slice(8, 10)) : '&nbsp;';
              const free = dayW && dayW.status === 'free' && !eveW;
              const cls = ['rb-mc'];
              if (!inMonth || (!dayW && !eveW)) cls.push('is-bare');
              else if (free) cls.push('is-free');
              else if (date < today) cls.push('is-past');
              else if (date > today) cls.push('is-fut');
              if (date === today && inMonth) cls.push('is-today');
              if ((dayW && dayW.pinned) || (eveW && eveW.pinned)) cls.push('is-pinned');
              const act = dayW && dayW.status !== 'free' ? (dayW.activity || dayW.headline || '') : (!dayW && eveW ? (eveW.activity || eveW.headline || '') : '');
              // One legible line at month scale — the evening is a marker,
              // never a second stacked line (§6.3)
              const eveMark = eveW ? '<span class="rb-mc-eve" title="Evening planned">☾</span>' : '';
              const thumbs = (dayW && Array.isArray(dayW.thumb_urls) ? dayW.thumb_urls : []).slice(0, 3)
                .filter(u => typeof u === 'string' && u.indexOf('http') === 0);
              const open = inMonth && (dayW || eveW) ? ` onclick="window.__mvCell('${date}')" role="button" tabindex="0"` : '';
              html += `<div class="${cls.join(' ')}"${open}><span class="n">${n}</span>${eveMark}`
                + (free ? `<span class="tag">left free</span>` : '')
                + (act ? `<span class="act">${_waEsc(String(act))}</span>` : '')
                + (thumbs.length ? `<span class="rb-mc-strip">${thumbs.map(u => `<img src="${_waEsc(u)}" alt="" onerror="this.style.display='none'">`).join('')}</span>` : '')
                + `</div>`;
            }
            html += `</div></div>`;
          }
          html += `</div>`;
          cal.innerHTML = html;
        }

        // Tapping a cell opens the day console at that date; tapping a
        // band opens the parent artifact — the same objects the rail opens
        window.__mvCell = function(date) {
          const here = _mvRows.filter(r => r.day_date === date);
          if (!here.length) return;
          if (_rbDayCardOn()) {
            // Body-tap = the day peek (Annie §6.2) — click-through to the
            // shared opener lives inside it.
            const moments = [];
            ['day', 'evening'].forEach(sl => {
              const w = _pdWinner(here.filter(r => (r.slot || 'day') === sl));
              if (w) moments.push(w);
            });
            if (moments.length) window.__rbDayPeek(date, moments);
            return;
          }
          const m = _pdWinner(here.filter(r => (r.slot || 'day') === 'day')) || _pdWinner(here);
          window._rbOpenPlannedDay(m);
        };
        window.__mvBand = function(sid, type) {
          _rbTrack('month_band_opened', { source_type: type });
          window.__snOpenItem(Number(sid));
        };
        // The +N reveal (spec §11.1): a small popover listing the bands
        // the two lanes couldn't hold — each row opens its artifact.
        window.__mvMore = function(w, ev) {
          if (ev) { ev.stopPropagation(); ev.preventDefault(); }
          document.getElementById('rb-mv-pop')?.remove();
          const hidden = _mvHidden[w] || [];
          if (!hidden.length) return;
          const seen = {}, list = hidden.filter(h => (seen[h.sid] ? false : (seen[h.sid] = true)));
          const pop = document.createElement('div');
          pop.id = 'rb-mv-pop';
          pop.innerHTML = `<div class="veil" onclick="document.getElementById('rb-mv-pop').remove()"></div>` +
            `<div class="card">` + list.map(h =>
              `<button onclick="document.getElementById('rb-mv-pop').remove();window.__mvBand('${String(h.sid).replace(/'/g, '')}','${h.type}')">` +
              `<i style="background:${h.type === 'travel' ? 'rgba(212,200,196,0.9)' : 'rgba(155,161,123,0.7)'}"></i>${_waEsc(h.title)}</button>`).join('') +
            `</div>`;
          document.body.appendChild(pop);
          const btn = ev && ev.currentTarget;
          const card = pop.querySelector('.card');
          if (btn && card) {
            const r = btn.getBoundingClientRect();
            card.style.top = Math.min(window.innerHeight - card.offsetHeight - 12, r.bottom + 6) + 'px';
            card.style.left = Math.max(12, Math.min(window.innerWidth - card.offsetWidth - 12, r.right - card.offsetWidth)) + 'px';
          }
        };

        // ?d=YYYY-MM-DD — deep-link a day: opens the console for whichever
        // plan wins precedence on that date (§6.4), from boot.
        (function _mvDeepLink() {
          let d = null;
          try { d = new URL(window.location.href).searchParams.get('d'); } catch (_) {}
          if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
          let tries = 0;
          const t = setInterval(() => {
            if (_waUid()) {
              clearInterval(t);
              _pdRail(d, d).then(slots => {
                const s = slots && slots[0];
                if (!s || !s.moments.length) return;
                const m = s.moments.find(x => (x.slot || 'day') === 'day') || s.moments[0];
                window._rbOpenPlannedDay(m);
              }).catch(() => {});
            } else if (++tries > 80) clearInterval(t);
          }, 250);
        })();
      })();

      // ═══ The Diary prompt + unfurl (Stage 3 — Phases 1–2, the
      // diary_prompt_intake flag) ═══════════════════════════════════════
      // One field that generates, scopes and restyles. Flag ON by default
      // (2026-07-24): _cbSubmit routes through _ikSubmit — deterministic
      // scope fast-paths first (no model call), then the /api/intent
      // classifier, then the unfurl intake that reads the request back
      // before anything is committed. An abandoned intake writes nothing.
      // ?diary=off is the per-device kill switch (everything below goes
      // inert and the concierge behaves exactly as before); ?diary=on
      // clears it.
      // ═══ Track config (Stage 4 / handoff Phase 3) ═════════════════════
      // A week and a trip are the same object with different constraints —
      // one config object, three consumers (intake, artifact shell,
      // console). A difference that can't be expressed here is a genuine
      // product difference (the capsule constraint, Phase 4) and gets
      // documented, never buried as an if(isTrip) in a component body.
      // Adding a fourth track = a config entry, no component changes
      // (proven by a throwaway fixture in the harness). Eyebrow strings
      // deliberately match the pre-refactor artifacts verbatim — the
      // reference tests assert zero visual drift.
      var _RB_TRACKS = {
        weekly: {
          key: 'weekly',
          engine: 'weekly',
          intake: {
            defaultDays: 7, maxDays: 21, requiresDates: false,
            // COPY: needs sign-off
            rackLabel: 'Build it around',
            quickAdd: ['Office', 'WFH', 'Big meeting', 'Dinner out', 'Date night', 'Pilates', 'School run', 'Drinks'],
            primaryLabel: st => 'Plan my week · ' + st.rows.filter(r => !r.free).length + ' days →',
            maxDaysError: 'That’s more than three weeks — Robes plans up to 21 days at a time.',
          },
          artifact: { eyebrow: 'Your week, planned', hasCapsuleTab: false, hasPackProgress: false },
          console: { rackScope: 'wardrobe', addVerb: 'Save', rackHint: '' },
        },
        travel: {
          key: 'travel',
          engine: 'travel',
          intake: {
            defaultDays: 7, maxDays: 10, requiresDates: true,
            rackLabel: 'What’s tempting you?',
            quickAdd: ['Beach day', 'Exploring', 'Boat day', 'Big dinner', 'A day trip', 'Slow morning'],
            primaryLabel: st => 'Pack for ' + (st.where || 'the trip') + ' →',
            maxDaysError: 'Trips plan up to 10 days at a time — split a longer stay in two.',
          },
          artifact: { eyebrow: 'The travel edit', hasCapsuleTab: true, hasPackProgress: true },
          // rackScope 'capsule' is Phase 4's enforcement target — the ONE
          // deliberate structural difference (dress from a case, not a
          // wardrobe). rackHint copy lands with it.
          console: { rackScope: 'capsule', addVerb: 'Add', rackHint: '' },
        },
        daily: {
          key: 'daily',
          engine: 'daily',
          intake: {
            defaultDays: 1, maxDays: 1, requiresDates: false,
            rackLabel: 'Build it around',
            quickAdd: ['Office', 'WFH', 'Big meeting', 'Dinner out', 'Date night', 'Pilates', 'School run', 'Drinks'],
            primaryLabel: () => 'Dress this day →',
            maxDaysError: '',
          },
          artifact: { eyebrow: 'Your daily look', hasCapsuleTab: false, hasPackProgress: false },
          console: { rackScope: 'wardrobe', addVerb: 'Save', rackHint: '' },
        },
      };
      window._RB_TRACKS = _RB_TRACKS;
      function _rbTrackCfg(kind) { return _RB_TRACKS[kind] || _RB_TRACKS.weekly; }

      var _IK_FLAG_KEY = 'rb_diary_prompt';
      var _ikScope = { kind: 'none', id: null, label: '', date: null };
      var _ikPlanScope = null;   // unused while plan auto-scope is disabled — see _ikAutoScope
      var _ikState = null;       // intake-local state; null = closed
      var _ikOpenedAt = 0;

      function _rbDiaryOn() {
        // Default ON for everyone (Annie, 2026-07-24 — the Diary is the
        // product now). ?diary=off is the per-device kill switch,
        // persisted; ?diary=on clears it.
        try { return localStorage.getItem(_IK_FLAG_KEY) !== 'off'; } catch (_) { return true; }
      }

      var _IK_CSS = `
#rb-scopechip{display:none;flex:none;align-items:center;gap:6px;margin-right:10px;padding:6px 11px;border:none;border-radius:6px;background:var(--ink,#202021);color:#FAF8F5;font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;font-family:inherit;max-width:220px}
#rb-scopechip.on{display:inline-flex}
#rb-scopechip.sel{background:var(--mauve,#D4C8C4);color:var(--ink,#202021)}
#rb-scopechip .lbl{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
#rb-scopechip .x{opacity:.65;font-size:11px;flex:none}
#rb-sugg{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
#rb-sugg .rb-schip{padding:8px 14px;border:0.5px solid rgba(32,32,33,0.14);border-radius:100px;background:#fff;font-size:12px;color:#6E6A64;cursor:pointer;font-family:inherit;transition:all .2s}
#rb-sugg .rb-schip:hover{border-color:var(--ink,#202021);color:var(--ink,#202021)}
#rb-intake{display:none;background:#fff;border:0.5px solid rgba(32,32,33,0.16);border-top:none;border-radius:0 0 18px 18px;padding:20px 22px 22px;margin-top:-14px;box-sizing:border-box}
.concierge-box.rb-attached{border-bottom-left-radius:0!important;border-bottom-right-radius:0!important}
#rb-intake .ik-read{display:flex;align-items:center;gap:10px;font-family:'Cormorant',Georgia,serif;font-style:italic;font-size:17px;color:var(--ink-faint);padding:2px 0 14px}
#rb-intake .ik-sk{height:18px;border-radius:4px;background:linear-gradient(90deg,#EFE9DC 25%,#F5F0E8 50%,#EFE9DC 75%);background-size:200% 100%;animation:rbIkSh 1.3s infinite;margin-bottom:10px}
@keyframes rbIkSh{0%{background-position:200% 0}100%{background-position:-200% 0}}
#rb-intake .ik-said{font-family:'Cormorant',Georgia,serif;font-style:italic;font-size:18px;line-height:1.35;color:var(--ink,#202021);margin:0 0 14px;max-width:640px}
#rb-intake .ik-crumbs{display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin-bottom:16px;padding-bottom:15px;border-bottom:0.5px solid rgba(32,32,33,0.08)}
#rb-intake .ik-crumb{display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border:0.5px solid rgba(32,32,33,0.14);border-radius:var(--rad-sm);font-size:12px;color:var(--ink,#202021);background:#FAF8F5;cursor:pointer;font-family:inherit}
#rb-intake .ik-crumb em{font-style:normal;color:var(--ink-faint)}
#rb-intake .ik-crumb input{border:none;background:none;outline:none;font-family:inherit;font-size:12px;color:var(--ink,#202021);width:120px}
#rb-intake .ik-note{font-size:11px;color:var(--ink-faint);font-style:italic;font-family:'Cormorant',Georgia,serif}
#rb-intake .ik-dates input{border:0.5px solid rgba(32,32,33,0.18);border-radius:6px;padding:4px 6px;font-size:11.5px;font-family:inherit;background:#fff;color:var(--ink,#202021)}
#rb-intake .ik-dates .done{font-size:9px;letter-spacing:.1em;text-transform:uppercase;background:var(--ink,#202021);color:#FAF8F5;border:none;border-radius:6px;padding:6px 11px;cursor:pointer;font-family:inherit}
#rb-intake .ik-err{font-size:11.5px;color:#B0654F;margin:-8px 0 12px}
#rb-intake .ik-ba{margin-bottom:16px}
#rb-intake .ik-ba-hd{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:9px}
#rb-intake .ik-ba-lab{font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-faint)}
#rb-intake .ik-ba-cat{padding:4px 10px;border:0.5px solid rgba(32,32,33,0.14);border-radius:100px;background:#fff;font-size:10.5px;color:#6E6A64;cursor:pointer;font-family:inherit}
#rb-intake .ik-ba-cat.on{background:var(--ink,#202021);color:#FAF8F5;border-color:var(--ink,#202021)}
#rb-intake .ik-rack{display:flex;align-items:flex-start;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}
#rb-intake .ik-rack::-webkit-scrollbar{display:none}
#rb-intake .ik-ri{flex:none;width:84px;border:0.5px solid rgba(32,32,33,0.12);border-radius:10px;background:#fff;cursor:pointer;overflow:hidden;text-align:left;padding:0;font-family:inherit}
#rb-intake .ik-ri.sel{border-color:var(--ink,#202021);box-shadow:0 0 0 1px var(--ink,#202021) inset}
#rb-intake .ik-ri .im{display:block;aspect-ratio:1;background:#EFE9DC;position:relative}
#rb-intake .ik-ri .im img{width:100%;height:100%;object-fit:cover;display:block}
#rb-intake .ik-ri .ck{position:absolute;top:5px;right:5px;width:16px;height:16px;border-radius:50%;background:var(--ink,#202021);color:#FAF8F5;display:flex;align-items:center;justify-content:center;font-size:9px}
#rb-intake .ik-ri .nm{display:block;padding:6px 8px 8px;font-size:10px;line-height:1.25;color:var(--ink,#202021);height:26px;overflow:hidden}
#rb-intake .ik-days-hd{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px}
#rb-intake .ik-days-hint{font-family:'Cormorant',Georgia,serif;font-style:italic;font-size:13px;color:var(--ink-faint)}
#rb-intake .ik-row{display:grid;grid-template-columns:22px 92px minmax(0,1fr);align-items:center;gap:12px;padding:8px 6px;border-bottom:0.5px solid rgba(32,32,33,0.07);border-radius:6px}
#rb-intake .ik-row.pinned{background:rgba(212,200,196,0.16)}
#rb-intake .ik-pin{width:22px;height:22px;border:0.5px solid rgba(32,32,33,0.22);border-radius:50%;background:none;display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--ink-faint);cursor:pointer;font-family:inherit;line-height:1;padding:0}
#rb-intake .ik-pin.on{background:var(--mauve,#D4C8C4);border-color:var(--mauve,#D4C8C4);color:var(--ink,#202021)}
#rb-intake .ik-dm .dd{font-size:11px;font-weight:500;color:var(--ink,#202021)}
#rb-intake .ik-dm .dt{font-size:9.5px;color:var(--ink-faint);margin-top:1px}
#rb-intake .ik-cell{text-align:left;background:none;border:0.5px solid transparent;border-radius:6px;padding:5px 9px;cursor:pointer;font-family:inherit;width:100%;min-width:0}
#rb-intake .ik-cell:hover{border-color:rgba(32,32,33,0.14);background:#FAF8F5}
#rb-intake .ik-cell .v{font-family:'Cormorant',Georgia,serif;font-size:16.5px;line-height:1.15;color:var(--ink,#202021);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#rb-intake .ik-cell .v.free,#rb-intake .ik-cell .v.blank{font-style:italic;color:var(--ink-faint)}
#rb-intake .ik-cell .s{font-size:9.5px;color:var(--ink-faint);margin-top:1px}
#rb-intake .ik-tray{grid-column:1/-1;padding:10px 4px 6px;display:flex;flex-direction:column;gap:9px}
#rb-intake .ik-tray input{width:100%;box-sizing:border-box;border:0.5px solid rgba(32,32,33,0.16);border-radius:var(--rad-sm);padding:9px 11px;font-size:12.5px;font-family:inherit;background:#fff;color:var(--ink,#202021);outline:none}
#rb-intake .ik-chips{display:flex;gap:6px;flex-wrap:wrap}
#rb-intake .ik-qc{padding:6px 11px;border:0.5px solid rgba(32,32,33,0.13);border-radius:100px;background:#FAF8F5;font-size:11px;color:var(--ink,#202021);cursor:pointer;font-family:inherit}
#rb-intake .ik-qc.free{border-style:dashed;color:var(--ink-faint)}
#rb-intake .ik-eve{display:flex;align-items:center;gap:8px}
#rb-intake .ik-eve .lab{flex:none;font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint)}
#rb-intake .ik-eve .rm{flex:none;background:none;border:none;color:var(--ink-faint);cursor:pointer;font-size:13px;padding:2px}
#rb-intake .ik-addeve{align-self:flex-start;background:none;border:none;padding:2px 0;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint);cursor:pointer;font-family:inherit}
#rb-intake .ik-addeve:hover{color:var(--ink,#202021)}
#rb-intake .ik-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;flex-wrap:wrap}
#rb-intake .ik-cancel{background:none;border:none;font-size:11.5px;color:var(--ink-faint);text-decoration:underline;cursor:pointer;font-family:inherit;padding:4px 0}
#rb-intake .ik-go{background:var(--ink,#202021);color:#fff;border:none;border-radius:100px;padding:13px 24px;font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;font-family:inherit}
#rb-intake .ik-clar{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
#rb-intake .ik-clar button{padding:9px 16px;border:0.5px solid rgba(32,32,33,0.16);border-radius:100px;background:#fff;font-size:12px;color:var(--ink,#202021);cursor:pointer;font-family:inherit}
#rb-intake .ik-clar button:hover{border-color:var(--ink,#202021)}
@media(max-width:767px){#rb-intake{padding:16px 14px 18px}#rb-intake .ik-row{grid-template-columns:20px 74px minmax(0,1fr);gap:8px}}`;

      function _ikEsc(s) { return _waEsc(s); }
      function _ikChipDateLabel(iso) {
        const d = new Date(iso + 'T00:00:00');
        return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
      }

      // ── scope ──────────────────────────────────────────────────────
      function _ikChipPaint() {
        let chip = document.getElementById('rb-scopechip');
        if (!chip) {
          // A scope can land before the boot poll has wired the chip
          // (e.g. a rail tap seconds after load) — create it on demand.
          const input = document.querySelector('.cb-input');
          const ta = document.getElementById('cb-ta');
          if (!input || !ta) return;
          chip = document.createElement('button');
          chip.id = 'rb-scopechip';
          chip.onclick = _ikScopeBack;
          input.insertBefore(chip, ta);
        }
        if (_ikScope.kind === 'none') { chip.className = ''; chip.style.display = 'none'; return; }
        chip.style.display = '';
        chip.className = 'on' + (_ikScope.kind === 'day' ? ' sel' : '');
        chip.innerHTML = '<span class="lbl">' + _ikEsc(_ikScope.label) + '</span><span class="x">×</span>';
      }
      function _ikSetScope(s) { _ikScope = s || { kind: 'none', id: null, label: '', date: null }; _ikChipPaint(); _ikPillsPaint(); }
      // Escaping a day scope always clears the chip — the plan auto-scope
      // this used to fall back to is disabled (product call: the day chip
      // is the only chip that should ever appear).
      function _ikScopeBack() {
        _ikSetScope(null);
      }
      window._ikScopeDay = function(date, slot) {
        const m = slot && slot.moments && slot.moments.length ? slot.moments[0] : null;
        _ikSetScope({ kind: 'day', id: m ? m.source_id : null, date, label: _ikChipDateLabel(date) });
        const ta = document.getElementById('cb-ta');
        if (ta) { ta.focus(); ta.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      };
      // Only a WEEKLY plan covering today auto-scopes — a week is ambient,
      // a trip is an occasion: someone on holiday typing into the field is
      // more likely starting something new than amending eight days of
      // Ibiza, and silently aiming the field at a trip is an expensive way
      // to be wrong. Trips scope on explicit selection only (decision 3).
      function _ikComputePlanScope() {
        const today = _pdLocalISO();
        const rows = _pdCacheRead().filter(r => r.day_date === today && r.source_type === 'weekly');
        if (!rows.length) return null;
        const src = rows[0].source_id;
        const p = _pdParent(src);
        // The label is always the plan's REAL title; date-range fallback,
        // never a "Your week" placeholder for a plan not called that.
        const item = snLoad().find(x => String(x.id) === String(src));
        const iso0 = item && item.wkData && Array.isArray(item.wkData.week_iso) ? item.wkData.week_iso[0] : null;
        const label = p.title || (iso0 ? 'Week of ' + new Date(iso0 + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'This week');
        return { kind: 'plan', id: src, label, date: null };
      }
      // Disabled (product call): a weekly plan covering today used to
      // auto-scope the field, but its title chip rendered as a broken-looking
      // black block (long stylist headlines have no clean truncation next to
      // the × button) and appeared without her asking for it. The day chip
      // (window._ikScopeDay, explicit tap only) is the only chip that should
      // ever appear now. _ikComputePlanScope/_ikPlanScope stay in place —
      // still read by the plan-restyle routing below — should an explicit
      // "scope to this plan" entry point return.
      function _ikAutoScope() {}

      // ── suggestion pills — the cold-start mechanism. Never a place or
      // date that isn't already in the user's data. ──────────────────
      function _ikPillsPaint() {
        const host = document.getElementById('rb-sugg');
        if (!host) return;
        const pills = [];
        const today = _pdLocalISO();
        const cached = _pdCacheRead();
        if (_ikScope.kind === 'day') {
          // Tone modifiers — never dated, never placed
          ['A touch warmer', 'Softer and easier', 'Flats today'].forEach(t =>
            pills.push({ label: t, act: () => { _ikTrack('pill', 'restyle_day'); _ikRestyleDay(t); } }));
        } else if (_ikScope.kind === 'plan') {
          pills.push({ label: 'Lean the week smarter', act: () => { _ikTrack('pill', 'restyle_plan'); _ikRestylePlan('Lean the week smarter — sharper, simpler'); } });
          pills.push({ label: 'More colour this week', act: () => { _ikTrack('pill', 'restyle_plan'); _ikRestylePlan('Bring more colour into the week'); } });
          if (!cached.some(r => r.day_date === today && r.status !== 'free')) {
            pills.push({ label: 'Dress today', act: () => { _ikTrack('pill', 'daily'); window.__dlSubmit('An outfit for today'); } });
          }
        } else {
          if (_waItems.length < 15) {
            pills.push({ label: '+ Add pieces — a few photos at once', act: () => { _ikTrack('pill', 'wardrobe'); if (window.__waAddChooser) window.__waAddChooser(); else if (window.App && App.showWardrobe) App.showWardrobe(); } });
          }
          const weekCovered = cached.some(r => r.source_type === 'weekly' && r.day_date >= today && r.day_date <= _pdAddISO(today, 6));
          if (!weekCovered) {
            const city = (window.__rbCtx && window.__rbCtx.city) || '';
            pills.push({ label: 'Plan my week' + (city ? ' in ' + city : ''), act: () => { _ikTrack('pill', 'weekly'); _ikOpen('weekly', { prompt: '' }); } });
          }
          const deferred = snLoad().find(t => t.type === 'travel-edit' && t.tvData && (!Array.isArray(t.tvData.days) || !t.tvData.days.length));
          if (deferred) {
            pills.push({ label: 'Finish ' + (deferred.title || 'your trip'), act: () => { _ikTrack('pill', 'travel'); window.__snOpenItem(deferred.id); } });
          }
          if (!cached.some(r => r.day_date === today)) {
            pills.push({ label: 'Dress today', act: () => { _ikTrack('pill', 'daily'); window.__dlSubmit('An outfit for today'); } });
          }
        }
        host.innerHTML = '';
        pills.slice(0, 3).forEach((p, i) => {
          const b = document.createElement('button');
          b.className = 'rb-schip';
          b.textContent = p.label;
          b.onclick = p.act;
          host.appendChild(b);
        });
      }
      window._ikPillsPaint = _ikPillsPaint;
      function _ikTrack(source, intent, extra) {
        _rbTrack('prompt_submitted', { intent: intent || '', scope: _ikScope.kind, source, ...(extra || {}) });
      }

      // ── routing (Phase 1 §1.3) — deterministic fast paths first ────
      function _ikHasSignal(text) {
        return /\b(trip|travel|pack|fly|flight|holiday|weekend away)\b|\d{1,2}\s*(?:–|-|to)\s*\d{1,2}|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text);
      }
      function _ikClearPrompt() {
        const ta = document.getElementById('cb-ta');
        if (ta) { ta.value = ''; ta.style.height = 'auto'; ta.dispatchEvent(new Event('input')); }
      }
      function _ikSubmit(prompt) {
        const t0 = Date.now();
        // The bundle's send pipeline can fire twice for one tap — a classify
        // already in flight, or a ready panel for this exact prompt, must
        // not be knocked back to the reading state.
        if (_ikState && _ikState.reading) return;
        if (_ikState && prompt && _ikState.prompt === prompt) return;
        if (_ikState && !_ikState.reading) _ikClose(true);
        // A photo attachment always means the style track (P0 rule) — the
        // classifier never sees it.
        if (_cbPhotoData) {
          const photo = _cbPhotoData;
          _ikTrack('typed', 'style', { has_photo: true });
          _cbReset();
          _cbStyleSubmit(prompt, photo, { intent: 'style' });
          return;
        }
        if (!prompt) {
          _waShowToast(_ikScope.kind === 'day' ? 'Tell Robes the day’s plan — or tap a suggestion' : 'Tell Robes what you’re dressing for');
          _rbTrack('prompt_submitted', { intent: '', scope: _ikScope.kind, source: 'typed', ok: false });
          return;
        }
        if (_ikScope.kind === 'day') { _ikTrack('typed', 'restyle_day'); _ikRestyleDay(prompt); _ikClearPrompt(); return; }
        if (_ikScope.kind === 'plan' && !_ikHasSignal(prompt)) { _ikTrack('typed', 'restyle_plan'); _ikRestylePlan(prompt); _ikClearPrompt(); return; }
        // Model call — open the reading state immediately, resolve into
        // ready (or clarify); a failure is never a dead end and never
        // loses the prompt.
        _ikOpenReading(prompt);
        _ikClassify(prompt).then(seed => {
          const ms = Date.now() - t0;
          _rbTrack('prompt_submitted', { intent: seed.intent, scope: _ikScope.kind, source: 'typed', latency_ms: ms, ok: true });
          const conf = seed.confidence >= 0.6 && seed.intent !== 'unclear';
          if (!conf) { _ikOpen('clarify', { prompt }); return; }
          if (seed.intent === 'daily') { _ikClose(); _ikClearPrompt(); window.__dlSubmit(prompt); return; }
          _ikOpen(seed.intent, { ...seed, prompt });
        }).catch(() => {
          _rbTrack('prompt_submitted', { intent: 'error', scope: _ikScope.kind, source: 'typed', latency_ms: Date.now() - t0, ok: false });
          _ikOpen('clarify', { prompt, failed: true });
        });
      }
      async function _ikClassify(prompt) {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 4000);
        try {
          const res = await fetch('/api/intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: ctl.signal,
            body: JSON.stringify({ prompt, clientDate: _pdLocalISO(), userId: _waUid() || undefined, genId: _rbGenId() }),
          });
          if (!res.ok) throw new Error('intent ' + res.status);
          return await res.json();
        } finally { clearTimeout(t); }
      }

      // ── restyle fast paths ─────────────────────────────────────────
      // An evening ASK on a scoped day is an ADDITION, never a restyle —
      // the day's look stays exactly as planned (Annie, 2026-07-24: "Add
      // an evening look for a date night" on an office Thursday must add
      // an evening moment, not re-dress the office day). Deliberately
      // narrow: bare "dinner"/"drinks" still restyle the day — only an
      // explicit evening framing routes to the addition.
      function _ikEveningIntent(text) {
        return /\b(add\s+an?\s+evening|evening\s+(look|outfit|plan)|for\s+the\s+evening|in\s+the\s+evening|this\s+evening|tonight|date\s*night|after\s*dark)\b/i.test(text);
      }
      function _ikRestyleDay(text) {
        const date = _ikScope.date || _pdLocalISO();
        const rows = _pdCacheRead().filter(r => r.day_date === date);
        const m = _pdWinner(rows.filter(r => (r.slot || 'day') === 'day'));
        const item = m ? snLoad().find(x => String(x.id) === String(m.source_id)) : null;
        const evening = _ikEveningIntent(text);
        if (!m || m.source_type === 'daily' || !item) {
          window.__dlSubmit(text, { anchorDate: date, slot: evening ? 'evening' : undefined });
          return;
        }
        // The day belongs to a plan: open it AT that day, then either ADD
        // the evening moment (evening ask) or run the single-day restyle
        // with her words as the activity — the same surgical
        // /api/weekly/day | /api/travel/day the artifacts use.
        window.__snOpenItem(item.id);
        if (m.source_type === 'weekly') {
          setTimeout(() => {
            if (window.__wkSelectDay) window.__wkSelectDay(m.day_index);
            if (evening) { if (window.__wkDressEvening) window.__wkDressEvening(text); return; }
            if (window.__wkEditDay) window.__wkEditDay(m.day_index);
            setTimeout(() => {
              const inp = document.getElementById('wk-day-input');
              if (inp) { inp.value = text; if (window.__wkDayApply) window.__wkDayApply(m.day_index); }
            }, 150);
          }, 400);
        } else {
          setTimeout(() => {
            if (window.__tvSetTab) window.__tvSetTab('outfits');
            if (window.__tvSelectDay) window.__tvSelectDay(m.day_index);
            if (evening) { if (window.__tvDressEvening) window.__tvDressEvening(text); return; }
            if (window.__tvEditDay) window.__tvEditDay(m.day_index);
            setTimeout(() => {
              const inp = document.getElementById('tv-day-input');
              if (inp) { inp.value = text; if (window.__tvDayApply) window.__tvDayApply(m.day_index); }
            }, 150);
          }, 400);
        }
      }
      function _ikRestylePlan(text) {
        const item = snLoad().find(x => String(x.id) === String(_ikScope.id));
        const w = item && item.wkData;
        if (!w || !Array.isArray(w.week_iso) || !Array.isArray(w.days)) { _ikOpen('weekly', { prompt: text }); return; }
        // Re-plan over the same dates: a NEW lookbook row that coexists in
        // planned_days and wins at read time (latest updated_at).
        const dayPlan = w.days.map(d => d.rest ? null : (d.user_activity || ''));
        const weekDays = w.days.map(d => d.day_label);
        _ikClearPrompt();
        _wkGenerate(text, dayPlan, weekDays, w.week_iso, {});
      }

      // ── the unfurl (Phase 2) ───────────────────────────────────────
      function _ikHost() {
        let host = document.getElementById('rb-intake');
        if (host) return host;
        const box = document.querySelector('.concierge-box');
        if (!box) return null;
        host = document.createElement('div');
        host.id = 'rb-intake';
        box.parentNode.insertBefore(host, box.nextSibling);
        return host;
      }
      function _ikAttach(on) {
        const box = document.querySelector('.concierge-box');
        if (box) box.classList.toggle('rb-attached', !!on);
        const host = document.getElementById('rb-intake');
        if (host) host.style.display = on ? 'block' : 'none';
      }
      function _ikOpenReading(prompt) {
        const host = _ikHost();
        if (!host) return;
        _ikState = { kind: 'reading', reading: true, prompt, openedAt: Date.now() };
        _ikOpenedAt = Date.now();
        _ikAttach(true);
        // COPY: needs sign-off
        host.innerHTML = '<div class="ik-read">Reading your week<span>…</span></div>'
          + '<div class="ik-sk" style="width:60%"></div><div class="ik-sk" style="width:84%"></div><div class="ik-sk" style="width:72%"></div>';
      }
      function _ikRows(fromISO, days, dayIntents) {
        const rows = [];
        for (let i = 0; i < days; i++) {
          const iso = _pdAddISO(fromISO, i);
          const d = new Date(iso + 'T00:00:00');
          const di = (dayIntents || []).find(x => x.date === iso);
          rows.push({
            iso,
            label: d.toLocaleDateString('en-GB', { weekday: 'long' }),
            date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            activity: di ? di.label : '',
            free: false,
            // A prompt-stated day IS a fixed moment she placed — pin it
            pinned: !!di,
            src: di ? 'your prompt' : '',
            evening: null,
            expanded: false,
          });
        }
        return rows;
      }
      function _ikOpen(kind, seed) {
        const host = _ikHost();
        if (!host) return;
        seed = seed || {};
        const wait = _ikState && _ikState.reading ? Math.max(0, 400 - (Date.now() - _ikState.openedAt)) : 0;
        const build = () => {
          const cfg = _rbTrackCfg(kind).intake;
          let from = null, days = 0;
          if (kind !== 'clarify' && seed.date_start && seed.date_end) {
            from = seed.date_start;
            days = Math.min(cfg.maxDays, Math.round((new Date(seed.date_end + 'T00:00:00Z') - new Date(seed.date_start + 'T00:00:00Z')) / 86400000) + 1);
            if (days < 1) { from = null; days = 0; }
          }
          // Tracks that don't demand dates default to the upcoming week;
          // date-demanding tracks (travel) leave the days empty until the
          // when crumb is filled — never an invented range.
          if (!from && kind !== 'clarify' && !cfg.requiresDates) {
            const wd = _wkWeekDays(cfg.defaultDays);
            from = wd[0].iso; days = cfg.defaultDays;
          }
          _ikState = {
            kind,
            prompt: seed.prompt || '',
            failed: !!seed.failed,
            where: seed.destination || '',
            whereEdited: false, datesEdited: false,
            from, days,
            rows: from ? _ikRows(from, days, seed.day_intents) : [],
            anchors: [], cat: 'All',
            editingDates: false, err: '',
            openedAt: _ikOpenedAt || Date.now(),
          };
          _rbTrack('intake_opened', { kind, from: seed.failed ? 'classifier_failed' : 'prompt' });
          _ikAttach(true);
          _ikPaint();
        };
        if (wait) setTimeout(build, wait); else build();
      }
      function _ikClose(abandon) {
        if (abandon && _ikState && _ikState.kind !== 'reading') {
          _rbTrack('intake_abandoned', { kind: _ikState.kind, seconds_open: Math.round((Date.now() - (_ikState.openedAt || Date.now())) / 1000) });
        }
        _ikState = null;
        _ikAttach(false);
        const host = document.getElementById('rb-intake');
        if (host) host.innerHTML = '';
      }
      window._ikCancel = function() { _ikClose(true); };

      function _ikSaid() {
        const st = _ikState;
        // COPY: needs sign-off
        if (st.kind === 'clarify') {
          return st.failed
            ? 'Robes couldn’t quite read that — what are we dressing for?'
            : 'One question — what should this become?';
        }
        if (st.kind === 'travel') {
          return st.where
            ? `A trip to <b>${_ikEsc(st.where)}</b>${st.from ? ', ' + st.days + ' days' : ''} — here’s the shape of it.`
            : 'A trip — tell Robes where, and the days follow.';
        }
        return `Your week${st.where ? ' in <b>' + _ikEsc(st.where) + '</b>' : ''}, day by day — pin what’s fixed, Robes dresses the rest.`;
      }
      function _ikPaint() {
        const host = document.getElementById('rb-intake');
        const st = _ikState;
        if (!host || !st || st.kind === 'reading') return;
        if (st.kind === 'clarify') {
          host.innerHTML = `<p class="ik-said">${_ikSaid()}</p>
            <div class="ik-clar">
              <button onclick="window._ikClarify('daily')">One outfit, one day</button>
              <button onclick="window._ikClarify('weekly')">Plan a week</button>
              <button onclick="window._ikClarify('travel')">Pack for a trip</button>
              <button class="ik-cancel" onclick="window._ikCancel()">Cancel</button>
            </div>`;
          return;
        }
        const fmtRange = () => {
          if (!st.from) return 'Add dates';
          const f = new Date(st.from + 'T00:00:00'), t = new Date(_pdAddISO(st.from, st.days - 1) + 'T00:00:00');
          const fs = f.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          const ts = t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
          return `${fs} – ${ts} <em>· ${st.days} days</em>`;
        };
        const whereCrumb = st.editingWhere
          ? `<span class="ik-crumb"><em>Where</em><input id="ik-where" value="${_ikEsc(st.where)}" placeholder="${st.kind === 'travel' ? 'Destination' : 'Your city'}" onkeydown="if(event.key==='Enter')window._ikWhereDone()" onblur="window._ikWhereDone()"></span>`
          : `<button class="ik-crumb" onclick="window._ikWhereEdit()"><em>Where</em> ${st.where ? _ikEsc(st.where) : '<span style="font-style:italic;color:var(--ink-faint)">add a place</span>'} ✎</button>`;
        const whenCrumb = st.editingDates
          ? `<span class="ik-crumb ik-dates"><em>When</em>
               <input type="date" id="ik-from" value="${st.from || ''}">
               <span style="color:var(--ink-faint)">–</span>
               <input type="date" id="ik-to" value="${st.from ? _pdAddISO(st.from, st.days - 1) : ''}">
               <button class="done" onclick="window._ikDatesDone()">Done</button></span>`
          : `<button class="ik-crumb" onclick="window._ikDatesEdit()"><em>When</em> ${fmtRange()} ✎</button>`;
        const provenance = st.whereEdited || st.datesEdited ? 'edited by you' : (st.where || st.from ? 'read from your prompt' : 'our suggestion — change anything');
        const crumbs = `<div class="ik-crumbs">${whereCrumb}${whenCrumb}<span class="ik-note">${provenance}</span></div>`;

        // Build-around: category chips derive from HER wardrobe; empty
        // wardrobe → the whole section stays out (that's the cataloguing
        // problem showing up in the wrong place).
        let ba = '';
        if (_waItems.length) {
          const cats = ['All'].concat([...new Set(_waItems.map(w => w.category).filter(Boolean))]);
          const items = (st.cat === 'All' ? _waItems : _waItems.filter(w => w.category === st.cat)).slice(0, 30);
          // Travel's rack IS the shortlist — everything she picks is kept
          // and the engine says what earns its place (COPY: needs sign-off)
          ba = `<div class="ik-ba"><div class="ik-ba-hd"><span class="ik-ba-lab">${_ikEsc(_rbTrackCfg(st.kind).intake.rackLabel)}</span>${cats.map(c =>
              `<button class="ik-ba-cat${c === st.cat ? ' on' : ''}" onclick="window._ikCat('${_ikEsc(c)}')">${_ikEsc(c)}</button>`).join('')}</div>
            <div class="ik-rack">${items.map(w => `
              <button class="ik-ri${st.anchors.indexOf(w.id) !== -1 ? ' sel' : ''}" onclick="window._ikAnchor(${JSON.stringify(String(w.id)).replace(/"/g, '&quot;')})">
                <span class="im">${w.image_url ? `<img src="${_ikEsc(w.image_url)}" alt="" loading="lazy">` : ''}${st.anchors.indexOf(w.id) !== -1 ? '<span class="ck">✓</span>' : ''}</span>
                <span class="nm">${_ikEsc(w.label || '')}</span>
              </button>`).join('')}</div></div>`;
        }

        // The day list — the primary path is SPARSE: pin the two things
        // she knows about, commit, Robes fills the rest.
        const chips = _rbTrackCfg(st.kind).intake.quickAdd;
        const rowsHtml = st.rows.map((r, i) => {
          const cellV = r.free
            ? '<span class="v free">Left free</span>'
            : (r.activity ? `<span class="v">${_ikEsc(r.activity)}</span>` : '<span class="v blank">Robes plans it</span>');
          const src = r.free ? 'left free' : (r.src || (r.activity ? 'quick-added' : ''));
          const eveLine = r.evening ? `<div class="s">Evening · ${_ikEsc(r.evening.activity || '')}</div>` : '';
          const tray = !r.expanded ? '' : `<div class="ik-tray">
              <input id="ik-act-${i}" value="${_ikEsc(r.free ? '' : r.activity)}" placeholder="What’s happening this day?" onkeydown="if(event.key==='Enter')window._ikRowDone(${i})">
              <div class="ik-chips">${chips.map(c => `<button class="ik-qc" onclick="window._ikRowChip(${i},'${_ikEsc(c)}')">${_ikEsc(c)}</button>`).join('')}<button class="ik-qc free" onclick="window._ikRowFree(${i})">${r.free ? 'Un-free it' : 'Leave free'}</button></div>
              ${r.evening
                ? `<div class="ik-eve"><span class="lab">Evening</span><input id="ik-eve-${i}" value="${_ikEsc(r.evening.activity || '')}" placeholder="Dinner, a date, drinks…" onkeydown="if(event.key==='Enter')window._ikRowDone(${i})"><button class="rm" onclick="window._ikEveRemove(${i})" aria-label="Remove evening">×</button></div>`
                : `<button class="ik-addeve" onclick="window._ikEveAdd(${i})">+ Add an evening</button>`}
              <button class="ik-addeve" style="align-self:flex-end" onclick="window._ikRowDone(${i})">Done</button>
            </div>`;
          return `<div class="ik-row${r.pinned ? ' pinned' : ''}">
            <button class="ik-pin${r.pinned ? ' on' : ''}" onclick="window._ikPinRow(${i})" aria-label="Pin this day" title="Pinned = fixed — Robes dresses around it"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 17v5"/><path d="M9 3h6l-1 7 3 3H7l3-3z"/></svg></button>
            <div class="ik-dm"><div class="dd">${_ikEsc(r.label)}</div><div class="dt">${_ikEsc(r.date)}</div></div>
            <button class="ik-cell" onclick="window._ikRowOpen(${i})">${cellV}${src ? `<div class="s">${_ikEsc(src)}</div>` : ''}${eveLine}</button>
            ${tray}
          </div>`;
        }).join('');
        const daysBlock = st.rows.length
          ? `<div class="ik-days-hd"><span class="ik-ba-lab">The days</span><span class="ik-days-hint">Pin what’s fixed — Robes dresses the rest</span></div>${rowsHtml}`
          : (st.kind === 'travel' ? '<div class="ik-note" style="margin-bottom:10px">Add dates above and the days appear here.</div>' : '');
        // COPY: needs sign-off (primary labels live in _RB_TRACKS)
        const goLabel = _rbTrackCfg(st.kind).intake.primaryLabel(st);
        host.innerHTML = `<p class="ik-said">${_ikSaid()}</p>${crumbs}${st.err ? `<div class="ik-err">${_ikEsc(st.err)}</div>` : ''}${ba}${daysBlock}
          <div class="ik-actions"><button class="ik-cancel" onclick="window._ikCancel()">Cancel</button>
          <button class="ik-go" onclick="window._ikCommit()">${_ikEsc(goLabel)}</button></div>`;
      }

      // Intake interaction handlers (state → repaint; nothing writes to
      // planned_days or the lookbook until commit)
      window._ikClarify = function(kind) {
        const p = _ikState ? _ikState.prompt : '';
        if (kind === 'daily') { _ikClose(); _ikClearPrompt(); window.__dlSubmit(p || 'An outfit for today'); return; }
        _ikOpen(kind, { prompt: p });
      };
      window._ikCat = function(c) { if (_ikState) { _ikState.cat = c; _ikPaint(); } };
      window._ikAnchor = function(id) {
        const st = _ikState; if (!st) return;
        const k = st.anchors.findIndex(x => String(x) === String(id));
        if (k !== -1) st.anchors.splice(k, 1);
        else { st.anchors.push(_waItems.find(w => String(w.id) === String(id)) ? _waItems.find(w => String(w.id) === String(id)).id : id); }
        _rbTrack('intake_anchor_selected', { kind: st.kind, count: st.anchors.length });
        _ikPaint();
      };
      window._ikWhereEdit = function() { if (_ikState) { _ikState.editingWhere = true; _ikPaint(); setTimeout(() => { const el = document.getElementById('ik-where'); if (el) el.focus(); }, 40); } };
      window._ikWhereDone = function() {
        const st = _ikState; if (!st) return;
        const el = document.getElementById('ik-where');
        const v = ((el && el.value) || '').trim();
        if (v !== st.where) { st.where = v; st.whereEdited = true; }
        st.editingWhere = false;
        _ikPaint();
      };
      window._ikDatesEdit = function() { if (_ikState) { _ikState.editingDates = true; _ikPaint(); } };
      window._ikDatesDone = function() {
        const st = _ikState; if (!st) return;
        let f = (document.getElementById('ik-from') || {}).value || '';
        let t = (document.getElementById('ik-to') || {}).value || '';
        st.editingDates = false; st.err = '';
        if (!f || !t) { _ikPaint(); return; }
        if (t < f) { const x = f; f = t; t = x; } // end before start swaps, never errors
        const days = Math.round((new Date(t + 'T00:00:00Z') - new Date(f + 'T00:00:00Z')) / 86400000) + 1;
        // Each track caps its range (travel = the capsule engine's 10-day
        // ceiling — showing rows the server would silently cut is worse
        // than saying so)
        const cfg = _rbTrackCfg(st.kind).intake;
        if (days > cfg.maxDays) { st.err = cfg.maxDaysError; _ikPaint(); return; }
        // Re-derive rows, preserving activity + pin + evening BY DATE where
        // dates overlap, discarding the rest
        const old = st.rows;
        const before = old.length;
        st.from = f; st.days = days; st.datesEdited = true;
        st.rows = _ikRows(f, days, null).map(r => {
          const prev = old.find(o => o.iso === r.iso);
          return prev ? { ...prev, expanded: false } : r;
        });
        _rbTrack('intake_dates_edited', { kind: st.kind, days_before: before, days_after: days });
        _ikPaint();
      };
      window._ikRowOpen = function(i) {
        const st = _ikState; if (!st || !st.rows[i]) return;
        st.rows.forEach((r, k) => { r.expanded = k === i ? !r.expanded : false; });
        _ikPaint();
        setTimeout(() => { const el = document.getElementById('ik-act-' + i); if (el) el.focus(); }, 40);
      };
      function _ikRowSync(i) {
        const st = _ikState; if (!st || !st.rows[i]) return;
        const r = st.rows[i];
        const a = document.getElementById('ik-act-' + i);
        if (a && !r.free) { if (a.value.trim() !== r.activity) { r.activity = a.value.trim(); r.src = r.activity ? 'quick-added' : ''; } }
        const e = document.getElementById('ik-eve-' + i);
        if (e && r.evening) r.evening.activity = e.value.trim();
      }
      window._ikRowDone = function(i) {
        _ikRowSync(i);
        const st = _ikState; if (!st) return;
        _rbTrack('intake_day_edited', { kind: st.kind, day_index: i, action: 'edit' });
        st.rows[i].expanded = false;
        _ikPaint();
      };
      window._ikRowChip = function(i, txt) {
        const st = _ikState; if (!st || !st.rows[i]) return;
        st.rows[i].free = false;
        st.rows[i].activity = txt;
        st.rows[i].src = 'quick-added';
        _rbTrack('intake_day_edited', { kind: st.kind, day_index: i, action: 'chip' });
        _ikPaint();
      };
      window._ikRowFree = function(i) {
        const st = _ikState; if (!st || !st.rows[i]) return;
        const r = st.rows[i];
        r.free = !r.free;
        if (r.free) { r.activity = ''; r.pinned = false; r.evening = null; r.src = ''; }
        _rbTrack('intake_day_edited', { kind: st.kind, day_index: i, action: r.free ? 'free' : 'unfree' });
        _ikPaint();
      };
      window._ikPinRow = function(i) {
        const st = _ikState; if (!st || !st.rows[i]) return;
        _ikRowSync(i);
        const r = st.rows[i];
        if (r.free) return;
        r.pinned = !r.pinned;
        _rbTrack('intake_day_pinned', { kind: st.kind, day_index: i, slot: 'day', on: r.pinned });
        _ikPaint();
      };
      window._ikEveAdd = function(i) {
        const st = _ikState; if (!st || !st.rows[i]) return;
        _ikRowSync(i);
        st.rows[i].evening = { activity: '', pinned: false };
        _rbTrack('intake_evening_added', { kind: st.kind, day_index: i });
        _ikPaint();
        setTimeout(() => { const el = document.getElementById('ik-eve-' + i); if (el) el.focus(); }, 40);
      };
      window._ikEveRemove = function(i) {
        const st = _ikState; if (!st || !st.rows[i]) return;
        st.rows[i].evening = null;
        _ikPaint();
      };

      window._ikCommit = function() {
        const st = _ikState; if (!st) return;
        st.rows.forEach((r, i) => _ikRowSync(i));
        // Commit routes by the track's ENGINE, not its name — a fourth
        // track is a config entry riding an existing generator.
        if (_rbTrackCfg(st.kind).engine === 'travel') {
          // Everything happens in the prompt, never the modal (Annie,
          // 2026-07-23): the unfurl IS the brief — crumbs are the
          // destination/dates, the day list is the day planner, and the
          // build-around rack is the shortlist ("what's tempting you?").
          // The modal's guardrails move inline.
          if (!st.where) { st.err = 'Tell Robes where you’re going first.'; _ikPaint(); return; }
          if (!st.from) { st.err = 'Add the dates — even rough ones — and Robes plans the days.'; _ikPaint(); return; }
          if (_waItems.length >= _TV_MIN_ANCHORS && st.anchors.length < _TV_MIN_ANCHORS) {
            st.err = 'Pick at least ' + _TV_MIN_ANCHORS + ' pieces you’re tempted to bring — Robes tells you what earns its place.';
            _ikPaint(); return;
          }
          _rbTrack('intake_committed', { kind: 'travel', days: st.rows.length, moments: st.rows.length, pinned_count: st.rows.filter(r => r.pinned).length, evenings: st.rows.filter(r => r.evening && r.evening.activity).length, anchors: st.anchors.length, free_days: st.rows.filter(r => r.free).length });
          // Evening moments fold into the day's plan line — travel
          // generation already dresses Day + Evening slots per day.
          const plan = st.rows.map(r => {
            if (r.free) return null;
            const eve = r.evening && r.evening.activity ? (r.activity ? r.activity + ' — evening: ' + r.evening.activity : 'Evening: ' + r.evening.activity) : r.activity;
            return eve || '';
          });
          _tvBrief = {
            dest: st.where,
            dateFrom: st.from,
            dateTo: _pdAddISO(st.from, st.days - 1),
            brief: st.prompt,
            anchors: st.anchors.map(String),
            plan,
            suggested: [],
          };
          _ikClose(); _ikClearPrompt();
          _tvGenerate(plan);
          return;
        }
        // Weekly: evenings fold into the day's authoritative plan line
        // (one look reads the whole day until Phase 3 gives weekly
        // per-slot looks); the evening MOMENT still gets its own index row
        // via wkData.evenings.
        const dayPlan = st.rows.map(r => {
          if (r.free) return null;
          const eve = r.evening && r.evening.activity ? (r.activity ? r.activity + ' — evening: ' + r.evening.activity : 'Evening: ' + r.evening.activity) : r.activity;
          return eve || '';
        });
        if (!dayPlan.some(p => p !== null)) { st.err = 'Every day is left free — keep at least one dressed.'; _ikPaint(); return; }
        const weekDays = st.rows.map(r => r.label + ' · ' + r.date);
        const weekIso = st.rows.map(r => r.iso);
        const pinnedDays = st.rows.map((r, i) => r.pinned ? i : -1).filter(i => i !== -1);
        const evenings = st.rows.map((r, i) => r.evening && r.evening.activity ? { day_index: i, activity: r.evening.activity, pinned: !!r.evening.pinned } : null).filter(Boolean);
        _rbTrack('intake_committed', { kind: 'weekly', days: st.rows.length, moments: st.rows.length + evenings.length, pinned_count: pinnedDays.length, evenings: evenings.length, anchors: st.anchors.length, free_days: st.rows.filter(r => r.free).length });
        const anchors = st.anchors.slice();
        const brief = st.prompt;
        _ikClose(); _ikClearPrompt();
        _wkGenerate(brief, dayPlan, weekDays, weekIso, { anchorItemIds: anchors, pinnedDays, evenings });
      };

      // ── boot wiring ────────────────────────────────────────────────
      (function _ikBoot() {
        try {
          const m = location.search.match(/[?&]diary=(on|off)/);
          if (m) localStorage.setItem(_IK_FLAG_KEY, m[1]);
        } catch (_) {}
        if (!_rbDiaryOn()) return;
        if (!document.getElementById('rb-ik-style')) {
          const st = document.createElement('style');
          st.id = 'rb-ik-style';
          st.textContent = _IK_CSS;
          document.head.appendChild(st);
        }
        const wire = () => {
          const input = document.querySelector('.cb-input');
          const ta = document.getElementById('cb-ta');
          if (!input || !ta) return false;
          if (!document.getElementById('rb-scopechip')) {
            const chip = document.createElement('button');
            chip.id = 'rb-scopechip';
            chip.onclick = _ikScopeBack;
            input.insertBefore(chip, ta);
          }
          const box = document.querySelector('.concierge-box');
          if (box && !document.getElementById('rb-sugg')) {
            const sugg = document.createElement('div');
            sugg.id = 'rb-sugg';
            const host = _ikHost(); // ensures #rb-intake sits flush under the box
            box.parentNode.insertBefore(sugg, host ? host.nextSibling : box.nextSibling);
          }
          ta.addEventListener('keydown', e => { if (e.key === 'Escape') _ikScopeBack(); });
          return true;
        };
        let tries = 0;
        const t = setInterval(() => { if (wire() || ++tries > 40) clearInterval(t); }, 250);
        // Auto-scope + pills once the session and rail cache have landed
        let tries2 = 0;
        const t2 = setInterval(() => {
          if (_waUid()) { _ikAutoScope(); _ikPillsPaint(); if (++tries2 > 3) clearInterval(t2); }
          else if (++tries2 > 60) clearInterval(t2);
        }, 1500);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) _ikPillsPaint(); });
      })();

      (function _rbOnboardHandoff() {
        let piece = null;
        try {
          const raw = sessionStorage.getItem('rb_onboard_piece');
          if (raw) piece = JSON.parse(raw);
          sessionStorage.removeItem('rb_onboard_piece');
        } catch (e) { piece = null; }
        if (!piece || (!piece.prompt && !piece.photo)) return;
        // Onboarding prefires /api/style the moment the piece is filed — if
        // the result already landed, the card renders styled straight away.
        let styled = null;
        try {
          const rawS = sessionStorage.getItem('rb_onboard_styled');
          if (rawS) styled = JSON.parse(rawS);
          sessionStorage.removeItem('rb_onboard_styled');
        } catch (e) { styled = null; }

        const serif = "'Cormorant',Georgia,serif";
        if (!document.getElementById('rb-styled-style')) {
          const ss = document.createElement('style');
          ss.id = 'rb-styled-style';
          ss.textContent = '@keyframes rbStyPulse{0%,100%{opacity:1}50%{opacity:.55}}' +
            '@media(max-width:560px){#rb-styled-tiles{grid-template-columns:1fr 1fr 1fr !important;gap:8px !important}}';
          document.head.appendChild(ss);
        }
        const card = document.createElement('section');
        card.id = 'rb-styled';
        // P0 center stage: the card sits directly under the prompt box,
        // ABOVE the wardrobe tracker (which snaps up when it collapses).
        card.style.cssText = 'display:block;margin:0 0 40px';

        // The whole block collapses and falls off the DOM the moment she
        // interacts with it or types a new prompt into the concierge — the
        // tracker beneath snaps up into the prime slot (elastic snap-up).
        // The styled result is already saved in the lookbook by then.
        let collapsed = false;
        function collapse() {
          if (collapsed) return;
          collapsed = true;
          if (!card.isConnected) { card.remove(); return; }
          card.style.overflow = 'hidden';
          card.style.maxHeight = card.scrollHeight + 'px';
          card.style.transition = 'max-height .45s ease, opacity .3s ease, margin .45s ease';
          requestAnimationFrame(function() {
            card.style.maxHeight = '0';
            card.style.opacity = '0';
            card.style.margin = '0';
          });
          setTimeout(function() { card.remove(); }, 500);
        }
        window.__rbStyledCollapse = collapse;
        document.addEventListener('input', function onType(e) {
          if (e.target && e.target.id === 'cb-ta' && e.target.value) {
            document.removeEventListener('input', onType);
            collapse();
          }
        });

        function mount() {
          if (collapsed || card.isConnected) return;
          const dash = document.getElementById('dash');
          if (!dash) { setTimeout(mount, 300); return; }
          const tracker = dash.querySelector('.tracker');
          if (tracker && tracker.parentNode) tracker.parentNode.insertBefore(card, tracker);
          else dash.insertBefore(card, dash.firstChild);
        }

        const photoThumb = piece.photo
          ? '<img src="' + _waEsc(piece.photo) + '" style="width:56px;height:72px;border-radius:6px;object-fit:cover;flex-shrink:0" alt="">'
          : '';
        const pieceName = (piece.prompt || 'your piece').slice(0, 48);

        function shell(title, sub, tiles, ctaRow, footer) {
          return '<div style="font-size:10px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-faint);margin:0 0 12px">Your piece, styled</div>' +
            '<div style="border:0.5px solid rgba(32,32,33,0.12);border-radius:var(--rad-card);background:#fff;padding:22px 24px">' +
              '<div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;flex-wrap:wrap">' + photoThumb +
                '<div style="flex:1;min-width:200px">' +
                  '<div style="font-family:' + serif + ';font-size:24px;font-weight:300;color:#202021;line-height:1.15">' + title + '</div>' +
                  '<div style="font-size:12px;color:var(--ink-faint);font-style:italic;margin-top:4px">' + sub + '</div>' +
                '</div>' + (ctaRow || '') +
              '</div>' +
              (tiles ? '<div id="rb-styled-tiles" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">' + tiles + '</div>' : '') +
              (footer || '') +
            '</div>';
        }

        function paintLoading() {
          const tiles = [0, 1, 2].map(() =>
            '<div style="aspect-ratio:4/5;border-radius:var(--rad-sm);background:#EDE9E2;animation:rbStyPulse 1.8s ease-in-out infinite"></div>'
          ).join('');
          card.innerHTML = shell(
            'Styling your ' + _waEsc(pieceName.toLowerCase()) + '<em>…</em>',
            'Three editorial looks are composing — they’ll appear right here.',
            tiles, '');
          mount();
        }

        function paintError() {
          // The card may have collapsed while /api/style was in flight —
          // painting a retry button into a detached node is invisible, so
          // surface the failure somewhere she can act on it instead.
          if (collapsed) { _waShowToast('Robes couldn’t style your first piece — it’s safe in your wardrobe, tap it any time.'); return; }
          card.innerHTML = shell(
            'Robes couldn’t style it <em>just now.</em>',
            'Your piece is safely in your wardrobe — try the looks again.',
            '',
            '<button id="rb-styled-retry" style="flex-shrink:0;padding:11px 20px;border-radius:100px;border:0.5px solid rgba(32,32,33,0.2);background:#fff;font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:#202021;cursor:pointer">Style it three ways</button>');
          mount();
          const btn = document.getElementById('rb-styled-retry');
          if (btn) btn.onclick = function() { collapsed = true; card.remove(); _cbStyleSubmit(piece.prompt || '', piece.photo || null); };
        }

        // The styled result saves straight into the lookbook the moment it's
        // ready — the Lookbook row (above Moodboards) shows the key piece
        // populated without her opening anything. Opening the full render
        // passes {skipSave, savedId} so nothing duplicates.
        let cardSaveId = null;

        function persistCardImages(data) {
          if (!cardSaveId) return;
          const saved = snLoad().find(x => x.id === cardSaveId);
          if (!saved) return;
          const persistable = (data.generatedImages || []).map(s => (typeof s === 'string' && s.indexOf('http') === 0) ? s : null);
          snUpdate(cardSaveId, {
            img: persistable.find(Boolean) || saved.img || null,
            kpData: { ...(saved.kpData || {}), generatedImages: persistable },
          });
        }

        function paintReady(data, prompt) {
          const ways = (data.ways || []).slice(0, 3);
          const imgs = Array.isArray(data.generatedImages) ? data.generatedImages : [];
          const pending = !!data.jobId;
          const tiles = ways.map(function(w, i) {
            const src = typeof imgs[i] === 'string' ? imgs[i] : null;
            return '<div style="cursor:pointer" onclick="document.getElementById(\'rb-styled-open\').click()">' +
              '<div id="rb-styled-img-' + i + '" style="aspect-ratio:4/5;border-radius:var(--rad-sm);overflow:hidden;background:#EDE9E2;' + (!src && pending ? 'animation:rbStyPulse 1.8s ease-in-out infinite' : '') + '">' +
                (src ? '<img src="' + _waEsc(src) + '" style="width:100%;height:100%;object-fit:cover;display:block" alt="">' : '') +
              '</div>' +
              '<div style="font-family:' + serif + ';font-size:14px;color:#202021;margin-top:8px;line-height:1.25">' + _waEsc(w.title || 'Look ' + (i + 1)) + '</div>' +
            '</div>';
          }).join('');
          // Peak-emotion moment → cataloguing loop. The wow is delivered, so
          // the dominant next action is the NEXT piece (the WAW driver), not
          // more consumption; "See the full looks" steps back to a text link.
          const nCat = Math.max(1, _waItems.length);
          const leftCat = Math.max(0, _WA_TARGET - nCat);
          const nudge = leftCat > 0
            ? 'That’s piece ' + nCat + ' filed. Add ' + leftCat + ' more and Robes builds every look entirely from your own closet.'
            : 'Your wardrobe’s there — Robes now styles you head to toe from what you own.';
          const footer =
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-top:18px;padding-top:16px;border-top:0.5px solid rgba(32,32,33,0.10)">' +
              '<div style="font-size:12.5px;color:#6E6A64;line-height:1.4;flex:1;min-width:180px">' + nudge + '</div>' +
              (leftCat > 0
                ? '<button id="rb-styled-addnext" style="flex-shrink:0;padding:11px 20px;border-radius:100px;border:none;background:#202021;color:#fff;font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;cursor:pointer">Add your next piece →</button>'
                : '') +
            '</div>';
          card.innerHTML = shell(
            'Your first piece, <em>worn three ways.</em>',
            'Built around your ' + _waEsc(pieceName.toLowerCase()) + ' — tap through for the full looks.',
            tiles,
            '<button id="rb-styled-open" style="flex-shrink:0;padding:10px 16px;border-radius:100px;border:0.5px solid rgba(32,32,33,0.2);background:#fff;color:#202021;font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;cursor:pointer">See the full looks →</button>',
            footer);
          mount();
          const addNext = document.getElementById('rb-styled-addnext');
          if (addNext) addNext.onclick = function() { _wtrkOpenAdd(); collapse(); };
          if (!cardSaveId) {
            const persistable = imgs.map(s => (typeof s === 'string' && s.indexOf('http') === 0) ? s : null);
            const title = data.fallback ? 'Balmain waistcoat' : ((prompt || 'Your piece').slice(0, 60));
            cardSaveId = snAdd({
              type: 'key-piece',
              title,
              subtitle: 'Worn three ways · ' + new Date().toLocaleDateString('en-GB', { weekday: 'long' }),
              img: persistable.find(Boolean) || data.photoUrl || null,
              kpData: { ways: data.ways, fallback: data.fallback, photoUrl: data.photoUrl, generatedImages: persistable, intent: 'style', context: null },
            });
          }
          const open = document.getElementById('rb-styled-open');
          if (open) open.onclick = function() {
            window.__kpRenderResult(data, prompt, { intent: 'style', skipSave: true, savedId: cardSaveId });
            collapse();
          };
          if (pending) pollImgs(data);
        }

        // Light image poll for the card tiles — patches the saved lookbook
        // entry as hosted URLs land, so the row thumbnail fills in too.
        function pollImgs(data) {
          const t0 = Date.now();
          (function tick() {
            fetch('/api/images/' + data.jobId)
              .then(function(r) { return r.ok ? r.json() : null; })
              .then(function(job) {
                if (job && Array.isArray(job.images)) {
                  let changed = false;
                  job.images.forEach(function(src, i) {
                    if (!src) return;
                    if (!Array.isArray(data.generatedImages)) data.generatedImages = [];
                    if (data.generatedImages[i] !== src) { data.generatedImages[i] = src; changed = true; }
                    const wrap = document.getElementById('rb-styled-img-' + i);
                    if (wrap && !wrap.querySelector('img')) {
                      wrap.style.animation = 'none';
                      wrap.innerHTML = '<img src="' + _waEsc(src) + '" style="width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity .5s" alt="">';
                      requestAnimationFrame(function() { const im = wrap.querySelector('img'); if (im) im.style.opacity = '1'; });
                    }
                  });
                  if (changed) persistCardImages(data);
                  if (job.done) return settle();
                } else if (!job) return settle();
                if (Date.now() - t0 < 300000) setTimeout(tick, 4000); else settle();
              })
              .catch(function() { if (Date.now() - t0 < 300000) setTimeout(tick, 6000); else settle(); });
          })();
          function settle() {
            [0, 1, 2].forEach(function(i) {
              const wrap = document.getElementById('rb-styled-img-' + i);
              if (wrap) wrap.style.animation = 'none';
            });
          }
        }

        async function quietStyle() {
          try {
            const genId = _rbGenId();
            const res = await fetch('/api/style', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: piece.prompt || '',
                photo: piece.photo || null,
                userId: _waUid() || undefined,
                genId,
                styleDna: _rbStyleDna(), styleIcons: _rbStyleIcons(), gender: _rbGender(),
                wardrobeCount: Math.max(1, _waItems.length),
                wardrobeItems: _waItems.map(i => ({ label: i.label, category: i.category, color: i.color, times_worn: i.times_worn })),
                intent: 'style',
              }),
            });
            if (!res.ok) throw new Error(await res.text());
            const forkData = await res.json();
            forkData.genId = genId;
            return forkData;
          } catch (e) { return null; }
        }

        if (styled && styled.data && styled.data.ways && Date.now() - (styled.ts || 0) < 10 * 60 * 1000) {
          paintReady(styled.data, styled.prompt || piece.prompt || '');
        } else {
          paintLoading();
          quietStyle().then(function(data) {
            if (data && Array.isArray(data.ways) && data.ways.length) paintReady(data, piece.prompt || '');
            else paintError();
          });
        }

        // Persist the key piece to the wardrobe in the background — the
        // first item a user shows Robes should count toward their 15.
        // Onboarding step 04 normally catalogs the piece itself before the
        // handoff (payload carries cataloged: true) — only persist here for
        // legacy payloads or when the onboarding insert failed.
        if (piece.photo && !piece.cataloged) (async function() {
          try {
            const m = String(piece.photo).match(/^data:([^;]+);base64,(.+)$/);
            if (!m) return;
            const analyse = () => fetch('/api/wardrobe/analyse', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: m[2], mimeType: m[1], userId: _waUid() || undefined }),
            }).then(r => r.ok ? r.json() : null).catch(() => null);
            let [tag, up] = await Promise.all([
              analyse(),
              fetch('/api/wardrobe/upload', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: m[2], mimeType: m[1] }),
              }).then(r => r.ok ? r.json() : null).catch(() => null),
            ]);
            if (!tag || tag.analysisFailed || (!tag.noItemDetected && !tag.label)) {
              await new Promise(r => setTimeout(r, 1500));
              tag = (await analyse()) || tag;
            }
            if (tag && tag.noItemDetected) return; // face/room photo — not a wardrobe piece
            const label = (tag && tag.label) || (piece.prompt || '').slice(0, 60) || 'Key piece';
            // Wait for the session-dependent fetch helper to be usable
            let tries = 0;
            while (!_waUid() && tries++ < 20) await new Promise(r => setTimeout(r, 250));
            if (!_waUid()) return;
            await _waFetch('POST', 'wardrobe_items', {
              user_id: _waUid(),
              label,
              category: (tag && tag.category) || 'Other',
              color: (tag && tag.color) || null,
              brand: (tag && tag.brand) || null,
              notes: (tag && tag.notes) || null,
              image_url: (up && up.url) || null,
              item_dna: (tag && tag.item_dna) || undefined,
            });
            await _waLoad();
            console.log('[robes] onboarding key piece saved to wardrobe:', label);
          } catch (e) { console.warn('[robes] onboarding wardrobe persist failed:', e); }
        })();
      })();
    };
