/* ══════════════════════════════════════════════════════════════════
   ROBES — Key Piece modal + Coming Soon modal logic
   Self-contained. Routes a styled key piece into the dashboard's
   existing "Style a piece" result (App.stylePiece).
   ══════════════════════════════════════════════════════════════════ */
window.KP = (function () {
  const $ = (id) => document.getElementById(id);
  const st = { photo: null, prompt: '', pieceName: '' };

  /* ── KEY PIECE modal ─────────────────────────────────────────────── */
  function openKeyPiece() {
    const m = $('kp-modal');
    if (!m) return;
    m.classList.add('open');
    document.body.classList.add('modal-open');
    paintTile();
    syncPrompt();
    setTimeout(() => { const t = $('kp-input'); if (t && !st.photo) t.focus(); }, 220);
  }
  function closeKeyPiece() {
    const m = $('kp-modal');
    if (m) m.classList.remove('open');
    document.body.classList.remove('modal-open');
  }

  function syncPrompt() {
    st.prompt = ($('kp-input') ? $('kp-input').value : '').trim();
    if (st.prompt) {
      st.pieceName = st.prompt.split(',')[0]
        .replace(/^(style |dress |my |the |a |an )+/i, '').trim().slice(0, 40);
    }
    const ready = !!(st.photo || st.prompt);
    const cta = $('kp-cta');
    if (cta) cta.toggleAttribute('disabled', !ready);
  }

  function pickFile() { $('kp-file').click(); }
  function onFile(input) {
    const f = input.files && input.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { st.photo = r.result; paintTile(); syncPrompt(); };
    r.readAsDataURL(f);
  }
  function clearPhoto(e) { if (e) e.stopPropagation(); st.photo = null; paintTile(); syncPrompt(); }
  function paintTile() {
    const tile = $('kp-tile');
    if (!tile) return;
    if (st.photo) {
      tile.classList.add('filled');
      $('kp-tile-empty').style.display = 'none';
      $('kp-tile-fill').style.display = 'block';
      $('kp-tile-img').src = st.photo;
    } else {
      tile.classList.remove('filled');
      $('kp-tile-empty').style.display = 'flex';
      $('kp-tile-fill').style.display = 'none';
    }
  }

  function submitStyle() {
    syncPrompt();
    if (!st.photo && !st.prompt) return;
    const name = st.pieceName || '';
    closeKeyPiece();
    if (typeof App !== 'undefined' && typeof App.stylePiece === 'function') App.stylePiece(name);
  }
  function later() {
    closeKeyPiece();
    if (typeof App !== 'undefined' && typeof App.toast === 'function') App.toast('Saved — come back any time to style a piece');
  }

  /* drag + drop onto the tile */
  function bindDrag() {
    const tile = $('kp-tile');
    if (!tile) return;
    ['dragenter', 'dragover'].forEach(ev => tile.addEventListener(ev, e => {
      e.preventDefault(); tile.classList.add('drag');
    }));
    ['dragleave', 'drop'].forEach(ev => tile.addEventListener(ev, e => {
      e.preventDefault(); tile.classList.remove('drag');
    }));
    tile.addEventListener('drop', e => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f || !f.type.startsWith('image/')) return;
      const r = new FileReader();
      r.onload = () => { st.photo = r.result; paintTile(); syncPrompt(); };
      r.readAsDataURL(f);
    });
  }

  /* ── COMING SOON modal ───────────────────────────────────────────── */
  function comingSoon(title, sub) {
    const m = $('cs-modal');
    if (!m) return;
    $('cs-h').innerHTML = title;
    $('cs-sub').textContent = sub;
    m.classList.add('open');
    document.body.classList.add('modal-open');
  }
  function closeComingSoon() {
    const m = $('cs-modal');
    if (m) m.classList.remove('open');
    document.body.classList.remove('modal-open');
  }

  /* esc to close whichever is open */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if ($('kp-modal') && $('kp-modal').classList.contains('open')) closeKeyPiece();
    if ($('cs-modal') && $('cs-modal').classList.contains('open')) closeComingSoon();
  });

  document.addEventListener('DOMContentLoaded', bindDrag);

  return {
    openKeyPiece, closeKeyPiece, pickFile, onFile, clearPhoto, syncPrompt, submitStyle, later,
    comingSoon, closeComingSoon,
  };
})();
