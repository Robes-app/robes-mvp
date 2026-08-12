// 3-level wardrobe taxonomy — the categorisation source of truth.
// Compiled from the "Robes wardrobe taxonomy" sheet (2026-07-31; 350 item
// types, 55 subcategories, 14 sheet-level categories from zara.com +
// editorialist.com + ICP gap fills).
//
// Three levels, two vocabularies:
//   - `l1` is the LEGACY category — the back-compat single-level enum every
//     existing surface reads (swap pools, Refine tabs, _dlSlot, #wa-cat).
//     The sheet's own 14 top-level categories (`sheet_l1`) are richer than
//     that enum, so each (l2, l3) node carries the legacy category it folds
//     into. Knitwear folds into Tops (except coatigans/knit dresses/knit
//     bottoms), Jewellery into Accessories, Tailoring splits by garment,
//     sleep/underwear/co-ords land in Other. L2 keeps the finer identity —
//     nothing is lost by the fold.
//   - `l2`/`l3` are the new columns (wardrobe_items.category_l2/_l3,
//     migration 15). L2 names are unique across the whole tree, so an L2
//     alone is enough to recover its sheet_l1 and legacy l1.
//
// Consumed by /api/wardrobe/analyse (prompt + validation) and by
// scripts/gen_taxonomy_migration.mjs (the migration's seed rows) — edit the
// tree here and regenerate the SQL; never edit the two independently.

