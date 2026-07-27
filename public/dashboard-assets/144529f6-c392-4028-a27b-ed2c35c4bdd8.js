/* ══════════════════════════════════════════════════════════════════
   ROBES — Dashboard controller
   Editorial home. Bridges the concierge UI into the existing App flows.
   ══════════════════════════════════════════════════════════════════ */
const Dash = (function () {
  const $ = (id) => document.getElementById(id);
  let intent = 'trip';

  const GENERAL_PILLS = ['A long weekend away', 'Build a summer capsule', 'Something for a wedding'];

  const INTENT = {
    trip: {
      ph: 'Where, when, what kind of trip\u2026',
      hint: 'Trip moodboard, styled from your wardrobe',
      pills: ['A week in the south of France', 'City break, lots of walking', 'A wedding abroad, three events'],
    },
    capsule: {
      ph: 'Season, lifestyle, how many pieces, any constraints\u2026',
      hint: 'A capsule built around what you own',
      pills: ['Ten-piece summer capsule', 'Workwear that travels', 'A neutral autumn edit'],
    },
    piece: {
      ph: 'Name a piece you own, or describe it\u2026',
      hint: 'One piece, worn three ways',
      pills: ['My Balmain waistcoat', 'A silk slip dress', 'A leather trench coat'],
    },
  };

  /* ── greeting + date ──────────────────────────────────────────── */
  function greetWord() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }
  function readName() {
    try { const s = JSON.parse(localStorage.getItem('robes-tweaks') || '{}'); if (s.name && s.name.trim()) return s.name.trim(); } catch (e) {}
    return '';
  }
  function applyGreet(name) {
    const first = (name || readName()).split(/\s+/)[0];
    const el = $('dash-greet');
    if (el) el.innerHTML = first ? `${greetWord()}, ${first}.` : `${greetWord()}.`;
  }
  function applyDate() {
    const wd = new Date().toLocaleDateString('en-GB', { weekday: 'long' });
    const el = $('dash-date');
    if (el) el.innerHTML = `<span>${wd}</span><span class="dd-dot"></span><span>Dublin</span><span class="dd-dot"></span><span>12&deg;</span>`;
  }

  /* ── concierge prompt ─────────────────────────────────────────── */
  function renderPills() {
    const host = $('cb-pills');
    if (!host) return;
    host.innerHTML = GENERAL_PILLS
      .map(p => `<button class="cb-pill" onclick="Dash.usePill(this)">${p}</button>`).join('');
  }
  function setIntent(i) {
    intent = i;
    ['trip', 'capsule', 'piece'].forEach(k => {
      const b = $('ci-' + k); if (b) b.classList.toggle('active', k === i);
    });
    $('cb-ta').placeholder = INTENT[i].ph;
    $('cb-hint').textContent = INTENT[i].hint;
    renderPills();
    // keep the underlying App composer in sync so submit routes correctly
    if (App.setIntent) App.setIntent(i);
    $('cb-ta').focus();
  }
  function usePill(el) {
    $('cb-ta').value = el.textContent;
    $('cb-ta').focus();
  }
  function send() {
    const v = $('cb-ta').value.trim();
    if (!v) { $('cb-ta').focus(); return; }
    if (App.setIntent) App.setIntent(intent);   // ensure routing
    $('home-ta').value = v;                                    // bridge to App composer
    if (App.submitHomePrompt) App.submitHomePrompt();
  }

  /* ── CTAs into existing flows ─────────────────────────────────── */
  function today() {
    if (!App.runGetDressed) return;
    App.runGetDressed({
      occasion: 'Garden party',
      ctx: {
        eyebrow: 'Today \u00b7 Garden party',
        title: 'Cream on cream,<br>quietly done.',
        img: 'images/wimbledon/london-street.png',
        crumb: 'Today',
      },
    });
  }
  function toggleAll() {
    const dual = $('dual'); if (!dual) return;
    const on = dual.classList.toggle('show-all');
    const link = $('insp-link'); if (link) link.textContent = on ? 'Show less' : 'View all';
  }

  /* ── + upload / photo capture ────────────────────────────────────── */
  function toggleAdd(e) { if (e) e.stopPropagation(); const m = $('cb-addmenu'); if (m) m.classList.toggle('open'); }
  function closeAdd() { const m = $('cb-addmenu'); if (m) m.classList.remove('open'); }
  function pickUpload(e) { if (e) e.stopPropagation(); const inp = $('cb-file'); inp.removeAttribute('capture'); inp.click(); closeAdd(); }
  function pickCamera(e) { if (e) e.stopPropagation(); const inp = $('cb-file'); inp.removeAttribute('capture'); inp.click(); closeAdd(); }
  function onPhoto(e) {
    closeAdd();
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const box = $('cb-attached');
    box.innerHTML =
      `<div class="hp-chip"><img src="${url}" alt="">` +
      `<span class="hp-chip-label">${file.name}</span>` +
      `<button class="hp-chip-x" onclick="Dash.removePhoto()" aria-label="Remove photo">` +
      `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button></div>`;
    box.hidden = false;
    e.target.value = '';
  }
  function removePhoto() { const box = $('cb-attached'); if (!box) return; box.innerHTML = ''; box.hidden = true; }

  /* ── typewriter placeholder (reuses the homepage prompt interaction) ── */
  const STATIC_PH = 'Tell Robes where you\u2019re going, or the look you\u2019re after\u2026';
  const PROMPT_EXAMPLES = [
    'What should I wear to dinner in the city tonight?',
    'Plan my work week — smart, comfortable, no repeats',
    'Style my Balmain waistcoat for the office',
    'Help me pack for Ibiza',
  ];
  const CARET = '\u258F';
  let twTimer = null, twOn = false;
  function stopType() { twOn = false; if (twTimer) { clearTimeout(twTimer); twTimer = null; } }
  function startType() {
    const ta = $('cb-ta'); if (!ta) return;
    stopType();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ta.placeholder = STATIC_PH; return;
    }
    twOn = true;
    let pi = 0;
    (function typeOne() {
      if (!twOn) return;
      const full = PROMPT_EXAMPLES[pi];
      let i = 0;
      (function typeStep() {
        if (!twOn) return;
        ta.placeholder = full.slice(0, i) + (i < full.length ? CARET : '');
        if (i < full.length) { i++; twTimer = setTimeout(typeStep, 44 + Math.random() * 46); }
        else { twTimer = setTimeout(eraseStart, 2000); }
      })();
      function eraseStart() {
        if (!twOn) return;
        let len = full.length;
        (function eraseStep() {
          if (!twOn) return;
          ta.placeholder = full.slice(0, len) + CARET;
          if (len > 0) { len--; twTimer = setTimeout(eraseStep, 24); }
          else { pi = (pi + 1) % PROMPT_EXAMPLES.length; twTimer = setTimeout(typeOne, 380); }
        })();
      }
    })();
  }

  /* ── boot ─────────────────────────────────────────────────────── */
  function boot() {
    applyGreet();
    if (App.setIntent) App.setIntent('trip');   // routing default for the single prompt
    const ta = $('cb-ta');
    startType();
    ta.addEventListener('focus', () => { stopType(); ta.placeholder = STATIC_PH; });
    ta.addEventListener('input', stopType);
    ta.addEventListener('blur', () => { if (!ta.value.trim()) startType(); });
    // close the + photo menu on outside click
    document.addEventListener('click', closeAdd);
    // enter-to-send
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    // keep the editorial greeting in sync when the name tweak changes
    if (App.setName) {
      const _setName = App.setName;
      App.setName = function (n) { _setName(n); applyGreet(n); };
    }
  }
  if (document.readyState !== 'loading') boot(); else document.addEventListener('DOMContentLoaded', boot);

  return { setIntent, usePill, send, today, toggleAll, toggleAdd, closeAdd, pickUpload, pickCamera, onPhoto, removePhoto };
})();
