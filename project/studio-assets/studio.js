/* ROBES STUDIO — workspace logic */
const Studio = (function () {
  const D = window.STUDIO_DATA;
  const $ = id => document.getElementById(id);
  const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  let cur = null;        // current client
  let curLook = null;    // look open in builder/preview
  let builderIds = [];   // piece ids in the capsule
  let clientFilter = 'All';
  let catFilter = 'All';

  // tweak-driven state
  const tw = { layout:'editorial', acq:0, powered:'standard' };

  /* ── visuals ─────────────────────────────────────────────── */
  function pieceVisual(p) {
    if (p && p.img) return `<img src="${p.img}" style="object-position:${p.pos||'50% 50%'}" alt="${esc(p.name)}">`;
    return `<div class="mb-sw" style="background-color:${(p&&p.sw)||'#D8CFC0'}"></div>`;
  }
  function tileVisual(p, swClass) {
    if (p.img) return `<img src="${p.img}" style="object-position:${p.pos||'50% 50%'}" alt="${esc(p.name)}">`;
    return `<div class="${swClass}" style="background-color:${p.sw||'#D8CFC0'}"></div>`;
  }
  function pieceById(client, id) { return (client.wardrobe || []).find(p => p.id === id); }
  function lookPieces(client, look) { return (look.pieceIds || []).map(id => pieceById(client, id)).filter(Boolean); }

  /* ── VIEW SWITCHING ──────────────────────────────────────── */
  const VIEWS = ['clients','lookbooks','brand','client','builder'];
  const NAV = { clients:'nav-clients', lookbooks:'nav-lookbooks', brand:'nav-brand' };
  let crumbStack = [];

  function go(name, opts) {
    opts = opts || {};
    VIEWS.forEach(v => $('v-' + v).classList.toggle('active', v === name));
    Object.values(NAV).forEach(id => $(id) && $(id).classList.remove('active'));
    if (NAV[name]) $(NAV[name]).classList.add('active');
    // builder is full-bleed → collapse rail
    $('shell').style.gridTemplateColumns = (name === 'builder') ? '1fr' : '';
    $('sidenav').style.display = (name === 'builder') ? 'none' : '';
    // breadcrumb
    const showCrumb = (name === 'client' || name === 'builder');
    $('tb-crumb').classList.toggle('show', showCrumb);
    if (showCrumb) $('tb-crumb-label').textContent = opts.crumb || 'Back';
    $('workspace').scrollTop = 0;
    window.scrollTo(0, 0);
    closeAvatar();
  }
  function back() {
    if ($('v-builder').classList.contains('active') && cur) openClient(cur.id);
    else go('clients');
  }

  /* ── CLIENTS DASHBOARD ───────────────────────────────────── */
  function renderClients() {
    const cs = D.clients;
    const onRobes = cs.filter(c => c.onRobes).length;
    const shared = cs.reduce((n,c) => n + (c.looks||[]).filter(l=>l.status==='shared').length, 0);
    $('stat-strip').innerHTML = `
      <div class="stat"><div class="stat-n">${cs.length}</div><div class="stat-l">Active clients</div></div>
      <div class="stat"><div class="stat-n">${shared}</div><div class="stat-l">Moodboards delivered</div></div>
      <div class="stat accent"><div class="stat-n">${onRobes}<span class="u">/ ${cs.length}</span></div><div class="stat-l"><b>now on Robes</b> — claimed their wardrobe</div></div>`;

    const filters = ['All','Active','Invited','Draft'];
    $('client-filters').innerHTML = filters.map(f => {
      const c = f === 'All' ? cs.length : cs.filter(x => x.status === f.toLowerCase()).length;
      return `<button class="fpill${f===clientFilter?' active':''}" onclick="Studio.filterClients('${f}')">${f}<span class="c">${c}</span></button>`;
    }).join('');

    const list = cs.filter(c => clientFilter === 'All' || c.status === clientFilter.toLowerCase());
    const statusLabel = { active:'Active', invited:'Invited', draft:'Onboarding' };
    $('client-grid').innerHTML = list.map(c => {
      const thumbs = (c.thumbs && c.thumbs.length)
        ? c.thumbs.map(t => `<div class="cc-thumb"><img src="${t}" alt=""></div>`).join('')
        : (c.swThumbs||[]).map(s => `<div class="cc-thumb"><div class="mb-sw" style="background-color:${s}"></div></div>`).join('');
      const robes = c.onRobes
        ? `<span class="cc-onrobes"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>On Robes</span>`
        : (c.status==='invited' ? `<span class="cc-pending">Invite sent</span>` : `<span class="cc-pending">Not invited</span>`);
      return `<button class="client-card" onclick="Studio.openClient('${c.id}')">
        <div class="cc-top">
          <div class="cc-av" style="background:${c.tone}">${c.initials}</div>
          <div class="cc-id"><div class="cc-name">${esc(c.name)}</div><div class="cc-aesthetic">${esc(c.aesthetic)}</div></div>
          <span class="cc-status ${c.status}">${statusLabel[c.status]}</span>
        </div>
        <div class="cc-thumbs">${thumbs}</div>
        <div class="cc-foot">
          <span class="cc-meta">${c.wardrobe.length} pieces<span class="dot"></span>${(c.looks||[]).length} lookbook${(c.looks||[]).length===1?'':'s'}</span>
          ${robes}
        </div>
      </button>`;
    }).join('') + `<button class="client-add" onclick="Studio.newClient()">
        <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span>Add a client</span></button>`;
  }
  function filterClients(f) { clientFilter = f; renderClients(); }

  /* ── ALL LOOKBOOKS ───────────────────────────────────────── */
  function renderAllLookbooks() {
    const rows = [];
    D.clients.forEach(c => (c.looks||[]).forEach(l => rows.push({ c, l })));
    const filters = ['All','Shared','Drafts'];
    $('lb-filters').innerHTML = filters.map((f,i) =>
      `<button class="fpill${i===0?' active':''} lbf" data-f="${f}" onclick="Studio.filterAllLb(this,'${f}')">${f}</button>`).join('');
    paintLookbooks('all-lb-grid', rows, true);
  }
  function filterAllLb(btn, f) {
    document.querySelectorAll('.lbf').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const rows = [];
    D.clients.forEach(c => (c.looks||[]).forEach(l => {
      if (f === 'All' || (f === 'Shared' && l.status==='shared') || (f === 'Drafts' && l.status==='draft')) rows.push({ c, l });
    }));
    paintLookbooks('all-lb-grid', rows, true);
  }
  function paintLookbooks(hostId, rows, showClient) {
    $(hostId).innerHTML = rows.map(({ c, l }) => {
      const pcs = lookPieces(c, l).slice(0, 4);
      const cover = pcs.length >= 4
        ? `<div class="lb-cover g4">${pcs.map((p,i) => `<div class="lc${i}">${tileVisual(p,'lc-sw')}</div>`).join('')}</div>`
        : `<div class="lb-cover">${(pcs[0]?tileVisual(pcs[0],'lc-sw'):'')}</div>`;
      const statusTag = l.status==='shared'
        ? `<span class="lb-status shared">Shared</span>` : `<span class="lb-status draft">Draft</span>`;
      const views = l.status==='shared'
        ? `<span class="lb-views"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>${l.views} view${l.views===1?'':'s'}</span>`
        : `<span class="lb-views">Not sent</span>`;
      return `<button class="lb-card" onclick="Studio.openBuilder('${c.id}','${l.id}')">
        <div class="lb-cover-wrap" style="position:relative">${cover}${statusTag}</div>
        <div class="lb-body">
          <div class="lb-title">${esc(l.title)}</div>
          <div class="lb-occ">${showClient ? esc(c.name) + ' · ' : ''}${esc(l.occ)}</div>
          <div class="lb-foot"><span class="lb-count">${(l.pieceIds||[]).length} pieces</span>${views}</div>
        </div>
      </button>`;
    }).join('');
  }

  /* ── CLIENT DETAIL ───────────────────────────────────────── */
  function openClient(id) {
    cur = D.clients.find(c => c.id === id);
    catFilter = 'All';
    renderClientHead();
    clientTab('wardrobe');
    go('client', { crumb:'Clients' });
  }
  function renderClientHead() {
    const c = cur;
    const statusLabel = { active:'Active', invited:'Invited', draft:'Onboarding' };
    $('cd-head').innerHTML = `
      <div class="cd-av" style="background:${c.tone}">${c.initials}</div>
      <div class="cd-id">
        <h1 class="cd-name">${esc(c.name)}</h1>
        <div class="cd-sub">
          <span>${esc(c.aesthetic)}</span><span class="dot"></span>
          <span>${esc(c.location)}</span><span class="dot"></span>
          <span>Client since ${esc(c.since)}</span>
          <span class="cc-status ${c.status}">${statusLabel[c.status]}</span>
          ${c.onRobes ? `<span class="cc-onrobes"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>On Robes</span>` : ''}
        </div>
      </div>
      <div class="cd-actions">
        <button class="btn btn-ghost" onclick="Studio.toast('Wardrobe export — not in this prototype')"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
        <button class="btn btn-dark" onclick="Studio.newLookbook()"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New lookbook</button>
      </div>`;
    $('cdt-wardrobe-c').textContent = c.wardrobe.length;
    $('cdt-lookbooks-c').textContent = (c.looks||[]).length;
  }
  function clientTab(tab) {
    ['wardrobe','lookbooks','notes'].forEach(t => {
      $('cdt-' + t).classList.toggle('active', t === tab);
      $('cdp-' + t).classList.toggle('active', t === tab);
    });
    if (tab === 'wardrobe') renderCatalogue();
    if (tab === 'lookbooks') {
      if ((cur.looks||[]).length) paintLookbooks('client-lb-grid', cur.looks.map(l => ({ c:cur, l })), false);
      $('client-lb-grid').innerHTML += `<button class="lb-add" onclick="Studio.newLookbook()">
        <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>New lookbook</span></button>`;
    }
    if (tab === 'notes') renderNotes();
  }
  const CATS = ['All','Outerwear','Tops','Bottoms','Dresses','Shoes','Bags','Accessories'];
  function renderCatalogue() {
    const counts = {};
    cur.wardrobe.forEach(p => counts[p.cat] = (counts[p.cat]||0)+1);
    $('cat-filters').innerHTML = CATS.filter(f => f==='All' || counts[f]).map(f => {
      const n = f==='All' ? cur.wardrobe.length : counts[f];
      return `<button class="fpill${f===catFilter?' active':''}" onclick="Studio.filterCat('${f}')">${f}<span class="c">${n}</span></button>`;
    }).join('');
    const items = cur.wardrobe.filter(p => catFilter==='All' || p.cat===catFilter);
    $('cat-grid').innerHTML = items.map(p => `
      <div class="cat-item" onclick="Studio.toast('${esc(p.name)} · ${esc(p.brand)}')">
        <div class="cat-imgwrap">
          ${tileVisual(p,'cat-swatch')}
          <span class="cat-cat">${p.cat}</span>
        </div>
        <div class="cat-info"><div class="cat-name">${esc(p.name)}</div><div class="cat-brand">${esc(p.brand)} · ${p.wears===0?'New':p.wears+'× worn'}</div></div>
      </div>`).join('') + `
      <button class="cat-add" onclick="Studio.toast('Photograph, upload, or pull from a website')">
        <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span>Add a piece</span></button>`;
  }
  function filterCat(f) { catFilter = f; renderCatalogue(); }
  function renderNotes() {
    $('notes-list').innerHTML = (cur.notes||[]).map(n => `
      <div class="note-card">
        <div class="note-meta">${esc(n.meta)}</div>
        <div class="note-body">${n.body}</div>
        ${(n.tags&&n.tags.length)?`<div class="note-tags">${n.tags.map(t=>`<span class="note-tag">${esc(t)}</span>`).join('')}</div>`:''}
      </div>`).join('');
  }

  /* ── LOOKBOOK BUILDER ────────────────────────────────────── */
  function openBuilder(clientId, lookId) {
    cur = D.clients.find(c => c.id === clientId);
    curLook = (cur.looks||[]).find(l => l.id === lookId) || null;
    builderIds = curLook ? [...curLook.pieceIds] : [];
    $('cv-title').value = curLook ? curLook.title : '';
    $('cv-occ').value = curLook ? curLook.occ : '';
    $('set-note').value = (curLook && curLook.note) || `Pulled this together for ${cur.name.split(' ')[0]} — every piece works back to the others. — E`;
    $('bld-ward-name').textContent = cur.name.split(' ')[0] + "'s wardrobe";
    $('pv-link').textContent = `my-robes.com/elodie/${cur.id}`;
    renderTray(); renderCanvas(); updateAcqPreview();
    go('builder', { crumb: cur.name });
  }
  function newLookbook() { openBuilder(cur.id, null); }

  function renderTray() {
    $('bld-tray').innerHTML = cur.wardrobe.map(p => {
      const inSet = builderIds.includes(p.id);
      return `<div class="tray-item${inSet?' in':''}" onclick="Studio.togglePiece('${p.id}')">
        <div class="tray-imgwrap">${tileVisual(p,'tray-sw')}
          <div class="tray-plus"><svg viewBox="0 0 24 24">${inSet?'<polyline points="20 6 9 17 4 12"/>':'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'}</svg></div>
        </div>
        <div class="tray-nm">${esc(p.name)}</div>
      </div>`;
    }).join('');
  }
  function renderCanvas() {
    const pcs = builderIds.map(id => pieceById(cur, id)).filter(Boolean);
    $('cv-counter').textContent = `${pcs.length} piece${pcs.length===1?'':'s'}`;
    if (!pcs.length) {
      $('cv-grid').innerHTML = `<div class="canvas-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        <span>Tap pieces from ${esc(cur.name.split(' ')[0])}'s wardrobe to build the capsule.</span></div>`;
      return;
    }
    $('cv-grid').innerHTML = pcs.map(p => `
      <div class="cv-item">
        <div class="cv-imgwrap">
          ${tileVisual(p,'cv-sw')}
          ${p.own?'<span class="cv-own"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Hers</span>':''}
          <button class="cv-rm" onclick="Studio.togglePiece('${p.id}')"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div class="cv-nm">${esc(p.name)}</div><div class="cv-meta">${esc(p.brand)}</div>
      </div>`).join('');
  }
  function togglePiece(id) {
    const i = builderIds.indexOf(id);
    if (i >= 0) builderIds.splice(i, 1); else builderIds.push(id);
    renderTray(); renderCanvas();
  }

  /* ── ACQUISITION COPY VARIANTS (tweakable) ───────────────── */
  const ACQ = [
    { ey:'Yours to keep', ttl:'This wardrobe is <em>yours now.</em>',
      sub:'Every piece Elodie styled, saved in one place. Add to it, restyle it, take it anywhere — free on Robes.',
      cta:'Claim my wardrobe', fine:'Free forever · no card needed' },
    { ey:'Carry it with you', ttl:'Your wardrobe, <em>in your pocket.</em>',
      sub:'Everything from this moodboard, ready whenever you are. Dress from what you own, wherever you are.',
      cta:'Open in Robes', fine:'Free · works on any phone' },
    { ey:'Never a screenshot again', ttl:'Keep the thread, <em>not the chaos.</em>',
      sub:'No more saved photos and scattered notes. Your whole wardrobe, styled and searchable, in one place.',
      cta:'Save to Robes', fine:'Free · set up in a minute' },
  ];
  function updateAcqPreview() {
    const a = ACQ[tw.acq];
    if ($('set-acq-preview')) $('set-acq-preview').innerHTML = `“${a.ttl.replace(/<\/?em>/g,'')}” → <b style="color:var(--brand)">${a.cta}</b>`;
  }

  /* ── CLIENT MOODBOARD (shared link) ──────────────────────── */
  function renderMoodboard() {
    if (!cur) return;
    const pcs = builderIds.map(id => pieceById(cur, id)).filter(Boolean);
    const title = $('cv-title').value || 'Untitled lookbook';
    const occ = $('cv-occ').value || '';
    const note = $('set-note').value || '';
    const a = ACQ[tw.acq];
    const ownCount = pcs.filter(p => p.own).length;
    const occParts = occ.split('·').map(s => s.trim()).filter(Boolean);

    // cell rhythm for editorial layout
    const cells = pcs.map((p, i) => {
      let extra = '';
      if (tw.layout === 'editorial') {
        if (i === 0) extra = ' wide tall';
        else if (i % 5 === 4) extra = ' wide';
      }
      const cap = p.img || p.sw
        ? `<div class="mb-cell-cap"><div class="nm">${esc(p.name)}</div><div class="br">${esc(p.brand)}</div></div>` : '';
      const own = p.own ? `<span class="mb-cell-own"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Hers</span>` : '';
      return `<div class="mb-cell${extra}">${tileVisual(p,'mb-sw')}${own}${cap}</div>`;
    }).join('');

    const poweredCls = tw.powered === 'hide' ? 'hide' : (tw.powered === 'subtle' ? 'subtle' : '');
    const stylist = D.stylist;

    $('mb-root').className = `mb layout-${tw.layout}`;
    $('mb-root').innerHTML = `
      <div class="mb-cobar">
        <div class="mb-cobar-l">
          <div class="mb-colon">${stylist.mark}</div>
          <div><div class="mb-coname">${esc(stylist.name)}</div><div class="mb-cosub">${esc(stylist.tagline)}</div></div>
        </div>
        <div class="mb-powered ${poweredCls}">Powered by <span class="pw-mark">Robes</span></div>
      </div>

      <div class="mb-hero">
        <div class="mb-hero-ey">A moodboard for ${esc(cur.name.split(' ')[0])}</div>
        <h1 class="mb-hero-ttl">${esc(title)}</h1>
        ${occParts.length?`<div class="mb-hero-meta">${occParts.map((o,i)=>`${i?'<span class="dot"></span>':''}<span>${esc(o)}</span>`).join('')}</div>`:''}
        ${note?`<p class="mb-note">${esc(note.replace(/—\s*E\s*$/,'').trim())}<span class="mb-note-sig">${esc(stylist.name)}</span></p>`:''}
      </div>

      <div class="mb-pieces">
        <div class="mb-grid">${cells}</div>
      </div>

      <div class="mb-acq">
        <div class="mb-acq-ey">${a.ey}</div>
        <h2 class="mb-acq-ttl">${a.ttl}</h2>
        <p class="mb-acq-sub">${esc(a.sub)}</p>
        <button class="mb-acq-cta" onclick="Studio.toast('This is where the client signs up — free Robes account')">${a.cta}
          <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>
        <div class="mb-acq-fine">${a.fine}</div>
        <div class="mb-acq-steps">
          <div class="acq-step"><span class="n">1</span>Claim your wardrobe</div>
          <span class="acq-arrow">→</span>
          <div class="acq-step"><span class="n">2</span>${ownCount} pieces already loaded</div>
          <span class="acq-arrow">→</span>
          <div class="acq-step"><span class="n">3</span>Style yourself, any day</div>
        </div>
      </div>

      <div class="mb-foot">
        <div class="mb-foot-l">Styled by ${esc(stylist.name)} · ${esc(stylist.tagline)}</div>
        <div class="mb-foot-r">Powered by <span class="pw-mark">Robes</span></div>
      </div>`;
  }
  function openPreview() {
    renderMoodboard();
    $('preview-stage').classList.add('open');
  }
  function closePreview() { $('preview-stage').classList.remove('open'); }
  function pvDevice(d) {
    $('pv-frame').classList.toggle('mobile', d === 'mobile');
    $('pv-desktop').classList.toggle('active', d === 'desktop');
    $('pv-mobile').classList.toggle('active', d === 'mobile');
  }

  /* ── MODALS / TOAST / MENU ───────────────────────────────── */
  function openShare() { renderMoodboard(); $('share-sheet').classList.add('open'); }
  function closeSheet(id) { $(id).classList.remove('open'); }
  function copyLink() {
    const b = $('copy-btn'); b.textContent = 'Copied'; setTimeout(() => b.textContent = 'Copy', 1600);
    toast('Link copied to clipboard');
  }
  function sendMoodboard() { closeSheet('share-sheet'); toast(`Moodboard sent to ${cur ? cur.name.split(' ')[0] : 'your client'}`); }
  function newClient() { $('nc-name').value = ''; $('nc-aesthetic').value = ''; $('newclient-sheet').classList.add('open'); }
  function createClient() {
    const name = $('nc-name').value.trim() || 'New client';
    closeSheet('newclient-sheet');
    toast(`${name} added — invite sent to start her wardrobe`);
  }
  let toastT;
  function toast(msg) {
    $('toast-msg').textContent = msg;
    $('toast').classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => $('toast').classList.remove('show'), 2600);
  }
  function toggleAvatar(e) { e.stopPropagation(); $('av-menu').classList.toggle('open'); }
  function closeAvatar() { $('av-menu').classList.remove('open'); }
  document.addEventListener('click', e => { if (!e.target.closest('.av-wrap')) closeAvatar(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePreview(); closeSheet('share-sheet'); closeSheet('newclient-sheet'); } });

  /* ── TWEAK HOOKS ─────────────────────────────────────────── */
  function setLayout(v) { tw.layout = v; if ($('preview-stage').classList.contains('open')) renderMoodboard(); }
  function setAcq(i) { tw.acq = +i; updateAcqPreview(); if ($('preview-stage').classList.contains('open')) renderMoodboard(); }
  function setPowered(v) { tw.powered = v; if ($('preview-stage').classList.contains('open')) renderMoodboard(); }
  function getTw() { return { ...tw }; }

  /* ── BOOT ────────────────────────────────────────────────── */
  function init() {
    renderClients();
    renderAllLookbooks();
    renderBrand();
    // prime builder context to Sophie / Wimbledon so Preview works from the get-go
    cur = D.clients[0];
    curLook = cur.looks[0];
    builderIds = [...curLook.pieceIds];
    updateAcqPreview();
  }

  /* brand kit page */
  function renderBrand() {
    const s = D.stylist;
    $('brand-wrap').innerHTML = `
      <div class="page-head"><div><div class="ph-eyebrow">White-label</div><h1 class="ph-title">Your brand</h1></div></div>
      <p style="max-width:560px;font-size:14px;line-height:1.7;color:var(--ink-soft);margin-bottom:30px">Every moodboard goes out under your name. Robes signs quietly at the foot — and turns each delivery into a new Robes user, on your client list.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:760px">
        <div class="note-card" style="margin:0">
          <div class="note-meta">Studio mark</div>
          <div style="display:flex;align-items:center;gap:14px;margin-top:6px">
            <div class="sn-logo" style="width:52px;height:52px;font-size:24px">${s.mark}</div>
            <div><div style="font-size:15px;font-weight:500;color:var(--ink)">${esc(s.name)}</div><div style="font-size:12px;color:var(--ink-faint);margin-top:2px">${esc(s.tagline)}</div></div>
          </div>
        </div>
        <div class="note-card" style="margin:0">
          <div class="note-meta">Brand colour</div>
          <p style="font-size:12.5px;color:var(--ink-soft);margin:6px 0 12px;line-height:1.5">Sets your accent across moodboards. Change it under Tweaks.</p>
          <div style="display:flex;align-items:center;gap:10px"><span style="width:30px;height:30px;border-radius:50%;background:var(--brand);box-shadow:0 0 0 1px var(--rule-mid)"></span><span style="font-size:12px;color:var(--ink-soft)" id="brand-hex">Terracotta</span></div>
        </div>
        <div class="note-card" style="margin:0;grid-column:1/-1">
          <div class="note-meta">Footer signature</div>
          <p style="font-size:12.5px;color:var(--ink-soft);margin:6px 0 0;line-height:1.6">Your moodboards close with <em>Styled by ${esc(s.name)}</em> and a quiet <em>Powered by Robes</em>. Adjust how prominent Robes is under Tweaks — it's also the link that lets your client claim their wardrobe.</p>
        </div>
      </div>`;
  }

  return {
    go, back, openClient, clientTab, filterClients, filterCat, filterAllLb,
    openBuilder, newLookbook, togglePiece, openPreview, closePreview, pvDevice,
    openShare, closeSheet, copyLink, sendMoodboard, newClient, createClient,
    toast, toggleAvatar, setLayout, setAcq, setPowered, getTw, init,
  };
})();
window.Studio = Studio;
document.addEventListener('DOMContentLoaded', Studio.init);
