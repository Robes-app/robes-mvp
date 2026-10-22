// The colour and pattern model — ONE source for every surface (the brief of
// 2026-10-22): 13 families, 74 named shades (each in exactly one family),
// the 13 patterns, the four-shade family tiles, and the map from the retired
// 21-swatch wheel. Served to the browser as /js/colour-model.js (it sets
// window.RB_COLOURS) and required by the server (the analyse prompt, the
// piece normaliser), so the two can never drift. Plain CommonJS on purpose:
// the package is "type":"module", and a .cjs file runs unchanged as a classic
// <script> as well.
(function (root, factory) {
  const M = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = M;
  else root.RB_COLOURS = M;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // [id, name, hex, neon?, metallic gradient?]
  const SH = {
    blacks:    [['jet','Jet','#0D0D0E'],['softblack','Soft black','#1F1E1D'],['blueblack','Blue-black','#151922'],['brownblack','Brown-black','#241D1A']],
    greys:     [['charcoal','Charcoal','#46464A'],['slate','Slate','#6B6E73'],['ash','Ash','#8E8C88'],['greymarl','Grey marl','#A7A5A1'],['dove','Dove','#C4C2BE']],
    whites:    [['optic','Optic white','#FFFFFF'],['ivory','Ivory','#FBF7EC'],['chalk','Chalk','#F3F1EC'],['cream','Cream','#F5EDDC'],['ecru','Ecru','#EDE5D2']],
    neutrals:  [['oat','Oat','#E4D9C4'],['sand','Sand','#D6C3A0'],['camel','Camel','#C19A6B'],['stone','Stone','#BDB3A2'],['taupe','Taupe','#A08E7C'],['khaki','Khaki','#B3A57E']],
    browns:    [['espresso','Espresso','#3A2620'],['chocolate','Chocolate','#4E3024'],['mocha','Mocha','#6E4C3C'],['cognac','Cognac','#9A5B32'],['rust','Rust','#9C4A2B'],['tan','Tan','#B07A4F']],
    greens:    [['bottle','Bottle','#1F3D2E'],['forest','Forest','#2F4A36'],['olive','Olive','#6B6A3A'],['emerald','Emerald','#1E7A55'],['sage','Sage','#9AA284'],['mint','Mint','#BFDCC7'],['lime','Lime','#A6E22E',1]],
    blues:     [['navy','Navy','#1F2A44'],['denim','Denim','#4B6C92'],['cobalt','Cobalt','#1F4FB0'],['teal','Teal','#2D6E73'],['sky','Sky','#8DB6DA'],['powder','Powder blue','#C9DBEA'],['electricblue','Electric blue','#2E5BFF',1]],
    purples:   [['aubergine','Aubergine','#3F2338'],['plum','Plum','#6B3557'],['violet','Violet','#5B2A86'],['mauve','Mauve','#9C7C8C'],['lavender','Lavender','#A898C4'],['lilac','Lilac','#D2C4DE']],
    reds:      [['oxblood','Oxblood','#4A1519'],['bordeaux','Bordeaux','#5E1A24'],['burgundy','Burgundy','#74202F'],['cherry','Cherry','#A31F2E'],['scarlet','Scarlet','#C8262E'],['brick','Brick','#A3473A']],
    pinks:     [['powderpink','Powder pink','#F4D9DE'],['blush','Blush','#EBCBC4'],['dustyrose','Dusty rose','#C99A9A'],['rose','Rose','#D97A93'],['fuchsia','Fuchsia','#C2246F'],['hotpink','Hot pink','#FF3E9A',1]],
    oranges:   [['terracotta','Terracotta','#B8603F'],['burntorange','Burnt orange','#C0561E'],['coral','Coral','#E9765E'],['apricot','Apricot','#F0B07A'],['neonorange','Neon orange','#FF6A13',1]],
    yellows:   [['ochre','Ochre','#C2922A'],['mustard','Mustard','#CFA33A'],['saffron','Saffron','#E8A92A'],['lemon','Lemon','#F1D84A'],['butter','Butter','#F2E2A0'],['acid','Acid','#DDF23A',1]],
    metallics: [
      ['gold','Gold','#C9A24A',0,'linear-gradient(135deg,#F1E0A6 0%,#B8923A 45%,#EBD48C 65%,#8E6E28 100%)'],
      ['silver','Silver','#BFC1C5',0,'linear-gradient(135deg,#F4F4F5 0%,#A6A8AC 45%,#E4E5E8 65%,#7F8287 100%)'],
      ['bronze','Bronze','#A8703F',0,'linear-gradient(135deg,#E0AA72 0%,#8C5A2E 45%,#C98D55 65%,#5E391C 100%)'],
      ['rosegold','Rose gold','#D9A592',0,'linear-gradient(135deg,#F6D3C4 0%,#BF8775 45%,#EBC0AE 65%,#94604F 100%)'],
      ['gunmetal','Gunmetal','#5A5D63',0,'linear-gradient(135deg,#9A9DA3 0%,#45484E 45%,#7A7E85 65%,#26282C 100%)'],
    ],
  };
  // Family order and the four shades each tile is built from (the brief: the
  // Neutrals tile carries camel, the Greens tile olive).
  const FAMS = [
    ['blacks','Blacks',['jet','softblack','brownblack','blueblack']],
    ['greys','Greys',['charcoal','ash','slate','dove']],
    ['whites','Whites',['optic','ivory','ecru','chalk']],
    ['neutrals','Neutrals',['oat','sand','camel','taupe']],
    ['browns','Browns',['espresso','mocha','cognac','tan']],
    ['greens','Greens',['olive','forest','sage','emerald']],
    ['blues','Blues',['navy','cobalt','denim','powder']],
    ['purples','Purples',['aubergine','plum','lavender','lilac']],
    ['reds','Reds',['bordeaux','cherry','scarlet','brick']],
    ['pinks','Pinks',['blush','dustyrose','rose','fuchsia']],
    ['oranges','Oranges',['terracotta','burntorange','apricot','coral']],
    ['yellows','Yellows',['ochre','mustard','butter','lemon']],
    ['metallics','Metallics',['gold','silver','bronze','rosegold']],
  ];
  // [id, name, inPreferences, swatch css]. Tie-dye, camouflage and other
  // tag a piece but are never offered as a preference (Robes can't act on
  // them). "plain" is the no-print value and lives outside this list.
  const I = '#202021', C = '#FAF8F5';
  const PATS = [
    ['stripes','Stripes',1,'repeating-linear-gradient(0deg,' + I + ' 0 3px,' + C + ' 3px 7px)'],
    ['checks','Checks & gingham',1,'repeating-linear-gradient(0deg,rgba(32,32,33,.42) 0 6px,transparent 6px 12px),repeating-linear-gradient(90deg,rgba(32,32,33,.42) 0 6px,transparent 6px 12px),' + C],
    ['plaid','Plaid & tartan',1,'repeating-linear-gradient(90deg,rgba(32,32,33,.75) 0 4px,transparent 4px 10px,rgba(32,32,33,.22) 10px 19px,transparent 19px 24px),repeating-linear-gradient(0deg,rgba(32,32,33,.75) 0 4px,transparent 4px 10px,rgba(32,32,33,.22) 10px 19px,transparent 19px 24px),' + C],
    ['houndstooth','Houndstooth',1,'linear-gradient(45deg,' + I + ' 25%,transparent 25%,transparent 75%,' + I + ' 75%) 0 0/10px 10px,linear-gradient(45deg,' + I + ' 25%,' + C + ' 25%,' + C + ' 75%,' + I + ' 75%) 5px 5px/10px 10px'],
    ['dots','Dots',1,'radial-gradient(' + I + ' 2.4px,transparent 2.9px) 0 0/10px 10px,' + C],
    ['florals','Florals',1,'radial-gradient(circle at 50% 30%,' + I + ' 0 2.6px,transparent 3px) 0 0/16px 16px,radial-gradient(circle at 70% 50%,' + I + ' 0 2.6px,transparent 3px) 0 0/16px 16px,radial-gradient(circle at 50% 70%,' + I + ' 0 2.6px,transparent 3px) 0 0/16px 16px,radial-gradient(circle at 30% 50%,' + I + ' 0 2.6px,transparent 3px) 0 0/16px 16px,' + C],
    ['animal','Animal prints',1,'radial-gradient(ellipse 5px 3.5px at 22% 28%,' + I + ' 85%,transparent 100%) 0 0/22px 22px,radial-gradient(ellipse 3.5px 5px at 72% 40%,' + I + ' 85%,transparent 100%) 0 0/22px 22px,#E4D3B4'],
    ['paisley','Paisley',1,'radial-gradient(ellipse 5px 7px at 36% 44%,' + I + ' 92%,transparent 100%) 0 0/20px 20px,' + C],
    ['graphic','Graphic & logo',1,'radial-gradient(circle at 50% 50%,' + I + ' 0 8px,' + C + ' 8.5px 12px,' + I + ' 12.5px 14px,transparent 14.5px),' + C],
    ['abstract','Abstract & geometric',1,'conic-gradient(from 45deg,' + I + ' 0 25%,' + C + ' 0 50%,' + I + ' 0 75%,' + C + ' 0) 0 0/24px 24px'],
    ['tiedye','Tie-dye',0,'repeating-radial-gradient(circle at 50% 50%,#8E7077 0 3px,#D4C8C4 3px 6px,#7E7C5A 6px 9px,#E7E0CF 9px 12px)'],
    ['camo','Camouflage',0,'radial-gradient(ellipse 8px 6px at 20% 30%,#4E5134 90%,transparent) 0 0/24px 24px,radial-gradient(ellipse 7px 9px at 65% 70%,#6E5B3E 90%,transparent) 0 0/24px 24px,#8C8A63'],
    ['other','Other',0,'repeating-linear-gradient(45deg,rgba(32,32,33,.5) 0 1px,transparent 1px 6px),' + C],
  ];
  // The retired 21-swatch wheel (_ALL_SWATCHES) → a shade. Multi and Print
  // carried no colour of their own: they fall to print "other", the shade
  // recovered from the stored hex where one exists.
  const LEGACY = {
    'white': 'optic', 'cream': 'cream', 'navy': 'navy', 'charcoal': 'charcoal', 'black': 'jet', 'espresso': 'espresso',
    'camel': 'camel', 'taupe': 'taupe', 'olive': 'olive', 'aubergine': 'aubergine', 'forest': 'forest', 'bordeaux': 'bordeaux', 'blush': 'blush',
    'ochre': 'ochre', 'magenta': 'fuchsia', 'cobalt': 'cobalt', 'emerald': 'emerald', 'vermillion': 'scarlet', 'acid': 'acid',
  };
  // Plain colour words a preference or an observation may carry → a family
  // (or, for the two metals everyone names, a shade). Phase 4 reads it.
  const WORDS = {
    'black': 'blacks', 'blacks': 'blacks', 'grey': 'greys', 'gray': 'greys', 'greys': 'greys', 'white': 'whites', 'whites': 'whites',
    'neutral': 'neutrals', 'neutrals': 'neutrals', 'beige': 'neutrals', 'brown': 'browns', 'browns': 'browns', 'green': 'greens', 'greens': 'greens',
    'blue': 'blues', 'blues': 'blues', 'purple': 'purples', 'purples': 'purples', 'red': 'reds', 'reds': 'reds', 'pink': 'pinks', 'pinks': 'pinks',
    'orange': 'oranges', 'oranges': 'oranges', 'yellow': 'yellows', 'yellows': 'yellows', 'metallic': 'metallics', 'metallics': 'metallics',
  };

  const lum = h => { const n = parseInt(String(h).slice(1), 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
  const EDGE = 'inset 0 0 0 1px rgba(32,32,33,0.16)';
  const SHADES = [], BY = {}, BY_NAME = {}, FAMILIES = [], FAM_BY = {};
  FAMS.forEach(([id, name, tileIds]) => {
    const shades = SH[id].map(([sid, sname, hex, neon, grad]) => {
      const s = { id: sid, name: sname, hex, family: id, familyName: name, neon: !!neon, metallic: id === 'metallics', css: grad || hex, light: lum(hex) > 0.8, dark: lum(hex) < 0.55 };
      s.edge = s.light ? EDGE : 'none';
      SHADES.push(s); BY[sid] = s; BY_NAME[sname.toLowerCase()] = s;
      return s;
    });
    const f = { id, name, shades, tile: tileIds.map(t => BY[t]) };
    FAMILIES.push(f); FAM_BY[id] = f;
  });
  const PATTERNS = PATS.map(([id, name, pref, css]) => ({ id, name, pref: !!pref, css }));
  const PAT_BY = {}; PATTERNS.forEach(p => { PAT_BY[p.id] = p; });
  const PLAIN = { id: 'plain', name: 'Plain', pref: false, css: '#EFE9DC' };

  function shade(id) { return (id && BY[String(id).toLowerCase()]) || null; }
  function family(id) { return (id && FAM_BY[String(id).toLowerCase()]) || null; }
  function pattern(id) { const k = String(id || '').toLowerCase(); return k === 'plain' ? PLAIN : (PAT_BY[k] || null); }
  // A shade by its display name ("Soft black") or by a retired wheel name
  // ("Black", "Vermillion"). Null when the word names nothing.
  function shadeByName(name) {
    const k = String(name || '').trim().toLowerCase();
    if (!k) return null;
    return BY_NAME[k] || (LEGACY[k] ? BY[LEGACY[k]] : null) || null;
  }
  // The nearest non-metallic shade to a hex (RGB distance — the backfill's
  // and the analyse fallback's reach, never a display rule).
  function nearest(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return null;
    const n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    let best = null, bd = Infinity;
    SHADES.forEach(s => {
      if (s.metallic) return;
      const q = parseInt(s.hex.slice(1), 16), dr = r - ((q >> 16) & 255), dg = g - ((q >> 8) & 255), db = b - (q & 255);
      const d = dr * dr + dg * dg + db * db;
      if (d < bd) { bd = d; best = s; }
    });
    return best;
  }
  // One resolver for everything that lands a colour on a piece: a shade id,
  // else a name (shade or legacy), else the nearest shade to a hex.
  function resolve(o) {
    o = o || {};
    return shade(o.id) || shadeByName(o.name) || nearest(o.hex) || null;
  }
  // A preference word → { family } | { shade } | null (phase 4's map from
  // the free-text loved/rejected lists and the observations).
  function preference(word) {
    const k = String(word || '').trim().toLowerCase();
    if (!k) return null;
    if (WORDS[k]) return { family: WORDS[k] };
    const s = shadeByName(k);
    return s ? { shade: s.id, family: s.family } : null;
  }
  // The analyse prompt's block: every family with its shade ids and names,
  // then the patterns — the model answers with the ids.
  function promptBlock() {
    return FAMILIES.map(f => f.name + ': ' + f.shades.map(s => s.id + ' (' + s.name + ')').join(', ')).join('\n')
      + '\nPATTERNS: plain (no print), ' + PATTERNS.map(p => p.id + ' (' + p.name + ')').join(', ');
  }
  // The CSS a swatch draws with: the hex, a metallic's sheen, a light
  // shade's hairline edge — never a bare colour on cream.
  function swatchCss(s) {
    if (!s) return 'background:#EFE9DC;box-shadow:inset 0 0 0 1px #E7E0CF';
    return 'background:' + s.css + (s.light ? ';box-shadow:' + EDGE : '');
  }
  function patternCss(p) { return 'background:' + (p ? p.css : PLAIN.css) + ';box-shadow:' + EDGE; }

  return {
    FAMILIES, SHADES, PATTERNS, PLAIN, LEGACY, WORDS, EDGE,
    shadeIds: SHADES.map(s => s.id), patternIds: PATTERNS.map(p => p.id),
    shade, family, pattern, shadeByName, nearest, resolve, preference, promptBlock, swatchCss, patternCss,
  };
});
