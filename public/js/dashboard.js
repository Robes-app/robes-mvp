/* ── Robes dashboard — wardrobe feature ────────────────────────── */

const SUPABASE_URL = 'https://ayowpaknssulsqqvwpqx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_D_iIPtp_R6kjN_711jfyTg_sFmRdpwJ';

const CATEGORIES = ['Outerwear','Tops','Bottoms','Shoes','Accessories','Dresses','Bags','Swimwear','Other'];

const COLORS = [
  { name: 'Cream',    hex: '#F0EDE6' },
  { name: 'Beige',    hex: '#D4BEA0' },
  { name: 'Tan',      hex: '#C09060' },
  { name: 'Camel',    hex: '#A87840' },
  { name: 'Khaki',    hex: '#8A8455' },
  { name: 'Olive',    hex: '#4E5030' },
  { name: 'Blush',    hex: '#DCC0C4' },
  { name: 'Lavender', hex: '#B8B0BC' },
  { name: 'Mauve',    hex: '#8E7077' },
  { name: 'Burgundy', hex: '#6C2030' },
  { name: 'Rust',     hex: '#B85030' },
  { name: 'Brown',    hex: '#5A3820' },
  { name: 'Navy',     hex: '#1A2848' },
  { name: 'Steel',    hex: '#3A5878' },
  { name: 'Grey',     hex: '#888888' },
  { name: 'Charcoal', hex: '#404040' },
  { name: 'Black',    hex: '#1A1A1A' },
  { name: 'White',    hex: '#FFFFFF' },
  { name: 'Pink',     hex: '#F020A0' },
  { name: 'Green',    hex: '#20C020' },
  { name: 'Blue',     hex: '#2050F0' },
  { name: 'Yellow',   hex: '#E0D000' },
  { name: 'Orange',   hex: '#E85020' },
  { name: 'Multi',    hex: 'multi'   },
  { name: 'Print',    hex: 'print'   },
];

let sb, user, items = [], activeCategory = 'All', selectedColor = null;
let editingId = null;

async function init() {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = '/'; return; }
  user = session.user;

  renderAvatar();
  buildCategoryFilters();
  buildColorSwatches();
  await loadItems();
  bindEvents();
}

function renderAvatar() {
  const el = document.getElementById('avatar');
  if (!el) return;
  const name = user.user_metadata?.full_name || user.email || '';
  el.textContent = name.charAt(0).toUpperCase() || '?';
}

function buildCategoryFilters() {
  const container = document.getElementById('cat-filters');
  const all = pill('All', true);
  container.appendChild(all);
  CATEGORIES.forEach(c => container.appendChild(pill(c, false)));
}

function pill(label, active) {
  const btn = document.createElement('button');
  btn.className = 'cat-pill' + (active ? ' active' : '');
  btn.textContent = label;
  btn.dataset.cat = label;
  btn.addEventListener('click', () => setCategory(label));
  return btn;
}

function setCategory(cat) {
  activeCategory = cat;
  document.querySelectorAll('.cat-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.cat === cat);
  });
  renderGrid();
}

function buildColorSwatches() {
  const grid = document.getElementById('swatch-grid');
  COLORS.forEach(c => {
    const el = document.createElement('div');
    el.className = 'swatch' + (c.hex === 'multi' ? ' swatch-multi' : c.hex === 'print' ? ' swatch-print' : '');
    el.dataset.color = c.name;
    if (c.hex !== 'multi' && c.hex !== 'print') el.style.background = c.hex;
    el.title = c.name;
    el.addEventListener('click', () => {
      if (selectedColor === c.name) {
        selectedColor = null;
        el.classList.remove('selected');
      } else {
        selectedColor = c.name;
        document.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
        el.classList.add('selected');
      }
    });
    grid.appendChild(el);
  });
}

async function loadItems() {
  const grid = document.getElementById('wardrobe-grid');
  showSkeletons(grid);

  const { data, error } = await sb
    .from('wardrobe_items')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) { console.error('Load error:', error); showToast('Could not load wardrobe'); return; }
  items = data || [];
  renderGrid();
}

function showSkeletons(grid) {
  grid.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const c = document.createElement('div');
    c.className = 'w-card skel-card';
    c.innerHTML = '<div class="w-card-img skeleton"></div>';
    grid.appendChild(c);
  }
}

function renderGrid() {
  const grid = document.getElementById('wardrobe-grid');
  const filtered = activeCategory === 'All'
    ? items
    : items.filter(it => it.category === activeCategory);

  grid.innerHTML = '';

  if (filtered.length === 0 && activeCategory !== 'All') {
    const empty = document.createElement('div');
    empty.className = 'wardrobe-empty';
    empty.textContent = `No ${activeCategory.toLowerCase()} pieces yet.`;
    grid.appendChild(empty);
  } else {
    filtered.forEach(it => grid.appendChild(itemCard(it)));
  }

  grid.appendChild(addCard());

  const count = document.getElementById('piece-count');
  if (count) count.textContent = `${items.length} piece${items.length !== 1 ? 's' : ''}`;

  const badge = document.getElementById('badge-count');
  if (badge) badge.textContent = items.length;
}

