/* ══════════════════════════════════════════════════════════════════
   ROBES — Key Piece MVP funnel · app logic
   ══════════════════════════════════════════════════════════════════ */
const App = (function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const UN = (id, w = 900) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

  /* ── styling content: a key piece, worn three ways ──────────────── */
  const WAYS = [
    { eyebrow:'Corporate to cocktails', title:'The sharp three-piece',
      img:'mvp/looks/look1.jpg', pos:'50% 24%',
      outfit:'The black Balmain waistcoat is worn as the central component of a three-piece suit. It is paired with high-waisted, wide-leg black crepe trousers and a crisp, white silk-blend tuxedo shirt with French cuffs.',
      details:'The sharp tailoring of the vest is enhanced by the wide-leg cut, while the gold lion-head buttons provide the signature Balmain luxury accent.',
      accessories:'Minimalist gold chain necklace, structured stilettos.',
      tags:['Wide-leg trousers','Tuxedo shirt','Gold chain'] },
    { eyebrow:'Casual chic', title:'Parisian, off-duty',
      img:'mvp/looks/look2.jpg', pos:'50% 28%',
      outfit:'The Balmain waistcoat is worn open for a relaxed feel, layered over a simple white cotton t-shirt. This is paired with high-waisted, slightly distressed light-wash straight-leg jeans. A cream tweed jacket is draped effortlessly over the shoulders.',
      details:'The juxtaposition of the structured vest against soft denim and tweed creates a textured, relaxed-luxury look.',
      accessories:'Quilted bag with a gold chain that echoes the buttons, cat-eye sunglasses, and classic loafers.',
      tags:['Straight-leg jeans','Tweed jacket','Quilted bag'] },
    { eyebrow:'After dark', title:'Edgy evening noir',
      img:'mvp/looks/look3.jpg', pos:'50% 22%',
      outfit:'The black Balmain waistcoat is buttoned up completely and worn as a top, maximising the visibility of the gold buttons against the deep black. It is paired with an asymmetric, voluminous black silk-faille midi skirt featuring an exaggerated side bow.',
      details:'The contrast between the rigid, masculine-tailored waistcoat and the soft, sculptural femininity of the skirt creates visual drama.',
      accessories:'Black patent ankle boots with gold hardware, a large gold cuff, and a velvet clutch with a gold lion emblem that matches the buttons.',
      tags:['Silk-faille skirt','Patent boots','Velvet clutch'] },
  ];
  const SAMPLE = 'mvp/looks/keypiece.jpg'; // the Balmain waistcoat — the key piece being styled

  /* ── state ──────────────────────────────────────────────────────── */
  const st = {
    name:'', email:'', pieceName:'', prompt:'', link:'', photo:null, style:'',
    resultLayout:'stack',       // 'stack' | 'grid'
    shareIdx:0, idx:0,
  };

  // single linear flow — a confirmation splash sits between email and styling
  const FLOW = ['landing','confirm','name','capture','gen','result'];
  const order = () => FLOW;

  /* ── screen switching ───────────────────────────────────────────── */
  function show(id) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('s-' + id);
    el.classList.add('active');
    window.scrollTo(0, 0);
    // nav theme (dark on the confirmation splash + name step)
    $('#nav').classList.toggle('on-dark', id === 'confirm' || id === 'name');
    $('#nav').classList.toggle('on-landing', id === 'landing');
    // nav progress visibility (hidden on landing + splashes)
    const splash = id === 'landing' || id === 'confirm' || id === 'name';
    $('#nav-progress').style.display = splash ? 'none' : '';
    $('#nav-cta').style.display = id === 'landing' ? '' : 'none';
    paintProgress(id);
    // per-screen prep
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
  function startFlow() { const seq = order(); go(seq[1]); }
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
    st.name = ''; st.email = ''; st.pieceName = ''; st.prompt = ''; st.link = ''; st.photo = null; st.style = ''; st.shareIdx = 0;
    go('landing');
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
    // typewriter rotator on the floating prompt card
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
    // scroll-reveal for sections below the fold
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
    startFlow();
    return false;
  }
  function focusEmail() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const inp = $('#land-email');
    if (inp) setTimeout(() => inp.focus(), 200);
  }
  // clicking a "what do you need today" card drops its prompt into the hero box
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

  // name capture (dedicated onboarding-style step)
  function prepName() {
    const guess = st.name || st.emailGuess || '';
    if ($('#name-input')) $('#name-input').value = guess;
    setTimeout(() => { const i = $('#name-input'); if (i) i.focus(); }, 140);
  }
  function submitName(e) {
    if (e) e.preventDefault();
    const v = ($('#name-input').value || '').trim();
    st.name = v ? v.replace(/\s+.*$/, '') : '';
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
  }
  function syncPrompt() {
    st.prompt = ($('#pb-input') ? $('#pb-input').value : '').trim();
    st.link = ($('#pb-link') && !$('#pb-link').hidden) ? ($('#pb-link-input').value || '').trim() : '';
    // derive a short piece name for the styling + result copy
    if (st.prompt) {
      st.pieceName = st.prompt.split(',')[0].replace(/^(style |dress |my |the |a |an )+/i,'').trim().slice(0,40);
    }
    const ready = !!(st.photo || st.link || st.prompt);
    if ($('#pb-send')) $('#pb-send').toggleAttribute('disabled', !ready);
  }
  function onFile(input) {
    const f = input.files && input.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { st.photo = r.result; paintDrop(); syncPrompt(); };
    r.readAsDataURL(f);
  }
  function clearPhoto(e) { if (e) e.stopPropagation(); st.photo = null; paintDrop(); syncPrompt(); }
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

  /* ── the "+" add menu (upload / camera / link) ──────────────────── */
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
    ['dragenter','dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
    ['dragleave','drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
    dz.addEventListener('drop', e => {
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) {
        const r = new FileReader(); r.onload = () => { st.photo = r.result; paintDrop(); syncPrompt(); }; r.readAsDataURL(f);
      }
    });
    // close the + menu on any outside click
    document.addEventListener('click', e => { if (!e.target.closest('.pb-add-wrap')) closeAddMenu(); });
  }

  /* ── generating ─────────────────────────────────────────────────── */
  let genTimer = null;
  function runGen() {
    $('#gen-piece-img').src = st.photo || SAMPLE;
    const who = st.name ? `${st.name}, styling` : 'Styling';
    const what = st.pieceName ? `your ${st.pieceName.toLowerCase()}` : 'your key piece';
    $('#gen-h').innerHTML = `${who}<br><em>${what}.</em>`;
    const steps = $$('#gen-steps .gen-step');
    steps.forEach(s => s.classList.remove('on','done'));
    let i = 0;
    const tick = () => {
      if (i > 0) steps[i-1].classList.replace('on','done') || steps[i-1].classList.add('done');
      if (i < steps.length) { steps[i].classList.add('on'); i++; genTimer = setTimeout(tick, 620); }
      else { genTimer = setTimeout(() => next(), 520); }
    };
    tick();
  }

  /* ── result ─────────────────────────────────────────────────────── */
  function renderResult() {
    const who = st.name ? `${st.name}, your piece —` : 'Your piece,';
    $('#res-h').innerHTML = `${who}<br><em>worn three ways.</em>`;
    $('#res-intro').textContent = 'A sharp piece does the most work in a wardrobe. Here it is three ways — none of them the obvious one.';
    // your piece card
    $('#yp-img').src = st.photo || SAMPLE;
    $('#yp-name').textContent = st.pieceName || 'Your key piece';
    // ways
    const host = $('#ways');
    host.classList.toggle('grid', st.resultLayout === 'grid');
    host.innerHTML = WAYS.map((w, i) => `
      <article class="way">
        <div class="way-img">
          <img src="${w.img}" style="object-position:${w.pos}" alt="">
          <span class="way-num">${String(i+1).padStart(2,'0')}</span>
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
      </article>`).join('');
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
    $('#share-cards').innerHTML = WAYS.map((w, i) => `
      <div class="ig">
        <div class="ig-grain"></div>
        <div class="ig-inner">
          <div class="ig-top">
            <span class="ig-wm">Robes</span>
            <span class="ig-idx">0${i+1} / 03</span>
          </div>
          <div class="ig-photo">
            <img src="${w.img}" style="object-position:${w.pos}" alt="">
            <span class="ig-num">${String(i+1).padStart(2,'0')}</span>
          </div>
          <div class="ig-cap">
            <div class="ig-eyebrow">${w.eyebrow}</div>
            <div class="ig-title">${w.title}</div>
            <div class="ig-pieces">${w.tags.map(t => `<span class="ig-chip">${t}</span>`).join('')}</div>
          </div>
          <div class="ig-foot">
            <span class="ig-foot-l">Styled around ${st.name ? st.name + "'s " : 'your '}${piece}</span>
            <span class="ig-foot-r">my-robes.com</span>
          </div>
        </div>
      </div>`).join('');
    $('#share-dots').innerHTML = WAYS.map((_, i) => `<span class="sd ${i===0?'on':''}" onclick="App.goShare(${i})"></span>`).join('');
  }
  function moveCarousel() {
    $('#share-cards').style.transform = `translateX(-${st.shareIdx * 100}%)`;
    $$('#share-dots .sd').forEach((d, i) => d.classList.toggle('on', i === st.shareIdx));
    $('#sa-prev').toggleAttribute('disabled', st.shareIdx === 0);
    $('#sa-next').toggleAttribute('disabled', st.shareIdx === WAYS.length - 1);
  }
  function goShare(i) { st.shareIdx = Math.max(0, Math.min(WAYS.length-1, i)); moveCarousel(); }
  function shareTo(label) {
    closeShare();
    toast(label === 'Download' ? 'All three saved to your camera roll' : `Shared to ${label}`);
  }
  function copyLink() {
    toast('Link copied');
  }

  /* ── toast ──────────────────────────────────────────────────────── */
  let toastTimer = null;
  function toast(msg) {
    $('#toast-msg').textContent = msg;
    $('#toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2400);
  }

  /* ── tweaks (variations) ────────────────────────────────────────── */
  function setResultLayout(v) {
    st.resultLayout = v; Tweaks.persist();
    if (document.getElementById('s-result').classList.contains('active')) renderResult();
  }

  /* ── boot ───────────────────────────────────────────────────────── */
  function init() {
    wireDrop();
    go('landing');
  }

  return {
    init, next, go, restart, startFlow, back,
    submitLandingEmail, focusEmail, pickNeed, submitName,
    onFile, clearPhoto, syncPrompt, submitPrompt,
    toggleAddMenu, menuUpload, menuCamera, menuLink, removeLink,
    openShare, closeShare, goShare,
    shareNext: () => goShare(st.shareIdx + 1), sharePrev: () => goShare(st.shareIdx - 1),
    shareTo, copyLink, toast,
    setResultLayout,
    _st: st,
  };
})();