export const TAXONOMY_GROUPS = [
  // ── Tops ──────────────────────────────────────────────────────
  { sheet_l1: 'Tops', l2: 'T-shirts & tees', l1: 'Tops', l3: ['Crew neck t-shirt', 'V-neck t-shirt', 'Scoop neck t-shirt', 'Long-sleeve t-shirt', 'Breton / striped top', 'Graphic t-shirt', 'Boxy / cropped tee'] },
  { sheet_l1: 'Tops', l2: 'Shirts & blouses', l1: 'Tops', l3: ['Classic button-up shirt', 'Oversized shirt', 'Silk shirt', 'Linen shirt', 'Poplin shirt', 'Denim shirt', 'Western shirt', 'Blouse', 'Peasant blouse', 'Ruffle / frill blouse', 'Sheer blouse', 'Wrap top', 'Peplum top', 'Tunic'] },
  { sheet_l1: 'Tops', l2: 'Camisoles & sleeveless', l1: 'Tops', l3: ['Camisole', 'Silk cami', 'Tank top', 'Muscle / boyfriend tank', 'Halter top', 'Tube / bandeau top', 'Bustier / corset top', 'Shell top'] },
  { sheet_l1: 'Tops', l2: 'Bodysuits', l1: 'Tops', l3: ['Scoop-neck bodysuit', 'Long-sleeve bodysuit', 'Square-neck bodysuit'] },
  { sheet_l1: 'Tops', l2: 'Statement tops', l1: 'Tops', l3: ['Crop top', 'Off-the-shoulder top', 'One-shoulder top', 'Cut-out top', 'Embellished / sequin top', 'Kaftan top'] },
  { sheet_l1: 'Tops', l2: 'Sweatshirts & hoodies', l1: 'Tops', l3: ['Crewneck sweatshirt', 'Hoodie', 'Zip-up hoodie', 'Half-zip sweatshirt'] },
  // ── Knitwear ──────────────────────────────────────────────────
  { sheet_l1: 'Knitwear', l2: 'Jumpers & sweaters', l1: 'Tops', l3: ['Crew neck jumper', 'V-neck jumper', 'Turtleneck / polo neck', 'Mock neck jumper', 'Cable knit jumper', 'Chunky knit jumper', 'Fine-gauge / merino jumper', 'Cashmere jumper', 'Oversized jumper', 'Cropped jumper', 'Striped jumper', 'Short-sleeve knit top', 'Knitted polo shirt'] },
  { sheet_l1: 'Knitwear', l2: 'Cardigans', l1: 'Tops', l3: ['Cropped cardigan', 'Longline cardigan', 'Chunky cardigan', 'Fine-knit cardigan', 'Button-through cardigan'] },
  { sheet_l1: 'Knitwear', l2: 'Cardigans', l1: 'Outerwear', l3: ['Cardigan coat / coatigan'] },
  { sheet_l1: 'Knitwear', l2: 'Vests & waistcoats', l1: 'Tops', l3: ['Knit vest', 'Argyle / patterned vest', 'Sleeveless knit waistcoat'] },
  { sheet_l1: 'Knitwear', l2: 'Knit separates & sets', l1: 'Dresses', l3: ['Knit dress'] },
  { sheet_l1: 'Knitwear', l2: 'Knit separates & sets', l1: 'Other', l3: ['Knit co-ord set'] },
  { sheet_l1: 'Knitwear', l2: 'Knit separates & sets', l1: 'Bottoms', l3: ['Knitted trousers', 'Knit skirt'] },
  // ── Bottoms ───────────────────────────────────────────────────
  { sheet_l1: 'Bottoms', l2: 'Trousers', l1: 'Bottoms', l3: ['Tailored straight trousers', 'Wide-leg trousers', 'Palazzo trousers', 'Cigarette / slim trousers', 'Cropped / ankle trousers', 'Culottes', 'Paperbag-waist trousers', 'Carrot / tapered trousers', 'Pleated trousers', 'Flare trousers', 'Chinos', 'Cargo trousers', 'Linen trousers', 'Leather trousers', 'Joggers', 'Leggings'] },
  { sheet_l1: 'Bottoms', l2: 'Jeans', l1: 'Bottoms', l3: ['Straight-leg jeans', 'Wide-leg jeans', 'Bootcut jeans', 'Flare jeans', 'Skinny jeans', 'Mom jeans', 'Barrel-leg jeans', 'Boyfriend / relaxed jeans', 'Cropped jeans'] },
  { sheet_l1: 'Bottoms', l2: 'Skirts', l1: 'Bottoms', l3: ['Mini skirt', 'Midi skirt', 'Maxi skirt', 'Pencil skirt', 'A-line skirt', 'Pleated skirt', 'Wrap skirt', 'Slip / bias-cut skirt', 'Denim skirt', 'Leather skirt', 'Tiered skirt'] },
  { sheet_l1: 'Bottoms', l2: 'Shorts', l1: 'Bottoms', l3: ['Tailored shorts', 'Bermuda shorts', 'Denim shorts', 'Linen shorts', 'Paperbag shorts', 'Cycling shorts', 'Culotte / skort'] },
  // ── Dresses & jumpsuits ───────────────────────────────────────
  { sheet_l1: 'Dresses & jumpsuits', l2: 'Day dresses', l1: 'Dresses', l3: ['Shirt dress', 'Wrap dress', 'Shift dress', 'T-shirt dress', 'Smock dress', 'Pinafore dress', 'Tunic dress', 'Denim dress', 'Knit dress', 'Sundress', 'A-line dress'] },
  { sheet_l1: 'Dresses & jumpsuits', l2: 'Occasion & evening', l1: 'Dresses', l3: ['Slip dress', 'Bias-cut dress', 'Cocktail dress', 'Evening gown', 'Bodycon dress', 'Corset dress', 'Halter-neck dress', 'One-shoulder dress', 'Off-the-shoulder dress', 'Sequin / embellished dress', 'Blazer dress'] },
  { sheet_l1: 'Dresses & jumpsuits', l2: 'Jumpsuits & playsuits', l1: 'Dresses', l3: ['Jumpsuit', 'Playsuit / romper', 'Boilersuit', 'Culotte jumpsuit'] },
  { sheet_l1: 'Dresses & jumpsuits', l2: 'Co-ord sets', l1: 'Other', l3: ['Matching two-piece set', 'Knit co-ord set', 'Tailored co-ord set'] },
  // ── Outerwear ─────────────────────────────────────────────────
  { sheet_l1: 'Outerwear', l2: 'Coats', l1: 'Outerwear', l3: ['Wool coat', 'Tailored overcoat', 'Trench coat', 'Mac / rain coat', 'Puffer coat', 'Quilted coat', 'Faux fur coat', 'Teddy / borg coat', 'Shearling coat', 'Parka', 'Duster / longline coat', 'Cape / poncho'] },
  { sheet_l1: 'Outerwear', l2: 'Jackets', l1: 'Outerwear', l3: ['Leather / biker jacket', 'Denim jacket', 'Bomber jacket', 'Harrington jacket', 'Quilted jacket', 'Cropped jacket', 'Utility / field jacket', 'Suede jacket', 'Shacket', 'Anorak / rain jacket', 'Linen jacket', 'Tweed / boucle jacket'] },
  { sheet_l1: 'Outerwear', l2: 'Blazers', l1: 'Outerwear', l3: ['Single-breasted blazer', 'Double-breasted blazer', 'Oversized blazer', 'Cropped blazer', 'Tuxedo blazer', 'Linen blazer'] },
  { sheet_l1: 'Outerwear', l2: 'Gilets & waistcoats', l1: 'Outerwear', l3: ['Puffer gilet', 'Quilted gilet', 'Tailored waistcoat', 'Faux fur gilet'] },
  // ── Tailoring & suiting ───────────────────────────────────────
  { sheet_l1: 'Tailoring & suiting', l2: 'Suit separates', l1: 'Outerwear', l3: ['Suit blazer', 'Suit waistcoat'] },
  { sheet_l1: 'Tailoring & suiting', l2: 'Suit separates', l1: 'Bottoms', l3: ['Suit trousers', 'Suit skirt'] },
  { sheet_l1: 'Tailoring & suiting', l2: 'Full suits', l1: 'Other', l3: ['Trouser suit', 'Skirt suit', 'Short suit'] },
  // ── Shoes ─────────────────────────────────────────────────────
  { sheet_l1: 'Shoes', l2: 'Flats', l1: 'Shoes', l3: ['Ballet flat', 'Mary Jane', 'Loafer', 'Mule', 'Slide', 'Brogue / derby', 'Moccasin / driving shoe', 'Pointed flat'] },
  { sheet_l1: 'Shoes', l2: 'Heels', l1: 'Shoes', l3: ['Court shoe / pump', 'Slingback', 'Kitten heel', 'Block heel', 'Stiletto', 'Platform heel', 'Wedge', 'Heeled mule', 'Ankle-strap heel'] },
  { sheet_l1: 'Shoes', l2: 'Sandals', l1: 'Shoes', l3: ['Flat sandal', 'Heeled sandal', 'Gladiator sandal', 'Thong sandal / flip-flop', 'Espadrille', 'Fisherman sandal', 'Slide sandal'] },
  { sheet_l1: 'Shoes', l2: 'Boots', l1: 'Shoes', l3: ['Ankle boot', 'Chelsea boot', 'Knee-high boot', 'Over-the-knee boot', 'Western / cowboy boot', 'Biker boot', 'Combat boot', 'Sock boot', 'Rain boot / wellington', 'Snow boot'] },
  { sheet_l1: 'Shoes', l2: 'Trainers', l1: 'Shoes', l3: ['Leather trainer', 'Retro runner', 'Court / tennis sneaker', 'Canvas plimsoll', 'Chunky / dad trainer', 'Running shoe'] },
  // ── Bags ──────────────────────────────────────────────────────
  { sheet_l1: 'Bags', l2: 'Everyday bags', l1: 'Bags', l3: ['Tote bag', 'Shoulder bag', 'Crossbody bag', 'Hobo bag', 'Bucket bag', 'Top-handle bag', 'Satchel', 'East-west bag', 'Baguette bag'] },
  { sheet_l1: 'Bags', l2: 'Occasion bags', l1: 'Bags', l3: ['Clutch', 'Minaudiere / box bag', 'Chain bag', 'Mini bag'] },
  { sheet_l1: 'Bags', l2: 'Travel & utility', l1: 'Bags', l3: ['Weekender / duffle', 'Cabin case / suitcase', 'Backpack', 'Laptop / work bag', 'Beach / straw bag', 'Gym bag'] },
  { sheet_l1: 'Bags', l2: 'Small leather goods', l1: 'Bags', l3: ['Purse / wallet', 'Cardholder', 'Coin purse', 'Pouch', 'Passport holder', 'Makeup bag'] },
  // ── Accessories ───────────────────────────────────────────────
  { sheet_l1: 'Accessories', l2: 'Belts', l1: 'Accessories', l3: ['Leather belt', 'Statement buckle belt', 'Woven belt', 'Chain belt', 'Waist / obi belt'] },
  { sheet_l1: 'Accessories', l2: 'Scarves & wraps', l1: 'Accessories', l3: ['Silk scarf', 'Wool scarf', 'Blanket scarf', 'Pashmina / wrap', 'Neckerchief'] },
  { sheet_l1: 'Accessories', l2: 'Hats & headwear', l1: 'Accessories', l3: ['Baseball cap', 'Bucket hat', 'Panama / straw hat', 'Fedora', 'Beanie', 'Headband', 'Hair clip / claw', 'Occasion hat / fascinator'] },
  { sheet_l1: 'Accessories', l2: 'Eyewear', l1: 'Accessories', l3: ['Sunglasses', 'Optical frames'] },
  { sheet_l1: 'Accessories', l2: 'Gloves & hosiery', l1: 'Accessories', l3: ['Leather gloves', 'Wool gloves', 'Tights', 'Sheer hosiery', 'Socks', 'Trainer socks', 'Knee-high socks'] },
  { sheet_l1: 'Accessories', l2: 'Other accessories', l1: 'Accessories', l3: ['Umbrella', 'Phone case / tech accessory', 'Keyring / bag charm'] },
  // ── Jewellery ─────────────────────────────────────────────────
  { sheet_l1: 'Jewellery', l2: 'Necklaces', l1: 'Accessories', l3: ['Fine chain', 'Pendant necklace', 'Statement necklace', 'Choker', 'Layered set', 'Pearls'] },
  { sheet_l1: 'Jewellery', l2: 'Earrings', l1: 'Accessories', l3: ['Studs', 'Hoops', 'Drop earrings', 'Statement earrings', 'Huggies', 'Ear cuff'] },
  { sheet_l1: 'Jewellery', l2: 'Bracelets & rings', l1: 'Accessories', l3: ['Cuff bracelet', 'Tennis bracelet', 'Bangle', 'Charm bracelet', 'Stacking ring', 'Signet ring', 'Cocktail ring'] },
  { sheet_l1: 'Jewellery', l2: 'Watches & pins', l1: 'Accessories', l3: ['Dress watch', 'Everyday watch', 'Smartwatch', 'Brooch / pin'] },
  // ── Activewear ────────────────────────────────────────────────
  { sheet_l1: 'Activewear', l2: 'Active tops', l1: 'Tops', l3: ['Sports bra', 'Workout tank', 'Technical tee', 'Long-sleeve base layer'] },
  { sheet_l1: 'Activewear', l2: 'Active tops', l1: 'Outerwear', l3: ['Running jacket'] },
  { sheet_l1: 'Activewear', l2: 'Active bottoms', l1: 'Bottoms', l3: ['Leggings', 'Cycling shorts', 'Running shorts', 'Track trousers', 'Tennis skirt'] },
  { sheet_l1: 'Activewear', l2: 'Active layers & sets', l1: 'Outerwear', l3: ['Track jacket'] },
  { sheet_l1: 'Activewear', l2: 'Active layers & sets', l1: 'Other', l3: ['Matching active set'] },
  { sheet_l1: 'Activewear', l2: 'Active layers & sets', l1: 'Tops', l3: ['Gym hoodie'] },
  { sheet_l1: 'Activewear', l2: 'Sport-specific', l1: 'Other', l3: ['Yoga / studio wear', 'Ski wear', 'Hiking layers', 'Swim training kit'] },
  // ── Loungewear & sleepwear ────────────────────────────────────
  { sheet_l1: 'Loungewear & sleepwear', l2: 'Loungewear', l1: 'Other', l3: ['Lounge set', 'Robe / dressing gown'] },
  { sheet_l1: 'Loungewear & sleepwear', l2: 'Loungewear', l1: 'Bottoms', l3: ['Cashmere joggers'] },
  { sheet_l1: 'Loungewear & sleepwear', l2: 'Loungewear', l1: 'Tops', l3: ['Lounge hoodie'] },
  { sheet_l1: 'Loungewear & sleepwear', l2: 'Sleepwear', l1: 'Other', l3: ['Pyjama set', 'Nightdress', 'Slip nightie', 'Sleep shirt'] },
  { sheet_l1: 'Loungewear & sleepwear', l2: 'Slippers', l1: 'Shoes', l3: ['Mule slipper', 'Slipper sock', 'Shearling slipper'] },
  // ── Underwear & intimates ─────────────────────────────────────
  { sheet_l1: 'Underwear & intimates', l2: 'Bras', l1: 'Other', l3: ['T-shirt bra', 'Balconette bra', 'Bralette', 'Strapless bra', 'Plunge bra'] },
  { sheet_l1: 'Underwear & intimates', l2: 'Briefs', l1: 'Other', l3: ['Brief', 'Thong', 'High-waist brief', 'Shaping brief'] },
  { sheet_l1: 'Underwear & intimates', l2: 'Shapewear & base layers', l1: 'Other', l3: ['Shaping bodysuit', 'Slip', 'Thermal base layer', 'Camisole slip'] },
  // ── Swim & beach ──────────────────────────────────────────────
  { sheet_l1: 'Swim & beach', l2: 'Swimwear', l1: 'Swimwear', l3: ['Bikini top', 'Bikini bottom', 'One-piece swimsuit', 'Tankini', 'Swim skirt / shorts'] },
  { sheet_l1: 'Swim & beach', l2: 'Cover-ups', l1: 'Swimwear', l3: ['Kaftan', 'Sarong', 'Beach shirt', 'Beach dress', 'Beach trousers'] },
];

