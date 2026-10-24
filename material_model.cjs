// The material model (2026-10-24, design "Colour & material, one section"):
// seven families, 43 materials, ONE material per piece — the one it is mostly
// made of. Its own list, never part of the colour model: a black waistcoat is
// as easily wool as polyester. Stored as `material` (a single id or null);
// the family is derived from the id, never stored. Served to the browser as
// /js/material-model.js (it sets window.RB_MATERIALS) and required by the
// server (the analyse prompt, the piece normaliser). Plain CommonJS on
// purpose, like colour_model.cjs: the same file runs as a classic <script>.
// The ids are a contract shared with platform/packages/core/src/material.
(function (root, factory) {
  const M = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
  else root.RB_MATERIALS = M;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // [familyId, familyName, [[id, name, hint?], …]] — ordered by how often
  // each turns up in a wardrobe, not alphabetically.
  const FAMS = [
    ['natural', 'Natural', [['cotton','Cotton'],['wool','Wool'],['linen','Linen'],['silk','Silk'],['cashmere','Cashmere'],['merino','Merino'],['mohair','Mohair'],['alpaca','Alpaca'],['hemp','Hemp']]],
    ['cloth', 'Cloths', [['denim','Denim'],['jersey','Jersey'],['satin','Satin'],['velvet','Velvet'],['lace','Lace'],['corduroy','Corduroy'],['tweed','Tweed'],['sequin','Sequins & glitter']]],
    ['synthetic', 'Synthetic', [['polyester','Polyester'],['polyamide','Polyamide','Also nylon'],['elastane','Elastane','Also spandex, Lycra'],['acrylic','Acrylic']]],
    ['leather', 'Leather & skins', [['leather','Leather'],['suede','Suede'],['patent','Patent leather'],['shearling','Shearling'],['nubuck','Nubuck'],['exotic','Exotic leather','Croc, snake, ostrich']]],
    ['regenerated', 'Plant-based', [['viscose','Viscose','Also rayon'],['lyocell','Lyocell','Also Tencel'],['modal','Modal'],['acetate','Acetate'],['cupro','Cupro']]],
    ['faux', 'Faux', [['vegan_leather','Vegan leather','Also PU, faux leather'],['faux_fur','Faux fur'],['faux_suede','Faux suede'],['vinyl','Vinyl & PVC']]],
    ['hard', 'Accessories', [['straw','Straw & raffia'],['metal','Metal'],['resin','Plastic & resin'],['wood','Wood']]],
  ];
  const families = FAMS.map(([id, name, items]) => ({ id, name, materials: items.map(m => m[0]) }));
  const materials = [];
  const BY = {};
  FAMS.forEach(([fid, , items]) => items.forEach(([id, name, hint], i) => {
    const m = { id, name, hint: hint || '', family: fid, order: i };
    materials.push(m); BY[id] = m;
  }));
  const ids = materials.map(m => m.id);
  const FAM_BY = {};
  families.forEach(f => { FAM_BY[f.id] = f; });

  // Words people (and labels) use for a material that isn't its list name.
  const SYN = {
    nylon: 'polyamide', spandex: 'elastane', lycra: 'elastane', rayon: 'viscose', tencel: 'lyocell',
    pu: 'vegan_leather', 'faux leather': 'vegan_leather', 'pu leather': 'vegan_leather', 'vegan leather': 'vegan_leather', pleather: 'vegan_leather',
    'patent leather': 'patent', sequins: 'sequin', glitter: 'sequin', 'sequins & glitter': 'sequin',
    raffia: 'straw', 'straw & raffia': 'straw', pvc: 'vinyl', 'vinyl & pvc': 'vinyl', plastic: 'resin', 'plastic & resin': 'resin',
    croc: 'exotic', crocodile: 'exotic', snake: 'exotic', snakeskin: 'exotic', ostrich: 'exotic', 'exotic leather': 'exotic',
    sheepskin: 'shearling', lambswool: 'wool', 'lambs wool': 'wool', 'merino wool': 'merino', 'organic cotton': 'cotton',
    'faux fur': 'faux_fur', 'faux suede': 'faux_suede',
  };
  const NAME = {};
  materials.forEach(m => { NAME[m.name.toLowerCase()] = m.id; NAME[m.id] = m.id; NAME[m.id.replace(/_/g, ' ')] = m.id; });

  function material(id) { return (id && BY[id]) || null; }
  function family(id) { return (id && FAM_BY[id]) || null; }
  function familyOf(id) { const m = material(id); return m ? FAM_BY[m.family] : null; }
  // The one resolver every write goes through: an id, a display name or a
  // synonym → an id, else null. A blend ("95% cotton, 5% elastane") files
  // under the first material it names — the main fibre comes first on a label.
  function resolve(v) {
    if (!v) return null;
    const s = String(v).toLowerCase().trim();
    if (BY[s]) return s;
    if (NAME[s]) return NAME[s];
    if (Object.prototype.hasOwnProperty.call(SYN, s)) return SYN[s];
    const words = s.replace(/[0-9%]+/g, ' ').split(/[,/+&;]|\band\b/).map(x => x.trim()).filter(Boolean);
    const hit = w => BY[w] || NAME[w] || SYN[w] || null;
    for (const w of words) {
      const id = hit(w) || w.split(/\s+/).map(hit).find(Boolean);
      if (id) return typeof id === 'string' ? id : id.id;
    }
    return null;
  }
  // For the analyse prompt: one line per family, "id — Name (hint)".
  function promptBlock() {
    return FAMS.map(([, fname, items]) => fname + ': ' + items.map(([id, name, hint]) => id + ' — ' + name + (hint ? ' (' + hint.toLowerCase() + ')' : '')).join('; ')).join('\n');
  }
  return { families, materials, ids, material, family, familyOf, resolve, promptBlock };
});
