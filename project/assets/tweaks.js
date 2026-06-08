/* ROBES — Tweaks: host protocol + live application */
(function () {
  const DEFAULTS = { accent:'#8E7077', name:'Annie', genTime:2200, weather:true };
  const ACCENTS = [
    ['#8E7077','Rose'], ['#7E7C5A','Sage'], ['#C9725C','Clay'], ['#A4453A','Terracotta'],
  ];
  let t = { ...DEFAULTS };
  try { const s = JSON.parse(localStorage.getItem('robes-tweaks') || '{}'); t = { ...t, ...s }; } catch (e) {}

  const panel = document.getElementById('tw-panel');

  function persist() {
    localStorage.setItem('robes-tweaks', JSON.stringify(t));
    try { window.parent.postMessage({ type:'__edit_mode_set_keys', edits:t }, '*'); } catch (e) {}
  }
  function apply() {
    document.documentElement.style.setProperty('--rose', t.accent);
    document.documentElement.style.setProperty('--rose-bg', hexA(t.accent, 0.16));
    document.documentElement.style.setProperty('--rose-mid', hexA(t.accent, 0.5));
    if (window.App && App.setGenTime) App.setGenTime(t.genTime);
    if (window.App && App.setName && t.name) App.setName(t.name);
    document.getElementById('nav-weather').style.display = t.weather ? '' : 'none';
  }
  function hexA(hex, a) {
    const n = hex.replace('#',''); const r=parseInt(n.slice(0,2),16),g=parseInt(n.slice(2,4),16),b=parseInt(n.slice(4,6),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function render() {
    panel.innerHTML = `
      <div class="tw-hd"><span class="tw-title">Tweaks</span><button class="tw-close" id="tw-close">×</button></div>
      <div class="tw-row">
        <span class="tw-label">Inspire accent</span>
        <div class="tw-swatches">${ACCENTS.map(([c,n]) => `<button class="tw-sw${t.accent===c?' on':''}" title="${n}" data-accent="${c}" style="background:${c}"></button>`).join('')}</div>
      </div>
      <div class="tw-row">
        <span class="tw-label">Your name</span>
        <input class="tw-input" id="tw-name" value="${t.name}" placeholder="Name">
      </div>
      <div class="tw-row">
        <span class="tw-label">Generation time <span class="tw-rangeval" id="tw-gt">${(t.genTime/1000).toFixed(1)}s</span></span>
        <input class="tw-range" id="tw-range" type="range" min="600" max="4000" step="200" value="${t.genTime}">
      </div>
      <div class="tw-row tw-toggle">
        <span class="tw-label" style="margin:0">Weather in nav</span>
        <div class="tw-switch${t.weather?' on':''}" id="tw-weather"></div>
      </div>
      <div class="tw-divider"></div>
      <button class="tw-btn" id="tw-replay">Replay onboarding</button>`;
    wire();
  }
  function wire() {
    panel.querySelectorAll('[data-accent]').forEach(b => b.addEventListener('click', () => {
      t.accent = b.dataset.accent; apply(); persist(); render();
    }));
    panel.querySelector('#tw-name').addEventListener('input', e => { t.name = e.target.value; apply(); persist(); });
    const range = panel.querySelector('#tw-range');
    range.addEventListener('input', e => { t.genTime = +e.target.value; panel.querySelector('#tw-gt').textContent = (t.genTime/1000).toFixed(1)+'s'; apply(); persist(); });
    panel.querySelector('#tw-weather').addEventListener('click', () => { t.weather = !t.weather; apply(); persist(); render(); });
    panel.querySelector('#tw-replay').addEventListener('click', () => { if (window.App) App.replayOnboarding(); });
    panel.querySelector('#tw-close').addEventListener('click', dismiss);
  }
  function dismiss() { panel.classList.remove('open'); try { window.parent.postMessage({ type:'__edit_mode_dismissed' }, '*'); } catch (e) {} }

  window.addEventListener('message', e => {
    const ty = e?.data?.type;
    if (ty === '__activate_edit_mode') { render(); panel.classList.add('open'); }
    else if (ty === '__deactivate_edit_mode') panel.classList.remove('open');
  });

  // apply persisted tweaks on load (after App init)
  function boot() { apply(); try { window.parent.postMessage({ type:'__edit_mode_available' }, '*'); } catch (e) {} }
  if (document.readyState !== 'loading') setTimeout(boot, 0); else document.addEventListener('DOMContentLoaded', boot);
})();