// l2 -> { sheet_l1, l1 } — valid because L2 names are unique tree-wide.
export const L2_INDEX = new Map();
// l2 -> Set(l3)
const L3_INDEX = new Map();
for (const g of TAXONOMY_GROUPS) {
  // A split L2 (e.g. Cardigans) appears in several groups with different
  // legacy l1s; the l1 recorded on L2_INDEX is the first (majority) group's.
  if (!L2_INDEX.has(g.l2)) L2_INDEX.set(g.l2, { sheet_l1: g.sheet_l1, l1: g.l1 });
  if (!L3_INDEX.has(g.l2)) L3_INDEX.set(g.l2, new Map());
  for (const l3 of g.l3) L3_INDEX.get(g.l2).set(l3, g.l1);
}

export const LEGACY_CATEGORIES = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Bags', 'Accessories', 'Swimwear', 'Other'];

// Flat (l1, sheet_l1, l2, l3) rows — the migration seed shape.
export function taxonomyRows() {
  const rows = [];
  for (const g of TAXONOMY_GROUPS) for (const l3 of g.l3) rows.push({ l1: g.l1, sheet_l1: g.sheet_l1, l2: g.l2, l3 });
  return rows;
}

// Validate a model-emitted (l2, l3) pair against the tree. Returns
// { category, category_l2, category_l3 } with `category` the legacy L1 the
// node folds into, or null when l2 isn't a real subcategory (the caller
// falls back to legacy single-level behaviour). An unknown l3 under a known
// l2 degrades to the l2 alone rather than rejecting the whole read.
export function resolveTaxonomy(l2, l3) {
  const norm = v => String(v || '').trim();
  const findKey = (map, v) => {
    if (map.has(v)) return v;
    const lower = v.toLowerCase();
    for (const k of map.keys()) if (k.toLowerCase() === lower) return k;
    return null;
  };
  const l2key = findKey(L2_INDEX, norm(l2));
  if (!l2key) return null;
  const l3map = L3_INDEX.get(l2key);
  const l3key = norm(l3) ? findKey(l3map, norm(l3)) : null;
  const category = l3key ? l3map.get(l3key) : L2_INDEX.get(l2key).l1;
  return { category, category_l2: l2key, category_l3: l3key };
}

