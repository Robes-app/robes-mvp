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
          <button onclick="document.getElementById('acct-modal').style.display='none'" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:18px;color:#A89880;cursor:pointer;padding:4px">✕</button>
          <h2 style="font-family:'Cormorant',Georgia,serif;font-weight:300;font-size:26px;margin:0 0 4px;color:#202021">Account details</h2>
          <p style="font-size:12px;color:#A89880;margin:0 0 28px;letter-spacing:.04em">${_acctEsc(userEmail)}</p>
          <div id="acct-msg" style="font-size:13px;margin-bottom:16px;min-height:18px"></div>
          <label style="display:block;margin-bottom:16px">
            <span style="display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#6E6A64;margin-bottom:6px">First name</span>
            <input id="acct-first" value="${_acctEsc(prof.first_name)}" style="width:100%;height:46px;border:1px solid rgba(32,32,33,0.12);border-radius:8px;padding:0 14px;font-size:14px;color:#202021;background:#fff;outline:none;box-sizing:border-box">
          </label>
          <label style="display:block;margin-bottom:16px">
            <span style="display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#6E6A64;margin-bottom:6px">Last name</span>
            <input id="acct-last" value="${_acctEsc(prof.last_name)}" style="width:100%;height:46px;border:1px solid rgba(32,32,33,0.12);border-radius:8px;padding:0 14px;font-size:14px;color:#202021;background:#fff;outline:none;box-sizing:border-box">
          </label>
          <label style="display:block;margin-bottom:28px">
            <span style="display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#6E6A64;margin-bottom:6px">Mobile number</span>
            <input id="acct-mobile" type="tel" value="${_acctEsc(prof.mobile)}" placeholder="+353..." style="width:100%;height:46px;border:1px solid rgba(32,32,33,0.12);border-radius:8px;padding:0 14px;font-size:14px;color:#202021;background:#fff;outline:none;box-sizing:border-box">
          </label>
          <button onclick="window.__saveAcctDetails()" style="width:100%;height:48px;background:#202021;color:#fff;border:none;border-radius:8px;font-size:10px;letter-spacing:.16em;text-transform:uppercase;cursor:pointer;font-weight:500">Save changes</button>
        </div>`;
      document.body.appendChild(acctModal);
      acctModal.addEventListener('click', (e) => { if (e.target === acctModal) acctModal.style.display = 'none'; });

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
          const res = await fetch(SUPA_URL + '/rest/v1/profiles?id=eq.' + userId, {
            method: 'PATCH',
            headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + token,
              'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              first_name: document.getElementById('acct-first').value.trim(),
              last_name: document.getElementById('acct-last').value.trim(),
              mobile: document.getElementById('acct-mobile').value.trim()
            })
          });
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
              if (city) window.__rbCtx.city = city;

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
      if (navigator.permissions && navigator.permissions.query) {
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
        if (!_waLoaded) {
          grid.innerHTML = '<div style="padding:56px 24px;text-align:center"><div style="font-family:\'Cormorant\',Georgia,serif;font-style:italic;font-weight:300;font-size:18px;color:#A89880">Opening your wardrobe…</div></div>';
        } else {
          const filtered = _waCat === 'All' ? _waItems : _waItems.filter(i => i.category === _waCat);
          const frag = document.createDocumentFragment();
          filtered.forEach(it => frag.appendChild(_waCard(it)));
          frag.appendChild(_waAddCard());
          grid.innerHTML = '';
          grid.appendChild(frag);
          _waSyncCounts();
        }
        _waObserver.observe(grid, { childList: true });
        _waRendering = false;
      }

      const _WA_TARGET = 15;
      // Wardrobe-first tracker copy (kicker, body) per milestone. Benefit-led:
      // the reason to add the next piece leads, the count trails as proof.
      // Copy stays honest about cold-start — below 15 pieces Robes weaves in
      // what you own but still fills gaps editorially; it only styles head to
      // toe from your closet once the wardrobe is built out.
      function _wtrkCopy(n) {
        const left = Math.max(0, _WA_TARGET - n);
        if (n === 0)  return ['Start here', 'Add your first piece and Robes starts weaving your own wardrobe into every look — <strong>0 of 15 catalogued</strong>.'];
        if (n < 5)   return ['Keep going', 'Add ' + left + ' more and Robes can dress you head to toe from your own closet — <strong>' + n + ' of 15 catalogued</strong>.'];
        if (n < 10)  return ['Keep going', 'Every piece you add pulls more of your real wardrobe into your daily looks — <strong>' + n + ' of 15 catalogued</strong>.'];
        if (n < 15)  return ['Nearly there', 'Add ' + left + ' more and every look is built entirely from your own wardrobe — <strong>' + n + ' of 15 catalogued</strong>.'];
        return ['Growing wardrobe', '<strong>' + n + ' pieces catalogued</strong> — the more you add, the sharper every look Robes builds.'];
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

        // Graduated ≥15 tracker: at the styling threshold the progress-to-15
        // job is done, so the 100% bar + the pre-15 pitch headline retire.
        if (!document.getElementById('rb-wtrk-style')) {
          const st = document.createElement('style');
          st.id = 'rb-wtrk-style';
          st.textContent = '.wtrk-complete .wtrk-h{display:none}.wtrk-complete .wtrk-bar{display:none}.wtrk-complete .wtrk-num span{display:none}';
          document.head.appendChild(st);
        }

        // wg-count pill inside the wardrobe panel
        const countEl = document.getElementById('wg-count');
        if (countEl) countEl.textContent = label;

        // nav badge
        const navBadge = document.querySelector('.nav-wbtn-count');
        if (navBadge) navBadge.textContent = n;

        // dashboard tracker (wardrobe-first redesign: count + copy + bar +
        // the catalogued pieces themselves, so the wardrobe is visible on
        // the dashboard, not just counted)
        const numEl = document.getElementById('wtrk-num');
        const fillEl = document.getElementById('wtrk-fill');
        const kickEl = document.getElementById('wtrk-kicker');
        const copyEl = document.getElementById('wtrk-copy');
        // At/after the 15-piece threshold the module retires completely
        // (beta feedback: it read as clutter once the closet was built out).
        // The section stays in the DOM — it's _rbApplyLayout's anchor and
        // #rb-styled glues after it — it's just no longer painted.
        const complete = n >= _WA_TARGET;
        const trkSection = document.getElementById('wtrk');
        if (trkSection) {
          trkSection.classList.toggle('wtrk-complete', complete);
          trkSection.style.display = complete ? 'none' : '';
        }
        if (numEl) numEl.innerHTML = complete ? String(n) : (n + '<span> / ' + _WA_TARGET + '</span>');
        if (fillEl) fillEl.style.width = Math.min(100, Math.round(n / _WA_TARGET * 100)) + '%';
        const [kicker, body] = _wtrkCopy(n);
        if (kickEl) kickEl.textContent = kicker;
        if (copyEl) copyEl.innerHTML = body;

        const itemsEl = document.getElementById('wtrk-items');
        if (itemsEl) {
          const tiles = _waItems.slice(0, 12).map(it => {
            const idAttr = _waEsc(String(it.id));
            return '<button class="wtrk-it" onclick="window.__wtrkEdit(\'' + idAttr + '\')" title="' + _waEsc(it.label) + '">' +
              (it.image_url
                ? '<img src="' + _waEsc(it.image_url) + '" alt="" loading="lazy">'
                : '<div class="wtrk-mono">' + _waEsc((it.label || '?').charAt(0).toUpperCase()) + '</div>') +
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
          ctaEl.childNodes[0].textContent = n === 0 ? 'Add your first piece' : 'Add pieces';
          ctaEl.onclick = function(e) { e.preventDefault(); e.stopPropagation(); _wtrkOpenAdd(); };
        }
        const snapEl = document.getElementById('wtrk-snap');
        if (snapEl) snapEl.onclick = _wtrkOpenAdd;

        // Refresh the masthead — once the count lands, the returner echo shows
        // the real number (and an established ≥3-piece closet flips a first
        // load to the returner register).
        if (typeof _rbUpdateMasthead === 'function') _rbUpdateMasthead();
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
        div.innerHTML = '<div class="wg-img-wrap">' +
          (it.image_url ? '<img src="' + _waEsc(it.image_url) + '" alt="' + _waEsc(it.label) + '" loading="lazy">' :
            '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;opacity:.3"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>') +
          (it.times_worn === 0 ? '<div class="wg-owned-badge">Never worn</div>' : '') +
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
        const div = document.createElement('div');
        div.className = 'wg-item wg-add wg-img-wrap';
        div.style.cursor = 'pointer';
        div.innerHTML = '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
        div.addEventListener('click', () => { _waEditId = null; _waAfterAdd = null; window.WA && WA.open(); });
        return div;
      }

      let _waFiltersBuilt = false;
      function _waBuildFilters() {
        const container = document.getElementById('wg-filters');
        if (!container) return;
        // Only rebuild if the bundle has overwritten our pills (check for onclick attr)
        const existing = container.querySelector('.wg-pill');
        if (_waFiltersBuilt && existing && !existing.getAttribute('onclick')) return;
        container.innerHTML = '';
        _waFiltersBuilt = true;
        WA_CATS.forEach(cat => {
          const btn = document.createElement('button');
          btn.className = 'wg-pill' + (cat === _waCat ? ' active' : '');
          btn.textContent = cat;
          btn.addEventListener('click', () => {
            _waCat = cat;
            container.querySelectorAll('.wg-pill:not(.wg-pack-pill)').forEach(p => p.classList.toggle('active', p.textContent === cat));
            _waRender();
          });
          container.appendChild(btn);
        });
        // Multi-select → Travel Edit, straight from the wardrobe (PRD:
        // the packing connection lives across the platform)
        const packBtn = document.createElement('button');
        packBtn.className = 'wg-pill wg-pack-pill';
        packBtn.textContent = '✈ Pack a trip';
        packBtn.style.marginLeft = 'auto';
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
              wrap.innerHTML = `<label style="font-size:10px;letter-spacing:0.1em;color:#9A8E82;display:block;margin-bottom:8px;">SILHOUETTE &amp; FIT</label><div id="rb-fit-pills" style="display:flex;flex-wrap:wrap;gap:6px;"></div>`;
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
                return `<span style="display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border:1px solid #C8B8A2;border-radius:20px;font-size:12px;color:#4A3F35;background:#FAF8F5;white-space:nowrap;">${p}<button onclick="window.__rbRemovePill(${i})" style="background:none;border:none;cursor:pointer;color:#9A8E82;font-size:13px;line-height:1;padding:0;margin-left:2px;">×</button></span>`;
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

        // Shared swatch data + renderer — used by both add (step 3) and edit modal
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
            swatchContainer.innerHTML = `<div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px;"><span style="font-size:10px;letter-spacing:0.1em;color:#9A8E82;">COLOUR</span><span id="rb-sw-label" style="font-size:12px;color:#6A5E54;font-style:italic;">${selectedColor||''}</span></div>${_buildSwatchRows(selectedColor)}`;
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
            <p style="font-size:14px;color:#9A8E82;margin:0 0 20px;">Snap it or attach it. Robes reads the colour, the cut and the label — and fills in the rest.</p>
            <label id="wa-rb-zone" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;height:240px;border:1.5px dashed #C8B8A2;border-radius:12px;background:#FAF8F5;cursor:pointer;text-align:center;padding:20px;box-sizing:border-box;">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#C8B8A2" stroke-width="1.4"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <span style="font-size:16px;color:#6A5E54;letter-spacing:0.01em;">Snap or attach the piece</span>
              <span style="font-size:13px;color:#B0A090;">Take a photo — or select several and Robes files them one after another</span>
              <input id="wa-rb-file" type="file" accept="image/*" multiple style="display:none;">
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
            <p style="font-size:14px;color:#9A8E82;margin:0 0 16px;">One moment — Robes is looking at the photo.</p>
            <div style="position:relative;height:280px;border-radius:12px;overflow:hidden;background:#1A1410;">
              <img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;display:block;opacity:0.85;">
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
            body: JSON.stringify({ data: match[2], mimeType: match[1] })
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

          function _renderFitPills() {
            const container = document.getElementById('rb-fit-pills');
            if (!container) return;
            container.innerHTML = window.__waSawFit.map(function(p, i) {
              return `<span style="display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border:1px solid #C8B8A2;border-radius:20px;font-size:12px;color:#4A3F35;background:#FAF8F5;white-space:nowrap;">${p}<button onclick="window.__rbRemovePill(${i})" style="background:none;border:none;cursor:pointer;color:#9A8E82;font-size:13px;line-height:1;padding:0;margin-left:2px;">×</button></span>`;
            }).join('');
          }
          window.__rbRemovePill = function(i) {
            window.__waSawFit.splice(i, 1);
            if (window.__waSawItemDna && window.__waSawItemDna.structural_dna) {
              window.__waSawItemDna.structural_dna.silhouette_fit = window.__waSawFit.slice();
            }
            _renderFitPills();
          };

          const aiNotes = (tag.item_dna && tag.item_dna.ai_generated_notes) || tag.notes || '';

          step.innerHTML = `
            ${_waBatchTag()}
            <h2 class="fm-h" style="margin-bottom:4px;">Here's what Robes <em style="font-style:italic;color:#9A7060">saw.</em></h2>
            <p style="font-size:13px;color:#9A8E82;margin:0 0 16px;">${tag.label ? `Pre-filled from your photo. Adjust anything that isn't quite right.` : `Robes couldn't quite read this one — give it a name and it files all the same.`}</p>
            <div style="display:flex;align-items:center;gap:12px;background:#F0EBE3;border-radius:10px;padding:10px 14px;margin-bottom:16px;">
              <img id="wa-saw-thumb" style="width:40px;height:40px;object-fit:cover;border-radius:6px;flex-shrink:0;">
              <div style="flex:1;min-width:0;">
                <div style="font-size:10px;letter-spacing:0.12em;color:#9A8070;margin-bottom:2px;">${tag.label ? '✦ ROBES FILLED THIS IN' : '✦ NAME THIS PIECE'}</div>
                <div style="font-size:12px;color:#6A5E54;">${tag.label ? 'Glance over it, tweak anything, then save.' : 'A name and category is all it needs.'}</div>
              </div>
              <button onclick="window.__waRetake&&window.__waRetake()" style="background:#fff;border:1px solid #D8CEBC;border-radius:20px;padding:6px 14px;font-size:12px;color:#6A5E54;cursor:pointer;white-space:nowrap;font-family:inherit;">↺ Retake</button>
            </div>
            <div style="margin-bottom:12px;">
              <label style="font-size:10px;letter-spacing:0.1em;color:#9A8E82;display:block;margin-bottom:5px;">ITEM NAME</label>
              <input id="wa-saw-label" value="${(tag.label||'').replace(/"/g,'&quot;')}" style="width:100%;box-sizing:border-box;padding:10px 14px;border:1px solid #D8CEBC;border-radius:8px;font-size:15px;font-family:inherit;background:#fff;color:#2A2520;" oninput="window.__waSawLabel=this.value">
            </div>
            <div style="display:flex;gap:10px;margin-bottom:12px;">
              <div style="flex:1;">
                <label style="font-size:10px;letter-spacing:0.1em;color:#9A8E82;display:block;margin-bottom:5px;">CATEGORY</label>
                <select id="wa-saw-cat" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #D8CEBC;border-radius:8px;font-size:14px;font-family:inherit;background:#fff;color:#2A2520;" onchange="window.__waSawCat=this.value">
                  ${cats.map(o => `<option${tag.category===o?' selected':''}>${o}</option>`).join('')}
                </select>
              </div>
              <div style="flex:1;">
                <label style="font-size:10px;letter-spacing:0.1em;color:#9A8E82;display:block;margin-bottom:5px;">BRAND</label>
                <input id="wa-saw-brand" value="${(tag.brand||'').replace(/"/g,'&quot;')}" placeholder="Unknown" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #D8CEBC;border-radius:8px;font-size:14px;font-family:inherit;background:#fff;color:#2A2520;" oninput="window.__waSawBrand=this.value">
              </div>
            </div>
            <div style="margin-bottom:12px;">
              <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px;">
                <label style="font-size:10px;letter-spacing:0.1em;color:#9A8E82;">COLOUR</label>
                <span id="rb-sw-label" style="font-size:12px;color:#6A5E54;font-style:italic;">${initColor}</span>
              </div>
              ${rowsHTML}
            </div>
            ${fitPills.length ? `<div style="margin-bottom:12px;">
              <label style="font-size:10px;letter-spacing:0.1em;color:#9A8E82;display:block;margin-bottom:8px;">SILHOUETTE &amp; FIT</label>
              <div id="rb-fit-pills" style="display:flex;flex-wrap:wrap;gap:6px;"></div>
            </div>` : ''}
            <div style="margin-bottom:16px;">
              <label style="font-size:10px;letter-spacing:0.1em;color:#9A8E82;display:block;margin-bottom:5px;">NOTES <span style="font-weight:400;letter-spacing:0;text-transform:none;color:#B0A090;">optional</span></label>
              <textarea id="wa-saw-notes" placeholder="Fabric, fit, occasion…" style="width:100%;box-sizing:border-box;padding:10px 14px;border:1px solid #D8CEBC;border-radius:8px;font-size:14px;font-family:inherit;background:#fff;color:#2A2520;resize:none;height:72px;" oninput="window.__waSawNotes=this.value">${aiNotes.replace(/</g,'&lt;')}</textarea>
            </div>
            <button id="wa-saw-cta" onclick="window.__waSawSubmit&&window.__waSawSubmit()" style="width:100%;padding:14px;background:#2A2520;color:#F8F5F0;border:none;border-radius:8px;font-size:14px;letter-spacing:0.08em;cursor:pointer;font-family:inherit;">ADD TO WARDROBE →</button>`;

          // Set thumbnail src via DOM (not innerHTML) so large data URLs aren't truncated
          const thumbEl = document.getElementById('wa-saw-thumb');
          if (thumbEl) thumbEl.src = dataUrl;

          // Render pills after innerHTML is set
          _renderFitPills();

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
            if (!(window.__waSawLabel || '').trim()) {
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

            let created = null;
            if (editId) {
              await _waFetch('PATCH', 'wardrobe_items?id=eq.' + editId, payload);
            } else {
              created = await _waFetch('POST', 'wardrobe_items', payload);
            }

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

      _waObserveGrid();

      // Zero out the bundle's mock counts (nav badge "10", tracker "10 / 15")
      // immediately — a new user must never see test data while the real
      // wardrobe loads. _waLoad() re-syncs with real numbers when it lands.
      _waSyncCounts();

      // Poll until Supabase session is ready, then load real wardrobe data.
      (function _waInit() {
        if (_waUid()) { _waLoad(); }
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
          document.querySelectorAll('#wg-filters .wg-pill').forEach(p =>
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
        } catch (e) {
          console.warn('[robes] lookbook cloud pull skipped:', String(e.message || e).slice(0, 120));
        }
      }

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
      snPage.style.cssText = 'display:none;position:fixed;left:0;right:0;bottom:0;top:60px;z-index:45;background:#FAF8F5;overflow-y:auto';
      snPage.innerHTML = `
        <div style="padding:32px 24px 24px;max-width:960px;margin:0 auto">
          <p style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#A89880;margin:0 0 24px">Saved looks & key pieces</p>
          <div id="sn-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px"></div>
          <div id="sn-empty" style="display:none;padding:80px 0;text-align:center">
            <p style="font-family:'Cormorant',Georgia,serif;font-size:22px;font-weight:300;color:#202021;margin:0 0 10px">Nothing saved yet.</p>
            <p style="font-size:13px;color:#A89880;line-height:1.6">Style a key piece or save today's look<br>and it will appear here.</p>
          </div>
        </div>`;
      document.body.appendChild(snPage);

      window.__snClose = function() {
        document.getElementById('sn-page').style.display = 'none';
        window.rbClearCrumb && window.rbClearCrumb();
        window._rbNav && window._rbNav('/dashboard');
      };
      window.__snOpen = function() {
        const av = document.getElementById('av-menu');
        if (av) av.classList.remove('open');
        document.getElementById('sn-page').style.display = 'block';
        snRenderPage();
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

      function snRenderPage() {
        const items = snLoad();
        const grid = document.getElementById('sn-grid');
        const empty = document.getElementById('sn-empty');
        if (!grid) return;
        if (!items.length) {
          grid.style.display = 'none';
          empty.style.display = 'block';
          return;
        }
        grid.style.display = 'grid';
        empty.style.display = 'none';
        _rbcInitSwipe();
        grid.innerHTML = items.map(item => `
          <div onclick="window.__snOpenItem(${item.id})" data-rmfn="__snRemove" data-rmidx="${item.id}" data-rmconfirm="1" style="position:relative;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(32,32,33,0.08);cursor:pointer" onmouseenter="this.querySelector('.sn-rm').style.opacity='1'" onmouseleave="this.querySelector('.sn-rm').style.opacity='0'">
            <button class="sn-rm" onclick="event.stopPropagation();window.__snRemove(${item.id})" style="position:absolute;top:10px;right:10px;opacity:0;transition:opacity .15s;background:rgba(32,32,33,0.55);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            ${item.img ? `<img src="${_waEsc(item.img)}" style="width:100%;aspect-ratio:3/4;object-fit:cover;display:block" alt="">` : `<div style="width:100%;aspect-ratio:3/4;background:#F0EDE8;display:flex;align-items:center;justify-content:center"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C8B8A2" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`}
            <div style="padding:14px 16px 16px">
              <span style="display:inline-block;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#A89880;margin-bottom:6px">${_snTypeLabel(item.type)}</span>
              <div style="font-family:'Cormorant',Georgia,serif;font-size:17px;font-weight:300;color:#202021;line-height:1.3;margin-bottom:4px">${_waEsc(item.title)}</div>
              <div style="font-size:11px;color:#A89880">${_waEsc(item.subtitle || '')}</div>
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
            <span style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#A89880">Lookbook</span>
            <button onclick="window.__snOpen()" style="background:none;border:none;cursor:pointer;font-size:11px;color:#A89880;letter-spacing:.04em;padding:0;text-decoration:underline;text-underline-offset:3px">View all</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
            ${items.map(item => `
              <div onclick="window.__snOpenItem(${item.id})" data-rmfn="__snRemove" data-rmidx="${item.id}" data-rmconfirm="1" style="cursor:pointer;border-radius:10px;overflow:hidden;background:#fff;box-shadow:0 1px 3px rgba(32,32,33,0.07)">
                ${item.img
                  ? `<img src="${item.img}" style="width:100%;aspect-ratio:1/1;object-fit:cover;display:block" alt="">`
                  : `<div style="width:100%;aspect-ratio:1/1;background:#F0EDE8;display:flex;align-items:center;justify-content:center"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C8B8A2" stroke-width="1.4"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>`}
                <div style="padding:10px 12px 12px">
                  <div style="font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#A89880;margin-bottom:3px">${_snTypeLabel(item.type)}</div>
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
        // Rename bundle's "My wardrobe" → "Wardrobe"
        Array.from(document.querySelectorAll('.av-item')).forEach(btn => {
          if (btn.textContent.includes('My wardrobe') || btn.textContent.includes('My Wardrobe')) {
            const txt = btn.childNodes[btn.childNodes.length - 1];
            if (txt && txt.nodeType === Node.TEXT_NODE) txt.textContent = 'Wardrobe';
            else btn.innerHTML = btn.innerHTML.replace(/My [Ww]ardrobe/, 'Wardrobe');
          }
        });

        // Rename "Style notes" → "Lookbook" and wire onclick
        const snAvItem = Array.from(document.querySelectorAll('.av-item')).find(b => b.textContent.includes('Style notes') || b.textContent.includes('Lookbook'));
        if (snAvItem) {
          const txt = snAvItem.childNodes[snAvItem.childNodes.length - 1];
          if (txt && txt.nodeType === Node.TEXT_NODE) txt.textContent = 'Lookbook';
          else snAvItem.innerHTML = snAvItem.innerHTML.replace(/Style notes/, 'Lookbook');
          snAvItem.onclick = () => window.__snOpen();
        }

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
                <div style="font-size:12px;color:#A89880;letter-spacing:.06em" id="kp-load-msg">Generating editorial looks</div>
                <div style="width:120px;height:1px;background:rgba(32,32,33,0.1);position:relative;overflow:hidden;margin-top:8px">
                  <div id="kp-load-bar" style="position:absolute;inset:0;background:#202021;transform:translateX(-100%);animation:kpLoadBar 2.5s ease-in-out infinite"></div>
                </div>`;
              const style = document.createElement('style');
              style.textContent = '@keyframes kpLoadBar{0%{transform:translateX(-100%)}50%{transform:translateX(0)}100%{transform:translateX(100%)}}'
              document.head.appendChild(style);
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
              const res = await fetch('/api/style', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, photo: photoData, styleDna: _rbStyleDna(), styleIcons: _rbStyleIcons(), wardrobeCount: _waItems.length, wardrobeItems: _waItems.map(i => ({ label: i.label, category: i.category, color: i.color, times_worn: i.times_worn })), intent: 'style' }),
              });
              clearInterval(msgInterval);
              overlay.style.display = 'none';
              if (!res.ok) throw new Error(await res.text());
              window.__kpRenderResult(await res.json(), prompt);
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
              if (Date.now() - t0 < 90000) _kpPollTimer = setTimeout(tick, 3500);
              else for (let i = 0; i < count; i++) _kpSettlePlaceholder(i);
            })
            .catch(() => {
              if (Date.now() - t0 < 90000) _kpPollTimer = setTimeout(tick, 5000);
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
        const pieceName = fallback ? 'Balmain waistcoat' : (promptText || 'Your piece');
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
            '@media(max-width:700px){.kp-look-card{grid-template-columns:1fr !important}.kp-look-card>div:last-child{padding:20px 22px 26px !important}.kp-look-imgwrap{min-height:300px !important}}';
          document.head.appendChild(kis);
        }
        const imagesPending = !!data.jobId;

        window.rbSetCrumb && window.rbSetCrumb([{ label: 'Style a piece' }]);
        try { kpResultPage.innerHTML = `
          <div style="width:100%;max-width:900px;margin:0 auto;padding:40px 32px 80px;box-sizing:border-box">

            <h1 id="kp-headline" style="font-family:${serif};font-weight:300;font-size:clamp(32px,4vw,52px);color:#202021;line-height:1.1;margin:0 0 12px">${kpDaily ? 'Your day,<br><em style="color:#A89880">dressed three ways.</em>' : 'Your piece,<br><em style="color:#A89880">worn three ways.</em>'}</h1>
            <p style="font-size:14px;line-height:1.7;color:#6E6A64;max-width:560px;margin:0 0 24px">${fallback ? "We didn't recognise your request, so we've styled a Balmain waistcoat for you instead." : kpDaily ? 'Three complete outfits for today — weather-checked, built from anchor to exclamation point.' : 'Three distinct looks — different moods, occasions, and ways of dressing.'}</p>

            ${kpDaily && kpCtx && (kpCtx.city || kpCtx.tempRange) ? `
            <div style="display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12px;color:#6E6A64;letter-spacing:.04em;border:0.5px solid rgba(32,32,33,0.12);border-radius:40px;padding:9px 18px;margin:0 0 28px;background:#fff">
              <span>🌤</span>
              <strong style="font-weight:500;color:#202021">${_waEsc([kpCtx.city, kpCtx.month].filter(Boolean).join(' · '))}</strong>
              ${kpCtx.tempRange ? `<span style="color:rgba(32,32,33,0.2)">|</span><span>${_waEsc(kpCtx.tempRange)}</span>` : ''}
              ${kpCtx.hint ? `<span style="color:rgba(32,32,33,0.2)">|</span><span style="font-style:italic">${_waEsc(kpCtx.hint)}</span>` : ''}
            </div>` : ''}

            <div style="display:flex;align-items:center;gap:14px;padding:14px 16px;border:0.5px solid rgba(32,32,33,0.15);border-radius:12px;background:#fff;max-width:400px;margin-bottom:40px">
              ${photoUrl ? `<img src="${photoUrl}" style="width:64px;height:80px;border-radius:4px;object-fit:cover;flex-shrink:0" alt="">` : ''}
              <div>
                <div style="font-size:9.5px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:#A89880;margin-bottom:4px">${kpDaily ? "Today's brief" : 'Your piece'}</div>
                <div style="font-family:${serif};font-size:22px;font-weight:400;color:#202021;line-height:1.1">${pieceName}</div>
                ${photoUrl ? '<div style="font-size:12px;color:#A89880;margin-top:4px">✓ The one you uploaded</div>' : ''}
              </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:32px">
              ${ways.map((w, i) => {
                const genImg = generatedImages && generatedImages[i];
                const phInner = imagesPending
                  ? `<span style="font-family:${serif};font-style:italic;font-size:15px;color:#B8AC9C;text-align:center;padding:0 24px">Creating your editorial image…</span>`
                  : `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C8BCAE" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
                return `
                <div class="kp-look-card" style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,3fr);gap:24px;background:#fff;border-radius:12px;overflow:hidden;border:0.5px solid rgba(32,32,33,0.08)">
                  <div class="kp-look-imgwrap" id="kp-look-imgwrap-${i}" style="position:relative;background:#EDE9E2;min-height:340px">
                    ${genImg
                      ? `<img src="${genImg}" style="width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0" alt="">`
                      : `<div class="kp-img-ph" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;${imagesPending ? 'animation:kpPhPulse 1.8s ease-in-out infinite' : ''}">${phInner}</div>`}
                    <span style="position:absolute;top:14px;left:16px;font-family:${serif};font-weight:300;font-size:20px;color:${genImg ? 'rgba(255,255,255,0.85);text-shadow:0 1px 8px rgba(32,32,33,0.35)' : 'rgba(32,32,33,0.35)'}">${String(i+1).padStart(2,'0')}</span>
                  </div>
                  <div style="padding:28px 28px 28px 4px;display:flex;flex-direction:column;gap:16px">
                    <div style="font-size:10px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:#B8A898">${w.eyebrow}</div>
                    <div style="font-family:${serif};font-weight:300;font-size:28px;color:#202021;line-height:1.08">${w.title}</div>
                    <div style="display:flex;flex-direction:column;gap:14px;margin-top:4px">
                      <div><div style="font-size:9.5px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:#B8A898;margin-bottom:5px">The Outfit</div><p style="font-size:13px;line-height:1.65;color:#6E6A64;margin:0">${w.outfit}</p></div>
                      <div><div style="font-size:9.5px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:#B8A898;margin-bottom:5px">Key Details</div><p style="font-size:13px;line-height:1.65;color:#6E6A64;margin:0">${w.details}</p></div>
                      <div><div style="font-size:9.5px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:#B8A898;margin-bottom:5px">Accessories</div><p style="font-size:13px;line-height:1.65;color:#6E6A64;margin:0">${w.accessories}</p></div>
                    </div>
                  </div>
                </div>`;
              }).join('')}
            </div>

            <div style="margin-top:48px;padding:28px 24px;background:rgba(32,32,33,0.03);border-radius:12px;text-align:center">
              <div style="font-family:${serif};font-size:22px;font-weight:300;color:#202021;margin-bottom:6px">How were these looks?</div>
              <div id="kp-fb-prompt">
                <div style="font-size:13px;color:#A89880;margin-bottom:18px;font-style:italic">Tell us — your taste shapes what comes next.</div>
                <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
                  <button id="kp-fb-up" onclick="window.__kpFbRate(1)" style="display:flex;align-items:center;gap:8px;padding:10px 22px;border:1px solid rgba(32,32,33,0.15);border-radius:40px;background:#fff;font-size:12px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#202021;font-family:${sans}">👍 Loved them</button>
                  <button id="kp-fb-dn" onclick="window.__kpFbRate(0)" style="display:flex;align-items:center;gap:8px;padding:10px 22px;border:1px solid rgba(32,32,33,0.15);border-radius:40px;background:#fff;font-size:12px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#202021;font-family:${sans}">Not quite</button>
                </div>
              </div>
              <div id="kp-fb-expand" hidden style="margin-top:16px">
                <textarea id="kp-fb-text" placeholder="What would have made them better?" rows="3" style="width:100%;border:1px solid rgba(32,32,33,0.15);border-radius:8px;padding:12px 14px;font-size:13px;color:#202021;resize:none;outline:none;box-sizing:border-box;font-family:${sans}"></textarea>
                <button onclick="window.__kpFbSubmit()" style="margin-top:10px;padding:10px 28px;background:#202021;color:#fff;border:none;border-radius:40px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;font-family:${sans}">Send feedback</button>
              </div>
              <div id="kp-fb-done" hidden style="font-size:13px;color:#7E7C5A;margin-top:12px">Thank you — noted.</div>
            </div>
          </div>
          <div class="rb-sfoot">
            <div class="rb-sfoot-in">
              <div class="rb-sfoot-meta">
                <span class="t">${_waEsc(pieceName || (kpDaily ? 'Today’s looks' : 'Your piece'))}</span>
                <span class="s">${kpDaily ? 'Daily look' : 'Styled three ways'}</span>
              </div>
              <div class="rb-sfoot-btns">
                <button class="rb-sfbtn" onclick="window.__rbShare&&window.__rbShare()"><svg viewBox="0 0 24 24"><polygon points="3 3 21 12 3 21 3 3"></polygon><line x1="3" y1="12" x2="21" y2="12"></line></svg>Share</button>
                <button class="rb-sfbtn" onclick="window.__rbRename&&window.__rbRename('kp')"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>Rename</button>
                <button class="rb-sfbtn primary" onclick="window.__kpGoBack();setTimeout(()=>{KP&&KP.openKeyPiece&&KP.openKeyPiece()},200)">Style another piece</button>
              </div>
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
            kpData: { ways, fallback, photoUrl, generatedImages: persistable, intent: kpIntent, context: kpCtx },
          });
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

      // Footer "Dress me again" (bug report 4.7): return her to the home
      // prompt to start a fresh brief, rather than silently re-mixing this
      // look (that's what the in-context "Restyle it" does).
      window.__dlDressAgain = function() {
        window.__dlGoBack();
        setTimeout(() => {
          if (typeof _cbSetIntent === 'function') _cbSetIntent('dress-me');
          const ta = document.getElementById('cb-ta');
          if (ta) ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 220);
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
            c.style.cssText = 'margin-top:14px;background:none;border:none;cursor:pointer;font-size:12px;letter-spacing:.06em;color:#A89880;text-decoration:underline;font-family:inherit';
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
            <div style="font-size:12px;color:#A89880;letter-spacing:.06em" id="kp-load-msg">Generating editorial looks</div>
            <div style="width:120px;height:1px;background:rgba(32,32,33,0.1);position:relative;overflow:hidden;margin-top:8px">
              <div id="kp-load-bar" style="position:absolute;inset:0;background:#202021;transform:translateX(-100%);animation:kpLoadBar 2.5s ease-in-out infinite"></div>
            </div>`;
          const ks = document.createElement('style');
          ks.textContent = '@keyframes kpLoadBar{0%{transform:translateX(-100%)}50%{transform:translateX(0)}100%{transform:translateX(100%)}}';
          document.head.appendChild(ks);
          document.body.appendChild(overlay);
        }
        const loadTitle = document.getElementById('kp-load-title');
        if (loadTitle) loadTitle.innerHTML = locked && locked.length
          ? 'Restyling around<br><em>your anchors…</em>'
          : 'Dressing you<br><em>for today…</em>';
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
        try {
          const res = await fetch('/api/daily', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: guard.signal,
            body: JSON.stringify({
              prompt,
              name,
              styleDna: _rbStyleDna(), styleIcons: _rbStyleIcons(),
              wardrobeItems: _waItems.map(i => ({ id: i.id, label: i.label, category: i.category, color: i.color, brand: i.brand, image_url: i.image_url, times_worn: i.times_worn })),
              context,
              locked: locked || undefined,
            }),
          });
          guard.done();
          clearInterval(msgInterval);
          overlay.style.display = 'none';
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
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
            if (saved) snUpdate(savedId, {
              title: data.headline || saved.title,
              dlData: { ...data, context, jobId: undefined, generatedImages: [], prompt: prompt || '' },
            });
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
      // The flick-through carousel for one rack card: the original styled
      // piece, the AI alternates the server proposed for this slot, then
      // owned pieces in the same category. Rebuilt from live data each time.
      function _dlOptions(it) {
        if (!it.orig) it.orig = { name: it.name, brand: it.brand || '', retailer_hint: it.retailer_hint || '', price_point: it.price_point || '', wardrobe_match: it.wardrobe_match || null };
        const list = [{ kind: 'orig', name: it.orig.name, brand: it.orig.brand, retailer_hint: it.orig.retailer_hint, price_point: it.orig.price_point, wardrobe_match: it.orig.wardrobe_match }];
        (Array.isArray(it.alternates) ? it.alternates : []).forEach(a => {
          if (a && a.name && !list.some(o => (o.name || '').toLowerCase() === a.name.toLowerCase())) {
            list.push({ kind: 'ai', name: a.name, brand: a.brand || '', retailer_hint: a.retailer_hint || '', price_point: a.price_point || '' });
          }
        });
        const catL = (it.category || '').toLowerCase().replace(/s$/, '');
        const origId = it.orig.wardrobe_match ? String(it.orig.wardrobe_match.id) : null;
        _waItems.filter(wi => ((wi.category || '').toLowerCase().replace(/s$/, '') === catL) && String(wi.id) !== origId)
          .slice(0, 4)
          .forEach(wi => list.push({ kind: 'owned', name: wi.label, brand: wi.brand || '', retailer_hint: '', price_point: '', wardrobeId: wi.id, image: wi.image_url || null, color: wi.color || '' }));
        return list;
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
.rbc-tile .tslot{position:absolute;left:9px;top:8px;z-index:2;font-size:7.5px;letter-spacing:.16em;text-transform:uppercase;color:#fff;background:rgba(32,32,33,0.42);padding:3px 7px;border-radius:100px}
.rbc-tile .tlab{position:absolute;left:10px;bottom:9px;right:10px;z-index:2;font-family:var(--font-serif);font-style:italic;font-weight:400;font-size:15px;color:#fff;line-height:1.05;pointer-events:none}
.rbc-tile .town{position:absolute;top:7px;right:7px;z-index:2;width:18px;height:18px;border-radius:50%;background:#fff;display:grid;place-items:center;color:#4A7C59}
.rbc-tile .tadd{position:absolute;top:7px;right:7px;z-index:2;font-size:7.5px;letter-spacing:.1em;text-transform:uppercase;color:#fff;background:rgba(185,138,78,0.92);padding:2px 7px;border-radius:100px}
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
.rbc-hlink{background:none;border:none;cursor:pointer;font-size:11px;color:var(--rose);text-decoration:underline;font-family:inherit;white-space:nowrap;padding:4px 0}
.rbc-rack{display:flex;flex-direction:column;gap:12px}
.rbc-row{position:relative;display:grid;grid-template-columns:112px 1fr;gap:16px;align-items:stretch;border:0.5px solid var(--rule-mid);border-radius:var(--rad);background:#fff;padding:12px;transition:border-color .2s,background .2s}
.rbc-row.anchored{border-color:var(--ink)}
.rbc-row.packed{border-color:rgba(126,124,90,0.5);background:var(--sage-bg)}
.rbc-rm{position:absolute;top:-7px;right:-7px;z-index:4;width:22px;height:22px;border-radius:50%;border:0.5px solid var(--rule-mid);background:#fff;color:var(--ink-faint);font-size:13px;line-height:1;display:grid;place-items:center;cursor:pointer;opacity:.45;transition:opacity .15s,color .15s;padding:0;box-shadow:0 1px 4px rgba(32,32,33,0.08)}
.rbc-row:hover .rbc-rm{opacity:1}
.rbc-rm:hover{color:var(--ink);border-color:rgba(32,32,33,0.25)}
.rbc-vp{position:relative;align-self:start;width:100%;border-radius:var(--rad-sm);overflow:hidden;background:var(--cream-200);aspect-ratio:1/1}
.rbc-vp .vslot{position:absolute;top:8px;left:8px;z-index:2;font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink);background:rgba(255,255,255,0.86);padding:3px 7px;border-radius:100px}
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
.rbc-sub .addtag{display:inline-flex;align-items:center;gap:5px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#B98A4E}
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
}`;

      function _rbcEnsureCss() {
        if (document.getElementById('rbc-style')) return;
        const el = document.createElement('style');
        el.id = 'rbc-style';
        el.textContent = _RBC_CSS;
        document.head.appendChild(el);
      }

      // "The read" — the one verdict block every day console carries
      // (ownership for Daily/Weekly, the packing case for Travel).
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
        return `<button class="rbc-tile${wide ? ' wide' : ''}${it.isNew ? ' isnew' : ''}" onclick="window.${cfg.onSwap}(${it.idx})" title="Swap the ${_waEsc(it.shortName)}">
          <div${it.frame.pollAttr} style="position:absolute;inset:0;background:var(--cream-200)">${it.frame.inner}</div>
          <div class="tgrad"></div>
          <span class="tslot">${_waEsc(it.slot)}</span>
          ${it.owned ? `<span class="town">${_rbcCheckSvg}</span>` : (it.showAddTag ? `<span class="tadd">Add</span>` : '')}
          <span class="tnav l" onclick="event.stopPropagation();window.${cfg.onFlip}(${it.idx},-1)" title="Previous">${_rbcChevL}</span>
          <span class="tnav r" onclick="event.stopPropagation();window.${cfg.onFlip}(${it.idx},1)" title="Next">${_rbcChevR}</span>
          <span class="tlab">the ${_waEsc(it.shortName)}</span>
        </button>`;
      }

      function _rbcRow(it, cfg) {
        const np = cfg.noprint ? ' tv-noprint' : '';
        const dots = it.count.len > 1 && it.count.len <= 8
          ? `<span class="rbc-dots">${Array.from({ length: it.count.len }, (_, k) => `<span${k === it.count.cur ? ' class="on"' : ''}></span>`).join('')}</span>`
          : (it.count.len > 8 ? `<span style="font-size:9px;letter-spacing:.08em;color:var(--ink-faint)">${it.count.cur + 1} / ${it.count.len}</span>` : '');
        return `<div class="rbc-row${it.anchored ? ' anchored' : ''}${it.rowClass || ''}"${cfg.onRemove ? ` data-rmfn="${cfg.onRemove}" data-rmidx="${it.idx}"` : ''}>
          ${cfg.onRemove ? `<button class="rbc-rm${np}" onclick="window.${cfg.onRemove}(${it.idx})" title="Remove from this look" aria-label="Remove from this look">×</button>` : ''}
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
              <div class="rbc-flip${np}">
                <button class="rbc-arrow" onclick="window.${cfg.onFlip}(${it.idx},-1)" aria-label="Previous option">${_rbcChevL}</button>
                ${dots}
                <button class="rbc-arrow" onclick="window.${cfg.onFlip}(${it.idx},1)" aria-label="Next option">${_rbcChevR}</button>
              </div>
              <div class="rbc-acts">
                ${cfg.onAnchor ? `<button class="rbc-act${it.anchored ? ' on' : ''}${np}" onclick="window.${cfg.onAnchor}(${it.idx})" title="Lock this piece through restyles">${_rbcLockSvg} ${it.anchored ? 'Anchored' : 'Anchor'}</button>` : ''}
                <button class="rbc-act${np}" onclick="window.${cfg.onSwap}(${it.idx})">${_rbcSwapSvg} Swap</button>
                ${it.thirdHtml || ''}
              </div>
            </div>
          </div>
        </div>`;
      }

      function _rbConsole(cfg, items) {
        _rbcEnsureCss();
        _rbcInitSwipe();
        const lookHtml = `
          <div class="rbc-panel">
            <div class="rbc-lhead">
              <span class="lab">${cfg.headLabel}</span>
              <span class="robes">Robes</span>
            </div>
            ${cfg.occHtml || ''}
            ${cfg.quoteHtml ? `<div class="rbc-quote">${cfg.quoteHtml}</div>` : ''}
            <div class="rbc-board">${items.map((it, i) => _rbcTile(it, i === 0, cfg)).join('')}</div>
            ${cfg.fabricsHtml ? `<div class="rbc-fabrics">${cfg.fabricsHtml}</div>` : ''}
            <div class="rbc-lfoot">
              <span class="rbc-palette">${cfg.paletteHtml || ''}</span>
              <span class="rbc-yours">${cfg.yoursHtml || ''}</span>
            </div>
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
          <div class="rbc-rack">${items.map(it => _rbcRow(it, cfg)).join('')}</div>
          ${cfg.addPieceFn ? `<button class="rbc-addpiece${cfg.noprint ? ' tv-noprint' : ''}" onclick="window.${cfg.addPieceFn}()"><span style="font-size:16px;line-height:1;margin-top:-1px">+</span> Add a piece</button>` : ''}`;
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
          `<button onclick="${click}" style="display:flex;align-items:center;gap:13px;width:100%;padding:14px 16px;border:0.5px solid rgba(32,32,33,0.12);border-radius:12px;background:#fff;cursor:pointer;font-family:inherit;text-align:left;margin-bottom:9px">
            ${svg}
            <span style="min-width:0"><span style="display:block;font-size:13.5px;color:#202021">${label}</span><span style="display:block;font-size:11px;color:#A89880;margin-top:1px">${sub}</span></span>
          </button>`;
        const modal = document.createElement('div');
        modal.id = 'rbc-add-menu';
        modal.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:24px';
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
        modal.innerHTML = `
          <div style="background:#FAF8F5;border-radius:20px;width:100%;max-width:400px;box-sizing:border-box;box-shadow:0 24px 60px -12px rgba(32,32,33,0.28);padding:24px 22px 16px">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:2px">
              <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#A89880;margin:0">Add a piece</p>
              <button onclick="document.getElementById('rbc-add-menu').remove()" style="background:none;border:none;cursor:pointer;padding:2px;color:#A89880;line-height:1;margin-top:-2px">${closeSvg}</button>
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
      window.__rbcAddSnap = function(applyName) {
        document.getElementById('rbc-add-menu')?.remove();
        _waEditId = null;
        _waAfterAdd = (newId) => { if (typeof window[applyName] === 'function') window[applyName](newId); };
        if (window.WA && WA.open) WA.open();
      };

      // Wardrobe door — a full-catalogue grid; tap a piece to place it.
      window.__rbcWaPick = function(applyName) {
        document.getElementById('rbc-add-menu')?.remove();
        document.getElementById('rbc-wa-pick')?.remove();
        const serif = "'Cormorant',Georgia,serif";
        const closeSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        const items = _waItems.slice(0, 60);
        const grid = items.length ? items.map(wi => `
          <div onclick="document.getElementById('rbc-wa-pick').remove();window.${applyName}('${_waEsc(wi.id)}')" style="cursor:pointer;border-radius:8px;overflow:hidden;background:#fff;border:0.5px solid rgba(32,32,33,0.08);transition:box-shadow .15s" onmouseenter="this.style.boxShadow='0 4px 12px rgba(32,32,33,0.12)'" onmouseleave="this.style.boxShadow='none'">
            ${wi.image_url
              ? `<img src="${_waEsc(wi.image_url)}" style="width:100%;aspect-ratio:1;object-fit:cover;display:block" alt="">`
              : `<div style="aspect-ratio:1;background:#EDE8E0;display:flex;align-items:center;justify-content:center"><span style="font-family:${serif};font-size:22px;color:#A89880">${_waEsc((wi.label || '?').charAt(0).toUpperCase())}</span></div>`}
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
                <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#A89880;margin:0">From your wardrobe</p>
                <button onclick="document.getElementById('rbc-wa-pick').remove()" style="background:none;border:none;cursor:pointer;padding:2px;color:#A89880;line-height:1;margin-top:-2px">${closeSvg}</button>
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
            body: JSON.stringify(body),
          });
          if (!res.ok) throw new Error(await res.text());
          return await res.json();
        } finally {
          clearTimeout(abortTimer);
        }
      }
      function _dlPatchSaved() {
        if (!_dlActiveSaveId || !window.__lastDlData) return;
        const saved = snLoad().find(x => x.id === _dlActiveSaveId);
        if (saved) snUpdate(_dlActiveSaveId, { dlData: { ...(saved.dlData || {}), steps: window.__lastDlData.steps } });
      }
      function _dlRerender() {
        const data = window.__lastDlData;
        if (!data) return;
        const sc = dlResultPage ? dlResultPage.scrollTop : 0;
        window.__dlRenderResult(data, window.__lastDlPrompt || data.prompt || '', { skipSave: true, savedId: _dlActiveSaveId, keepScroll: sc });
        _dlPatchSaved();
      }
      window.__dlFlip = function(fi, dir) {
        const it = window.__dlCurrentItems && window.__dlCurrentItems[fi];
        if (!it || !window.__lastDlData) return;
        const list = _dlOptions(it);
        if (list.length < 2) { _waShowToast('Nothing else fits this slot yet — snap more pieces'); return; }
        const next = list[(_dlOptIndex(it, list) + dir + list.length) % list.length];
        _dlApplyOption(it, next);
        _dlRerender();
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

      let _dlWorn = false;
      window.__dlWear = async function() {
        if (_dlWorn) { _waShowToast('Already logged for today'); return; }
        const flat = window.__dlCurrentItems || [];
        const ownedIds = flat.filter(it => it.wardrobe_match).map(it => it.wardrobe_match.id);
        if (!ownedIds.length) { _waShowToast('Nothing owned in this look yet — snap your pieces to log wears'); return; }
        _dlWorn = true;
        try {
          for (const id of ownedIds) {
            const wi = _waItems.find(w => String(w.id) === String(id));
            if (wi) await _waFetch('PATCH', 'wardrobe_items?id=eq.' + id, { times_worn: (Number(wi.times_worn) || 0) + 1 });
          }
          _waLoad();
          _waShowToast('On you today — Robes logged the wear ✓');
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
#dl-result-page .dlm-wrap{max-width:1180px;margin:0 auto;padding:34px 36px 28px;box-sizing:border-box}
#dl-result-page .dlm-eyebrow{font-size:10px;font-weight:500;letter-spacing:.24em;text-transform:uppercase;color:var(--rose);margin-bottom:8px}
#dl-result-page .dlm-title{font-family:var(--font-serif);font-weight:300;font-style:italic;font-size:clamp(30px,4vw,42px);line-height:1.05;color:var(--ink);margin:0}
#dl-result-page .dlm-kws{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:12px}
#dl-result-page .dlm-kws .kw{font-size:9.5px;font-weight:500;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-faint)}
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
#dl-result-page .dlm-panel{background:#fff;border:0.5px solid var(--rule-mid);border-radius:var(--rad-lg);padding:18px}
#dl-result-page .dlm-lhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
#dl-result-page .dlm-lhead .lab{font-size:9px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-faint)}
#dl-result-page .dlm-lhead .robes{font-size:9px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--rose)}
#dl-result-page .dlm-quote{font-family:var(--font-serif);font-style:italic;font-weight:300;font-size:16px;line-height:1.42;color:var(--ink-soft);margin-bottom:14px;padding-left:13px;border-left:2px solid var(--rose-mid)}
#dl-result-page .dlm-board{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#dl-result-page .dlm-tile{position:relative;border-radius:var(--rad-sm);overflow:hidden;aspect-ratio:1/1.16;text-align:left;padding:0;background:var(--cream-200);border:0.5px solid var(--rule-mid);cursor:pointer}
#dl-result-page .dlm-tile.wide{grid-column:span 2;aspect-ratio:2/1.05}
#dl-result-page .dlm-tile .tgrad{position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,rgba(0,0,0,0.42));z-index:1;pointer-events:none}
#dl-result-page .dlm-tile .tslot{position:absolute;left:9px;top:8px;z-index:2;font-size:7.5px;letter-spacing:.16em;text-transform:uppercase;color:#fff;background:rgba(32,32,33,0.42);padding:3px 7px;border-radius:100px}
#dl-result-page .dlm-tile .tlab{position:absolute;left:10px;bottom:9px;right:10px;z-index:2;font-family:var(--font-serif);font-style:italic;font-weight:400;font-size:15px;color:#fff;line-height:1.05;pointer-events:none}
#dl-result-page .dlm-tile .town{position:absolute;top:7px;right:7px;z-index:2;width:18px;height:18px;border-radius:50%;background:#fff;display:grid;place-items:center;color:#4A7C59}
#dl-result-page .dlm-tile .tshop{position:absolute;top:7px;right:7px;z-index:2;font-size:7.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);background:rgba(255,255,255,0.9);padding:2px 7px;border-radius:100px}
#dl-result-page .dlm-tile .tnav{position:absolute;top:50%;transform:translateY(-50%);z-index:3;width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.92);border:0.5px solid var(--rule-mid);display:grid;place-items:center;opacity:0;transition:opacity .15s;padding:0;color:var(--ink);cursor:pointer}
#dl-result-page .dlm-tile:hover .tnav{opacity:1}
#dl-result-page .dlm-tile .tnav.l{left:6px}
#dl-result-page .dlm-tile .tnav.r{right:6px}
#dl-result-page .dlm-fabrics{display:flex;flex-wrap:wrap;gap:9px 14px;margin-top:14px;padding-top:13px;border-top:0.5px solid var(--rule)}
#dl-result-page .dlm-fabrics .fab{display:flex;align-items:center;gap:7px}
#dl-result-page .dlm-fabrics .sw{width:14px;height:14px;border-radius:3px;border:0.5px solid var(--rule-mid);display:block}
#dl-result-page .dlm-fabrics .fl{font-family:var(--font-serif);font-style:italic;font-size:12.5px;color:var(--ink-faint)}
#dl-result-page .dlm-lfoot{display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:13px;border-top:0.5px solid var(--rule)}
#dl-result-page .dlm-palette{display:flex;gap:5px}
#dl-result-page .dlm-palette span{width:14px;height:14px;border-radius:50%;border:0.5px solid var(--rule-mid);display:block}
#dl-result-page .dlm-yours{font-size:10px;letter-spacing:.02em;color:var(--ink-faint)}
#dl-result-page .dlm-yours b{color:var(--ink);font-weight:500}
#dl-result-page .dlm-ttip{display:flex;gap:9px;align-items:baseline;flex-wrap:wrap;margin-top:12px;padding-top:11px;border-top:0.5px solid var(--rule)}
#dl-result-page .dlm-ttip .tl{font-size:8.5px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-faint);white-space:nowrap}
#dl-result-page .dlm-ttip .tt{font-size:12px;line-height:1.6;color:var(--ink-soft);font-style:italic;flex:1;min-width:180px}
#dl-result-page .dlm-rackhead{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px}
#dl-result-page .dlm-rackhead .ey{font-size:10px;font-weight:500;letter-spacing:.24em;text-transform:uppercase;color:var(--rose)}
#dl-result-page .dlm-restyle{display:inline-flex;align-items:center;gap:7px;border:0.5px solid var(--rule-mid);border-radius:100px;padding:10px 16px;font-size:12px;color:var(--ink-soft);background:#fff;cursor:pointer;transition:all .15s;white-space:nowrap}
#dl-result-page .dlm-restyle:hover{border-color:rgba(32,32,33,0.22);color:var(--ink)}
#dl-result-page .dlm-rack{display:flex;flex-direction:column;gap:12px}
#dl-result-page .dlm-addpiece{margin-top:12px;width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px dashed var(--rule-mid);border-radius:var(--rad);padding:13px;font-size:12px;letter-spacing:.02em;background:transparent;color:var(--ink-soft);cursor:pointer;transition:all .15s;font-family:inherit}
#dl-result-page .dlm-addpiece:hover{border-color:var(--ink-faint);color:var(--ink);background:#fff}
#dl-result-page .dlm-row{display:grid;grid-template-columns:112px 1fr;gap:16px;align-items:stretch;border:0.5px solid var(--rule-mid);border-radius:var(--rad);background:#fff;padding:12px;transition:border-color .2s}
#dl-result-page .dlm-row.anchored{border-color:var(--ink)}
#dl-result-page .dlm-vp{position:relative;align-self:start;width:100%;border-radius:var(--rad-sm);overflow:hidden;background:var(--cream-200);aspect-ratio:1/1}
#dl-result-page .dlm-vp .vslot{position:absolute;top:8px;left:8px;z-index:2;font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink);background:rgba(255,255,255,0.86);padding:3px 7px;border-radius:100px}
#dl-result-page .dlm-vp .vcount{position:absolute;bottom:8px;right:8px;z-index:2;font-size:9px;letter-spacing:.04em;color:var(--ink);background:rgba(255,255,255,0.86);padding:3px 7px;border-radius:100px}
#dl-result-page .dlm-body{display:flex;flex-direction:column;justify-content:space-between;min-width:0;padding:2px 0}
#dl-result-page .dlm-name{font-family:var(--font-serif);font-weight:400;font-size:21px;line-height:1.08;color:var(--ink)}
#dl-result-page .dlm-sub{display:flex;align-items:center;gap:8px;margin-top:6px;font-size:12px;color:var(--ink-faint);flex-wrap:wrap}
#dl-result-page .dlm-sub .price{color:var(--ink)}
#dl-result-page .dlm-owned{display:inline-flex;align-items:center;gap:5px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#4A7C59}
#dl-result-page .dlm-anchpill{display:inline-flex;align-items:center;gap:5px;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);border:0.5px solid var(--rule-mid);border-radius:100px;padding:3px 9px}
#dl-result-page .dlm-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:13px;flex-wrap:wrap}
#dl-result-page .dlm-flip{display:flex;align-items:center;gap:9px}
#dl-result-page .dlm-arrow{width:32px;height:32px;border:0.5px solid var(--rule-mid);border-radius:50%;display:grid;place-items:center;background:#fff;cursor:pointer;transition:all .15s;color:var(--ink)}
#dl-result-page .dlm-arrow:hover{background:var(--ink);border-color:var(--ink);color:#fff}
#dl-result-page .dlm-dots{display:flex;gap:5px;padding:0 2px}
#dl-result-page .dlm-dots span{width:5px;height:5px;border-radius:50%;background:var(--cream-400);display:block;transition:all .2s}
#dl-result-page .dlm-dots span.on{background:var(--ink);transform:scale(1.25)}
#dl-result-page .dlm-acts{display:flex;gap:7px;flex-wrap:wrap}
#dl-result-page .dlm-act{display:inline-flex;align-items:center;gap:6px;border:0.5px solid var(--rule-mid);border-radius:100px;padding:8px 13px;font-size:11px;letter-spacing:.01em;background:#fff;color:var(--ink-soft);cursor:pointer;transition:all .15s}
#dl-result-page .dlm-act:hover{border-color:rgba(32,32,33,0.22);color:var(--ink)}
#dl-result-page .dlm-act.on{background:var(--ink);color:#fff;border-color:var(--ink)}
#dl-result-page .dlm-act.shop{background:var(--ink);color:#fff;border-color:var(--ink)}
#dl-result-page .dlm-act.shop:hover{opacity:.85;color:#fff}
#dl-result-page .dlm-payoff{position:sticky;bottom:0;z-index:5;background:rgba(250,248,245,0.94);backdrop-filter:blur(16px);border-top:0.5px solid var(--rule-mid)}
#dl-result-page .dlm-payoff-in{max-width:1180px;margin:0 auto;padding:13px 36px;display:flex;align-items:center;justify-content:space-between;gap:22px;box-sizing:border-box}
#dl-result-page .dlm-pmeta{display:flex;flex-direction:column;gap:3px;min-width:0}
#dl-result-page .dlm-pmeta .t{font-family:var(--font-serif);font-size:18px;font-weight:400;font-style:italic;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink)}
#dl-result-page .dlm-pmeta .s{font-size:11px;letter-spacing:.02em;color:var(--ink-faint)}
#dl-result-page .dlm-pmeta .s b{color:#4A7C59;font-weight:500}
#dl-result-page .dlm-pbtns{display:flex;gap:9px;flex-shrink:0}
#dl-result-page .dlm-pbtn{display:inline-flex;align-items:center;gap:7px;border:0.5px solid var(--rule-mid);border-radius:100px;padding:11px 18px;font-size:12px;background:#fff;color:var(--ink-soft);cursor:pointer;transition:all .15s}
#dl-result-page .dlm-pbtn:hover{border-color:rgba(32,32,33,0.22);color:var(--ink)}
#dl-result-page .dlm-pbtn.primary{background:var(--ink);color:#fff;border-color:var(--ink)}
#dl-result-page .dlm-pbtn.primary:hover{opacity:.85;color:#fff}
@media(max-width:900px){
#dl-result-page .dlm-console{grid-template-columns:1fr;gap:26px}
#dl-result-page .dlm-look{position:static}
#dl-result-page .dlm-wrap{padding:28px 20px 20px}
#dl-result-page .dlm-payoff-in{padding:11px 16px;gap:12px}
#dl-result-page .dlm-pmeta{display:none}
#dl-result-page .dlm-pbtns{width:100%;justify-content:space-between}
#dl-result-page .dlm-pbtn{flex:1;justify-content:center;padding:12px 8px}
}
@media(max-width:520px){
#dl-result-page .dlm-row{grid-template-columns:88px 1fr;gap:12px}
#dl-result-page .dlm-name{font-size:18px}
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
        const weekday = new Date().toLocaleDateString('en-GB', { weekday: 'long' });
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
            ? `<span style="font-family:${serif};font-style:italic;font-size:12px;color:#B8AC9C;text-align:center;padding:0 12px">Creating imagery…</span>`
            : (altered && !wmImg)
              ? `<span style="font-family:${serif};font-size:30px;font-weight:300;color:var(--ink-faint)">${_waEsc((it.name || '?').charAt(0).toUpperCase())}</span>`
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

        const fabricsHtml = ordered.map(x => {
          const hex = palette[0] || '#E7E0CF';
          const c = (x.it.wardrobe_match && x.it.wardrobe_match.color) || '';
          return `<span class="fab"><span class="sw" style="background:${_waEsc(c && /^#/.test(c) ? c : hex)}"></span><span class="fl">${_waEsc(_dlFabric(x.it.name))}</span></span>`;
        }).join('');

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
            count: { cur: _dlOptIndex(it, list), len: list.length },
            subHtml: it.wardrobe_match
              ? `<span class="owned">${_rbcCheckSvg} In your wardrobe</span>`
              : `${it.brand ? `<span class="brand">${_waEsc(it.brand)}</span>` : ''}${(it.retailer_hint || it.price_point) ? `<span class="price">${_waEsc([it.retailer_hint, it.price_point].filter(Boolean).join(' · '))}</span>` : ''}`,
          };
        });
        const dlUnowned = ordered.filter(x => !x.it.wardrobe_match);
        const con = _rbConsole({
          headLabel: `The look · ${_waEsc(weekday)} · ${total} pieces`,
          quoteHtml: summaryHtml || (quote ? '“' + _waEsc(quote) + '”' : ''),
          fabricsHtml,
          paletteHtml: palette.map(h => `<span style="background:${h}"></span>`).join(''),
          yoursHtml: `<b>${owned}</b>&thinsp;of&thinsp;${total} from your wardrobe`,
          panelExtraHtml: _rbcReadBlock({
            score: owned, total, unit: 'in your wardrobe', clean: dlUnowned.length === 0,
            verdict: dlUnowned.length
              ? `Nearly there — flick or swap the ${_waEsc(dlUnowned[0].it.name.toLowerCase())} for something you own, or snap it into your wardrobe.`
              : 'Every piece is from your own wardrobe — dressed with nothing new.',
          }),
          rackLabel: `The rack · ${_waEsc(weekday)}`,
          headButtonsHtml: `<button class="rbc-hbtn" onclick="window.__dlRestyle()" title="A fresh look — anchored pieces stay">↻ Restyle this day</button>`,
          onFlip: '__dlFlip', onSwap: '__dlSwap', onAnchor: '__dlAnchor', onRemove: '__dlRemove',
          addPieceFn: '__dlAddPiece',
        }, conItems);

        // Header mirrors the live Moodboard: eyebrow → short serif title →
        // keyword row → meta row (weather-strip pill + occasion tag pill).
        window.rbSetCrumb && window.rbSetCrumb([{ label: 'Daily look' }]);
        try { dlResultPage.innerHTML = `
          <div class="dlm-wrap">
            <header>
              <div class="dlm-eyebrow">Your daily look</div>
              <h1 class="dlm-title">${_waEsc(headline)}</h1>
              ${data.occasion_label ? `<div class="dlm-kws"><span class="kw">${_waEsc(data.occasion_label)}</span></div>` : ''}
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
          </div>

          <div class="dlm-payoff">
            <div class="dlm-payoff-in">
              <div class="dlm-pmeta">
                <span class="t">${_waEsc(headline)}</span>
                <span class="s"><b>${owned === total && total > 0 ? 'All yours.' : 'It works.'}</b> · ${_waEsc(provenance)}</span>
              </div>
              <div class="dlm-pbtns">
                <button class="dlm-pbtn" onclick="window.__rbShare&&window.__rbShare()"><span>Share</span></button>
                <button class="dlm-pbtn" onclick="window.__dlWear()"><span>Wear today</span></button>
                <button class="dlm-pbtn primary" onclick="window.__dlDressAgain()">${restyleSvg}<span>Dress me again</span></button>
              </div>
            </div>
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
            subtitle: 'Daily look · ' + new Date().toLocaleDateString('en-GB', { weekday: 'long' }),
            img: persistable.find(Boolean) || null,
            dlData: saveCopy,
          });
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
        const candidates = _waItems.filter(wi => {
          const wiCat = (wi.category || '').toLowerCase();
          return wiCat === catLower || catLower.includes(wiCat) || wiCat.includes(catLower) || wiCat.replace(/s$/, '') === catLower.replace(/s$/, '');
        });
        const retailer = item.retailer_hint || '';
        const price = item.price_point || '';

        let aiAlt = null;
        if (!candidates.length && _waItems.length > 0) aiAlt = _waItems[0];

        const closeSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
        const cameraSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
        const arrowSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;

        let wardrobeSection = '';
        if (candidates.length > 0) {
          const itemsHtml = candidates.slice(0, 8).map(wi => `
            <div onclick="window.${cfg.applyName}(${cfg.idx},'${_waEsc(wi.id)}')" style="cursor:pointer;border-radius:8px;overflow:hidden;background:#fff;border:0.5px solid rgba(32,32,33,0.08);transition:box-shadow .15s" onmouseenter="this.style.boxShadow='0 4px 12px rgba(32,32,33,0.12)'" onmouseleave="this.style.boxShadow='none'">
              ${wi.image_url
                ? `<img src="${_waEsc(wi.image_url)}" style="width:100%;aspect-ratio:1;object-fit:cover;display:block" alt="">`
                : `<div style="aspect-ratio:1;background:#EDE8E0;display:flex;align-items:center;justify-content:center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C8C0B8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`}
              <div style="padding:7px 8px;font-size:10.5px;color:#3A3733;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_waEsc(wi.label)}</div>
            </div>`).join('');
          wardrobeSection = `
            <div style="margin-bottom:24px">
              <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#A89880;margin:0 0 10px">From your wardrobe</p>
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${itemsHtml}</div>
            </div>`;
        } else if (aiAlt) {
          wardrobeSection = `
            <div style="margin-bottom:24px;background:#F5F2EE;border-radius:12px;padding:14px">
              <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#A89880;margin:0 0 6px">Robes’ suggestion</p>
              <p style="font-family:'Cormorant',Georgia,serif;font-size:15px;font-weight:300;color:#202021;margin:0 0 10px;line-height:1.5">You don’t have a ${_waEsc((item.category || 'piece').toLowerCase())}, but your <em>${_waEsc(aiAlt.label)}</em> creates a similar outline.</p>
              <button onclick="window.${cfg.applyName}(${cfg.idx},'${_waEsc(aiAlt.id)}')" style="font-size:10px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:#202021;background:#EDE8E0;border:none;border-radius:20px;padding:6px 14px;cursor:pointer">Use this instead</button>
            </div>`;
        }

        const modal = document.createElement('div');
        modal.id = cfg.id;
        modal.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:24px';
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
        modal.innerHTML = `
          <div style="background:#FAF8F5;border-radius:20px;width:100%;max-width:480px;max-height:80vh;overflow-y:auto;box-sizing:border-box;box-shadow:0 24px 60px -12px rgba(32,32,33,0.28)">
            <div style="position:sticky;top:0;background:#FAF8F5;padding:20px 20px 0;z-index:2">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:2px">
                <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#A89880;margin:0">Swap this piece</p>
                <button onclick="document.getElementById('${cfg.id}').remove()" style="background:none;border:none;cursor:pointer;padding:2px;color:#A89880;line-height:1;margin-top:-2px">${closeSvg}</button>
              </div>
              <p style="font-family:'Cormorant',Georgia,serif;font-size:26px;font-weight:300;color:#202021;margin:0 0 2px;line-height:1.15">${_waEsc(item.name)}</p>
              ${(item.brand || retailer) ? `<p style="font-size:12px;color:#A89880;font-style:italic;margin:0 0 18px">${_waEsc(item.brand || retailer)}</p>` : `<div style="height:18px"></div>`}
              <div style="height:1px;background:rgba(32,32,33,0.08);margin:0 -20px 20px"></div>
            </div>
            <div style="padding:0 20px 32px">
              ${wardrobeSection}
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:${(retailer || price) ? '10px' : '0'}">
                <button onclick="window.${cfg.snapName}()" style="display:inline-flex;align-items:center;justify-content:center;gap:7px;font-size:12px;font-weight:500;color:#202021;background:#EDE8E0;border:none;border-radius:100px;padding:14px 16px;cursor:pointer;letter-spacing:.01em">
                  ${cameraSvg} Snap mine
                </button>
                <button onclick="window.__rbAffiliateSoon('${cfg.id}')" style="display:inline-flex;align-items:center;justify-content:center;gap:7px;font-size:12px;font-weight:500;color:#202021;background:#fff;border:1px solid rgba(32,32,33,0.15);border-radius:100px;padding:14px 16px;cursor:pointer;letter-spacing:.01em">
                  Shop via Affiliate ${arrowSvg}
                </button>
              </div>
              ${(retailer || price) ? `<p style="text-align:center;font-size:11px;color:#A89880;margin:0">Opens ${_waEsc(retailer)}${price ? ' · ' + _waEsc(price) : ''}</p>` : ''}
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
        const inputCss = 'width:100%;box-sizing:border-box;border:1px solid rgba(32,32,33,0.15);border-radius:8px;padding:11px 12px;font-size:13.5px;color:#202021;background:#fff;outline:none;font-family:inherit';
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
              <div style="font-size:10px;color:#A89880">${_waEsc(d.date)}</div>
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
              <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#A89880;margin:0">The weekly plan</p>
              <button onclick="(function(){document.getElementById('wk-plan-modal').remove()})()" style="background:none;border:none;cursor:pointer;padding:2px;color:#A89880;font-size:16px;line-height:1">×</button>
            </div>
            <p style="font-family:${serif};font-size:26px;font-weight:300;color:#202021;margin:0 0 6px;line-height:1.15">What does the week hold?</p>
            <p style="font-size:12.5px;color:#8A8078;line-height:1.5;margin:0 0 16px">Tell Robes each day's plan, leave it blank and Robes reads the week, or leave the day free — free days get no outfit.</p>
            <input id="wk-brief" value="${_waEsc(_wkPlan.brief)}" placeholder="The week's mood — smart, comfortable, no repeats…" style="${inputCss};margin-bottom:16px">
            <div style="display:flex;gap:6px;overflow-x:auto;padding:2px 0 14px">${chipsHtml}</div>
            ${rows}
            ${_wkPlan.days.length < 14 ? `<button onclick="window.__wkPlanExtend()" style="width:100%;margin-top:4px;background:none;border:1px dashed rgba(32,32,33,0.22);border-radius:8px;padding:10px;font-size:11.5px;color:#6E6A64;cursor:pointer;font-family:inherit">+ Plan next week too</button>` : ''}
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:18px;flex-wrap:wrap">
              <button onclick="window.__wkPlanGo(true)" style="background:none;border:none;cursor:pointer;font-size:11.5px;color:#A89880;text-decoration:underline;font-family:inherit;padding:4px 0">Skip — let Robes plan the days</button>
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
        document.getElementById('wk-plan-modal')?.remove();
        _wkGenerate(_wkPlan.brief, dayPlan, weekDays);
      };

      // Routing entry — the weekly track always goes through the planner
      // (Trip-style plan-first flow: days are hers before anything renders)
      window.__wkSubmit = function(prompt) {
        window.__wkOpen({ brief: prompt || '' });
      };

      async function _wkGenerate(prompt, dayPlan, weekDays) {
        let overlay = document.getElementById('kp-loading-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'kp-loading-overlay';
          overlay.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(250,248,245,0.92);backdrop-filter:blur(6px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px';
          overlay.innerHTML = `
            <div id="kp-load-title" style="font-family:'Cormorant',Georgia,serif;font-size:28px;font-weight:300;color:#202021;text-align:center"></div>
            <div style="font-size:12px;color:#A89880;letter-spacing:.06em" id="kp-load-msg"></div>
            <div style="width:120px;height:1px;background:rgba(32,32,33,0.1);position:relative;overflow:hidden;margin-top:8px">
              <div id="kp-load-bar" style="position:absolute;inset:0;background:#202021;transform:translateX(-100%);animation:kpLoadBar 2.5s ease-in-out infinite"></div>
            </div>`;
          const ks = document.createElement('style');
          ks.textContent = '@keyframes kpLoadBar{0%{transform:translateX(-100%)}50%{transform:translateX(0)}100%{transform:translateX(100%)}}';
          document.head.appendChild(ks);
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
              styleDna: _rbStyleDna(), styleIcons: _rbStyleIcons(),
              wardrobeItems: _waItems.map(i => ({ id: i.id, label: i.label, category: i.category, color: i.color, brand: i.brand, image_url: i.image_url, times_worn: i.times_worn })),
              context,
            }),
          });
          guard.done();
          clearInterval(msgInterval);
          overlay.style.display = 'none';
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          window.__wkRenderResult({ ...data, context }, prompt);
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
        if (saved) snUpdate(_wkActiveSaveId, { wkData: { ...(saved.wkData || {}), days: _wkState.data.days } });
      }

      window.__wkSelectDay = function(di) {
        if (!_wkState) return;
        _wkState.day = di;
        _wkPaintStrip();
        _wkPaintConsole();
      };

      function _wkPaintStrip() {
        const strip = document.getElementById('wk-strip');
        if (!strip || !_wkState) return;
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
            thumbs: d.rest ? [] : d.items.slice(0, 4).map(it => (it.wardrobe_match && it.wardrobe_match.image_url) || null),
            onclick: `window.__wkSelectDay(${di})`,
          };
        }), _wkState.day);
      }

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

        if (d.rest) {
          host.innerHTML = `
            <div style="background:#fff;border:0.5px dashed rgba(32,32,33,0.2);border-radius:16px;padding:44px 24px;margin-top:18px;text-align:center">
              <div style="font-family:${serif};font-size:26px;font-weight:300;color:#202021;margin-bottom:6px">${_waEsc(_wkDayName(d))}, <em style="font-style:italic">left free.</em></div>
              <div style="font-size:12.5px;color:#8A8078;margin-bottom:18px">No outfit planned — a deliberately blank page in the week.</div>
              <button onclick="window.__wkEditDay(${_wkState.day})" style="background:#202021;color:#fff;border:none;border-radius:100px;padding:12px 22px;font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;font-family:inherit">✎ Dress this day</button>
            </div>`;
          return;
        }

        // Thin adapter over the shared console template (_rbConsole) —
        // weekly has no imagery jobs, so frames are wardrobe photos or a
        // serif monogram, and the flick set is original + owned pieces.
        const owned = d.items.filter(it => it.wardrobe_match).length;
        const wkFrame = (it) => {
          const m = it.wardrobe_match;
          return {
            pollAttr: '',
            inner: m && m.image_url
              ? `<img src="${_waEsc(m.image_url)}" style="width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0" alt="">`
              : `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><span style="font-family:${serif};font-size:30px;font-weight:300;color:var(--ink-faint)">${_waEsc((it.name || '?').charAt(0).toUpperCase())}</span></div>`,
          };
        };
        const palette = (Array.isArray(_wkState.data.palette) ? _wkState.data.palette : []).filter(h => /^#[0-9A-Fa-f]{6}$/.test(String(h || ''))).slice(0, 3);
        const fabricsHtml = d.items.map(it => {
          const c = (it.wardrobe_match && it.wardrobe_match.color) || '';
          return `<span class="fab"><span class="sw" style="background:${_waEsc(c && /^#/.test(c) ? c : (palette[0] || '#E7E0CF'))}"></span><span class="fl">${_waEsc(_dlFabric(it.name))}</span></span>`;
        }).join('');
        const conItems = d.items.map((it, ii) => {
          const list = _dlOptions(it);
          const retail = [it.retailer_hint !== it.brand ? it.retailer_hint : '', it.price_point].filter(Boolean).join(' · ');
          return {
            idx: ii,
            frame: wkFrame(it),
            slot: _dlSlot(it).l,
            shortName: _dlShort(it.name),
            name: it.name,
            owned: !!it.wardrobe_match,
            anchored: !!it.anchored,
            count: { cur: _dlOptIndex(it, list), len: list.length },
            subHtml: it.wardrobe_match
              ? `<span class="owned">${_rbcCheckSvg} In your wardrobe</span>`
              : `${it.brand ? `<span class="brand">${_waEsc(it.brand)}</span>` : ''}${retail ? `<span class="price">${_waEsc(retail)}</span>` : ''}`,
          };
        });
        const wkUnowned = d.items.filter(it => !it.wardrobe_match);
        const con = _rbConsole({
          headLabel: `The look · ${_waEsc(_wkDayName(d))} · ${d.items.length} pieces`,
          quoteHtml: d.note ? '“' + _waEsc(d.note) + '”' : '',
          fabricsHtml,
          paletteHtml: palette.map(h => `<span style="background:${h}"></span>`).join(''),
          yoursHtml: `<b>${owned}</b>&thinsp;of&thinsp;${d.items.length} from your wardrobe`,
          panelExtraHtml: _rbcReadBlock({
            score: owned, total: d.items.length, unit: 'in your wardrobe', clean: wkUnowned.length === 0,
            verdict: wkUnowned.length
              ? `Nearly there — flick or swap the ${_waEsc(wkUnowned[0].name.toLowerCase())} for something you own, or snap it into your wardrobe.`
              : 'Every piece is from your own wardrobe — dressed with nothing new.',
          }),
          rackLabel: `The rack · ${_waEsc(_wkDayName(d))}${d.occasion ? ' · ' + _waEsc(d.occasion) : ''}`,
          headButtonsHtml: `<button class="rbc-hlink" onclick="window.__wkEditDay(${_wkState.day})">✎ The real plan</button><button class="rbc-hbtn" onclick="window.__wkRestyleDay()" title="A fresh look — anchored pieces stay">↻ Restyle this day</button>`,
          onFlip: '__wkFlip', onSwap: '__wkSwap', onAnchor: '__wkAnchor', onRemove: '__wkRemove',
          addPieceFn: '__wkAddPiece',
        }, conItems);

        host.innerHTML = `
          <div class="wk-con">
            <div>${con.lookHtml}</div>
            <div>${con.rackHtml}</div>
          </div>`;
      }

      window.__wkFlip = function(ii, dir) {
        if (!_wkState) return;
        const d = _wkState.data.days[_wkState.day];
        const it = d && d.items[ii];
        if (!it) return;
        const list = _dlOptions(it);
        if (list.length < 2) { _waShowToast('Nothing else fits this slot yet — snap more pieces'); return; }
        _dlApplyOption(it, list[(_dlOptIndex(it, list) + dir + list.length) % list.length]);
        _wkPaintConsole();
        _wkPaintStrip();
        _wkPatchSaved();
      };

      window.__wkAnchor = function(ii) {
        if (!_wkState) return;
        const d = _wkState.data.days[_wkState.day];
        const it = d && d.items[ii];
        if (!it) return;
        it.anchored = !it.anchored;
        _wkPaintConsole();
        _wkPatchSaved();
        _waShowToast(it.anchored ? 'Anchored — restyles build around it' : 'Anchor released');
      };

      // Remove a piece she doesn't need from the day's look.
      window.__wkRemove = function(ii) {
        const d = _wkState && _wkState.data.days[_wkState.day];
        const it = d && d.items[ii];
        if (!it) return;
        if (d.items.length <= 2) { _waShowToast('A look needs at least two pieces'); _wkPaintConsole(); return; }
        d.items.splice(ii, 1);
        _wkPaintConsole();
        _wkPaintStrip();
        _wkPatchSaved();
        _waShowToast(it.name + ' removed from ' + _wkDayName(d));
      };

      // Swap — the same shared PRD 3.B modal as the Daily and Travel racks.
      let _wkSwapIdx = null;
      window.__wkSwap = function(ii) {
        if (!_wkState) return;
        const d = _wkState.data.days[_wkState.day];
        const item = d && d.items[ii];
        if (!item) return;
        _wkSwapIdx = ii;
        _rbSwapModal(item, { id: 'wk-swap-modal', applyName: '__wkSwapApply', snapName: '__wkSnapMine', idx: ii });
      };
      window.__wkSwapApply = function(ii, wardrobeId) {
        const wi = _waItems.find(i => i.id === wardrobeId);
        const d = _wkState && _wkState.data.days[_wkState.day];
        const item = d && d.items[ii];
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
        if (!wi || !d || d.rest) return;
        d.items.push({
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
          styleDna: _rbStyleDna(), styleIcons: _rbStyleIcons(),
          wardrobeItems: _waItems.map(i => ({ id: i.id, label: i.label, category: i.category, color: i.color, brand: i.brand, image_url: i.image_url, times_worn: i.times_worn })),
          context: rc.city ? { city: rc.city, month: new Date().toLocaleDateString('en-GB', { month: 'long' }), tempRange: rc.tempRange || '', condition: rc.condition || '', hint: rc.hint || '' } : null,
        });
      }

      function _wkApplyDay(di, activity, fresh) {
        const d = _wkState.data.days[di];
        const anchored = d.items.filter(it => it.anchored);
        d.occasion = fresh.occasion || activity || d.occasion;
        d.note = fresh.note || d.note;
        d.transition_tip = fresh.transition_tip || d.transition_tip || '';
        d.rest = false;
        if (activity) d.user_activity = activity;
        d.items = Array.isArray(fresh.items) ? fresh.items : [];
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
              <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#A89880;margin:0">${_waEsc(d.day_label)}</p>
              <button onclick="document.getElementById('wk-day-modal').remove()" style="background:none;border:none;cursor:pointer;padding:2px;color:#A89880;font-size:16px;line-height:1">×</button>
            </div>
            <p style="font-family:${serif};font-size:24px;font-weight:300;color:#202021;margin:0 0 14px;line-height:1.15">What are you actually doing?</p>
            <input id="wk-day-input" value="${_waEsc(d.user_activity || '')}" placeholder="Client presentation, then drinks" style="width:100%;box-sizing:border-box;border:1px solid rgba(32,32,33,0.15);border-radius:8px;padding:12px 13px;font-size:13.5px;color:#202021;background:#fff;outline:none;font-family:inherit;margin-bottom:14px">
            <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:20px">${chipsHtml}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
              ${d.rest ? '<span></span>' : `<button onclick="window.__wkFreeDay(${di})" style="background:none;border:none;cursor:pointer;font-size:11.5px;color:#A89880;text-decoration:underline;font-family:inherit;padding:4px 0">Leave this day free</button>`}
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

      window.__wkPlanAgain = function() {
        window.__wkGoBack();
        window.__wkOpen();
      };

      window.__wkRenderResult = function(data, promptText, opts) {
        const serif = "'Cormorant',Georgia,serif";
        if (!data || !Array.isArray(data.days) || !data.days.length) { _waShowToast('That plan didn’t load — try planning the week again.'); return; }
        _rbHideResultPages('wk');
        window.__lastWkData = data;
        _wkState = { data, prompt: promptText || '', day: 0 };
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
            '#wk-day .wk-con{display:grid;grid-template-columns:360px 1fr;gap:18px;margin-top:18px;align-items:start}' +
            '@media(max-width:900px){#wk-day .wk-con{grid-template-columns:1fr}}';
          document.head.appendChild(ws);
        }

        const owned = data.days.reduce((s, d) => s + d.items.filter(it => it.wardrobe_match).length, 0);
        const total = data.days.reduce((s, d) => s + d.items.length, 0);
        const ctx = data.context || {};
        const pill = [ctx.city, ctx.month].filter(Boolean).join(' · ') + (ctx.tempRange ? ' | ' + ctx.tempRange : '') + (ctx.hint ? ' | ' + ctx.hint : '');
        const paletteDots = (data.palette || []).map(h =>
          /^#[0-9a-fA-F]{3,8}$/.test(String(h || '')) ? `<span style="width:14px;height:14px;border-radius:50%;background:${h};border:0.5px solid rgba(32,32,33,0.15);display:inline-block"></span>` : ''
        ).join('');

        wkResultPage.innerHTML = `
          <div style="max-width:1148px;margin:0 auto;padding:36px 24px 0;min-height:calc(100% - 72px);box-sizing:border-box">
            <div style="font-size:10px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:#8E7077;margin-bottom:10px">Your week, planned</div>
            <h1 id="wk-headline" style="font-family:${serif};font-size:clamp(28px,4.5vw,42px);font-weight:300;font-style:italic;color:#202021;line-height:1.12;margin:0 0 12px;max-width:720px">${_waEsc(data.headline || 'The week ahead.')}</h1>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">
              ${data.week_label ? `<span style="font-size:10px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:#6A5E54;background:#fff;border:0.5px solid rgba(32,32,33,0.12);border-radius:100px;padding:6px 13px">${_waEsc(data.week_label)}</span>` : ''}
              ${pill ? `<span style="font-size:11px;color:#8A8078;background:#fff;border:0.5px solid rgba(32,32,33,0.12);border-radius:100px;padding:6px 13px">🌤 ${_waEsc(pill)}</span>` : ''}
              ${paletteDots ? `<span style="display:inline-flex;gap:5px;align-items:center">${paletteDots}</span>` : ''}
            </div>
            ${data.stylist_summary ? `<p style="font-family:${serif};font-style:italic;font-size:15.5px;color:#6E6A64;line-height:1.6;margin:0 0 24px;max-width:640px">${_waEsc(data.stylist_summary)}</p>` : ''}
            <div id="wk-strip" class="rbd-strip"></div>
            <div id="wk-day"></div>
            ${_rbFeedbackBlock('wk', { title: 'How does this week feel?', up: '👍 I’d wear it', down: 'Not quite' })}
            <div style="height:36px"></div>
          </div>
          <div class="rb-sfoot">
            <div class="rb-sfoot-in">
              <div class="rb-sfoot-meta">
                <span class="t">${_waEsc(data.headline || 'Your week')}</span>
                <span class="s">${data.days.length} days · ${total} pieces${owned ? ' · ' + owned + ' from your wardrobe' : ''}</span>
              </div>
              <div class="rb-sfoot-btns">
                <button class="rb-sfbtn" onclick="window.__rbShare&&window.__rbShare()">Share</button>
                <button class="rb-sfbtn" onclick="window.__rbRename&&window.__rbRename('wk')">Rename</button>
                <button class="rb-sfbtn" onclick="window.__wkWear()">Wear today</button>
                <button class="rb-sfbtn primary" onclick="window.__wkPlanAgain()">Plan a new week</button>
              </div>
            </div>
          </div>`;

        wkResultPage.style.display = 'block';
        wkResultPage.scrollTop = 0;
        // Land on the first dressed day, not a free one
        const firstDressed = data.days.findIndex(d => !d.rest);
        if (firstDressed > 0) _wkState.day = firstDressed;
        _wkPaintStrip();
        _wkPaintConsole();
        window.rbSetCrumb && window.rbSetCrumb([{ label: 'Plan the week' }]);

        if (opts && opts.skipSave) {
          _wkActiveSaveId = (opts && opts.savedId) || null;
        } else {
          const firstImg = (function() {
            for (const d of data.days) for (const it of d.items) {
              if (it.wardrobe_match && it.wardrobe_match.image_url && String(it.wardrobe_match.image_url).indexOf('http') === 0) return it.wardrobe_match.image_url;
            }
            return null;
          })();
          _wkActiveSaveId = snAdd({
            type: 'weekly-plan',
            title: data.headline || 'Your week, planned',
            subtitle: data.days.filter(d => !d.rest).length + ' days · ' + (data.week_label || '').toLowerCase(),
            img: firstImg,
            wkData: { ...data, prompt: promptText || '' },
          });
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
      }

      // Generated frames appear in several places (day console board, rack
      // viewport, edit cards), so frames carry data-tvimg="i" and the poller
      // patches every instance.
      function _tvSetImage(i, src) {
        document.querySelectorAll('[data-tvimg="' + i + '"]').forEach(wrap => {
          if (wrap.querySelector('img')) return;
          const ph = wrap.querySelector('.tv-img-ph');
          if (ph) ph.remove();
          const img = document.createElement('img');
          img.src = src;
          img.alt = '';
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;position:absolute;inset:0;opacity:0;transition:opacity .5s ease';
          wrap.insertBefore(img, wrap.firstChild);
          requestAnimationFrame(() => { img.style.opacity = '1'; });
        });
      }

      function _tvSettlePlaceholder(i) {
        document.querySelectorAll('[data-tvimg="' + i + '"]').forEach(wrap => {
          if (wrap.querySelector('img')) return;
          const ph = wrap.querySelector('.tv-img-ph');
          if (ph) {
            ph.style.animation = 'none';
            ph.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C8BCAE" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
          }
        });
      }

      function _tvPollImages(jobId, count) {
        _tvStopPolling();
        const t0 = Date.now();
        function settleAll() { for (let i = 0; i < count; i++) _tvSettlePlaceholder(i); }
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
              : `<div style="width:100%;aspect-ratio:1/1;background:#EDE8E0;display:flex;align-items:center;justify-content:center;font-family:${serif};font-size:26px;color:#B8AC9C">${_waEsc((wi.label || '?').charAt(0).toUpperCase())}</div>`}
            <div style="padding:6px 8px 7px">
              <div style="font-size:10px;color:#3A3733;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_waEsc(wi.label)}</div>
              ${wi.category ? `<div style="font-size:7.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#B8AC9C;margin-top:1px">${_waEsc(wi.category)}</div>` : ''}
            </div>
          </div>`).join('');
        grid.innerHTML = `
          <div onclick="window.__tvAnchorSnap()" style="cursor:pointer;border-radius:10px;background:#F0EAE0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-height:120px;color:#8A7B62">
            ${cameraSvg}
            <span style="font-size:9px;font-weight:500;letter-spacing:.08em;text-transform:uppercase">Snap new</span>
          </div>
          ${tiles}
          ${!items.length && _waItems.length ? `<div style="grid-column:1/-1;padding:14px 4px;font-size:12px;color:#A89880;font-style:italic">Nothing in this filter — try another category${_tvWxOnly ? ' or untick the weather filter' : ''}.</div>` : ''}`;
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
            dest: destGuess,
            dateFrom: iso(new Date(Date.now() + 14 * 86400000)),
            dateTo: iso(new Date(Date.now() + 21 * 86400000)),
            brief: rawBrief,
            anchors: (opts && Array.isArray(opts.anchors) ? opts.anchors.map(String) : []),
            plan: [],
            suggested: (opts && Array.isArray(opts.suggested) ? opts.suggested : []),
          };
          _tvCat = 'All';
          _tvWxOnly = false;
        }
        const st = _tvBrief;
        const inputCss = 'width:100%;box-sizing:border-box;border:1px solid rgba(32,32,33,0.15);border-radius:8px;padding:11px 13px;font-size:13.5px;color:#202021;background:#fff;outline:none;font-family:inherit';
        const labelCss = 'font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#A89880;margin:0 0 8px';
        const closeSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

        // Category pills — only the categories she actually owns, plus All
        const cats = ['All'].concat(WA_CATS.slice(1).filter(c => _waItems.some(w => w.category === c)));
        const catPills = cats.map(c =>
          `<button data-tvcat="${_waEsc(c)}" onclick="window.__tvCatSet('${_waEsc(c)}')" style="padding:6px 13px;border:0.5px solid ${c === _tvCat ? '#202021' : 'rgba(32,32,33,0.15)'};border-radius:40px;background:${c === _tvCat ? '#202021' : '#fff'};color:${c === _tvCat ? '#fff' : '#202021'};font-size:11px;cursor:pointer;font-family:inherit;white-space:nowrap">${_waEsc(c)}</button>`
        ).join('');

        const browser = `
          <p style="${labelCss}">What’s tempting you?</p>
          ${(st.suggested || []).length ? `<p style="font-size:11px;color:#6E6A64;font-style:italic;margin:0 0 10px">✦ ${st.suggested.length} piece${st.suggested.length === 1 ? '' : 's'} from your moodboard will join the edit under Worth Adding.</p>` : ''}
          <p id="tv-anchor-hint" style="font-size:11px;color:#A89880;font-style:italic;margin:0 0 10px"></p>
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
              <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#A89880;margin:0">Travel edit</p>
              <button onclick="document.getElementById('tv-brief-modal').remove()" style="background:none;border:none;cursor:pointer;padding:2px;color:#A89880;line-height:1;margin-top:-2px">${closeSvg}</button>
            </div>
            <p style="font-family:${serif};font-size:26px;font-weight:300;color:#202021;margin:0 0 4px;line-height:1.15">Where are we packing for?</p>
            <p style="font-size:12px;color:#A89880;font-style:italic;margin:0 0 20px">Select everything you’re tempted to bring — Robes tells you what earns its place.</p>
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
        const inputCss = 'width:100%;box-sizing:border-box;border:1px solid rgba(32,32,33,0.15);border-radius:8px;padding:10px 12px;font-size:13px;color:#202021;background:#fff;outline:none;font-family:inherit';
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
              ${fmtDay(i) ? `<span style="font-size:10px;color:#A89880">${_waEsc(fmtDay(i))}</span>` : ''}
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
                ? `<p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#A89880;margin:0">${_waEsc(data.destination || 'Your trip')}</p>`
                : `<button onclick="window.__tvPlanBack()" style="background:none;border:none;cursor:pointer;padding:0;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#A89880;font-family:inherit">← Your pieces</button>`}
              <button onclick="document.getElementById('tv-plan-modal').remove()" style="background:none;border:none;cursor:pointer;padding:2px;color:#A89880;line-height:1;margin-top:-2px">${closeSvg}</button>
            </div>
            <p style="font-family:${serif};font-size:26px;font-weight:300;color:#202021;margin:8px 0 4px;line-height:1.15">What’s the plan, day by day?</p>
            <p style="font-size:12px;color:#A89880;font-style:italic;margin:0 0 18px">Every outfit gets built around what you’re actually doing. Leave a day blank and Robes reads the trip; “Leave free” means no outfits that day.</p>
            <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:14px">${rows}</div>
            <div style="display:flex;gap:6px;overflow-x:auto;padding:2px 0 16px">${chipsHtml}</div>
            <button onclick="${go}" style="width:100%;padding:14px 24px;border:none;border-radius:40px;background:#202021;font-size:12px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#fff;font-family:inherit">Create my outfits · ${n} day${n > 1 ? 's' : ''} →</button>
            ${forTrip ? '' : `<button onclick="window.__tvPlanGo('defer')" style="width:100%;margin-top:9px;padding:13px 24px;border:1px solid rgba(32,32,33,0.18);border-radius:40px;background:#fff;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;color:#202021;font-family:inherit">Still gathering pieces? Get the edit first →</button>`}
            <button onclick="${goSkip}" style="display:block;margin:12px auto 0;background:none;border:none;padding:4px;cursor:pointer;font-size:11px;color:#A89880;text-decoration:underline;text-underline-offset:3px;font-family:inherit">Skip — let Robes plan the days</button>
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
            <div style="font-size:12px;color:#A89880;letter-spacing:.06em" id="kp-load-msg">Generating editorial looks</div>
            <div style="width:120px;height:1px;background:rgba(32,32,33,0.1);position:relative;overflow:hidden;margin-top:8px">
              <div id="kp-load-bar" style="position:absolute;inset:0;background:#202021;transform:translateX(-100%);animation:kpLoadBar 2.5s ease-in-out infinite"></div>
            </div>`;
          const ks = document.createElement('style');
          ks.textContent = '@keyframes kpLoadBar{0%{transform:translateX(-100%)}50%{transform:translateX(0)}100%{transform:translateX(100%)}}';
          document.head.appendChild(ks);
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
              name,
              styleDna: _rbStyleDna(), styleIcons: _rbStyleIcons(),
              wardrobeItems: _waItems.map(i => ({ id: i.id, label: i.label, category: i.category, color: i.color, brand: i.brand, image_url: i.image_url, times_worn: i.times_worn })),
            }),
          });
          clearInterval(msgInterval);
          overlay.style.display = 'none';
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
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
#tv-result-page .tvm-wrap{max-width:1180px;margin:0 auto;padding:34px 36px 28px;box-sizing:border-box}
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
#tv-result-page .tvm-week{display:grid;grid-auto-flow:column;grid-auto-columns:200px;grid-template-columns:none;gap:10px;margin-bottom:34px;overflow-x:auto;padding-bottom:10px;scroll-snap-type:x proximity}
#tv-result-page .tvm-week .tvm-day{scroll-snap-align:start}
#tv-result-page .tvm-day{position:relative;text-align:left;border:0.5px solid var(--rule-mid);border-radius:var(--rad);background:#fff;padding:13px 13px 12px;min-height:132px;display:flex;flex-direction:column;cursor:pointer;transition:border-color .2s,background .2s;font-family:inherit}
#tv-result-page .tvm-day:hover{border-color:rgba(32,32,33,0.22)}
#tv-result-page .tvm-day.active{border-color:var(--ink);background:var(--cream-100)}
#tv-result-page .tvm-day .dtop{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
#tv-result-page .tvm-day .ddow{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink);font-weight:500}
#tv-result-page .tvm-day .dst{width:8px;height:8px;border-radius:50%;border:1px solid var(--cream-400);background:transparent}
#tv-result-page .tvm-day .dst.done{background:var(--sage);border-color:var(--sage)}
#tv-result-page .tvm-day .dev{font-family:var(--font-serif);font-weight:400;font-size:16px;line-height:1.12;color:var(--ink);margin-bottom:4px}
#tv-result-page .tvm-day .dmeta{font-size:10px;color:var(--ink-faint);line-height:1.4;margin-bottom:10px}
#tv-result-page .tvm-day .dth{margin-top:auto;display:flex}
#tv-result-page .tvm-day .dth span{width:24px;height:32px;border-radius:4px;overflow:hidden;border:0.5px solid var(--rule-mid);margin-left:-5px;background:var(--cream-200);display:block;background-size:cover;background-position:center}
#tv-result-page .tvm-day .dth span:first-child{margin-left:0}
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
#tv-result-page .tvm-board{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#tv-result-page .tvm-tile{position:relative;border-radius:var(--rad-sm);overflow:hidden;aspect-ratio:1/1.16;text-align:left;padding:0;background:var(--cream-200);border:0.5px solid var(--rule-mid);cursor:pointer}
#tv-result-page .tvm-tile.wide{grid-column:span 2;aspect-ratio:2/1.05}
#tv-result-page .tvm-tile.isnew{border:1px dashed rgba(185,138,78,0.6)}
#tv-result-page .tvm-tile .tgrad{position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,rgba(0,0,0,0.42));z-index:1;pointer-events:none}
#tv-result-page .tvm-tile .tslot{position:absolute;left:9px;top:8px;z-index:2;font-size:7.5px;letter-spacing:.16em;text-transform:uppercase;color:#fff;background:rgba(32,32,33,0.42);padding:3px 7px;border-radius:100px}
#tv-result-page .tvm-tile .tlab{position:absolute;left:10px;bottom:9px;right:10px;z-index:2;font-family:var(--font-serif);font-style:italic;font-weight:400;font-size:15px;color:#fff;line-height:1.05;pointer-events:none}
#tv-result-page .tvm-tile .town{position:absolute;top:7px;right:7px;z-index:2;width:18px;height:18px;border-radius:50%;background:#fff;display:grid;place-items:center;color:#4A7C59}
#tv-result-page .tvm-tile .tadd{position:absolute;top:7px;right:7px;z-index:2;font-size:7.5px;letter-spacing:.1em;text-transform:uppercase;color:#fff;background:rgba(185,138,78,0.92);padding:2px 7px;border-radius:100px}
#tv-result-page .tvm-tile .tnav{position:absolute;top:50%;transform:translateY(-50%);z-index:3;width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.92);border:0.5px solid var(--rule-mid);display:grid;place-items:center;opacity:0;transition:opacity .15s;padding:0;color:var(--ink);cursor:pointer}
#tv-result-page .tvm-tile:hover .tnav{opacity:1}
#tv-result-page .tvm-tile .tnav.l{left:6px}
#tv-result-page .tvm-tile .tnav.r{right:6px}
#tv-result-page .tvm-fabrics{display:flex;flex-wrap:wrap;gap:9px 14px;margin-top:14px;padding-top:13px;border-top:0.5px solid var(--rule)}
#tv-result-page .tvm-fabrics .fab{display:flex;align-items:center;gap:7px}
#tv-result-page .tvm-fabrics .sw{width:14px;height:14px;border-radius:3px;border:0.5px solid var(--rule-mid);display:block}
#tv-result-page .tvm-fabrics .fl{font-family:var(--font-serif);font-style:italic;font-size:12.5px;color:var(--ink-faint)}
#tv-result-page .tvm-lfoot{display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:13px;border-top:0.5px solid var(--rule)}
#tv-result-page .tvm-palette{display:flex;gap:5px}
#tv-result-page .tvm-palette span{width:14px;height:14px;border-radius:50%;border:0.5px solid var(--rule-mid);display:block}
#tv-result-page .tvm-yours{font-size:10px;letter-spacing:.02em;color:var(--ink-faint)}
#tv-result-page .tvm-yours b{color:var(--ink);font-weight:500}
#tv-result-page .tvm-read{border:0.5px solid var(--rule-mid);border-radius:var(--rad);background:var(--cream-100);padding:15px 16px}
#tv-result-page .tvm-read .rh{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
#tv-result-page .tvm-read .lab{font-size:9px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-faint)}
#tv-result-page .tvm-read .score{font-family:var(--font-serif);font-weight:300;font-size:20px;color:var(--ink)}
#tv-result-page .tvm-read .score .of{font-size:11px;color:var(--ink-faint)}
#tv-result-page .tvm-read .bar{position:relative;height:5px;border-radius:100px;background:var(--cream-200);overflow:hidden}
#tv-result-page .tvm-read .bar span{position:absolute;left:0;top:0;height:100%;border-radius:100px;transition:width .4s,background .4s;display:block}
#tv-result-page .tvm-read p{font-size:12.5px;line-height:1.6;color:#3A3733;margin:11px 0 0}
#tv-result-page .tvm-rackhead{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px;flex-wrap:wrap}
#tv-result-page .tvm-rackhead .ey{font-size:10px;font-weight:500;letter-spacing:.24em;text-transform:uppercase;color:var(--rose)}
#tv-result-page .tvm-rackhead h2{font-family:var(--font-serif);font-weight:300;font-style:italic;font-size:25px;line-height:1.05;margin:6px 0 0;color:var(--ink)}
#tv-result-page .tvm-hbtn{display:inline-flex;align-items:center;gap:7px;border:0.5px solid var(--rule-mid);border-radius:100px;padding:9px 15px;font-size:11.5px;color:var(--ink-soft);background:#fff;cursor:pointer;transition:all .15s;white-space:nowrap;font-family:inherit}
#tv-result-page .tvm-hbtn:hover{border-color:rgba(32,32,33,0.22);color:var(--ink)}
#tv-result-page .tvm-rack{display:flex;flex-direction:column;gap:12px}
#tv-result-page .tvm-row{display:grid;grid-template-columns:108px 1fr;gap:16px;align-items:stretch;border:0.5px solid var(--rule-mid);border-radius:var(--rad);background:#fff;padding:12px;transition:border-color .2s,background .2s}
#tv-result-page .tvm-row.packed{border-color:rgba(126,124,90,0.5);background:var(--sage-bg)}
#tv-result-page .tvm-vp{position:relative;align-self:start;width:100%;border-radius:var(--rad-sm);overflow:hidden;background:var(--cream-200);aspect-ratio:4/5}
#tv-result-page .tvm-vp .vslot{position:absolute;top:8px;left:8px;z-index:2;font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink);background:rgba(255,255,255,0.86);padding:3px 7px;border-radius:100px}
#tv-result-page .tvm-vp .vlooks{position:absolute;bottom:8px;left:8px;z-index:2;font-size:9px;letter-spacing:.04em;color:var(--ink);background:rgba(255,255,255,0.86);padding:3px 7px;border-radius:100px;white-space:nowrap}
#tv-result-page .tvm-vp .vcount{position:absolute;bottom:8px;right:8px;z-index:2;font-size:9px;letter-spacing:.04em;color:var(--ink);background:rgba(255,255,255,0.86);padding:3px 7px;border-radius:100px}
#tv-result-page .tvm-body{display:flex;flex-direction:column;justify-content:space-between;min-width:0;padding:2px 0}
#tv-result-page .tvm-name{font-family:var(--font-serif);font-weight:400;font-size:20px;line-height:1.08;color:var(--ink)}
#tv-result-page .tvm-sub{display:flex;align-items:center;gap:8px;margin-top:5px;font-size:12px;color:var(--ink-faint);flex-wrap:wrap}
#tv-result-page .tvm-sub .price{color:var(--ink)}
#tv-result-page .tvm-owned{display:inline-flex;align-items:center;gap:5px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#4A7C59}
#tv-result-page .tvm-addtag{display:inline-flex;align-items:center;gap:5px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#B98A4E}
#tv-result-page .tvm-hownote{font-size:11.5px;line-height:1.5;color:var(--ink-soft);margin-top:7px;font-style:italic;font-family:var(--font-serif)}
#tv-result-page .tvm-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;flex-wrap:wrap}
#tv-result-page .tvm-flip{display:flex;align-items:center;gap:9px}
#tv-result-page .tvm-arrow{width:32px;height:32px;border:0.5px solid var(--rule-mid);border-radius:50%;display:grid;place-items:center;background:#fff;cursor:pointer;transition:all .15s;color:var(--ink);padding:0}
#tv-result-page .tvm-arrow:hover{background:var(--ink);border-color:var(--ink);color:#fff}
#tv-result-page .tvm-dots{display:flex;gap:5px;padding:0 2px}
#tv-result-page .tvm-dots span{width:5px;height:5px;border-radius:50%;background:var(--cream-400);display:block;transition:all .2s}
#tv-result-page .tvm-dots span.on{background:var(--ink);transform:scale(1.25)}
#tv-result-page .tvm-acts{display:flex;gap:7px;flex-wrap:wrap;align-items:center}
#tv-result-page .tvm-act{display:inline-flex;align-items:center;gap:6px;border:0.5px solid var(--rule-mid);border-radius:100px;padding:8px 13px;font-size:11px;letter-spacing:.01em;background:#fff;color:var(--ink-soft);cursor:pointer;transition:all .15s;font-family:inherit}
#tv-result-page .tvm-act:hover{border-color:rgba(32,32,33,0.22);color:var(--ink)}
#tv-result-page .tvm-act.on{background:var(--sage);color:#fff;border-color:var(--sage)}
#tv-result-page .tvm-act.add{background:var(--ink);color:#fff;border-color:var(--ink)}
#tv-result-page .tvm-act.add:hover{opacity:.85;color:#fff;border-color:var(--ink)}
#tv-result-page .tvm-act.anch.on{background:var(--ink);color:#fff;border-color:var(--ink)}
#tv-result-page .tvm-row.anchored{border-color:var(--ink)}
#tv-result-page .tvm-anchpill{display:inline-flex;align-items:center;gap:5px;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);border:0.5px solid var(--rule-mid);border-radius:100px;padding:3px 9px;flex:none}
#tv-result-page .tvm-ttip{display:flex;gap:9px;align-items:baseline;flex-wrap:wrap;margin-top:12px;padding-top:11px;border-top:0.5px solid var(--rule)}
#tv-result-page .tvm-ttip .tl{font-size:8.5px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-faint);white-space:nowrap}
#tv-result-page .tvm-ttip .tt{font-size:12px;line-height:1.6;color:var(--ink-soft);font-style:italic;flex:1;min-width:180px}
#tv-result-page .tvm-packbox{display:inline-flex;align-items:center;gap:7px;background:none;border:none;padding:6px 4px;cursor:pointer;font-size:11px;letter-spacing:.01em;color:var(--ink-soft);font-family:inherit;transition:color .15s}
#tv-result-page .tvm-packbox.on{color:var(--ink)}
#tv-result-page .tvm-packbox .box{width:16px;height:16px;border-radius:4px;border:1.5px solid rgba(32,32,33,0.3);background:#fff;display:inline-flex;align-items:center;justify-content:center;color:#fff;box-sizing:border-box}
#tv-result-page .tvm-packbox.on .box{border-color:var(--ink);background:var(--ink)}
#tv-result-page .tvm-packbox .box svg{width:10px;height:10px;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
#tv-result-page .tvm-payoff{position:sticky;bottom:0;z-index:5;background:rgba(250,248,245,0.94);backdrop-filter:blur(16px);border-top:0.5px solid var(--rule-mid)}
#tv-result-page .tvm-payoff-in{max-width:1180px;margin:0 auto;padding:13px 36px;display:flex;align-items:center;justify-content:space-between;gap:22px;box-sizing:border-box}
#tv-result-page .tvm-pmeta{display:flex;flex-direction:column;gap:3px;min-width:0}
#tv-result-page .tvm-pmeta .t{font-family:var(--font-serif);font-size:18px;font-weight:400;font-style:italic;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink)}
#tv-result-page .tvm-pmeta .s{font-size:11px;letter-spacing:.02em;color:var(--ink-faint)}
#tv-result-page .tvm-pmeta .s b{color:var(--sage);font-weight:500}
#tv-result-page .tvm-pbtns{display:flex;gap:9px;flex-shrink:0}
#tv-result-page .tvm-pbtn{display:inline-flex;align-items:center;gap:7px;border:0.5px solid var(--rule-mid);border-radius:100px;padding:11px 18px;font-size:12px;background:#fff;color:var(--ink-soft);cursor:pointer;transition:all .15s;font-family:inherit}
#tv-result-page .tvm-pbtn svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}
#tv-result-page .tvm-pbtn:hover{border-color:rgba(32,32,33,0.22);color:var(--ink)}
#tv-result-page .tvm-pbtn.primary{background:var(--ink);color:#fff;border-color:var(--ink)}
#tv-result-page .tvm-pbtn.primary:hover{opacity:.85;color:#fff}
@media(max-width:900px){
#tv-result-page .tvm-console{grid-template-columns:1fr;gap:26px}
#tv-result-page .tvm-look{position:static}
#tv-result-page .tvm-wrap{padding:28px 20px 20px}
#tv-result-page .tvm-mast{flex-direction:column;align-items:flex-start;gap:16px}
#tv-result-page .tvm-progress{align-items:flex-start}
#tv-result-page .tvm-week{display:grid;grid-auto-flow:column;grid-auto-columns:150px;grid-template-columns:none;overflow-x:auto;padding-bottom:8px;scroll-snap-type:x mandatory}
#tv-result-page .tvm-day{scroll-snap-align:start}
#tv-result-page .tvm-payoff-in{padding:11px 16px;gap:12px}
#tv-result-page .tvm-pmeta{display:none}
#tv-result-page .tvm-pbtns{width:100%;justify-content:space-between}
#tv-result-page .tvm-pbtn{flex:1;justify-content:center;padding:12px 8px}
}
@media(max-width:520px){
#tv-result-page .tvm-row{grid-template-columns:84px 1fr;gap:12px}
#tv-result-page .tvm-name{font-size:17px}
#tv-result-page .tvm-vp .vlooks{display:none}
}
@media print{
body>*:not(#tv-result-page){display:none !important}
#tv-result-page{position:static !important;overflow:visible !important}
#tv-result-page .tv-noprint{display:none !important}
#tv-result-page .tvm-tabs{display:none !important}
#tv-result-page #tv-pane-edit,#tv-result-page #tv-pane-outfits{display:block !important}
#tv-result-page .tvm-look{position:static}
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
          ? `<span style="font-family:${_tvSerif};font-style:italic;font-size:12px;color:#B8AC9C;text-align:center;padding:0 12px">Creating imagery…</span>`
          : (!genOk && !wmImg)
            ? `<span style="font-family:${_tvSerif};font-size:28px;font-weight:300;color:var(--ink-faint)">${_waEsc((it.name || '?').charAt(0).toUpperCase())}</span>`
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
        if (_tvActiveOcc >= slots.length) _tvActiveOcc = 0;
        return { data, d, slots, s: slots[_tvActiveOcc] };
      }

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
                <button class="tvm-hbtn tv-noprint" onclick="window.__tvEditDay(${_tvActiveDay})" title="Give this day a plan after all">✎ Dress this day</button>
              </div>
            </div>`;
          return;
        }
        const entries = (s.formula || []).map(f => ({ f, it: data.capsule[f.item_index], ci: f.item_index })).filter(x => x.it);
        const ownedN = entries.filter(x => x.it.wardrobe_match).length;

        const occHtml = slots.map((sl, oi) =>
          `<button class="${oi === _tvActiveOcc ? 'on' : ''}" onclick="window.__tvSetOcc(${oi})">${_waEsc(sl.slot || (oi === 0 ? 'Day' : 'Evening'))}</button>`
        ).join('');

        // No "The mood" hero tile here — the trip hero is static across days
        // and read as the day's look (beta feedback); the first piece tile
        // takes the wide slot instead, like the Daily board. Rendering runs
        // through the shared console template (_rbConsole) — this adapter
        // only supplies frames, provenance and the pack third action.
        const fabricsHtml = entries.map(x => {
          const c = (x.it.wardrobe_match && x.it.wardrobe_match.color) || '';
          return `<span class="fab"><span class="sw" style="background:${_waEsc(c && /^#/.test(c) ? c : (palette[0] || '#E7E0CF'))}"></span><span class="fl">${_waEsc(_dlFabric(x.it.name))}</span></span>`;
        }).join('');

        const conItems = entries.map(x => {
          const { it, ci } = x;
          const wears = (usage[ci] || []).length;
          const list = _dlOptions(it);
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
            count: { cur: _dlOptIndex(it, list), len: list.length },
            wearsHtml: wears ? `<span class="vlooks">× ${wears} looks</span>` : '',
            subHtml: it.wardrobe_match
              ? `<span class="owned">${_rbcCheckSvg} In your wardrobe</span>`
              : `<span class="addtag">${it.added ? 'Added to the pack' : 'Worth adding'}</span>${it.brand ? `<span class="brand">${_waEsc(it.brand)}</span>` : ''}${(it.retailer_hint || it.price_point) ? `<span class="price">${_waEsc([it.retailer_hint, it.price_point].filter(Boolean).join(' · '))}</span>` : ''}`,
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
          let verdict;
          if (gaps.length) verdict = `Nearly there — the ${_waEsc(gaps[0].it.name.toLowerCase())} is the gap worth adding, then this look is complete.`;
          else if (toPack.length) verdict = `Everything’s chosen — just pack the ${_waEsc(toPack[0].it.name.toLowerCase())} and it’s ready.`;
          else verdict = 'Every piece is packed and accounted for — this look travels as it is.';
          return _rbcReadBlock({ score: inCase.length, total: entries.length, unit: 'in the case', clean: gaps.length === 0, verdict });
        })();

        const con = _rbConsole({
          headLabel: `The look · ${_waEsc(dayName)} · ${entries.length} pieces`,
          occHtml: `<div class="tvm-occ">${occHtml}</div>`,
          quoteHtml: s.how ? '“' + _waEsc(s.how) + '”' : '',
          fabricsHtml,
          paletteHtml: palette.map(h => `<span style="background:${h}"></span>`).join(''),
          yoursHtml: `<b>${ownedN}</b>&thinsp;of&thinsp;${entries.length} already yours`,
          panelExtraHtml: readHtml,
          rackLabel: `The rack · ${_waEsc(dayName)}`,
          rackTitleHtml: `<h2>${_waEsc(s.title || 'The look')}${s.title && !/[.!?]$/.test(s.title) ? '.' : ''}</h2>`,
          headButtonsHtml: `<button class="rbc-hbtn tv-noprint" onclick="window.__tvRestyleDay()" title="A fresh day — anchored pieces stay">↻ Restyle this day</button><button class="rbc-hbtn tv-noprint" onclick="window.__tvEditDay(${_tvActiveDay})" title="Tell Robes this day’s real plan">✎ The real plan</button><button class="rbc-hbtn tv-noprint" onclick="window.__tvPackLook()">${_tvCheckSvg} Pack this look</button>`,
          onFlip: '__tvFlip', onSwap: '__tvSwap', onAnchor: '__tvAnchor', onRemove: '__tvRemoveFromLook',
          addPieceFn: '__tvAddPieceToLook',
          noprint: true,
        }, conItems);

        panel.innerHTML = con.lookHtml;

        rackWrap.innerHTML = con.rackHtml;
      }

      // Flick a capsule piece through similar options — the served original,
      // then owned pieces in the same category (the Daily rack's carousel,
      // reusing its option helpers). The capsule item is a shared reference,
      // so the flick carries across every day that wears it, like a swap.
      window.__tvFlip = function(ci, dir) {
        const data = window.__lastTvData;
        const it = data && data.capsule[ci];
        if (!it) return;
        const list = _dlOptions(it);
        if (list.length < 2) { _waShowToast('Nothing else fits this slot yet — snap more pieces'); return; }
        const next = list[(_dlOptIndex(it, list) + dir + list.length) % list.length];
        _dlApplyOption(it, next);
        const savedId = _tvActiveSaveId;
        const scroll = tvResultPage ? tvResultPage.scrollTop : 0;
        window.__tvRenderResult(data, { skipSave: true, savedId });
        if (tvResultPage) tvResultPage.scrollTo({ top: scroll });
        _tvPatchSaved();
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

      window.__tvPackAll = function() {
        const data = window.__lastTvData;
        if (!data) return;
        data.capsule.forEach(it => { it.packed = true; });
        _tvPaintConsole();
        _tvPaintWeek();
        _tvPaintPackProgress();
        _tvPaintEditCards();
        _tvPatchSaved();
        _waShowToast('Suitcase packed — bon voyage ✈');
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
          const badge = it.wardrobe_match
            ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:9.5px;font-weight:500;color:#4A7C59;background:rgba(74,124,89,0.10);border-radius:20px;padding:2px 7px;white-space:nowrap">${checkSvg} Yours</span>`
            : (it.retailer_hint || it.price_point)
              ? `<span style="font-size:10px;color:#A89880;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px;display:inline-block;vertical-align:bottom">${_waEsc([it.retailer_hint, it.price_point].filter(Boolean).join(' · '))}</span>`
              : '';
          return `<div id="tv-cap-${ci}" onclick="window.__tvSelectItem(${ci})" style="background:#fff;border:0.5px solid var(--rule-mid);border-radius:var(--rad);overflow:hidden;cursor:pointer;transition:opacity .2s,outline-color .2s;outline:2px solid transparent;outline-offset:-2px">
            <div${f.pollAttr} style="position:relative;background:var(--cream-200);overflow:hidden;aspect-ratio:1/1">${f.inner}</div>
            <div style="padding:10px 12px 11px">
              <div style="font-size:12.5px;font-weight:500;color:#202021;line-height:1.35">${_waEsc(it.name)}</div>
              ${it.brand ? `<div style="font-family:${serif};font-style:italic;font-size:12px;color:#A89880;margin-top:1px">${_waEsc(it.brand)}</div>` : ''}
              <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:7px;flex-wrap:wrap">
                <span style="display:inline-flex;align-items:center;gap:6px">${badge}</span>
                ${wears ? `<span style="font-size:9.5px;font-weight:500;letter-spacing:.08em;color:#8A7B62;background:#F0EAE0;border-radius:20px;padding:2px 8px;white-space:nowrap">× ${wears} looks</span>` : ''}
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:11px">
                ${(it.wardrobe_match || it.added)
                  ? `<button id="tv-pack-${ci}" onclick="event.stopPropagation();window.__tvPackToggle(${ci})" style="display:inline-flex;align-items:center;gap:6px;background:none;border:none;padding:0;cursor:pointer;font-size:9px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:${it.packed ? '#202021' : '#6E6A64'};font-family:${sans}">
                    <span class="tv-pack-box" style="width:15px;height:15px;border-radius:4px;border:1.5px solid ${it.packed ? '#202021' : 'rgba(32,32,33,0.3)'};background:${it.packed ? '#202021' : '#fff'};display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:9px;line-height:1;box-sizing:border-box">${it.packed ? '✓' : ''}</span>
                    <span class="tv-pack-lbl">${it.packed ? 'Packed' : 'Pack'}</span>
                  </button>`
                  : `<button onclick="event.stopPropagation();window.__tvAddOwn(${ci})" style="display:inline-flex;align-items:center;gap:4px;padding:6px 13px;border:none;border-radius:100px;background:#202021;font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;color:#fff;font-family:${sans}"><span style="font-size:13px;line-height:1;margin-top:-1px">+</span> Add</button>`}
                <button class="tv-noprint" onclick="event.stopPropagation();window.__tvSwap(${ci})" style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border:0.5px solid var(--rule-mid);border-radius:100px;background:#fff;font-size:9px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;color:var(--ink-soft);font-family:${sans}">${swapSvg} Swap</button>
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
            <span style="font-size:10.5px;color:#A89880;letter-spacing:.06em">${count} ${count === 1 ? 'piece' : 'pieces'}</span>
          </div>
          <div style="font-size:11.5px;color:#A89880;font-style:italic;margin-bottom:12px">${sub}</div>`;
        const tiersHtml = [
          keptCards.length ? `<div style="margin-bottom:28px">
            ${sectionHead('Keep', 'Packed for this trip — each one earns its place.', keptCards.length)}
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:12px">${keptCards.map(capCard).join('')}</div>
          </div>` : '',
          addCards.length ? `<div style="margin-bottom:28px">
            ${sectionHead('Worth adding', 'Genuine gaps only — each new piece must bridge what you already own.', addCards.length)}
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:12px">${addCards.map(capCard).join('')}</div>
          </div>` : '',
        ].join('');

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
                <div class="tvm-eyebrow">The travel edit</div>
                <h1 class="tvm-title" id="tv-headline">${_waEsc(data.headline || ('A trip to ' + (data.destination || 'somewhere lovely') + '.'))}</h1>
              </div>
              <div class="tvm-progress">
                <span class="tvm-mpcount"><b id="tv-mp-n">0</b><span class="of"> / ${total} packed</span></span>
                <div class="tvm-mpbar"><span id="tv-mp-fill"></span></div>
                <span class="tvm-mplab">${total} pieces · ${deferred ? 'outfits to plan' : lookCount + ' looks'}</span>
              </div>
            </header>
            <div class="tvm-meta-row">
              <div class="tvm-wx"><span>${_tvWxEmoji}</span><strong>${_waEsc([wx && wx.city ? wx.city + (wx.country ? ', ' + wx.country : '') : data.destination, data.dateLine].filter(Boolean).join(' · ')) || 'Your trip'}</strong>${wx && wx.tempRange ? `<span class="div"></span><span>${_waEsc(wx.tempRange)}</span>` : ''}${wx && wx.condition ? `<span class="div"></span><span style="font-style:italic">${_waEsc(wx.condition)}${wx.seasonal ? ' · seasonal read' : ''}</span>` : ''}</div>
              ${data.location_vibe ? `<div class="tvm-tag">${_waEsc(data.location_vibe)}</div>` : ''}
            </div>
            ${data.fallback ? `<p style="font-size:12px;color:var(--ink-faint);font-style:italic;margin:12px 0 0">Robes couldn’t quite read the brief, so it’s packed you for a lovely week away instead.</p>` : ''}
            <div class="tvm-rule"></div>

            <div class="tvm-tabs">
              <button class="tvm-tab" id="tv-tab-edit" onclick="window.__tvSetTab('edit')">
                <span class="tt">01 · The Edit</span>
                <span class="ts">What to pack · ${total} pieces</span>
              </button>
              <button class="tvm-tab" id="tv-tab-outfits" onclick="window.__tvSetTab('outfits')">
                <span class="tt">02 · Outfits</span>
                <span class="ts">${deferred ? 'Not planned yet — plan as you pack' : `Day by day · ${data.days.length} days · ${lookCount} looks`}</span>
              </button>
            </div>

            <div id="tv-pane-edit">
              <div style="font-family:${serif};font-weight:300;font-style:italic;font-size:clamp(24px,3vw,34px);color:var(--ink);line-height:1.05;margin-bottom:6px">The edit.</div>
              <div style="font-size:12.5px;color:var(--ink-faint);margin-bottom:8px;line-height:1.5">${_waEsc(data.stylist_summary || '')}</div>
              <div id="tv-matrix-note" style="font-size:12px;color:var(--ink-faint);font-style:italic;margin-bottom:18px;min-height:18px">Tap any piece to see how it multiplies across the trip.</div>
              ${tiersHtml}
              <button class="tv-noprint" onclick="window.__tvAddPieceToTrip()" style="width:100%;max-width:640px;display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px dashed var(--rule-mid);border-radius:var(--rad);padding:13px;font-size:12px;letter-spacing:.02em;background:transparent;color:var(--ink-soft);cursor:pointer;font-family:inherit;margin-bottom:16px"><span style="font-size:16px;line-height:1;margin-top:-1px">+</span> Add a piece to this trip</button>
              <div class="tv-noprint" style="margin:4px 0 10px">
                <button class="tvm-crosscta" onclick="${deferred ? 'window.__tvPlanOutfits()' : `window.__tvSetTab('outfits')`}">${deferred ? 'Plan your outfits, day by day →' : 'See your outfits, day by day →'}</button>
              </div>
            </div>

            <div id="tv-pane-outfits" style="display:none">
              ${deferred ? `
              <div class="tv-noprint" style="padding:38px 26px;background:#fff;border:0.5px solid var(--rule-mid);border-radius:var(--rad-lg);text-align:center;max-width:640px">
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

            <div class="tv-noprint">${_rbFeedbackBlock('tv', { title: 'How is this edit?', up: '👍 I’d pack it', down: 'Not quite' })}</div>
          </div>

          <div class="tvm-payoff tv-noprint">
            <div class="tvm-payoff-in">
              <div class="tvm-pmeta">
                <span class="t">The ${_waEsc((wx && wx.city) || data.destination || 'travel')} capsule</span>
                <span class="s"><b id="tv-pm-count">0 of ${total}</b> packed · ${total} pieces${deferred ? ' · outfits to plan' : ', ' + lookCount + ' looks'}</span>
              </div>
              <div class="tvm-pbtns">
                <button class="tvm-pbtn" onclick="window.__rbShare&&window.__rbShare()"><svg viewBox="0 0 24 24"><polygon points="3 3 21 12 3 21 3 3"></polygon><line x1="3" y1="12" x2="21" y2="12"></line></svg><span>Share</span></button>
                <button class="tvm-pbtn" onclick="window.__rbRename&&window.__rbRename('tv')"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg><span>Rename</span></button>
                <button class="tvm-pbtn primary" onclick="window.__tvGoBack();setTimeout(()=>{window.__tvOpen()},200)"><span>Pack a new trip</span></button>
              </div>
            </div>
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
        } else {
          _tvActiveSaveId = (opts && opts.savedId) || null;
        }

        _rbFeedbackArm('tv', () => ({
          prompt: [data.destination, data.dateLine, data.brief].filter(Boolean).join(' · '),
          looksOutput: JSON.stringify({ surface: 'travel-edit', destination: data.destination || '', trip_label: data.trip_label || '', owned: data.capsule.filter(c => c.wardrobe_match).length, total, packed: data.capsule.filter(c => c.packed).length, looks: lookCount, ts: new Date().toISOString() }),
        }));
      };

      // One-Click Export (PRD §5) — the print stylesheet in #tv-style turns
      // the page into a clean PDF via the browser's print-to-PDF.
      window.__tvExport = function() { window.print(); };

      function _tvPatchSaved() {
        const savedId = _tvActiveSaveId;
        if (!savedId || !window.__lastTvData) return;
        const saved = snLoad().find(x => x.id === savedId);
        if (saved) snUpdate(savedId, { tvData: {
          ...(saved.tvData || {}),
          capsule: window.__lastTvData.capsule,
          days: window.__lastTvData.days,
          outfits_deferred: !(window.__lastTvData.days || []).length,
          trip_day_plan: window.__lastTvData.trip_day_plan || null,
        } });
      }

      // Deferred outfit planning — she took the packing edit first, gathered
      // pieces over days, and now dresses the whole trip from the capsule as
      // it stands (packed ticks, swaps and added pieces intact).
      window.__tvPlanOutfits = function() { _tvShowPlanModal({ forTrip: true }); };

      window.__tvOutfitsGo = async function(skip) {
        const data = window.__lastTvData;
        if (!data || !Array.isArray(data.capsule) || !data.capsule.length) return;
        const n = _tvTripDays({ dateFrom: data.dateFrom, dateTo: data.dateTo }).n;
        const plan = skip ? [] : _tvPlanRead(n);
        document.getElementById('tv-plan-modal')?.remove();
        const send = plan.some(p => p === null || p) ? plan : [];
        let overlay = document.getElementById('kp-loading-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'kp-loading-overlay';
          overlay.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(250,248,245,0.92);backdrop-filter:blur(6px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px';
          overlay.innerHTML = `
            <div id="kp-load-title" style="font-family:'Cormorant',Georgia,serif;font-size:28px;font-weight:300;color:#202021;text-align:center"></div>
            <div style="font-size:12px;color:#A89880;letter-spacing:.06em" id="kp-load-msg"></div>
            <div style="width:120px;height:1px;background:rgba(32,32,33,0.1);position:relative;overflow:hidden;margin-top:8px">
              <div id="kp-load-bar" style="position:absolute;inset:0;background:#202021;transform:translateX(-100%);animation:kpLoadBar 2.5s ease-in-out infinite"></div>
            </div>`;
          const ks = document.createElement('style');
          ks.textContent = '@keyframes kpLoadBar{0%{transform:translateX(-100%)}50%{transform:translateX(0)}100%{transform:translateX(100%)}}';
          document.head.appendChild(ks);
          document.body.appendChild(overlay);
        }
        const loadTitle = document.getElementById('kp-load-title');
        if (loadTitle) loadTitle.innerHTML = 'Dressing your days in<br><em>' + _waEsc(data.destination || 'the trip') + '…</em>';
        const msgEl = document.getElementById('kp-load-msg');
        if (msgEl) msgEl.textContent = 'Mapping every look, day by evening…';
        overlay.style.display = 'flex';
        try {
          const res = await fetch('/api/travel/outfits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              destination: data.destination || '',
              brief: data.brief || '',
              dateFrom: data.dateFrom || '',
              dateTo: data.dateTo || '',
              dayPlan: send,
              weather: data.weather || null,
              name,
              styleDna: _rbStyleDna(), styleIcons: _rbStyleIcons(),
              capsule: data.capsule.map(c => ({ name: c.name, category: c.category, brand: c.brand, tier: c.tier, owned: !!c.wardrobe_match })),
            }),
          });
          overlay.style.display = 'none';
          if (!res.ok) throw new Error(await res.text());
          const out = await res.json();
          if (!Array.isArray(out.days) || !out.days.length) throw new Error('empty days');
          data.days = out.days;
          data.outfits_deferred = false;
          data.trip_day_plan = undefined;
          _tvActiveTab = 'outfits';
          _tvActiveDay = 0;
          _tvActiveOcc = 0;
          window.__tvRenderResult(data, { skipSave: true, savedId: _tvActiveSaveId });
          _tvPatchSaved();
          _waShowToast('Your days are dressed — every look from what you’re packing');
        } catch (e) {
          overlay.style.display = 'none';
          console.error('[Robes] /api/travel/outfits error:', e.message);
          _waShowToast('Couldn’t plan the outfits — please try again');
        }
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
              <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#A89880;margin:0">${_waEsc(dayName)}</p>
              <button onclick="document.getElementById('tv-day-modal').remove()" style="background:none;border:none;cursor:pointer;padding:2px;color:#A89880;line-height:1;margin-top:-2px">${closeSvg}</button>
            </div>
            <p style="font-family:${serif};font-size:25px;font-weight:300;color:#202021;margin:0 0 6px;line-height:1.15">What are you actually doing?</p>
            <p style="font-size:12px;color:#A89880;font-style:italic;margin:0 0 16px">Robes re-mixes the capsule you’ve packed — a new piece only appears if the plan truly needs it.</p>
            <input id="tv-day-input" value="${_waEsc(d.user_activity || '')}" placeholder="Attending a formal sunset wedding reception" style="width:100%;box-sizing:border-box;border:1px solid rgba(32,32,33,0.15);border-radius:8px;padding:12px 13px;font-size:13.5px;color:#202021;background:#fff;outline:none;font-family:inherit;margin-bottom:14px">
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
          styleDna: _rbStyleDna(), styleIcons: _rbStyleIcons(),
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
          ? 'Suitcase closed ✈'
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
            <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#A89880;margin:0 0 8px">Add to wardrobe</p>
            <p style="font-family:${serif};font-size:25px;font-weight:300;color:#202021;margin:0 0 8px;line-height:1.2">Add the ${_waEsc(it.name)}?</p>
            <p style="font-size:12.5px;color:#6E6A64;line-height:1.65;margin:0 0 20px">It moves into <em>Keep</em> and joins your wardrobe — ready to pack, and every future look can style it.</p>
            <div style="display:flex;flex-direction:column;gap:9px">
              <button onclick="window.__tvOwnSnap(${ci})" style="width:100%;padding:13px 20px;border:none;border-radius:100px;background:#202021;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#fff;font-family:inherit">📷 Snap it now</button>
              <button onclick="window.__tvQuickOwn(${ci})" style="width:100%;padding:13px 20px;border:1px solid rgba(32,32,33,0.18);border-radius:100px;background:#fff;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#202021;font-family:inherit">Add without a photo</button>
              <button onclick="document.getElementById('tv-own-modal').remove()" style="background:none;border:none;padding:6px;cursor:pointer;font-size:11px;color:#A89880;text-decoration:underline;text-underline-offset:3px;font-family:inherit">Not now</button>
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
            noteEl.innerHTML = `<strong style="color:#202021;font-style:normal">${_waEsc(data.capsule[sel].name)}</strong> earns ${labels.length} wear${labels.length === 1 ? '' : 's'}${labels.length ? ' — ' + labels.join(', ') : ''} · <button onclick="window.__tvSelectItem(${sel})" style="background:none;border:none;padding:0;cursor:pointer;font-size:12px;color:#A89880;text-decoration:underline;text-underline-offset:2px;font-family:inherit;font-style:italic">clear</button>`;
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

      window.__tvSwap = function(idx) {
        const item = window.__lastTvData && window.__lastTvData.capsule[idx];
        if (!item) return;
        _tvSwapIdx = idx;
        _rbSwapModal(item, { id: 'tv-swap-modal', applyName: '__tvSwapApply', snapName: '__tvSnapMine', idx });
      };

      window.__tvSwapApply = function(idx, wardrobeId) {
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
        _waShowToast(wi.label + ' packed instead');
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
          cur = (saved && saved.title) || (window.__lastKpData && window.__lastKpData.piece) || '';
          applyLive = (v) => { const m = document.querySelector('#kp-result-page .rb-sfoot-meta .t'); if (m) m.textContent = v; };
        } else if (kind === 'wk') {
          id = _wkActiveSaveId;
          cur = (window.__lastWkData && window.__lastWkData.headline) || '';
          applyLive = (v) => {
            const h = document.getElementById('wk-headline'); if (h) h.textContent = v;
            const m = document.querySelector('#wk-result-page .rb-sfoot-meta .t'); if (m) m.textContent = v;
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
              <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#A89880;margin:0">Rename</p>
              <button onclick="document.getElementById('rb-rename-modal').remove()" style="background:none;border:none;cursor:pointer;padding:2px;color:#A89880;line-height:1;margin-top:-2px">${closeSvg}</button>
            </div>
            <p style="font-family:${serif};font-size:25px;font-weight:300;font-style:italic;color:#202021;margin:0 0 16px;line-height:1.15">Give it a name.</p>
            <input id="rb-rename-input" value="${_waEsc(cur)}" placeholder="A name you’ll recognise" style="width:100%;box-sizing:border-box;border:0.5px solid rgba(32,32,33,0.18);border-radius:8px;padding:12px 13px;font-size:14px;color:#202021;background:#fff;outline:none;font-family:inherit;margin-bottom:16px">
            <button onclick="window.__rbRenameSave()" style="width:100%;padding:13px 20px;border:none;border-radius:100px;background:#202021;font-size:12px;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;color:#fff;font-family:inherit">Save name</button>
          </div>`;
        document.body.appendChild(modal);
        setTimeout(() => { const el = document.getElementById('rb-rename-input'); if (el) { el.focus(); el.select(); el.onkeydown = e => { if (e.key === 'Enter') window.__rbRenameSave(); }; } }, 60);
        window.__rbRenameSave = function() {
          const v = ((document.getElementById('rb-rename-input') || {}).value || '').trim();
          if (!v) { _waShowToast('Type a name first'); return; }
          snUpdate(id, { title: v });
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
          ? `<img src="${_waEsc(entry.img)}" style="width:52px;height:64px;object-fit:cover;border-radius:8px;flex:none" alt="">`
          : `<div style="width:52px;height:64px;border-radius:8px;background:#EDE8E0;flex:none"></div>`;
        modal.innerHTML = `
          <div style="position:relative;background:#FAF8F5;border-radius:18px;width:100%;max-width:440px;padding:34px 32px 30px;box-shadow:0 24px 60px -12px rgba(32,32,33,0.3)">
            <button onclick="document.getElementById('rb-share-modal').remove()" style="position:absolute;top:14px;right:14px;width:32px;height:32px;background:none;border:none;cursor:pointer;color:#A89880;font-size:20px;line-height:1">×</button>
            <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
              ${thumb}
              <div><p style="font-size:9px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:#A89880;margin:0 0 4px">Share</p>
              <p style="font-family:'Cormorant',Georgia,serif;font-size:19px;font-weight:300;color:#202021;margin:0;line-height:1.2">${_waEsc(entry.title || 'Your look')}</p></div>
            </div>
            <h3 style="font-family:'Cormorant',Georgia,serif;font-size:27px;font-weight:300;color:#202021;margin:0 0 8px;line-height:1.1">Can we share your look?</h3>
            <p style="font-size:12.5px;color:#A89880;line-height:1.6;margin:0 0 18px">Add your Instagram handle and we’ll tag you when we showcase this week’s best looks.</p>
            <div style="display:flex;align-items:center;gap:8px;border:1px solid rgba(32,32,33,0.15);border-radius:10px;padding:12px 14px;background:#fff;margin-bottom:12px">
              <span style="color:#A89880;font-size:14px">@</span>
              <input id="rb-share-ig" type="text" placeholder="yourhandle" autocomplete="off" style="flex:1;min-width:0;border:none;outline:none;background:none;font-size:16px;font-family:inherit;color:#202021">
            </div>
            <button id="rb-share-go" style="width:100%;padding:15px;background:#202021;color:#FAF8F5;border:none;border-radius:10px;font-size:11px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;margin-bottom:14px">Share my look</button>
            <div id="rb-share-copyrow" style="display:flex;align-items:center;gap:10px;border:0.5px solid rgba(32,32,33,0.12);border-radius:10px;padding:11px 14px;background:rgba(32,32,33,0.03);cursor:pointer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A89880" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              <span id="rb-share-url" style="flex:1;min-width:0;font-size:12px;color:#6E6A64;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Preparing your link…</span>
              <button id="rb-share-copy" style="background:none;border:none;cursor:pointer;font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#202021" disabled>Copy</button>
            </div>
            <p id="rb-share-note" style="font-size:11px;color:#A89880;text-align:center;margin:12px 0 0">Anyone with the link can view this look — no account details are shown.</p>
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
          <div id="sn-fb" style="width:100%;background:rgba(32,32,33,0.03);border-radius:12px;padding:28px 24px;text-align:center;margin-bottom:8px">
            <div style="font-family:'Cormorant',Georgia,serif;font-size:20px;font-weight:300;color:#202021;margin-bottom:6px">How were these looks?</div>
            <div id="sn-fb-prompt">
              <div style="font-size:12px;color:#A89880;margin-bottom:18px;font-style:italic">Tell us — your taste shapes what comes next.</div>
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
              <textarea id="sn-fb-text" placeholder="What would have made them better?" rows="3" style="width:100%;border:1px solid rgba(32,32,33,0.15);border-radius:8px;padding:12px 14px;font-size:13px;color:#202021;resize:none;outline:none;box-sizing:border-box;font-family:inherit"></textarea>
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
          /* Design system tokens (matching uploaded Claude Design file) */
          :root {
            --rb-mauve: #C4B0B4;
            --rb-sage-mid: #B4C2B0;
            --rb-rose-mid: #C4AEAD;
            --rb-rose-bg: #EEE5E4;
            --rb-sage-bg: #E4EDE6;
            --rb-cream: #FAF8F5;
            --rb-cream-100: #F2EDE8;
            --rb-rule: rgba(32,32,33,0.1);
            --rb-rule-mid: rgba(32,32,33,0.14);
            --rb-ink: #202021;
            --rb-ink-soft: #6E6A64;
            --rb-rose-ey: #A89880;
            --rb-sage-ey: #7E8C7A;
            --rb-rad-lg: 14px;
          }

          .rb-section { margin-bottom: 52px; }
          .rb-sec-head { display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px; }
          .rb-sec-ey { font-size:10px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:var(--rb-rose-ey); }
          .rb-sec-meta { font-size:11px;color:var(--rb-rose-ey);letter-spacing:.03em; }
          .rb-sec-link { background:none;border:none;cursor:pointer;font-size:11px;color:var(--rb-rose-ey);letter-spacing:.04em;padding:0;text-decoration:underline;text-underline-offset:3px; }
          .rb-sec-h { font-family:'Cormorant',Georgia,serif;font-weight:300;font-size:clamp(22px,2.6vw,28px);color:var(--rb-ink);line-height:1.15;margin:0 0 16px; }
          .rb-sec-h em { font-style:italic; }

          /* ES card — shared art+body layout (matches .es-card in uploaded design) */
          .rb-es-card { display:flex;width:100%;text-align:left;cursor:pointer;overflow:hidden;
            border:0.5px solid var(--rb-rule-mid);border-radius:var(--rb-rad-lg);background:#fff;
            transition:border-color .22s,box-shadow .22s; }
          .rb-es-card:hover { border-color:rgba(32,32,33,0.2);box-shadow:0 22px 54px -30px rgba(32,32,33,0.24); }
          .rb-es-art { flex:1 1 46%;min-width:0;min-height:248px;padding:20px;display:grid;gap:10px;
            background:linear-gradient(150deg,var(--rb-cream-100),var(--rb-cream)); }

          /* Moodboard art: 2-col grid, hero spans 2 rows */
          .rb-es-art-board { grid-template-columns:1.35fr 1fr;grid-template-rows:1fr 1fr; }
          .rb-es-art-board .rb-esb { border-radius:9px;border:0.5px solid var(--rb-rule); }
          .rb-es-art-board .rb-esb-hero { grid-row:1 / span 2;background:var(--rb-mauve); }
          .rb-es-art-board .rb-esb-2 { background:var(--rb-sage-mid); }
          .rb-es-art-board .rb-esb-3 { background:var(--rb-rose-mid); }

          /* Style-notes art: 3 staggered frames */
          .rb-es-art-ways { grid-template-columns:repeat(3,1fr);align-items:start; }
          .rb-es-frame { border-radius:9px;border:0.5px solid var(--rb-rule);aspect-ratio:3/4;padding:13px; }
          .rb-es-frame.f1 { background:var(--rb-rose-bg); }
          .rb-es-frame.f2 { background:var(--rb-sage-bg);margin-top:18px; }
          .rb-es-frame.f3 { background:var(--rb-rose-mid);margin-top:36px; }
          .rb-es-frame-num { font-family:'Cormorant',Georgia,serif;font-weight:300;font-size:23px;line-height:1;color:rgba(32,32,33,0.46); }

          /* ES body (text panel) */
          .rb-es-body { flex:1 1 54%;min-width:0;padding:38px 42px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center; }
          .rb-es-eyebrow { font-size:10px;font-weight:500;letter-spacing:.24em;text-transform:uppercase;color:var(--rb-rose-ey);margin-bottom:16px; }
          .rb-es-eyebrow.sage { color:var(--rb-sage-ey); }
          .rb-es-h { font-family:'Cormorant',Georgia,serif;font-weight:400;font-size:33px;line-height:1.04;color:var(--rb-ink);margin:0; }
          .rb-es-h em { font-style:italic;color:var(--rb-ink-soft); }
          .rb-es-sub { font-size:13.5px;line-height:1.62;color:var(--rb-ink-soft);margin-top:14px;max-width:38ch; }
          .rb-es-cta { margin-top:26px;display:inline-flex;align-items:center;gap:9px;padding:12px 22px;
            border-radius:100px;background:var(--rb-ink);color:var(--rb-cream);font-size:11px;font-weight:500;
            letter-spacing:.16em;text-transform:uppercase;border:none;cursor:pointer;
            transition:opacity .18s,transform .18s; }
          .rb-es-card:hover .rb-es-cta { opacity:.9;transform:translateY(-1px); }
          .rb-es-cta svg { width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round; }

          /* Populated: moodboard 4-up grid (2×2) */
          .rb-mb-grid { display:grid;grid-template-columns:1fr 1fr;gap:16px; }
          .rb-mb-card { cursor:pointer;border-radius:var(--rb-rad-lg);overflow:hidden;background:#fff;border:0.5px solid var(--rb-rule);transition:border-color .2s,box-shadow .2s; }
          .rb-mb-card:hover { border-color:rgba(32,32,33,0.2);box-shadow:0 12px 32px -16px rgba(32,32,33,0.18); }
          .rb-mb-imgs { display:grid;grid-template-columns:1.35fr 1fr;grid-template-rows:1fr 1fr;gap:3px;min-height:200px;background:var(--rb-cream-100); }
          .rb-mb-img-main { grid-row:1/3;width:100%;height:100%;object-fit:cover;display:block; }
          .rb-mb-img-ph-main { grid-row:1/3;background:var(--rb-mauve); }
          .rb-mb-img-ph-sm { background:var(--rb-sage-mid); }
          .rb-mb-img-ph-sm:nth-child(3) { background:var(--rb-rose-mid); }
          .rb-mb-foot { padding:14px 16px 16px;position:relative; }
          .rb-mb-foot-title { font-family:'Cormorant',Georgia,serif;font-weight:300;font-size:16px;color:var(--rb-ink);line-height:1.25;margin-bottom:3px; }
          .rb-mb-foot-meta { font-size:10px;color:var(--rb-rose-ey);letter-spacing:.02em; }
          .rb-mb-new { position:absolute;top:14px;right:16px;font-size:9px;font-weight:600;letter-spacing:.14em;color:var(--rb-rose-ey);text-transform:uppercase; }

          /* Populated: style notes 4-up grid */
          .rb-sn-grid { display:grid;grid-template-columns:repeat(4,1fr);gap:12px; }
          .rb-sn-card { cursor:pointer;border-radius:10px;overflow:hidden;background:#fff;border:0.5px solid var(--rb-rule);transition:border-color .2s; }
          .rb-sn-card:hover { border-color:rgba(32,32,33,0.2); }
          .rb-sn-img { width:100%;aspect-ratio:3/4;object-fit:cover;display:block; }
          .rb-sn-img-ph { aspect-ratio:3/4;background:var(--rb-cream-100); }
          .rb-sn-body { padding:11px 13px 13px; }
          .rb-sn-type { font-size:9px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--rb-rose-ey);margin-bottom:4px; }
          .rb-sn-title { font-family:'Cormorant',Georgia,serif;font-weight:300;font-size:15px;color:var(--rb-ink);line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
          .rb-sn-meta { font-size:10px;color:var(--rb-rose-ey);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }

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
                  if (window.location.pathname === '/wardrobe') window._rbNav && window._rbNav('/dashboard');
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
            <button class="rb-sec-link" onclick="window.__snOpen()">${snLoad().length} kept</button>
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
          pill.innerHTML = `<span class="rb-lock-pill">✦ ${Math.max(1, _WA_TARGET - _waItems.length)} more pieces and every look is closet-only · ${_waItems.length}/15</span>`;
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
      ];

      function _cbGetSendBtn() { return document.querySelector('.cb-send'); }

      function _cbSetCta(text) {
        const btn = _cbGetSendBtn();
        if (!btn) return;
        if (!btn.dataset.origText) btn.dataset.origText = btn.textContent || 'Send';
        btn.textContent = text;
      }

      function _cbResetCta() {
        const btn = _cbGetSendBtn();
        if (btn && btn.dataset.origText) btn.textContent = btn.dataset.origText;
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
              <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#A89880;margin:0">From your wardrobe</p>
              <button onclick="document.getElementById('cb-wa-pick').remove()" style="background:none;border:none;cursor:pointer;padding:2px;color:#A89880;font-size:16px;line-height:1">×</button>
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
            <div style="font-size:12px;color:#A89880;letter-spacing:.06em" id="kp-load-msg">Generating editorial looks</div>
            <div style="width:120px;height:1px;background:rgba(32,32,33,0.1);position:relative;overflow:hidden;margin-top:8px">
              <div id="kp-load-bar" style="position:absolute;inset:0;background:#202021;transform:translateX(-100%);animation:kpLoadBar 2.5s ease-in-out infinite"></div>
            </div>`;
          const ks = document.createElement('style');
          ks.textContent = '@keyframes kpLoadBar{0%{transform:translateX(-100%)}50%{transform:translateX(0)}100%{transform:translateX(100%)}}';
          document.head.appendChild(ks);
          document.body.appendChild(overlay);
        }
        const loadTitle = document.getElementById('kp-load-title');
        if (loadTitle) loadTitle.innerHTML = daily
          ? 'Dressing you<br><em>for today…</em>'
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
        try {
          const res = await fetch('/api/style', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: guard.signal,
            body: JSON.stringify({
              prompt,
              photo: photoData || null,
              styleDna: _rbStyleDna(), styleIcons: _rbStyleIcons(),
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
          window.__kpRenderResult(await res.json(), prompt, { intent, context });
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
        document.getElementById('rb-addfork')?.remove();
        const serif = "'Cormorant',Georgia,serif";
        const modal = document.createElement('div');
        modal.id = 'rb-addfork';
        modal.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(32,32,33,0.45);display:flex;align-items:center;justify-content:center;padding:24px';
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
        const thumb = row.image_url
          ? `<img src="${_waEsc(row.image_url)}" style="width:64px;height:82px;border-radius:8px;object-fit:cover;flex-shrink:0" alt="">`
          : `<div style="width:64px;height:82px;border-radius:8px;background:#F0EDE8;display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="font-family:${serif};font-size:24px;color:#C8B8A2">${_waEsc((row.label || '?').charAt(0).toUpperCase())}</span></div>`;
        modal.innerHTML = `
          <div style="background:#FAF8F5;border-radius:20px;width:100%;max-width:420px;box-sizing:border-box;box-shadow:0 24px 60px -12px rgba(32,32,33,0.28);padding:26px 26px 22px">
            <div style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#A89880;margin-bottom:14px">In your wardrobe ✓</div>
            <div style="display:flex;gap:16px;align-items:center;margin-bottom:20px">
              ${thumb}
              <div style="flex:1;min-width:0">
                <div style="font-family:${serif};font-size:24px;font-weight:300;color:#202021;line-height:1.15">Your ${_waEsc(row.label.toLowerCase())} is filed.</div>
                <div style="font-size:12px;color:#A89880;font-style:italic;margin-top:4px">Want it styled straight away?</div>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:9px">
              <button id="rb-fork-ways" style="width:100%;padding:13px 20px;border-radius:100px;border:none;background:#202021;color:#fff;font-size:12px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;font-family:inherit">Style it 3 ways</button>
              <button id="rb-fork-daily" style="width:100%;padding:13px 20px;border-radius:100px;border:0.5px solid rgba(32,32,33,0.2);background:#fff;color:#202021;font-size:12px;font-weight:500;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;font-family:inherit">Build today's look around it</button>
              <button id="rb-fork-skip" style="background:none;border:none;cursor:pointer;font-size:12px;color:#A89880;text-decoration:underline;font-family:inherit;padding:6px">Not now — keep cataloguing</button>
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
        row.style.cssText = 'margin:12px 0 0;padding:16px 18px;background:#fff;border:0.5px solid rgba(32,32,33,0.12);border-radius:12px';
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

      function _cbResolve(intent, prompt) {
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
          _cbReset();
          window.__dlSubmit(prompt);
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
          const res = await fetch('/api/moodboard', {
            method: 'POST',
            headers,
            body: JSON.stringify({ prompt, wardrobeItems, styleDna: _rbStyleDna(), styleIcons: _rbStyleIcons() }),
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
          _mbShowResult({ ...data, prompt });
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
          <p style="font-size:10px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:#A89880;margin:0 0 12px">Robes is building your board</p>
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

        // Sticky-footer meta mirrors the board title + piece provenance
        const sfTitle = document.getElementById('mb-sfoot-title');
        const sfSub = document.getElementById('mb-sfoot-sub');
        if (sfTitle) sfTitle.textContent = String(title || 'Moodboard').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (sfSub) sfSub.textContent = railSubText;

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
        fb.style.cssText = 'margin:36px auto 40px;max-width:640px;padding:28px 24px;background:rgba(32,32,33,0.03);border-radius:12px;text-align:center';
        fb.innerHTML = `
          <div style="font-family:'Cormorant',Georgia,serif;font-size:22px;font-weight:300;color:#202021;margin-bottom:6px">How is this board?</div>
          <div id="mb-fb-prompt">
            <div style="font-size:13px;color:#A89880;margin-bottom:18px;font-style:italic">Tell us — your taste shapes what comes next.</div>
            <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
              <button id="mb-fb-up" onclick="window.__mbFbRate(1)" style="display:flex;align-items:center;gap:8px;padding:10px 22px;border:1px solid rgba(32,32,33,0.15);border-radius:40px;background:#fff;font-size:12px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#202021;font-family:inherit">👍 Love it</button>
              <button id="mb-fb-dn" onclick="window.__mbFbRate(0)" style="display:flex;align-items:center;gap:8px;padding:10px 22px;border:1px solid rgba(32,32,33,0.15);border-radius:40px;background:#fff;font-size:12px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;color:#202021;font-family:inherit">Not quite</button>
            </div>
          </div>
          <div id="mb-fb-expand" hidden style="margin-top:16px">
            <textarea id="mb-fb-text" placeholder="What would have made it better?" rows="3" style="width:100%;border:1px solid rgba(32,32,33,0.15);border-radius:8px;padding:12px 14px;font-size:13px;color:#202021;resize:none;outline:none;box-sizing:border-box;font-family:inherit"></textarea>
            <button onclick="window.__mbFbSubmit()" style="margin-top:10px;padding:10px 28px;background:#202021;color:#fff;border:none;border-radius:40px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;font-family:inherit">Send feedback</button>
          </div>
          <div id="mb-fb-done" hidden style="font-size:13px;color:#7E7C5A;margin-top:12px">Thank you — noted.</div>`;
        // Insert before the sticky footer (not appendChild) — the footer is
        // static markup inside #moodboard-panel and must stay the panel's
        // last child so it reads as a sticky bottom bar, matching the
        // key-piece/daily-look/travel result pages where the feedback block
        // sits above the footer, not below it.
        const stickyFoot = panel.querySelector('.rb-sfoot');
        if (stickyFoot) panel.insertBefore(fb, stickyFoot);
        else panel.appendChild(fb);
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
            <div onclick="window.__mbSwapApply(${idx},'${_mbEsc(wi.id)}')" style="cursor:pointer;border-radius:8px;overflow:hidden;background:#fff;border:0.5px solid rgba(32,32,33,0.08);transition:box-shadow .15s" onmouseenter="this.style.boxShadow='0 4px 12px rgba(32,32,33,0.12)'" onmouseleave="this.style.boxShadow='none'">
              ${wi.image_url
                ? `<img src="${_mbEsc(wi.image_url)}" style="width:100%;aspect-ratio:1;object-fit:cover;display:block" alt="">`
                : `<div style="aspect-ratio:1;background:#EDE8E0;display:flex;align-items:center;justify-content:center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C8C0B8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`}
            </div>`).join('');
          wardrobeSection = `
            <div style="margin-bottom:24px">
              <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#A89880;margin:0 0 10px">From your wardrobe</p>
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${itemsHtml}</div>
            </div>`;
        } else if (aiAlt) {
          wardrobeSection = `
            <div style="margin-bottom:24px;background:#F5F2EE;border-radius:12px;padding:14px">
              <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#A89880;margin:0 0 6px">Robes’ suggestion</p>
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
                <p style="font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#A89880;margin:0">Swap this piece</p>
                <button onclick="document.getElementById('mb-swap-modal').remove()" style="background:none;border:none;cursor:pointer;padding:2px;color:#A89880;line-height:1;margin-top:-2px">${closeSvg}</button>
              </div>
              <p style="font-family:'Cormorant',Georgia,serif;font-size:26px;font-weight:300;color:#202021;margin:0 0 2px;line-height:1.15">${_mbEsc(item.name)}</p>
              ${retailer ? `<p style="font-size:12px;color:#A89880;font-style:italic;margin:0 0 18px">${_mbEsc(retailer)}</p>` : `<div style="height:18px"></div>`}
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
              ${(retailer || price) ? `<p style="text-align:center;font-size:11px;color:#A89880;margin:0">Opens ${_mbEsc(retailer)}${price ? ' · ' + _mbEsc(price) : ''}</p>` : ''}
            </div>
          </div>`;
        document.body.appendChild(modal);
      };

      window.__mbSwapApply = function(lookIdx, wardrobeId) {
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
            <p style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#A89880;margin:0">Your moodboards</p>
            <button onclick="window.__mbCloseList();window.__rbStartMoodboard()" style="display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:100px;background:#202021;color:#FAF8F5;font-size:10px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;border:none;cursor:pointer">+ New</button>
          </div>
          <div id="mb-list-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px"></div>
          <div id="mb-list-empty" style="display:none;padding:80px 0;text-align:center">
            <p style="font-family:'Cormorant',Georgia,serif;font-size:22px;font-weight:300;color:#202021;margin:0 0 10px">No moodboards yet.</p>
            <p style="font-size:13px;color:#A89880;line-height:1.6">Describe a trip or season and Robes<br>will build the board.</p>
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
          <div onclick="window.__mbOpenSaved(${item.id})" style="cursor:pointer;border-radius:14px;overflow:hidden;background:#fff;border:0.5px solid rgba(32,32,33,0.1);transition:box-shadow .2s" onmouseenter="this.style.boxShadow='0 12px 32px -16px rgba(32,32,33,0.18)'" onmouseleave="this.style.boxShadow='none'">
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
              <div style="font-size:11px;color:#A89880">${_mbEsc(item.subtitle || '')}</div>
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
      // markup ships a hardcoded "Good evening, Annie." / "What are we dressing
      // for today?". First-timers get a time-of-day greeting + the static echo;
      // returners (onboarded, plus a genuine prior visit or an established
      // ≥3-piece closet) get a "Welcome back" register and a count-aware steer
      // toward styling today or cataloguing what's new. Detection stays local:
      // a per-uid last-visit timestamp, no backend.
      // NOTE: var (not let) — _waSyncCounts runs early in boot and calls
      // _rbUpdateMasthead → _rbIsReturner, which reads _rbPriorVisit. Those
      // are hoisted function declarations, so they can fire before execution
      // reaches this line; a let binding would still be in its temporal dead
      // zone and throw ("Cannot access '_rbPriorVisit' before initialization"),
      // failing the whole dashboard boot. var hoists to undefined (falsy) so
      // the early call reads first-timer state, and the _rbMarkVisit IIFE +
      // the later _rbUpdateMasthead() call below apply the real returner state.
      var _rbLastVisitTs = 0, _rbPriorVisit = false;
      (function _rbMarkVisit() {
        try {
          const p = window.__robes_profile || {};
          const uid = p.id || (window.__robes_session && window.__robes_session.user && window.__robes_session.user.id) || '';
          if (!uid) return;
          const key = 'rb_last_visit__' + uid;
          const prev = Number(localStorage.getItem(key) || 0);
          const now = Date.now();
          // A reload inside the same session isn't a "return" — require a 30-min gap.
          if (prev && (now - prev) > 30 * 60 * 1000) { _rbPriorVisit = true; _rbLastVisitTs = prev; }
          localStorage.setItem(key, String(now));
        } catch (e) {}
      })();
      function _rbIsReturner() {
        const p = window.__robes_profile || {};
        if (!p.onboarded_at) return false;
        return _rbPriorVisit || (_waLoaded && _waItems.length >= 3);
      }
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
          if (wpOpen && p !== '/wardrobe') {
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
          else if (p === '/wardrobe') { if (!wpOpen && window.App && App.showWardrobe) App.showWardrobe(); }
          else window.rbClearCrumb && window.rbClearCrumb();
        } catch (e) {} finally { _rbRouting = false; }
      });

      // Pull the durable lookbook/moodboards from Supabase — refreshes all
      // dashboard rows once the cloud copy lands (and syncs up any
      // local-only entries from before the migration).
      _lbCloudPull();

      // ── Style Note completion prompt ─────────────────────────────────────
      // Onboarding deliberately asks for NO photos of her (the face scan was
      // the likeliest bail point — beta feedback 4.7 removed it entirely);
      // this quiet below-the-fold card invites her to capture her colour and
      // silhouette chapters in Style Notes on her own time. Gated on
      // style_dna (already in the boot select) and dismissible per user.
      // Delayed past _rbApplyLayout (900ms) so the reshuffle can't displace it.
      setTimeout(function _rbSilPrompt() {
        try {
          const prof = window.__robes_profile || {};
          const dna = prof.style_dna || {};
          const needsColour = !dna.color_harmony;
          const needsSil = !dna.silhouette_proportions;
          if (!needsColour && !needsSil) return;
          const uid = prof.id || _waUid() || '';
          if (!uid) return;
          if (localStorage.getItem('rb_sil_prompt_off__' + uid)) return;
          if (document.getElementById('rb-sil-prompt')) return;
          const grid = document.querySelector('.services-grid');
          if (!grid) return;
          const both = needsColour && needsSil;
          const eyebrow = both ? 'Style notes · your style, read once' : 'Style notes · one chapter left';
          const headline = both
            ? 'Your colours & silhouette, <em style="font-style:italic">whenever suits.</em>'
            : (needsColour
              ? 'Your colour harmony, <em style="font-style:italic">whenever suits.</em>'
              : 'Your silhouette, <em style="font-style:italic">whenever suits.</em>');
          const body = both
            ? 'Two photos teach Robes your colouring and your line — the shades and cuts that flatter, woven into every look it builds. Two minutes, only ever seen by Robes.'
            : (needsColour
              ? 'One close-up teaches Robes your colouring — your season, undertone and the shades that are yours, woven into every look it builds. Two minutes, only ever seen by Robes.'
              : 'One full-length photo teaches Robes your line — the cuts that flatter, woven into every look it builds. Two minutes, only ever seen by Robes.');
          const cta = both ? 'Complete my style notes →' : (needsColour ? 'Complete my colours →' : 'Complete my silhouette →');
          const target = needsColour ? '/stylenotes' : '/stylenotes#silhouette';
          const host = grid.closest('section') || grid;
          const card = document.createElement('section');
          card.id = 'rb-sil-prompt';
          card.style.cssText = 'max-width:1140px;margin:26px auto;padding:20px 24px;background:#FDFCFA;border:1px solid #E7E0CF;border-radius:14px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;position:relative';
          card.innerHTML =
            '<div style="flex:1;min-width:230px">' +
              '<div style="font-size:10px;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:#A89880;margin-bottom:6px">' + eyebrow + '</div>' +
              '<div style="font-family:\'Cormorant\',Georgia,serif;font-size:21px;font-weight:400;color:#202021;margin-bottom:4px">' + headline + '</div>' +
              '<div style="font-size:13px;color:#9A8E82;line-height:1.55">' + body + '</div>' +
            '</div>' +
            '<button id="rb-sil-go" style="flex-shrink:0;background:#202021;color:#F8F5F0;border:none;border-radius:100px;padding:11px 22px;font-size:13px;letter-spacing:.03em;cursor:pointer;font-family:inherit">' + cta + '</button>' +
            '<button id="rb-sil-x" aria-label="Not now" style="position:absolute;top:10px;right:14px;background:none;border:none;cursor:pointer;color:#B0A090;font-size:16px;line-height:1;padding:4px">×</button>';
          host.parentNode.insertBefore(card, host);
          card.querySelector('#rb-sil-go').onclick = function() { window.location.href = target; };
          card.querySelector('#rb-sil-x').onclick = function() {
            try { localStorage.setItem('rb_sil_prompt_off__' + uid, '1'); } catch (e) {}
            card.remove();
          };
        } catch (e) { console.warn('[robes] style-note prompt:', e); }
      }, 1200);

      // ── Onboarding handoff — "Your piece, styled" as an inline card ─────
      // /onboarding step 04 stores {prompt, photo} then lands here. The
      // wardrobe-first PRD relocated the wow moment: no full-screen overlay,
      // no gate — a card on the dashboard itself, loading → styled, sitting
      // right under the wardrobe progress module. Tapping through opens the
      // full three-look render (which also saves it to the lookbook).
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
          return '<div style="font-size:10px;font-weight:500;letter-spacing:.22em;text-transform:uppercase;color:#A89880;margin:0 0 12px">Your piece, styled</div>' +
            '<div style="border:0.5px solid rgba(32,32,33,0.12);border-radius:14px;background:#fff;padding:22px 24px">' +
              '<div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;flex-wrap:wrap">' + photoThumb +
                '<div style="flex:1;min-width:200px">' +
                  '<div style="font-family:' + serif + ';font-size:24px;font-weight:300;color:#202021;line-height:1.15">' + title + '</div>' +
                  '<div style="font-size:12px;color:#A89880;font-style:italic;margin-top:4px">' + sub + '</div>' +
                '</div>' + (ctaRow || '') +
              '</div>' +
              (tiles ? '<div id="rb-styled-tiles" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">' + tiles + '</div>' : '') +
              (footer || '') +
            '</div>';
        }

        function paintLoading() {
          const tiles = [0, 1, 2].map(() =>
            '<div style="aspect-ratio:4/5;border-radius:8px;background:#EDE9E2;animation:rbStyPulse 1.8s ease-in-out infinite"></div>'
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
              '<div id="rb-styled-img-' + i + '" style="aspect-ratio:4/5;border-radius:8px;overflow:hidden;background:#EDE9E2;' + (!src && pending ? 'animation:rbStyPulse 1.8s ease-in-out infinite' : '') + '">' +
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
            ? 'That’s piece ' + nCat + ' of 15. Add ' + leftCat + ' more and Robes builds every look entirely from your own closet.'
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
            const res = await fetch('/api/style', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: piece.prompt || '',
                photo: piece.photo || null,
                styleDna: _rbStyleDna(), styleIcons: _rbStyleIcons(),
                wardrobeCount: Math.max(1, _waItems.length),
                wardrobeItems: _waItems.map(i => ({ label: i.label, category: i.category, color: i.color, times_worn: i.times_worn })),
                intent: 'style',
              }),
            });
            if (!res.ok) throw new Error(await res.text());
            return await res.json();
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
              body: JSON.stringify({ data: m[2], mimeType: m[1] }),
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
