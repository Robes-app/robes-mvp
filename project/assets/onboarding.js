/* ══════════════════════════════════════════════════════════════════
   ROBES — onboarding state machine (launch on demand)
   exposes: window.RobesOnboarding.start({ onComplete })
   ══════════════════════════════════════════════════════════════════ */
(function () {
  const ICONS = [
    'Carolyn Bessette-Kennedy','The Row','Hailey Bieber','Totême','Jane Birkin','Sézane',
    'Zoë Kravitz','Acne Studios','Sienna Miller','Isabel Marant','Sofia Loren','Jacquemus',
    'Phoebe Philo','Khaite','The Frankie Shop','Audrey Hepburn','Lauren Hutton',
    'Caroline de Maigret','Charlotte Gainsbourg','Lemaire','Carolina Herrera','Grace Kelly',
  ];
  const PALETTES = [
    { id:'neutrals', name:'Quiet neutrals', desc:'soft creams, warm greys, deep ink', colors:['#EFEAE0','#D9D2C7','#A7A29A','#5E5A55','#2A2724'] },
    { id:'earths',   name:'Sandy earths',   desc:'tan, biscuit, espresso',            colors:['#EAD9BE','#D9B98B','#C49A63','#9A6E42','#5B3C28'] },
    { id:'clay',     name:'Warm clay',      desc:'terracotta, blush, rose',           colors:['#F0CFC4','#E3A593','#C9725C','#A4453A','#6E2A28'] },
    { id:'coastal',  name:'Coastal cools',  desc:'sea glass, denim, slate',           colors:['#D6E0E4','#9DB6C4','#5C7E97','#3A5872','#22303F'] },
    { id:'mono',     name:'Editorial mono', desc:'ink + cream, nothing else',         colors:['#F3EFE8','#D7D2C8','#8C8880','#3A3733','#1A1917'] },
    { id:'bold',     name:'Bold accents',   desc:'saturated, statement, never quiet', colors:['#F2C94C','#F2994A','#EB5757','#BB6BD9','#2D9CDB'] },
  ];
  const TIERS = [
    { id:'everyday',     name:'Everyday',     examples:'Zara, H&M, Arket, Vinted',          price:'Under €150' },
    { id:'contemporary', name:'Contemporary', examples:'Sézane, Reformation, ba&sh',         price:'€150–500' },
    { id:'designer',     name:'Designer',     examples:'Anine Bing, Totême, Isabel Marant',  price:'€500–1,500' },
    { id:'luxury',       name:'Luxury',       examples:'The Row, Celine, Bottega, Loewe',    price:'€1,500–5,000' },
    { id:'ultra',        name:'Ultra luxury', examples:'Chanel, Prada, Dior, Hermès',        price:'€5,000+' },
  ];
  const CATEGORIES = ['Shoes','Bags','Outerwear','Jewellery','Occasionwear','Tops & knitwear'];
  const SPEND = [
    { id:'u500',  amount:'Under €500',         note:'Occasional picks' },
    { id:'s500',  amount:'€500–1,500',         note:'Regular wardrobe updates' },
    { id:'s1500', amount:'€1,500–5,000',       note:'Considered investment' },
    { id:'s5000', amount:'€5,000+',            note:'Fashion is a priority' },
    { id:'na',    amount:'Prefer not to say',  note:'' },
  ];

  let onComplete = null;
  const ROOT = document.getElementById('ob-root');
  const state = {
    stage:'splash', name:'', icons:['Totême','Sienna Miller'], palettes:['neutrals'],
    tier:'contemporary', cats:['Shoes','Bags'], spend:'s500',
  };

  const GRAIN = `<svg class="dk-grain" xmlns="http://www.w3.org/2000/svg"><filter id="dkNoise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#dkNoise)"/></svg>`;
  const swatches = (cs) => cs.map(c => `<span class="sw" style="background:${c}"></span>`).join('');

  function go(stage) { state.stage = stage; ROOT.scrollTop = 0; window.scrollTo(0,0); render(); }

  function finish() {
    if (onComplete) onComplete({ name: state.name });
    ROOT.style.transition = 'opacity .4s ease';
    ROOT.style.opacity = '0';
    setTimeout(() => { ROOT.classList.add('hidden'); ROOT.style.opacity=''; ROOT.style.transition=''; ROOT.innerHTML=''; }, 420);
  }

  function chrome(opts, body) {
    const { step, count, progress, eyebrow, title, sub, continueLabel='Continue', showSkip=true } = opts;
    return `<div class="ob-screen">
      <header class="ob-top">
        <button class="ob-back" data-action="back"><span class="ob-arrow">←</span> <span>Back</span></button>
        <div class="ob-step">${step}</div>
        <div class="ob-count">${count}</div>
      </header>
      <div class="ob-progress"><div class="ob-progress-fill" style="width:${progress*100}%"></div></div>
      <main class="ob-body">
        <div class="ob-eyebrow">${eyebrow}</div>
        <h1 class="ob-title">${title}</h1>
        <p class="ob-sub">${sub}</p>
        <div class="ob-input-zone">${body}</div>
      </main>
      <footer class="ob-footer">
        <button class="ob-continue" data-action="next">${continueLabel}</button>
        ${showSkip ? `<button class="ob-skip" data-action="next">Skip for now</button>` : ''}
      </footer>
    </div>`;
  }

  function renderSplash() {
    ROOT.innerHTML = `<div class="dk dk-splash">${GRAIN}<div class="dk-glow"></div><div class="dk-inner"><div style="text-align:center"><div class="dk-wordmark">Robes</div></div></div></div>`;
    setTimeout(() => { if (state.stage === 'splash') go('intro'); }, 1800);
  }

  function renderIntro() {
    ROOT.innerHTML = `<div class="dk flow-anim">${GRAIN}<div class="dk-glow"></div><div class="dk-inner">
      <p class="dk-eyebrow">An introduction</p>
      <h1 class="dk-heading">A few questions.<em>Robes builds<br>your style notes.</em></h1>
      <p class="dk-body">Your style has a signature. Robes gathers it, then builds every outfit around it — so getting dressed always feels intentional.</p>
      <div class="dk-spacer"></div>
      <div class="dk-cta"><button class="dk-btn" data-action="begin">Begin</button>
      <button class="dk-skip" data-action="skip-all">Skip — take me in</button></div>
    </div></div>`;
    ROOT.querySelector('[data-action=begin]').addEventListener('click', () => go('name'));
    ROOT.querySelector('[data-action=skip-all]').addEventListener('click', finish);
  }

  function renderName() {
    ROOT.innerHTML = `<div class="dk flow-anim">${GRAIN}<div class="dk-glow"></div><div class="dk-inner">
      <button class="dk-back" data-action="back"><span>←</span> Back</button>
      <p class="dk-eyebrow">First things first</p>
      <h1 class="dk-heading">What should<br><em>we call you?</em></h1>
      <p class="dk-sub">A name for your style notes.</p>
      <input class="dk-input" type="text" placeholder="Your name" autocomplete="off" value="${state.name}">
      <div class="dk-spacer"></div>
      <div class="dk-cta"><button class="dk-btn" id="name-btn" ${state.name.trim()?'':'disabled'}>Continue</button></div>
    </div></div>`;
    const input = ROOT.querySelector('.dk-input'), btn = ROOT.querySelector('#name-btn');
    input.addEventListener('input', e => { state.name = e.target.value; btn.disabled = !state.name.trim(); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && state.name.trim()) go(0); });
    btn.addEventListener('click', () => { if (state.name.trim()) go(0); });
    ROOT.querySelector('[data-action=back]').addEventListener('click', () => go('intro'));
    setTimeout(() => input.focus(), 300);
  }

  function renderDone() {
    const first = (state.name || '').trim().split(/\s+/)[0];
    ROOT.innerHTML = `<div class="done-screen flow-anim">${GRAIN}<div class="dk-glow"></div>
      <p class="done-eyebrow">Your style notes are ready</p>
      <h1 class="done-title">${first ? `Welcome in,<br><em>${first}.</em>` : 'Welcome in.'}</h1>
      <p class="done-sub">Robes knows your taste now. Prompt a mood, or get dressed from what you already own.</p>
      <button class="done-cta">Enter Robes</button>
      <div class="done-dots">${Array(4).fill('<span class="done-dot on"></span>').join('')}</div>
    </div>`;
    ROOT.querySelector('.done-cta').addEventListener('click', finish);
  }

  function iconsHTML() {
    const pool = ICONS.filter(n => !state.icons.includes(n)).slice(0, 10);
    const selected = state.icons.map(n => `<span class="chip-solid">${n}<button class="chip-x" data-remove="${n}">×</button></span>`).join('');
    const browse = pool.map(n => `<button class="chip-ghost" data-add="${n}">${n}</button>`).join('');
    return `<div class="v1">
      <div class="v1-field"><input class="v1-input" id="icon-input" placeholder="Add a name…"><span class="v1-hint">Press <kbd>Enter</kbd> to add</span></div>
      <div class="v1-selected-head"><span class="ob-label">Your icons</span><span class="ob-tally">${state.icons.length}</span></div>
      ${state.icons.length === 0 ? '<p class="v1-empty">Nothing yet — tap a name below or type your own.</p>' : `<div class="chip-row">${selected}</div>`}
      <div class="v1-divider"></div>
      <div class="v1-pool-head"><span class="ob-label">Popular among stylists</span></div>
      <div class="chip-row">${browse}</div></div>`;
  }
  function colourHTML() {
    return `<div class="cl-list">${PALETTES.map((p,i)=>{const sel=state.palettes.includes(p.id);
      return `<button class="cl-row${sel?' is-sel':''}" data-palette="${p.id}">
        <span class="cl-num">${String(i+1).padStart(2,'0')}</span><span class="cl-swatches">${swatches(p.colors)}</span>
        <span class="cl-meta"><span class="cl-name">${p.name}</span><span class="cl-desc">${p.desc}</span></span>
        <span class="cl-check">✓</span></button>`;}).join('')}</div>`;
  }
  function budgetHTML() {
    return `<div class="bt-list">${TIERS.map(t=>{const sel=state.tier===t.id;
      return `<button class="bt-row${sel?' is-sel':''}" data-tier="${t.id}">
        <span class="bt-main"><span class="bt-name">${t.name}</span><span class="bt-examples">${t.examples}</span></span>
        <span class="bt-price">${t.price}</span><span class="bt-radio"></span></button>`;}).join('')}</div>`;
  }
  function splurgeHTML() {
    const cats = CATEGORIES.map(c=>{const sel=state.cats.includes(c);
      return `<button class="sp-cell${sel?' is-sel':''}" data-cat="${c}"><span class="sp-box">✓</span><span class="sp-label">${c}</span></button>`;}).join('');
    const spend = SPEND.map(s=>{const sel=state.spend===s.id;
      return `<button class="sd-row${!s.note?' sd-row-single':''}${sel?' is-sel':''}" data-spend="${s.id}"><span class="sd-amount">${s.amount}</span>${s.note?`<span class="sd-note">${s.note}</span>`:''}</button>`;}).join('');
    return `<div class="sp"><div class="sp-grid">${cats}</div><div class="cl-rule"></div>
      <div class="cl-section-head"><span class="ob-label">How much do you spend a year?</span></div><div class="sd-list">${spend}</div></div>`;
  }

  const STEPS = [
    { step:'Step 01 · Icons',   count:'01 / 04', progress:0.25, eyebrow:'Style',   title:'Who inspires <em>your style?</em>',           sub:'Add the people and brands whose style inspires you. The more you add, the faster Robes gets to know you.', bodyFn: iconsHTML },
    { step:'Step 02 · Colour',  count:'02 / 04', progress:0.50, eyebrow:'Colour',  title:'What colours <em>live in your wardrobe?</em>', sub:'Pick the palettes that feel like your closet — not what you wish was there.', bodyFn: colourHTML },
    { step:'Step 03 · Budget',  count:'03 / 04', progress:0.75, eyebrow:'Budget',  title:'How do you <em>mostly shop?</em>',            sub:'Pick the tier that feels most like your everyday wardrobe.', bodyFn: budgetHTML },
    { step:'Step 04 · Splurge', count:'04 / 04', progress:1.00, eyebrow:'Splurge', title:'Where do you <em>splurge?</em>',              sub:"Select every category you'll spend more on when you find the right piece.", bodyFn: splurgeHTML, continueLabel:'Unlock my style', showSkip:false },
  ];

  function renderStep(idx) {
    const cfg = STEPS[idx];
    ROOT.innerHTML = chrome(cfg, cfg.bodyFn());
    ROOT.querySelector('.ob-screen').classList.add('flow-anim');
    ROOT.querySelector('[data-action=back]').addEventListener('click', () => go(idx > 0 ? idx - 1 : 'name'));
    ROOT.querySelector('[data-action=next]').addEventListener('click', () => go(idx < 3 ? idx + 1 : 'done'));
    if (idx === 0) {
      wireIcons();
    } else if (idx === 1) {
      ROOT.querySelectorAll('[data-palette]').forEach(b => b.addEventListener('click', () => {
        const id = b.dataset.palette;
        if (state.palettes.includes(id)) state.palettes = state.palettes.filter(x => x !== id);
        else state.palettes.push(id);
        b.classList.toggle('is-sel', state.palettes.includes(id));
      }));
    } else if (idx === 2) {
      ROOT.querySelectorAll('[data-tier]').forEach(b => b.addEventListener('click', () => {
        state.tier = b.dataset.tier;
        ROOT.querySelectorAll('[data-tier]').forEach(x => x.classList.toggle('is-sel', x.dataset.tier === state.tier));
      }));
    } else if (idx === 3) {
      ROOT.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => {
        const c = b.dataset.cat;
        if (state.cats.includes(c)) state.cats = state.cats.filter(x => x !== c);
        else state.cats.push(c);
        b.classList.toggle('is-sel', state.cats.includes(c));
      }));
      ROOT.querySelectorAll('[data-spend]').forEach(b => b.addEventListener('click', () => {
        state.spend = b.dataset.spend;
        ROOT.querySelectorAll('[data-spend]').forEach(x => x.classList.toggle('is-sel', x.dataset.spend === state.spend));
      }));
    }
  }
  function wireIcons() {
    const input = ROOT.querySelector('#icon-input');
    if (input) {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const v = e.target.value.trim();
          if (v && !state.icons.includes(v)) state.icons.push(v);
          ROOT.querySelector('.ob-input-zone').innerHTML = iconsHTML(); wireIcons();
          ROOT.querySelector('#icon-input')?.focus();
        }
      });
    }
    ROOT.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => {
      if (!state.icons.includes(b.dataset.add)) state.icons.push(b.dataset.add);
      ROOT.querySelector('.ob-input-zone').innerHTML = iconsHTML(); wireIcons();
    }));
    ROOT.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => {
      state.icons = state.icons.filter(x => x !== b.dataset.remove);
      ROOT.querySelector('.ob-input-zone').innerHTML = iconsHTML(); wireIcons();
    }));
  }

  function render() {
    const s = state.stage;
    if (s === 'splash') renderSplash();
    else if (s === 'intro') renderIntro();
    else if (s === 'name') renderName();
    else if (s === 'done') renderDone();
    else renderStep(s);
  }

  window.RobesOnboarding = {
    start(opts = {}) {
      onComplete = opts.onComplete || null;
      if (opts.name) state.name = opts.name;
      state.stage = 'splash';
      ROOT.classList.remove('hidden');
      ROOT.style.opacity = '';
      render();
    },
  };
})();
