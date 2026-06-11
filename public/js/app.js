/* ══════════════════════════════════════════════════════════════════
   ROBES — Key Piece MVP funnel · client app
   ══════════════════════════════════════════════════════════════════ */
const App = (function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const SAMPLE = '/images/looks/keypiece.jpg';

  /* ── state ──────────────────────────────────────────────────────── */
  const st = {
    name: '', email: '', pieceName: '', prompt: '', link: '', photo: null,
    photoUrl: null,        // Cloudinary URL for the uploaded photo
    ways: null,            // AI response: array of 3 look objects
    generatedImages: null, // Nano Banana generated outfit images [img0, img1, img2]
    history: [],           // archived results from previous styling sessions
    fromHistory: false,    // true when current result was reopened from history (don't re-archive)
    resultLayout: 'stack',
    shareIdx: 0, idx: 0,
  };

  const FLOW = ['landing', 'confirm', 'name', 'capture', 'gen', 'result'];
  const order = () => FLOW;

  /* ── screen switching ───────────────────────────────────────────── */
  function show(id) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('s-' + id);
    el.classList.add('active');
    window.scrollTo(0, 0);
    $('#nav').classList.toggle('on-dark', id === 'confirm' || id === 'name');
    $('#nav').classList.toggle('on-landing', id === 'landing');
    const splash = id === 'landing' || id === 'confirm' || id === 'name';
    $('#nav-progress').style.display = splash ? 'none' : '';
    $('#nav-cta').style.display = id === 'landing' ? '' : 'none';
    paintProgress(id);
    if (id === 'landing') prepLanding();
    if (id === 'name') prepName();
    if (id === 'capture') prepCapture();
    if (id === 'gen') runGen();
    if (id === 'result') renderResult();
  }
  function paintProgress(id) {
    const seq = order().filter(s => s !== 'gen' && s !== 'landing' && s !== 'confirm' && s !== 'name');
    const curPos = seq.indexOf(id);
    $('#nav-progress').innerHTML = seq.map((s, i) => {
      const cls = i < curPos ? 'done' : i === curPos ? 'cur' : '';
      return `<span class="np-dot ${cls}"></span>`;
    }).join('');
  }
  function go(id) { st.idx = order().indexOf(id); show(id); }
  function startFlow() { go(order()[1]); }
  function next() {
    const seq = order();
    const ni = Math.min(st.idx + 1, seq.length - 1);
    st.idx = ni; show(seq[ni]);
  }
  function back() {
    const seq = order();
    const pi = Math.max(0, st.idx - 1);
    st.idx = pi; show(seq[pi]);
  }
  function restart() {
    st.name = ''; st.email = ''; st.pieceName = ''; st.prompt = '';
    st.link = ''; st.photo = null; st.photoUrl = null; st.ways = null;
    st.generatedImages = null; st.shareIdx = 0; st.history = [];
    closeModal();
    go('landing');
  }

  function styleAnother() {
    if (st.ways && !st.fromHistory) {
      st.history.unshift({ photo: st.photo, photoUrl: st.photoUrl, pieceName: st.pieceName, ways: st.ways, generatedImages: st.generatedImages, ts: Date.now() });
    }
    st.photo = null; st.photoUrl = null; st.link = ''; st.prompt = ''; st.pieceName = ''; st.ways = null; st.generatedImages = null; st.fromHistory = false;
    persist();
    go('landing');
    openModal();
  }

  function reopenResult(idx) {
    const item = st.history[idx];
    if (!item) return;
    st.photo = item.photo; st.photoUrl = item.photoUrl || null;
    st.pieceName = item.pieceName; st.ways = item.ways;
    st.generatedImages = item.generatedImages || null;
    st.fromHistory = true;
    go('result');
  }

  function relativeTime(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  /* ── landing ────────────────────────────────────────────────────── */
  const LC_PROMPTS = [
    'Style my Balmain waistcoat three ways',
    'Help me pack for a week in Ibiza',
    'What do I wear to dinner tonight?',
    'A week of outfits for the office',
  ];
  let lcTimer = null, lcRevealed = false;
  function prepLanding() {
    if ($('#land-submit')) $('#land-submit').textContent = 'Join the waitlist';
    if ($('#nav-cta')) $('#nav-cta').textContent = 'Join the waitlist';
    clearInterval(lcTimer); clearTimeout(lcTimer);
    const el = $('#lc-typed');
    if (el) {
      let pi = 0, ci = 0, dir = 1;
      const tick = () => {
        const full = LC_PROMPTS[pi];
        ci += dir;
        el.textContent = full.slice(0, ci);
        if (dir > 0 && ci >= full.length) { dir = -1; lcTimer = setTimeout(tick, 1900); return; }
        if (dir < 0 && ci <= 0) { dir = 1; pi = (pi + 1) % LC_PROMPTS.length; lcTimer = setTimeout(tick, 360); return; }
        lcTimer = setTimeout(tick, dir > 0 ? 52 : 24);
      };
      tick();
    }
    if (!lcRevealed) {
      lcRevealed = true;
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: 0.12 });
      $$('#s-landing .reveal').forEach(s => io.observe(s));
    }
  }

  function submitLandingEmail(e) {
    if (e) e.preventDefault();
    const inp = $('#land-email');
    const v = (inp.value || '').trim();
    if (!v || !/.+@.+\..+/.test(v)) { inp.focus(); return false; }
    st.email = v;
    st.emailGuess = guessName(v);
    persist();

    // fire-and-forget: save to waitlist (non-blocking so UX stays snappy)
    fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: v }),
    }).catch(() => {}); // swallow errors — waitlist is best-effort

    openModal();
    return false;
  }
  function focusEmail() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const inp = $('#land-email');
    if (inp) setTimeout(() => inp.focus(), 200);
  }
  function pickNeed(card, text) {
    clearInterval(lcTimer); clearTimeout(lcTimer);
    const el = $('#lc-typed');
    if (el) el.textContent = text;
    $$('.use-card').forEach(c => c.classList.toggle('active', c === card));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function guessName(email) {
    let local = email.split('@')[0].replace(/[0-9._-]+/g, ' ').trim().split(' ')[0];
    if (!local) return '';
    return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase();
  }

  /* ── name ───────────────────────────────────────────────────────── */
  function prepName() {
    const guess = st.name || st.emailGuess || '';
    if ($('#name-input')) $('#name-input').value = guess;
    setTimeout(() => { const i = $('#name-input'); if (i) i.focus(); }, 140);
  }
  function submitName(e) {
    if (e) e.preventDefault();
    const v = ($('#name-input').value || '').trim();
    st.name = v ? v.replace(/\s+.*$/, '') : '';
    persist();
    // update Airtable contact with the name now that we have it
    if (st.name && st.email) {
      fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: st.email, name: st.name }),
      }).catch(() => {});
    }
    next();
  }

  /* ── capture ────────────────────────────────────────────────────── */
  function prepCapture() {
    const h = new Date().getHours();
    const tod = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    $('#cap-h').innerHTML = st.name ? `${tod},<br><em>${st.name}.</em>` : `${tod}.`;
    if ($('#pb-input')) $('#pb-input').value = st.prompt || '';
    if ($('#pb-link-input')) $('#pb-link-input').value = st.link || '';
    if ($('#pb-link')) $('#pb-link').hidden = !st.link;
    closeAddMenu();
    paintDrop();
    syncPrompt();
    paintHistory();
  }

  function paintHistory() {
    const el = $('#cap-history');
    if (!el || !st.history.length) { if (el) el.innerHTML = ''; return; }
    el.innerHTML = `
      <div class="prev-label eyebrow">Previously styled</div>
      ${st.history.map((item, i) => `
        <button class="prev-card" onclick="App.reopenResult(${i})">
          <img class="prev-thumb" src="${item.photo || SAMPLE}" alt="">
          <div class="prev-info">
            <div class="prev-name">${item.pieceName || 'Key piece'}</div>
            <div class="prev-meta">3 looks · ${relativeTime(item.ts)}</div>
          </div>
          <span class="prev-arrow">→</span>
        </button>`).join('')}`;
  }
  function syncPrompt() {
    const fmInput = $('#fm-input');
    const pbInput = $('#pb-input');
    st.prompt = (fmInput ? fmInput.value : pbInput ? pbInput.value : '').trim();
    st.link = ($('#pb-link') && !$('#pb-link').hidden) ? ($('#pb-link-input').value || '').trim() : '';
    if (st.prompt) {
      st.pieceName = st.prompt.split(',')[0].replace(/^(style |dress |my |the |a |an )+/i, '').trim().slice(0, 40);
    }
    const ready = !!(st.photo || st.link || st.prompt);
    if ($('#fm-style-cta')) $('#fm-style-cta').toggleAttribute('disabled', !ready);
    if ($('#pb-send')) $('#pb-send').toggleAttribute('disabled', !ready);
  }
  function onFile(input) {
    const f = input.files && input.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { st.photo = r.result; paintDrop(); paintFmTile(); syncPrompt(); };
    r.readAsDataURL(f);
  }
  function clearPhoto(e) { if (e) e.stopPropagation(); st.photo = null; paintDrop(); paintFmTile(); syncPrompt(); }
  function paintDrop() {
    const dz = $('#dropzone');
    if (st.photo) {
      dz.classList.add('filled');
      $('#dz-empty').style.display = 'none';
      $('#dz-fill').style.display = 'block';
      $('#dz-preview').src = st.photo;
    } else {
      dz.classList.remove('filled');
      $('#dz-empty').style.display = 'flex';
      $('#dz-fill').style.display = 'none';
    }
  }

  /* ── add menu ───────────────────────────────────────────────────── */
  function toggleAddMenu(e) {
    if (e) e.stopPropagation();
    const m = $('#pb-menu'), b = $('#pb-add');
    const open = m.hidden;
    m.hidden = !open;
    b.classList.toggle('open', open);
  }
  function closeAddMenu() {
    if ($('#pb-menu')) $('#pb-menu').hidden = true;
    if ($('#pb-add')) $('#pb-add').classList.remove('open');
  }
  function menuUpload() { closeAddMenu(); $('#cap-file').click(); }
  function menuCamera() { closeAddMenu(); $('#cap-cam').click(); }
  function menuLink() {
    closeAddMenu();
    if ($('#pb-link')) $('#pb-link').hidden = false;
    setTimeout(() => { const i = $('#pb-link-input'); if (i) i.focus(); }, 60);
    syncPrompt();
  }
  function removeLink() {
    if ($('#pb-link-input')) $('#pb-link-input').value = '';
    if ($('#pb-link')) $('#pb-link').hidden = true;
    syncPrompt();
  }
  function submitPrompt() {
    syncPrompt();
    if (!st.photo && !st.link && !st.prompt) return;
    next();
  }
  function wireDrop() {
    const dz = $('#dropzone');
    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
    dz.addEventListener('drop', e => {
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) {
        const r = new FileReader();
        r.onload = () => { st.photo = r.result; paintDrop(); syncPrompt(); };
        r.readAsDataURL(f);
      }
    });
    document.addEventListener('click', e => { if (!e.target.closest('.pb-add-wrap')) closeAddMenu(); });
  }

  /* ── generating — real Claude API call ─────────────────────────── */
  let genTimer = null;
  let genStepIdx = 0;
  let apiDone = false;
  let animDone = false;
  let fmStep = 0;

  function runGen() {
    $('#gen-piece-img').src = st.photo || SAMPLE;
    const who = st.name ? `${st.name}, styling` : 'Styling';
    const what = st.pieceName ? `your ${st.pieceName.toLowerCase()}` : 'your key piece';
    $('#gen-h').innerHTML = `${who}<br><em>${what}.</em>`;

    const errEl = $('#gen-err');
    if (errEl) errEl.style.display = 'none';

    const steps = $$('#gen-steps .gen-step');
    steps.forEach(s => { s.textContent = ''; s.classList.remove('on', 'done'); });
    apiDone = false;
    animDone = false;

    // typewriter — one step at a time, loops until API responds
    function typeStep(si) {
      if (si >= steps.length) {
        if (apiDone) { animDone = true; advance(); return; }
        // API still working — reset and loop
        steps.forEach(s => { s.textContent = ''; s.classList.remove('on', 'done'); });
        genTimer = setTimeout(() => typeStep(0), 400);
        return;
      }
      const el = steps[si];
      const text = el.dataset.text || '';
      el.classList.add('on');
      let ci = 0;
      function typeChar() {
        ci++;
        el.textContent = text.slice(0, ci);
        if (ci < text.length) {
          genTimer = setTimeout(typeChar, 32);
        } else {
          el.classList.replace('on', 'done');
          genTimer = setTimeout(() => typeStep(si + 1), 320);
        }
      }
      typeChar();
    }
    typeStep(0);

    // real API call
    callStyle().then(ways => {
      st.ways = ways;
      apiDone = true;
      if (animDone) advance();
    }).catch(err => {
      clearTimeout(genTimer);
      steps.forEach(s => s.classList.remove('on', 'done'));
      if (errEl) {
        errEl.textContent = 'Styling failed — ' + (err.message || 'please try again.');
        errEl.style.display = 'block';
      }
      toast('Something went wrong. Please try again.');
      setTimeout(() => go('capture'), 2000);
    });
  }

  function advance() {
    clearTimeout(genTimer);
    genTimer = setTimeout(() => next(), 400);
  }

  async function callStyle() {
    const body = {
      photo: st.photo || null,
      link: st.link || null,
      prompt: st.prompt || null,
      name: st.name || null,
      pieceName: st.pieceName || null,
    };
    const res = await fetch('/api/style', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Server error ${res.status}`);
    }
    const data = await res.json();
    if (!data.ways || !Array.isArray(data.ways)) throw new Error('Unexpected response');
    if (data.photoUrl) st.photoUrl = data.photoUrl;
    if (Array.isArray(data.generatedImages)) st.generatedImages = data.generatedImages;
    return data.ways;
  }

  /* ── result ─────────────────────────────────────────────────────── */
  function renderResult() {
    const ways = st.ways;
    if (!ways) return; // shouldn't happen

    // reset feedback bar
    fbRating = null;
    if ($('#fb-prompt')) $('#fb-prompt').hidden = false;
    if ($('#fb-expand')) $('#fb-expand').hidden = true;
    if ($('#fb-done'))   $('#fb-done').hidden   = true;
    if ($('#fb-up'))     { $('#fb-up').classList.remove('sel-up','sel-dn'); }
    if ($('#fb-dn'))     { $('#fb-dn').classList.remove('sel-up','sel-dn'); }
    if ($('#fb-text'))   $('#fb-text').value = '';

    const who = st.name ? `${st.name}, your piece —` : 'Your piece,';
    $('#res-h').innerHTML = `${who}<br><em>worn three ways.</em>`;
    $('#res-intro').textContent = 'Here are three different styling suggestions for your key piece, ranging from sharp tailoring to casual sophistication and high-glamour evening wear.';

    $('#yp-img').src = st.photo || SAMPLE;
    $('#yp-name').textContent = st.pieceName || 'Your key piece';

    const host = $('#ways');
    host.classList.toggle('grid', st.resultLayout === 'grid');

    host.innerHTML = ways.map((w, i) => {
      const imgSrc = (st.generatedImages && st.generatedImages[i]) || st.photo || SAMPLE;
      return `
      <article class="way">
        <div class="way-img">
          <img src="${imgSrc}" style="object-position:50% ${[24, 28, 22][i]}%" alt="">
          <span class="way-num">${String(i + 1).padStart(2, '0')}</span>
        </div>
        <div class="way-body">
          <div class="way-eyebrow">${w.eyebrow}</div>
          <div class="way-title">${w.title}</div>
          <div class="way-sections">
            <div class="way-sec">
              <span class="way-sec-label">The Outfit</span>
              <p class="way-sec-text">${w.outfit}</p>
            </div>
            <div class="way-sec">
              <span class="way-sec-label">Key Details</span>
              <p class="way-sec-text">${w.details}</p>
            </div>
            <div class="way-sec">
              <span class="way-sec-label">Accessories</span>
              <p class="way-sec-text">${w.accessories}</p>
            </div>
          </div>
        </div>
      </article>`;
    }).join('');
  }

  /* ── flow modal ─────────────────────────────────────────────────── */
  function openModal() {
    fmStep = 0;
    st.photo = null; st.photoUrl = null; st.prompt = ''; st.pieceName = '';
    paintFmTile();
    if ($('#fm-input')) $('#fm-input').value = '';
    if ($('#fm-name-input')) $('#fm-name-input').value = st.name || '';
    renderFmDots();
    showFmStep('fms-style');
    paintFmRecent();
    syncPrompt();
    document.getElementById('flow-modal').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const m = document.getElementById('flow-modal');
    if (m) m.classList.remove('open');
    document.body.style.overflow = '';
  }

  function showFmStep(id) {
    $$('.fm-step').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  function renderFmDots() {
    const steps = ['fms-style', 'fms-name', 'fms-gen'];
    const el = document.getElementById('fm-dots');
    if (!el) return;
    el.innerHTML = steps.map((_, i) => {
      const cls = i < fmStep ? 'done' : i === fmStep ? 'cur' : '';
      return `<span class="fmd ${cls}"></span>`;
    }).join('');
  }

  function pickFile() { document.getElementById('fm-file').click(); }

  function paintFmTile() {
    const tile = document.getElementById('fm-tile');
    if (!tile) return;
    if (st.photo) {
      tile.classList.add('filled');
      document.getElementById('fm-tile-empty').style.display = 'none';
      document.getElementById('fm-tile-fill').style.display = 'block';
      document.getElementById('fm-tile-img').src = st.photo;
    } else {
      tile.classList.remove('filled');
      document.getElementById('fm-tile-empty').style.display = 'flex';
      document.getElementById('fm-tile-fill').style.display = 'none';
    }
  }

  function paintFmRecent() {
    const el = document.getElementById('fm-recent');
    if (!el) return;
    if (!st.history.length) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `
      <div class="fm-recent-label">Previously styled</div>
      <div class="fm-recent-row">
        ${st.history.slice(0, 3).map((item, i) => `
          <button class="fm-recent-card" onclick="App.reopenResult(${i}); App.closeModal();">
            <img class="frc-img" src="${item.photo || SAMPLE}" alt="">
            <div class="frc-meta">
              <div class="frc-name">${item.pieceName || 'Key piece'}</div>
              <div class="frc-sub">3 looks · ${relativeTime(item.ts)}</div>
            </div>
          </button>`).join('')}
      </div>`;
  }

  function submitStyle() {
    syncPrompt();
    if (!st.photo && !st.prompt) return;
    fmStep = 1;
    renderFmDots();
    showFmStep('fms-name');
    const nameInput = document.getElementById('fm-name-input');
    if (nameInput && st.name) nameInput.value = st.name;
    setTimeout(() => { if (nameInput) nameInput.focus(); }, 180);
  }

  function submitNameModal(e) {
    if (e) e.preventDefault();
    const v = (document.getElementById('fm-name-input').value || '').trim();
    st.name = v ? v.replace(/\s+.*$/, '') : '';
    persist();
    if (st.name && st.email) {
      fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: st.email, name: st.name }),
      }).catch(() => {});
    }
    startGenModal();
  }

  function skipName() { startGenModal(); }

  function styleLater() { closeModal(); }

  function startGenModal() {
    fmStep = 2;
    renderFmDots();
    showFmStep('fms-gen');
    runGenModal();
  }

  function runGenModal() {
    const img = document.getElementById('fm-gen-img');
    if (img) img.src = st.photo || SAMPLE;

    const h = document.getElementById('fm-gen-h');
    if (h) {
      const who = st.name ? `${st.name}, styling` : 'Styling';
      const what = st.pieceName ? `your ${st.pieceName.toLowerCase()}` : 'your key piece';
      h.innerHTML = `${who}<br><em>${what}.</em>`;
    }

    const steps = $$('#fm-gen-steps .gen-step');
    steps.forEach(s => { s.textContent = ''; s.classList.remove('on', 'done'); });
    const errEl = document.getElementById('fm-gen-err');
    if (errEl) errEl.style.display = 'none';
    apiDone = false;
    animDone = false;

    function typeStep(si) {
      if (si >= steps.length) {
        if (apiDone) { animDone = true; advanceModal(); return; }
        // API still working — reset and loop
        steps.forEach(s => { s.textContent = ''; s.classList.remove('on', 'done'); });
        genTimer = setTimeout(() => typeStep(0), 400);
        return;
      }
      const el = steps[si];
      const text = el.dataset.text || '';
      el.classList.add('on');
      let ci = 0;
      function typeChar() {
        ci++;
        el.textContent = text.slice(0, ci);
        if (ci < text.length) { genTimer = setTimeout(typeChar, 32); }
        else { el.classList.replace('on', 'done'); genTimer = setTimeout(() => typeStep(si + 1), 320); }
      }
      typeChar();
    }
    typeStep(0);

    callStyle().then(ways => {
      st.ways = ways;
      apiDone = true;
      if (animDone) advanceModal();
    }).catch(err => {
      clearTimeout(genTimer);
      steps.forEach(s => s.classList.remove('on', 'done'));
      if (errEl) { errEl.textContent = 'Styling failed — ' + (err.message || 'please try again.'); errEl.style.display = 'block'; }
      toast('Something went wrong. Please try again.');
      setTimeout(() => { fmStep = 0; renderFmDots(); showFmStep('fms-style'); }, 2000);
    });
  }

  function advanceModal() {
    clearTimeout(genTimer);
    genTimer = setTimeout(() => { closeModal(); go('result'); }, 400);
  }

  /* ── feedback ───────────────────────────────────────────────────── */
  let fbRating = null;

  function feedbackRate(val) {
    fbRating = val;
    $('#fb-up').classList.toggle('sel-up', val === 1);
    $('#fb-up').classList.remove('sel-dn');
    $('#fb-dn').classList.toggle('sel-dn', val === 0);
    $('#fb-dn').classList.remove('sel-up');
    // reveal text input, keep thanks hidden
    $('#fb-expand').hidden = false;
    $('#fb-done').hidden = true;
    setTimeout(() => { if ($('#fb-text')) $('#fb-text').focus(); }, 60);
  }

  function feedbackSubmit() {
    const comment = ($('#fb-text') ? $('#fb-text').value : '').trim();
    const looksOutput = st.ways ? st.ways.map((w, i) =>
      `Look ${i + 1}: ${w.title} (${w.eyebrow})\n${w.outfit}\n${w.details}\n${w.accessories}`
    ).join('\n\n') : '';
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: st.email || '',
        rating: fbRating,
        comment,
        prompt: st.prompt || '',
        pieceName: st.pieceName || '',
        pieceLink: st.link || '',
        photoUrl: st.photoUrl || '',
        looksOutput,
      }),
    }).catch(() => {});
    // only now show thanks
    $('#fb-prompt').hidden = true;
    $('#fb-expand').hidden = true;
    $('#fb-done').hidden = false;
  }

  /* ── share — Instagram 1:1 carousel ─────────────────────────────── */
  function openShare() {
    buildCarousel();
    st.shareIdx = 0; moveCarousel();
    $('#share-modal').classList.add('open');
  }
  function closeShare() { $('#share-modal').classList.remove('open'); }
  function buildCarousel() {
    const piece = st.pieceName || 'key piece';
    const ways = st.ways || [];

    $('#share-cards').innerHTML = ways.map((w, i) => {
      const imgSrc = (st.generatedImages && st.generatedImages[i]) || st.photo || SAMPLE;
      return `
      <div class="ig">
        <div class="ig-grain"></div>
        <div class="ig-inner">
          <div class="ig-top">
            <span class="ig-wm">Robes</span>
            <span class="ig-idx">0${i + 1} / 03</span>
          </div>
          <div class="ig-photo">
            <img src="${imgSrc}" style="object-position:50% ${[24, 28, 22][i]}%" alt="">
            <span class="ig-num">${String(i + 1).padStart(2, '0')}</span>
          </div>
          <div class="ig-cap">
            <div class="ig-eyebrow">${w.eyebrow}</div>
            <div class="ig-title">${w.title}</div>
            <div class="ig-pieces">${(w.tags || []).map(t => `<span class="ig-chip">${t}</span>`).join('')}</div>
          </div>
          <div class="ig-foot">
            <span class="ig-foot-l">Styled around ${st.name ? st.name + "'s " : 'your '}${piece}</span>
            <span class="ig-foot-r">my-robes.com</span>
          </div>
        </div>
      </div>`;
    }).join('');

    $('#share-dots').innerHTML = ways.map((_, i) => `<span class="sd ${i === 0 ? 'on' : ''}" onclick="App.goShare(${i})"></span>`).join('');
  }
  function moveCarousel() {
    const ways = st.ways || [];
    $('#share-cards').style.transform = `translateX(-${st.shareIdx * 100}%)`;
    $$('#share-dots .sd').forEach((d, i) => d.classList.toggle('on', i === st.shareIdx));
    $('#sa-prev').toggleAttribute('disabled', st.shareIdx === 0);
    $('#sa-next').toggleAttribute('disabled', st.shareIdx === ways.length - 1);
  }
  function goShare(i) {
    const ways = st.ways || [];
    st.shareIdx = Math.max(0, Math.min(ways.length - 1, i));
    moveCarousel();
  }
  function shareTo(label) {
    const handle = ($('#share-handle-input') ? $('#share-handle-input').value : '').trim();
    if (handle) {
      fetch('/api/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: st.email, handle }),
      }).catch(() => {});
    }
    closeShare();
    toast(label === 'Download' ? 'All three saved to your camera roll' : `Shared to ${label}`);
  }
  function copyLink() { toast('Link copied'); }

  /* ── toast ──────────────────────────────────────────────────────── */
  let toastTimer = null;
  function toast(msg) {
    $('#toast-msg').textContent = msg;
    $('#toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2400);
  }

  /* ── persistence ────────────────────────────────────────────────── */
  const STORE_KEY = 'robes-v1';

  function persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        name: st.name, email: st.email, history: st.history.slice(0, 5),
      }));
    } catch {
      try {
        // if storage is full (large base64 photos), strip photos and retry
        localStorage.setItem(STORE_KEY, JSON.stringify({
          name: st.name, email: st.email,
          history: st.history.slice(0, 5).map(h => ({ ...h, photo: null })),
        }));
      } catch { /* give up silently */ }
    }
  }

  function loadPersisted() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.name)  st.name  = d.name;
      if (d.email) st.email = d.email;
      if (Array.isArray(d.history)) st.history = d.history;
    } catch { /* ignore corrupt data */ }
  }

  /* ── tweaks ──────────────────────────────────────────────────────── */
  function setResultLayout(v) {
    st.resultLayout = v;
    Tweaks.persist();
    if (document.getElementById('s-result').classList.contains('active')) renderResult();
  }

  /* ── boot ───────────────────────────────────────────────────────── */
  function goHome() {
    closeModal();
    go('landing');
  }

  function init() {
    wireDrop();
    loadPersisted();
    go('landing');
  }

  return {
    init, next, go, restart, goHome, startFlow, back, styleAnother, reopenResult,
    submitLandingEmail, focusEmail, pickNeed, submitName,
    onFile, clearPhoto, syncPrompt, submitPrompt,
    toggleAddMenu, menuUpload, menuCamera, menuLink, removeLink,
    openShare, closeShare, goShare,
    shareNext: () => goShare(st.shareIdx + 1),
    sharePrev: () => goShare(st.shareIdx - 1),
    openModal, closeModal, pickFile, submitStyle, submitNameModal, skipName, styleLater,
    shareTo, copyLink, toast, feedbackRate, feedbackSubmit,
    setResultLayout,
    _st: st,
  };
})();

/* ── Tweaks panel ────────────────────────────────────────────────── */
const Tweaks = (function () {
  const DEFAULTS = { resultLayout: 'stack' };
  let t = { ...DEFAULTS };
  try { t = { ...t, ...JSON.parse(localStorage.getItem('robes-mvp-tweaks') || '{}') }; } catch (e) {}
  const panel = () => document.getElementById('tw-panel');

  function persist() {
    t.resultLayout = App._st.resultLayout;
    localStorage.setItem('robes-mvp-tweaks', JSON.stringify(t));
    try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: t }, '*'); } catch (e) {}
  }
  function render() {
    const s = App._st;
    panel().innerHTML = `
      <div class="tw-hd"><span class="tw-title">Tweaks</span><button class="tw-close" onclick="Tweaks.dismiss()">×</button></div>
      <div class="tw-row">
        <span class="tw-label">Result layout</span>
        <div class="tw-seg">
          <button class="${s.resultLayout === 'stack' ? 'on' : ''}" onclick="App.setResultLayout('stack')">Editorial stack</button>
          <button class="${s.resultLayout === 'grid' ? 'on' : ''}" onclick="App.setResultLayout('grid')">Gallery grid</button>
        </div>
      </div>
      <div class="tw-divider"></div>
      <button class="tw-btn" onclick="App.restart()">Restart the flow</button>`;
  }
  function dismiss() {
    panel().classList.remove('open');
    try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch (e) {}
  }

  window.addEventListener('message', e => {
    const ty = e?.data?.type;
    if (ty === '__activate_edit_mode') { render(); panel().classList.add('open'); }
    else if (ty === '__deactivate_edit_mode') panel().classList.remove('open');
  });

  function boot() {
    App._st.resultLayout = t.resultLayout || 'stack';
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}
  }

  return { persist, render, dismiss, boot };
})();

document.addEventListener('DOMContentLoaded', () => { Tweaks.boot(); App.init(); });