/* ── Tweaks: host protocol + panel ──────────────────────────────── */
const Tweaks = (function () {
  const DEFAULTS = { resultLayout:'stack' };
  let t = { ...DEFAULTS };
  try { t = { ...t, ...JSON.parse(localStorage.getItem('robes-mvp-tweaks') || '{}') }; } catch (e) {}
  const panel = () => document.getElementById('tw-panel');

  function persist() {
    t.resultLayout = App._st.resultLayout;
    localStorage.setItem('robes-mvp-tweaks', JSON.stringify(t));
    try { window.parent.postMessage({ type:'__edit_mode_set_keys', edits:t }, '*'); } catch (e) {}
  }
  function render() {
    const s = App._st;
    panel().innerHTML = `
      <div class="tw-hd"><span class="tw-title">Tweaks</span><button class="tw-close" onclick="Tweaks.dismiss()">×</button></div>
      <div class="tw-row">
        <span class="tw-label">Result layout</span>
        <div class="tw-seg">
          <button class="${s.resultLayout==='stack'?'on':''}" onclick="App.setResultLayout('stack')">Editorial stack</button>
          <button class="${s.resultLayout==='grid'?'on':''}" onclick="App.setResultLayout('grid')">Gallery grid</button>
        </div>
      </div>
      <div class="tw-divider"></div>
      <button class="tw-btn" onclick="App.restart()">Restart the flow</button>`;
  }
  function dismiss() { panel().classList.remove('open'); try { window.parent.postMessage({ type:'__edit_mode_dismissed' }, '*'); } catch (e) {} }

  window.addEventListener('message', e => {
    const ty = e?.data?.type;
    if (ty === '__activate_edit_mode') { render(); panel().classList.add('open'); }
    else if (ty === '__deactivate_edit_mode') panel().classList.remove('open');
  });

  function boot() {
    App._st.resultLayout = t.resultLayout || 'stack';
    try { window.parent.postMessage({ type:'__edit_mode_available' }, '*'); } catch (e) {}
  }
  return { persist, render, dismiss, boot };
})();

document.addEventListener('DOMContentLoaded', () => { Tweaks.boot(); App.init(); });