// The analyse prompt's tree — one line per (legacy l1 › l2) group, L3s
// pipe-separated. ~350 short terms; flash-friendly input cost.
export function taxonomyPromptBlock() {
  return TAXONOMY_GROUPS
    .map(g => `${g.l1} \u203a ${g.l2}: ${g.l3.join(' | ')}`)
    .join('\n');
}

// \u2500\u2500 ADR-002 section 6 \u00b7 the pre-fill \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Season and "Wear it for" defaults, mapped from the category she is already
// filing the piece under. The audit that gated ADR-002 found 3 of 166 pieces
// carrying any season tag \u2014 at 1.8% adoption the axis is not a decision she
// gets wrong, it is one she does not make. So the app fills it in and she
// corrects; every value written from here carries source 'inferred', and a
// correction flips that row to 'user'. Correction rates per category are the
// quality signal on this table.
//
// CONSUMED BY SQL, NOT BY THE CLIENT. scripts/gen_taxonomy_migration.mjs
// emits these into the `wardrobe_tag_defaults` table that migration 18's
// trigger reads, so the pre-fill has ONE implementation covering both the
// backfill and every future insert. Edit here, regenerate, never hand-edit
// the SQL \u2014 the same rule the taxonomy itself follows.

export const SEASON_BANDS = ['spring_summer', 'autumn_winter', 'year_round'];

