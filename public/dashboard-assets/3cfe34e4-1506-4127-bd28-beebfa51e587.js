/* ══════════════════════════════════════════════════════════════════
   ROBES — Add to wardrobe modal logic
   Collects a piece and hands it to App.addPiece().
   ══════════════════════════════════════════════════════════════════ */
window.WA = (function () {
  const $ = (id) => document.getElementById(id);
  const st = { photo: null, colour: null };
  let onAdded = null;

  const SWATCHES = [
    { hex: '#F3EFE7', name: 'Cream', light: true },
    { hex: '#D9CFC0', name: 'Oat', light: true },
    { hex: '#B79A6F', name: 'Sand' },
    { hex: '#A9885A', name: 'Camel' },
    { hex: '#B7B58E', name: 'Sage', light: true },
    { hex: '#7E7C5A', name: 'Olive' },
    { hex: '#E8D5D2', name: 'Blush', light: true },
    { hex: '#D4C8C4', name: 'Mauve', light: true },
    { hex: '#8E7077', name: 'Rosewood' },
    { hex: '#7C3B3B', name: 'Oxblood' },
    { hex: '#A0522D', name: 'Rust' },
    { hex: '#5A4632', name: 'Chocolate' },
    { hex: '#2B3550', name: 'Navy' },
    { hex: '#5A6B82', name: 'Denim' },
    { hex: '#9A9694', name: 'Grey' },
    { hex: '#3A3A3C', name: 'Charcoal' },
    { hex: '#202021', name: 'Black' },
    { hex: '#F7F4EF', name: 'White', light: true },
    { hex: '#FF2D78', name: 'Neon pink' },
    { hex: '#39FF14', name: 'Neon green', light: true },
    { hex: '#2D6CFF', name: 'Electric blue' },
    { hex: '#E5FF00', name: 'Neon yellow', light: true },
    { hex: '#FF6A00', name: 'Neon orange' },
    { hex: '#C9A24B', name: 'Multi-colour', css: 'conic-gradient(from 90deg,#E8514F,#E6A23C,#E5D44A,#5BAE6E,#3D7BD6,#8E5AC8,#E8514F)' },
    { hex: '#A9885A', name: 'Print', css: 'repeating-linear-gradient(45deg,#C9B79A 0 5px,#7E7C5A 5px 10px)' },
  ];

  function renderSwatches() {
    const host = $('wa-swatches');
    if (!host || host.dataset.built) return;
    host.innerHTML = SWATCHES.map((s, i) =>
      `<button type="button" class="wa-sw${s.light ? ' light' : ''}" style="background:${s.css || s.hex}"
        title="${s.name}" aria-label="${s.name}"
        onmouseenter="WA.hover(${i})" onmouseleave="WA.hover(-1)" onfocus="WA.hover(${i})" onblur="WA.hover(-1)"
        onclick="WA.pickColour(${i})"></button>`).join('');
    host.dataset.built = '1';
  }
  function pickColour(i) {
    const s = SWATCHES[i];
    st.colour = s;
    [...document.querySelectorAll('#wa-swatches .wa-sw')].forEach((el, n) => el.classList.toggle('sel', n === i));
    $('wa-sw-name').textContent = s.name;
    validate();
  }
  function hover(i) {
    $('wa-sw-name').textContent = i >= 0 ? SWATCHES[i].name : (st.colour ? st.colour.name : '');
  }

  function open(cb) {
    onAdded = (typeof cb === 'function') ? cb : null;
    renderSwatches();
    st.photo = null; st.colour = null;
    $('wa-label-in').value = '';
    $('wa-cat').value = '';
    $('wa-brand').value = '';
    $('wa-notes').value = '';
    $('wa-sw-name').textContent = '';
    [...document.querySelectorAll('#wa-swatches .wa-sw')].forEach(el => el.classList.remove('sel'));
    paintTile();
    validate();
    const m = $('wa-modal');
    m.classList.add('open');
    document.body.classList.add('modal-open');
    setTimeout(() => $('wa-label-in').focus(), 220);
  }
  function close() {
    const m = $('wa-modal');
    if (m) m.classList.remove('open');
    document.body.classList.remove('modal-open');
  }

  function validate() {
    const ready = !!$('wa-label-in').value.trim();
    $('wa-cta').toggleAttribute('disabled', !ready);
  }

  function pickFile() { $('wa-file').click(); }
  function onFile(input) {
    const f = input.files && input.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { st.photo = r.result; paintTile(); };
    r.readAsDataURL(f);
  }
  function clearPhoto(e) { if (e) e.stopPropagation(); st.photo = null; paintTile(); }
  function paintTile() {
    const tile = $('wa-tile');
    if (!tile) return;
    if (st.photo) {
      tile.classList.add('filled');
      $('wa-tile-empty').style.display = 'none';
      $('wa-tile-fill').style.display = 'block';
      $('wa-tile-img').src = st.photo;
    } else {
      tile.classList.remove('filled');
      $('wa-tile-empty').style.display = 'flex';
      $('wa-tile-fill').style.display = 'none';
    }
  }

  function submit() {
    const label = $('wa-label-in').value.trim();
    if (!label) { $('wa-label-in').focus(); return; }
    const cb = onAdded; onAdded = null;
    close();
    if (typeof App !== 'undefined' && typeof App.addPiece === 'function') {
      const id = App.addPiece({
        label,
        category: $('wa-cat').value || 'Accessories',
        colour: st.colour ? (st.colour.css || st.colour.hex) : '',
        brand: $('wa-brand').value.trim(),
        notes: $('wa-notes').value.trim(),
        photo: st.photo,
      });
      if (cb && id) cb(id);
    }
  }

  function bindDrag() {
    const tile = $('wa-tile');
    if (!tile) return;
    ['dragenter', 'dragover'].forEach(ev => tile.addEventListener(ev, e => { e.preventDefault(); tile.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => tile.addEventListener(ev, e => { e.preventDefault(); tile.classList.remove('drag'); }));
    tile.addEventListener('drop', e => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f || !f.type.startsWith('image/')) return;
      const r = new FileReader();
      r.onload = () => { st.photo = r.result; paintTile(); };
      r.readAsDataURL(f);
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('wa-modal') && $('wa-modal').classList.contains('open')) close();
  });
  document.addEventListener('DOMContentLoaded', bindDrag);

  return { open, openFor: open, close, pickFile, onFile, clearPhoto, pickColour, hover, validate, submit };
})();