function itemCard(it) {
  const card = document.createElement('div');
  card.className = 'w-card';
  card.dataset.id = it.id;

  const imgWrap = document.createElement('div');
  imgWrap.className = 'w-card-img';

  if (it.image_url) {
    const img = document.createElement('img');
    img.src = it.image_url;
    img.alt = it.label;
    img.loading = 'lazy';
    imgWrap.appendChild(img);
  } else {
    imgWrap.innerHTML = `<div class="w-card-img-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg></div>`;
  }

  if (it.times_worn === 0) {
    const badge = document.createElement('div');
    badge.className = 'never-worn-badge';
    badge.textContent = 'Never worn';
    imgWrap.appendChild(badge);
  }

  const info = document.createElement('div');
  info.className = 'w-card-info';
  const meta = [it.brand, it.times_worn > 0 ? `${it.times_worn}× worn` : null].filter(Boolean).join(' · ');
  info.innerHTML = `<div class="w-card-label">${esc(it.label)}</div>
    ${meta ? `<div class="w-card-meta">${esc(meta)}</div>` : ''}`;

  card.appendChild(imgWrap);
  card.appendChild(info);
  card.addEventListener('click', () => openEdit(it));
  return card;
}

function addCard() {
  const card = document.createElement('div');
  card.className = 'w-card w-card-add';
  card.innerHTML = `<div class="w-card-img"><div class="add-plus">+</div></div>`;
  card.addEventListener('click', () => openModal());
  return card;
}

/* ── modal ──────────────────────────────────────────────────────── */
function openModal(existing) {
  editingId = existing ? existing.id : null;
  selectedColor = existing?.color || null;

  document.getElementById('modal-label').value = existing?.label || '';
  document.getElementById('modal-category').value = existing?.category || 'Outerwear';
  document.getElementById('modal-brand').value = existing?.brand || '';
  document.getElementById('modal-notes').value = existing?.notes || '';

  document.querySelectorAll('.swatch').forEach(s => {
    s.classList.toggle('selected', s.dataset.color === selectedColor);
  });

  const preview = document.getElementById('photo-preview');
  const icon = document.getElementById('photo-icon');
  const photoWrap = document.getElementById('photo-upload');
  if (existing?.image_url) {
    preview.src = existing.image_url;
    preview.style.display = 'block';
    icon.style.display = 'none';
    photoWrap.classList.add('has-image');
  } else {
    preview.style.display = 'none';
    icon.style.display = '';
    photoWrap.classList.remove('has-image');
    preview.src = '';
  }
  photoWrap._pendingFile = null;

  const addBtn = document.getElementById('btn-add');
  addBtn.innerHTML = existing
    ? `UPDATE PIECE <span class="arrow">→</span>`
    : `ADD TO WARDROBE <span class="arrow">→</span>`;

  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('modal-label').focus();
}

function openEdit(it) { openModal(it); }

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  editingId = null;
}

function bindEvents() {
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  document.getElementById('photo-upload').addEventListener('click', () => {
    document.getElementById('photo-input').click();
  });
  document.getElementById('photo-input').addEventListener('change', handlePhotoSelect);
  document.getElementById('btn-add').addEventListener('click', submitPiece);
  document.getElementById('open-add-modal').addEventListener('click', () => openModal());
}

function handlePhotoSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const preview = document.getElementById('photo-preview');
    const icon = document.getElementById('photo-icon');
    const wrap = document.getElementById('photo-upload');
    preview.src = ev.target.result;
    preview.style.display = 'block';
    icon.style.display = 'none';
    wrap.classList.add('has-image');
    wrap._pendingFile = { dataUrl: ev.target.result, file };
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

async function submitPiece() {
  const label = document.getElementById('modal-label').value.trim();
  if (!label) { document.getElementById('modal-label').focus(); return; }

  const btn = document.getElementById('btn-add');
  btn.disabled = true;
  btn.innerHTML = editingId ? 'SAVING… <span class="arrow">→</span>' : 'ADDING… <span class="arrow">→</span>';

  try {
    let imageUrl = editingId ? (items.find(i => i.id === editingId)?.image_url || null) : null;
    const wrap = document.getElementById('photo-upload');
    if (wrap._pendingFile) {
      const { dataUrl, file } = wrap._pendingFile;
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const res = await fetch('/api/wardrobe/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: match[2], mimeType: match[1] }),
        });
        const json = await res.json();
        if (json.url) imageUrl = json.url;
      }
    }

    const payload = {
      user_id: user.id,
      label,
      category: document.getElementById('modal-category').value,
      color: selectedColor || null,
      brand: document.getElementById('modal-brand').value.trim() || null,
      notes: document.getElementById('modal-notes').value.trim() || null,
      image_url: imageUrl,
    };

    let error;
    if (editingId) {
      ({ error } = await sb.from('wardrobe_items').update(payload).eq('id', editingId));
    } else {
      ({ error } = await sb.from('wardrobe_items').insert(payload));
    }

    if (error) throw error;
    closeModal();
    await loadItems();
    showToast(editingId ? 'Piece updated' : 'Added to wardrobe');
  } catch (err) {
    console.error('Submit error:', err);
    showToast('Something went wrong — try again');
  } finally {
    btn.disabled = false;
    btn.innerHTML = editingId ? 'UPDATE PIECE <span class="arrow">→</span>' : 'ADD TO WARDROBE <span class="arrow">→</span>';
  }
}

/* ── helpers ────────────────────────────────────────────────────── */
function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

init();