// The seven seeds (ADR-002 section 4). Seed rows are not pre-created per
// account: the client renders this list and a `tags` row is minted on first
// use, so a fresh account carries no unused rows.
export const WEAR_SEEDS = [
  { slug: 'everyday', label: 'Everyday' },
  { slug: 'work',     label: 'Work' },
  { slug: 'evening',  label: 'Evening' },
  { slug: 'occasion', label: 'Occasion' },
  { slug: 'travel',   label: 'Travel' },
  { slug: 'active',   label: 'Active' },
  { slug: 'lounge',   label: 'Lounge' },
];

// Keyed by the SHEET l1 (the fourteen she actually reads), with per-l2
// overrides only where one sheet category spans genuinely different uses.
// Just three entries are anything other than year_round \u2014 everything else
// takes the honest "wears in any weather" answer rather than guessing.
const CATEGORY_DEFAULTS = {
  'Tops':                   { wear: ['everyday'], band: 'year_round' },
  'Knitwear':               { wear: ['everyday'], band: 'autumn_winter' },
  'Bottoms':                { wear: ['everyday'], band: 'year_round' },
  'Dresses & jumpsuits':    { wear: ['everyday'], band: 'year_round', l2: {
    // The one split that matters here: a gown and a sundress are not one use.
    'Occasion & evening':   { wear: ['evening', 'occasion'], band: 'year_round' },
  } },
  'Outerwear':              { wear: ['everyday'], band: 'autumn_winter', l2: {
    // A blazer is workwear that happens to be filed as outerwear, and it is
    // the only member of the group that is not seasonal.
    'Blazers':              { wear: ['work', 'everyday'], band: 'year_round' },
  } },
  'Tailoring & suiting':    { wear: ['work'], band: 'year_round' },
  'Shoes':                  { wear: ['everyday'], band: 'year_round' },
  'Bags':                   { wear: ['everyday'], band: 'year_round' },
  'Accessories':            { wear: ['everyday'], band: 'year_round' },
  'Jewellery':              { wear: ['everyday'], band: 'year_round' },
  'Activewear':             { wear: ['active'], band: 'year_round' },
  'Loungewear & sleepwear': { wear: ['lounge'], band: 'year_round' },
  'Underwear & intimates':  { wear: ['everyday'], band: 'year_round' },
  'Swim & beach':           { wear: ['travel'], band: 'spring_summer' },
};

