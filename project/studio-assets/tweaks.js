/* ROBES STUDIO — Tweaks: host protocol + live application */
(function () {
  const DEFAULTS = { accent:'#9C5B43', layout:'editorial', acq:0, powered:'standard' };
  const ACCENTS = [
    ['#9C5B43','Terracotta'], ['#7E7C5A','Sage'], ['#8C7A86','Mauve'], ['#5A4636','Cocoa'], ['#3C3B38','Charcoal'],
  ];
  const LAYOUTS = [['editorial','Editorial'],['gallery','Gallery'],['stack','Stack']];
  const POWERED = [['standard','Clear'],['subtle','Quiet'],['hide','Off']];
  const ACQ = [['0','Yours to keep'],['1','In your pocket'],['2','No more chaos']];

  let t = { ...DEFAULTS };
  try { const s = JSON.parse(localStorage.getItem('robes-studio-tweaks') || '{}'); t = { ...t, ...s }; } catch (e) {}

  const panel = document.getElementById('tw-panel');

  // extra control styles (segmented + select) layered on tweaks.css
  const style = document.createElement('style');
  style.textContent = `
    .tw-seg{display:flex;gap:3px;padding:3px;background:var(--cream-100);border-radius:100px}
    .tw-seg button{flex:1;padding:7px 6px;border-radius:100px;font-size:11px;font-weight:500;color:var(--ink-soft);transition:all .15s}
    .tw-seg button.on{background:#fff;color:var(--ink);border:0.5px solid var(--rule-mid)}
    .tw-select{width:100%;padding:9px 12px;border:0.5px solid var(--rule-mid);border-radius:var(--rad-sm);background:#fff;
      font-family:var(--font-sans);font-size:12.5px;color:var(--ink);outline:none;cursor:pointer}
    .tw-note{font-size:10.5px;color:var(--ink-faint);line-height:1.45;margin-top:8px}`;
  document.head.appendChild(style);

  function hexA(hex, a) {
    const n = hex.replace('#',''); const r=parseInt(n.slice(0,2),16),g=parseInt(n.slice(2,4),16),b=parseInt(n.slice(4,6),16);
    return `rgba(${r},${g},${b},${a})`;
  }
  function persist() {
    localStorage.setItem('robes-studio-tweaks', JSON.stringify(t));
    try { window.parent.postMessage({ type:'__edit_mode_set_keys', edits:t }, '*'); } catch (e) {}
  }
  function apply() {
    const r = document.documentElement.style;
    r.setProperty('--brand', t.accent);
    r.setProperty('--brand-bg', hexA(t.accent, 0.10));
    r.setProperty('--brand-mid', hexA(t.accent, 0.5));
    r.setProperty('--brand-tint', hexA(t.accent, 0.06));
    if (window.Studio) { Studio.setLayout(t.layout); Studio.setAcq(t.acq); Studio.setPowered(t.powered); }
  }

  function render() {
    panel.innerHTML = `
      <div class="tw-hd"><span class="tw-title">Tweaks</span><button class="tw-close" id="tw-close">×</button></div>
      <div class="tw-row">
        <span class="tw-label">Stylist brand colour</span>
        <div class="tw-swatches">${ACCENTS.map(([c,n]) => `<button class="tw-sw${t.accent===c?' on':''}" title="${n}" data-accent="${c}" style="background:${c}"></button>`).join('')}</div>
      </div>
      <div class="tw-row">
        <span class="tw-label">Moodboard layout</span>
        <div class="tw-seg" id="tw-layout">${LAYOUTS.map(([v,l]) => `<button class="${t.layout===v?'on':''}" data-layout="${v}">${l}</button>`).join('')}</div>
      </div>
      <div class="tw-row">
        <span class="tw-label">Invitation framing</span>
        <select class="tw-select" id="tw-acq">${ACQ.map(([v,l]) => `<option value="${v}"${String(t.acq)===v?' selected':''}>${l}</option>`).join('')}</select>
        <div class="tw-note">How the client is invited to claim their wardrobe on Robes.</div>
      </div>
      <div class="tw-row">
        <span class="tw-label">“Powered by Robes”</span>
        <div class="tw-seg" id="tw-powered">${POWERED.map(([v,l]) => `<button class="${t.powered===v?'on':''}" data-powered="${v}">${l}</button>`).join('')}</div>
      </div>
      <div class="tw-divider"></div>
      <button class="tw-btn" id="tw-preview">Preview as client</button>`;
    wire();
  }
  function wire() {
    panel.querySelectorAll('[data-accent]').forEach(b => b.addEventListener('click', () => { t.accent = b.dataset.accent; apply(); persist(); render(); }));
    panel.querySelectorAll('#tw-layout button').forEach(b => b.addEventListener('click', () => { t.layout = b.dataset.layout; apply(); persist(); render(); }));
    panel.querySelectorAll('#tw-powered button').forEach(b => b.addEventListener('click', () => { t.powered = b.dataset.powered; apply(); persist(); render(); }));
    panel.querySelector('#tw-acq').addEventListener('change', e => { t.acq = +e.target.value; apply(); persist(); });
    panel.querySelector('#tw-preview').addEventListener('click', () => { if (window.Studio) Studio.openPreview(); });
    panel.querySelector('#tw-close').addEventListener('click', dismiss);
  }
  function dismiss() { panel.classList.remove('open'); try { window.parent.postMessage({ type:'__edit_mode_dismissed' }, '*'); } catch (e) {} }

  window.addEventListener('message', e => {
    const ty = e?.data?.type;
    if (ty === '__activate_edit_mode') { render(); panel.classList.add('open'); }
    else if (ty === '__deactivate_edit_mode') panel.classList.remove('open');
  });

  function boot() { apply(); try { window.parent.postMessage({ type:'__edit_mode_available' }, '*'); } catch (e) {} }
  if (document.readyState !== 'loading') setTimeout(boot, 0); else document.addEventListener('DOMContentLoaded', boot);
})();