// Pre-migration-15 pieces carry no L2 at all, so the pre-fill must also key
// on the legacy nine. 'Other' is deliberately absent: it means "unfiled", and
// inferring a use from it would be a guess rather than a default.
const LEGACY_DEFAULTS = {
  'Tops': 'Tops', 'Bottoms': 'Bottoms', 'Dresses': 'Dresses & jumpsuits',
  'Outerwear': 'Outerwear', 'Shoes': 'Shoes', 'Bags': 'Bags',
  'Accessories': 'Accessories', 'Swimwear': 'Swim & beach',
};

// { wear: [slug], band } for a filed piece, or null when nothing is known.
// Null means leave the piece at the year_round default with no tags.
export function defaultTagsFor(sheetL1, l2) {
  const norm = v => String(v || '').trim();
  let key = norm(sheetL1);
  if (!CATEGORY_DEFAULTS[key]) key = LEGACY_DEFAULTS[key] || '';
  const base = CATEGORY_DEFAULTS[key];
  if (!base) return null;
  const over = base.l2 && base.l2[norm(l2)];
  const out = over || base;
  return { wear: out.wear.slice(), band: out.band };
}

// Flat rows for the migration seed: one per (sheet_l1, l2) node the tree
// contains, plus a null-l2 row per sheet category and per legacy category so
// the trigger can resolve a piece filed before migration 15.
export function tagDefaultRows() {
  const rows = [];
  const seen = new Set();
  const push = (sheet_l1, l2) => {
    const k = sheet_l1 + ' ' + (l2 || '');
    if (seen.has(k)) return;
    const d = defaultTagsFor(sheet_l1, l2);
    if (!d) return;
    seen.add(k);
    rows.push({ sheet_l1, l2: l2 || null, season_band: d.band, wear_slugs: d.wear });
  };
  for (const g of TAXONOMY_GROUPS) { push(g.sheet_l1, null); push(g.sheet_l1, g.l2); }
  for (const legacy of Object.keys(LEGACY_DEFAULTS)) push(legacy, null);
  return rows;
}
