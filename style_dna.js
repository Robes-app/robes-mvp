// Style DNA deterministic mapping engine (PRD: Style DNA Core Profile Generation).
// Gemini extracts measurable primitives only; everything the user sees comes from
// this catalog so results are repeatable and editable in one place.

export const METAL_GRADIENTS = {
  'Gold':        ['#E4C878', '#C6A24C', '#9C7E36'],
  'Yellow gold': ['#EED27E', '#D2A845', '#A87F2E'],
  'Bronze':      ['#C99670', '#A9744E', '#7E5436'],
  'Rose gold':   ['#E0AE98', '#C98F78', '#A06B58'],
  'Copper':      ['#D89870', '#B87048', '#8E5230'],
  'Silver':      ['#E8EAEC', '#B9BEC4', '#8A9098'],
  'Platinum':    ['#E6E4DE', '#C2BFB8', '#96938C'],
  'White gold':  ['#F0EEE6', '#CFCBC0', '#A29E92'],
  'Pewter':      ['#C8C8C6', '#98989A', '#6E6E72'],
  'Chrome':      ['#F2F4F6', '#C0C6CE', '#848C98'],
};

const B = (name, hex) => ({ name, hex });

// ── The 12-Season Archetype Catalog ──────────────────────────────────
// voice: the Robes stylist explanation (hover/info voice) from the Colour
// Harmony matrix sheet. palette: eighteen_shade_matrix rows 1–3.
export const SEASONS = {
  'Light Spring': {
    family: 'warm',
    voice: 'A sun-dappled, luminous canvas. Your features are bright, warm, and delicate. The engine completely avoids heavy, muddy colors, opting instead for buttermilk creams, soft peach, and warm, illuminated corals.',
    summary: 'Bright, warm, delicate — lit like early morning.',
    palette: [
      ['#F2E3C4', '#F0D5A8', '#EEC28E', '#E8A87C', '#E09266', '#D8C878'],
      ['#C4D49A', '#9CBE84', '#7CB89C', '#82C4C0', '#8CC4D8', '#9CB8DC'],
      ['#8898C8', '#A490C8', '#C89CC0', '#DC94A8', '#E89C94', '#ECB2A0'],
    ],
    neutrals: [B('Soft white', '#F6F1E4'), B('Buttermilk', '#F0E4C0'), B('Light sand', '#E4D2AC'), B('Camel', '#C8A26E'), B('Dove grey', '#C2BEB4'), B('Warm mocha', '#8E7458')],
    stars: [B('Warm coral', '#E8836C'), B('Peach', '#F0B088'), B('Apple green', '#9CC468'), B('Aqua', '#7CC4C8')],
    accents: [B('Buttermilk', '#F0E0A8'), B('Warm ivory', '#F4EBD4'), B('Soft turquoise', '#84C8C0'), B('Light camel', '#D2B084')],
    avoid: [B('Jet black', '#111111'), B('Charcoal', '#3A3E42'), B('Deep burgundy', '#5A2430'), B('Fuchsia', '#B23A72'), B('Cool grey', '#9AA0A6'), B('Icy blue', '#C2D8E8'), B('Dark navy', '#1A2438')],
    avoid_note: 'Heavy, dark values swallow your light.',
    metals: { finish: 'Shiny / Polished', approved: ['Yellow gold', 'Rose gold', 'Gold'], prohibited: ['Pewter', 'Chrome', 'Gunmetal'] },
    metals_note: 'Light, polished golds catch the brightness your skin already carries.',
    proof_best: 'Fresher, brighter, more awake.',
    proof_less: 'Shadowed, heavy, washed down.',
    seen_on_you: [{ lifts: 'Peach blouse', flattens: 'Black crew' }, { lifts: 'Camel trench', flattens: 'Charcoal coat' }, { lifts: 'Aqua knit', flattens: 'Deep burgundy' }],
  },
  'Warm Spring': {
    family: 'warm',
    voice: 'Drenched in pure golden hour light. Your palette is rich, warm, and mid-toned. The system anchors your wardrobe in luxurious camels, warm tan leathers, and glowing marigolds that pull out your natural vitality.',
    summary: 'Golden, sunny, mid-toned — pure golden hour.',
    palette: [
      ['#F0DCA8', '#E8C878', '#E0AE5A', '#D89440', '#C87834', '#B8A048'],
      ['#A8B468', '#84A054', '#5E9460', '#4E9C88', '#4A94A0', '#5484A8'],
      ['#5870A0', '#7C6AA0', '#A87498', '#C07484', '#D08070', '#E09A6C'],
    ],
    neutrals: [B('Cream', '#F4EAD0'), B('Warm sand', '#E2CCA0'), B('Camel', '#C89E62'), B('Golden brown', '#A0784A'), B('Warm marine', '#3E5A6E'), B('Chestnut', '#6E4E32')],
    stars: [B('Marigold', '#E8A83C'), B('Warm tan', '#C89468'), B('Grass green', '#7CA050'), B('Warm turquoise', '#3EA0A0')],
    accents: [B('Tomato red', '#D05438'), B('Golden cream', '#F0E0B0'), B('Amber', '#D28C38'), B('Warm navy', '#34506E')],
    avoid: [B('Icy pink', '#F2D6DF'), B('Pure white', '#FFFFFF'), B('Cool charcoal', '#3E4248'), B('Magenta', '#B23A72'), B('Cool lavender', '#C9C2E0'), B('Icy blue', '#C6DAE8'), B('Jet black', '#111111')],
    avoid_note: 'Icy, blue-based tones fight your glow.',
    metals: { finish: 'Bright / Polished', approved: ['Yellow gold', 'Bronze', 'Copper'], prohibited: ['High-shine Silver', 'Platinum', 'Chrome'] },
    metals_note: 'Bright yellow gold and polished bronze glow with your warmth.',
    proof_best: 'Golden, vital, lit from within.',
    proof_less: 'Cooler, flatter, drained.',
    seen_on_you: [{ lifts: 'Marigold shirt', flattens: 'Icy pink' }, { lifts: 'Tan leather', flattens: 'Pure white' }, { lifts: 'Turquoise dress', flattens: 'Cool charcoal' }],
  },
  'Clear Spring': {
    family: 'warm',
    voice: 'Vibrant, energetic, and highly saturated. Your warm undertone meets high clarity, meaning you brilliantly carry striking hues like poppy red, bright apple green, and warm turquoise. The AI uses these as your statement anchors.',
    summary: 'Vivid, clear, high-contrast — colour at full volume.',
    palette: [
      ['#F4E6B4', '#F0C868', '#E8A43C', '#E07C2C', '#D05028', '#C0B040'],
      ['#94C048', '#54A448', '#289C6C', '#20A0A0', '#2088B8', '#3068B0'],
      ['#2E4A9C', '#5C3E9C', '#8C3E94', '#B03878', '#C83C54', '#E06848'],
    ],
    neutrals: [B('Cream', '#F4ECD8'), B('Slate grey', '#5E6672'), B('Warm charcoal', '#44403C'), B('Navy', '#26324E'), B('Warm taupe', '#A08A70'), B('Espresso', '#3E2E22')],
    stars: [B('Poppy red', '#D83C30'), B('Apple green', '#68B044'), B('Warm turquoise', '#20A4A8'), B('Marigold', '#ECA82C')],
    accents: [B('Violet', '#6448A8'), B('Hot coral', '#E85C48'), B('Bright navy', '#2A3C74'), B('Warm white', '#F6F0E0')],
    avoid: [B('Dusty mauve', '#B090A8'), B('Muted sage', '#A8AC90'), B('Pastel lavender', '#D2C8E4'), B('Oatmeal', '#DCCCB0'), B('Dusty rose', '#C89AA0'), B('Heathered grey', '#A8A4A0'), B('Muted olive', '#8A8468')],
    avoid_note: 'Dusty, muted tones dim your clarity.',
    metals: { finish: 'High-shine / Polished', approved: ['Yellow gold', 'Rose gold', 'Gold'], prohibited: ['Matte Pewter', 'Brushed Silver', 'Antique finishes'] },
    metals_note: 'High-shine gold matches your clarity — never matte, never antique.',
    proof_best: 'Sharper, brighter, more present.',
    proof_less: 'Muddy, faded, softened away.',
    seen_on_you: [{ lifts: 'Poppy red knit', flattens: 'Dusty mauve' }, { lifts: 'Bright navy blazer', flattens: 'Muted sage' }, { lifts: 'Turquoise silk', flattens: 'Oatmeal' }],
  },
  'Light Summer': {
    family: 'cool',
    voice: 'An airy, ethereal spectrum. Your features thrive in light, cool, chalky pastels—soft lavender, ice blue, and seafoam. The AI pairs this palette with fluid, light-catching fabrics like silk and linen.',
    summary: 'Airy, cool, chalky — light as sea glass.',
    palette: [
      ['#EAE4DC', '#DCD8E4', '#C8D2E4', '#B0C6E0', '#9CB8D8', '#C4CCD8'],
      ['#B8D4CC', '#9CC8B8', '#84BCB4', '#88B4C8', '#94A8CC', '#A89CC8'],
      ['#B894BC', '#C88CA8', '#D094A0', '#C4A0B0', '#A8A0C0', '#8C98B8'],
    ],
    neutrals: [B('Soft white', '#F2F0EC'), B('Rose beige', '#E0CEC4'), B('Light slate', '#AAB2BE'), B('Cool taupe', '#B0A49C'), B('Dove grey', '#C6C4C2'), B('Cocoa', '#7A6458')],
    stars: [B('Soft lavender', '#B0A0CC'), B('Ice blue', '#A8C8E0'), B('Seafoam', '#9CC8B8'), B('Powder pink', '#E0B4C0')],
    accents: [B('Light periwinkle', '#98A8D4'), B('Dusty rose', '#C898A4'), B('Soft aqua', '#8CC0C4'), B('Cloud grey', '#C8CCD2')],
    avoid: [B('Mustard', '#C89428'), B('Deep terracotta', '#A85434'), B('Jet black', '#111111'), B('Electric blue', '#2244CC'), B('Warm camel', '#C29050'), B('Brick red', '#963A2E'), B('Golden yellow', '#E0A828')],
    avoid_note: 'Hot, heavy earth tones overpower your lightness.',
    metals: { finish: 'Brushed / Matte', approved: ['Silver', 'Platinum', 'White gold'], prohibited: ['Yellow Gold', 'Bronze', 'Copper'] },
    metals_note: 'Brushed silver settles softly into your cool light.',
    proof_best: 'Luminous, rested, softly lifted.',
    proof_less: 'Sallow, heavy, overpowered.',
    seen_on_you: [{ lifts: 'Ice blue shirt', flattens: 'Mustard' }, { lifts: 'Lavender knit', flattens: 'Terracotta' }, { lifts: 'Seafoam dress', flattens: 'Jet black' }],
  },
  'True Summer': {
    family: 'cool',
    voice: 'The epitome of understated elegance. Your palette is crisp, cool, and mid-toned, dominated by sea blues, berry tones, and slaty taupes. The engine uses these to build a timeless, sophisticated uniform.',
    summary: 'Crisp, cool, mid-toned — quiet sophistication.',
    palette: [
      ['#E4E0DC', '#CCD2DC', '#A8BCD4', '#8AA8C8', '#7090B4', '#98A4B8'],
      ['#A0C0B8', '#7CACA4', '#5C9898', '#5088A4', '#5C7CA8', '#68709C'],
      ['#786CA0', '#8C6494', '#A06088', '#B06C8C', '#A87890', '#94809C'],
    ],
    neutrals: [B('Soft white', '#F0EEEA'), B('Slate', '#6E7888'), B('Cool taupe', '#A89C94'), B('Rose brown', '#8E6E68'), B('Grey flannel', '#8A8C90'), B('Deep slate', '#4A5464')],
    stars: [B('Sea blue', '#4880A8'), B('True berry', '#A04870'), B('Slate blue', '#68809C'), B('Cool rose', '#C08498')],
    accents: [B('Soft teal', '#5C9498'), B('Plum', '#7C5878'), B('Powder blue', '#A0BCD4'), B('Mauve', '#A88098')],
    avoid: [B('Neon orange', '#F06018'), B('Golden yellow', '#E0A828'), B('Brick red', '#963A2E'), B('Mustard', '#C89428'), B('Warm camel', '#C29050'), B('Rust', '#A8603C'), B('Olive', '#5A5836')],
    avoid_note: 'Hot, golden tones clash with your coolness.',
    metals: { finish: 'Brushed / Matte', approved: ['Silver', 'Pewter', 'White gold'], prohibited: ['Yellow Gold', 'Copper', 'Bronze'] },
    metals_note: 'Brushed silver and matte pewter read as quietly expensive on you.',
    proof_best: 'Even, polished, quietly lifted.',
    proof_less: 'Flushed, hot, out of tune.',
    seen_on_you: [{ lifts: 'Sea blue shirt', flattens: 'Golden yellow' }, { lifts: 'Berry knit', flattens: 'Rust' }, { lifts: 'Slate blazer', flattens: 'Warm camel' }],
  },
  'Soft Summer': {
    family: 'cool',
    voice: 'Like a coastal landscape veiled in morning mist. Your palette is cool, soft, and beautifully desaturated. The engine sources heathered greys, dusty blues, and muted plums that feel effortlessly relaxed.',
    summary: 'Misty, muted, cool — coastal morning light.',
    palette: [
      ['#E2DEDA', '#CCC8CC', '#B0B4C0', '#94A0B0', '#7C8CA0', '#9C9AA4'],
      ['#A4B4AC', '#8AA098', '#708C88', '#68848C', '#6C7C90', '#747490'],
      ['#7C6C8C', '#8C6880', '#986C7C', '#A47C84', '#94808C', '#847C94'],
    ],
    neutrals: [B('Soft white', '#F0EEEA'), B('Rose beige', '#DCCAC0'), B('Heather grey', '#B4B0AE'), B('Light slate', '#9AA2AE'), B('Mushroom', '#A89A90'), B('Cocoa', '#7A6458')],
    stars: [B('Dusty blue', '#7C94AC'), B('Muted plum', '#8C6880'), B('Soft sage', '#96A894'), B('Heathered rose', '#B08C94')],
    accents: [B('Slate teal', '#68888C'), B('Dusty mauve', '#A4889C'), B('Smoke blue', '#8C9CB0'), B('Grey pearl', '#C4C2C6')],
    avoid: [B('Neon orange', '#F06018'), B('Golden yellow', '#E0A828'), B('Brick red', '#963A2E'), B('Mustard', '#C89428'), B('Jet black', '#111111'), B('Bright white', '#FFFFFF'), B('Electric blue', '#2244CC')],
    avoid_note: 'Loud, saturated colour drowns your softness.',
    metals: { finish: 'Brushed / Satin', approved: ['Silver', 'Platinum', 'White gold'], prohibited: ['Yellow Gold', 'Copper', 'High-shine Chrome'] },
    metals_note: 'Satin platinum and brushed silver blend into your mist, never glare.',
    proof_best: 'Softer, smoother, harmonised.',
    proof_less: 'Harsh, stark, washed out.',
    seen_on_you: [{ lifts: 'Dusty blue shirt', flattens: 'Bright white' }, { lifts: 'Plum knit', flattens: 'Golden yellow' }, { lifts: 'Sage dress', flattens: 'Jet black' }],
  },
  'Soft Autumn': {
    family: 'warm',
    voice: "Inspired by nature's shifting light—rich, muted, and beautifully grounded. Your palette relies on sophisticated, organic mid-tones like sage, mauve, and oatmeal. The engine uses this to curate an incredibly cohesive, low-contrast wardrobe.",
    summary: 'Warm, low in contrast, a little dusty.',
    palette: [
      ['#DCC8AC', '#C8A982', '#C2925A', '#B5774A', '#9C5638', '#8A8048'],
      ['#7E8E6E', '#5A6E50', '#3E5E48', '#2E6A66', '#2C5E66', '#355A66'],
      ['#2E3A52', '#3A3450', '#4E3A50', '#5E3340', '#7A3A42', '#9A5A4E'],
    ],
    neutrals: [B('Cream', '#EDE5D5'), B('Oat', '#D8C7AC'), B('Wheat', '#B89A78'), B('Taupe', '#8E7458'), B('Olive grey', '#6E6A52'), B('Cocoa', '#4A3A2C')],
    stars: [B('Sage', '#6E7E64'), B('Olive', '#5A5836'), B('Teal', '#2C6066'), B('Rust', '#A8603C')],
    accents: [B('Muted coral', '#C97A5E'), B('Camel', '#C2925A'), B('Warm taupe', '#8A7458'), B('Soft navy', '#33405C')],
    avoid: [B('Bright white', '#FFFFFF'), B('Icy pink', '#F2D6DF'), B('Cool lavender', '#C9C2E0'), B('Bright blue', '#2E54C8'), B('Fuchsia', '#B23A72'), B('Cool grey', '#9AA0A6'), B('Jet black', '#111111')],
    avoid_note: 'They pull focus from your warmth.',
    metals: { finish: 'Brushed / Matte', approved: ['Gold', 'Bronze', 'Rose gold'], prohibited: ['High-shine Silver', 'Chrome', 'Platinum'] },
    metals_note: 'Brushed, not bright. Warm metals settle into your skin instead of sitting on top of it.',
    proof_best: 'Warmer, healthier, more even.',
    proof_less: 'Cooler, duller, more redness.',
    seen_on_you: [{ lifts: 'Olive shirt', flattens: 'Pale blue' }, { lifts: 'Rust knit', flattens: 'Hot pink' }, { lifts: 'Camel blazer', flattens: 'Cool grey' }],
  },
  'True Autumn': {
    family: 'warm',
    voice: 'Rich, spice-toned, and intensely warm. Your palette thrives on the heavy, saturated colors of changing leaves—terracotta, deep olive, and burnished copper. The AI weaves these textures through your tailoring and outerwear.',
    summary: 'Rich, spiced, intensely warm — changing leaves.',
    palette: [
      ['#E0C494', '#D0A860', '#C08840', '#B06830', '#984C28', '#907C34'],
      ['#788048', '#5C6C38', '#48602C', '#3E6A54', '#3C6468', '#48586C'],
      ['#3E4460', '#563C58', '#6E3C4C', '#84383C', '#9A4838', '#B06844'],
    ],
    neutrals: [B('Cream', '#F0E4C8'), B('Coffee', '#6E5238'), B('Warm terracotta', '#B06438'), B('Olive', '#5E5A34'), B('Camel', '#C09258'), B('Dark chocolate', '#44301F')],
    stars: [B('Terracotta', '#B85C34'), B('Deep olive', '#5A5E2C'), B('Burnished copper', '#A86234'), B('Forest teal', '#2E5C58')],
    accents: [B('Mustard', '#C89430'), B('Warm burgundy', '#7A3A34'), B('Pumpkin', '#C87838'), B('Deep navy', '#2A3A52')],
    avoid: [B('Icy blue', '#C6DAE8'), B('Stark white', '#FFFFFF'), B('Magenta', '#B23A72'), B('Hot fuchsia', '#D8388C'), B('Cool lavender', '#C9C2E0'), B('Cool grey', '#9AA0A6'), B('Icy pink', '#F2D6DF')],
    avoid_note: 'Icy, blue-based colour argues with your fire.',
    metals: { finish: 'Antique / Textured', approved: ['Gold', 'Bronze', 'Copper'], prohibited: ['High-shine Silver', 'Platinum', 'Chrome'] },
    metals_note: 'Antique gold and textured bronze deepen your natural spice.',
    proof_best: 'Richer, grounded, glowing.',
    proof_less: 'Chalky, cold, disconnected.',
    seen_on_you: [{ lifts: 'Terracotta knit', flattens: 'Icy blue' }, { lifts: 'Olive jacket', flattens: 'Stark white' }, { lifts: 'Copper silk', flattens: 'Magenta' }],
  },
  'Dark Autumn': {
    family: 'warm',
    voice: 'An opulent, shadow-filled warmth. Your palette is deep and anchored in the earth—think forest green, dark chocolate wool, and rich espresso. The system uses these heavy values to create grounding, luxurious columns of color.',
    summary: 'Deep, warm, shadowed — opulent earth.',
    palette: [
      ['#C8A870', '#B08848', '#986C34', '#845428', '#6C3E20', '#6E6428'],
      ['#585C2C', '#404E24', '#2C441E', '#24483E', '#204048', '#2C3A50'],
      ['#26304A', '#3C2C48', '#502C40', '#602830', '#742E2C', '#8C4630'],
    ],
    neutrals: [B('Cream', '#EEE2C4'), B('Black-brown', '#2E2018'), B('Deep olive', '#4A482A'), B('Mahogany', '#5E3226'), B('Espresso', '#3A2A1E'), B('Warm stone', '#A89474')],
    stars: [B('Forest green', '#2C4A2E'), B('Dark chocolate', '#4A3222'), B('Burgundy', '#642832'), B('Burnt orange', '#A85428')],
    accents: [B('Deep teal', '#1E4A4C'), B('Aubergine', '#46283E'), B('Antique gold', '#B08838'), B('Dark camel', '#A07C48')],
    avoid: [B('Pastel pink', '#F2D0DA'), B('Icy lavender', '#DCD4EC'), B('Stark white', '#FFFFFF'), B('Neon blue', '#2848E8'), B('Powder blue', '#B8D0E4'), B('Cool grey', '#9AA0A6'), B('Icy mint', '#C8ECD8')],
    avoid_note: 'Pale pastels evaporate against your depth.',
    metals: { finish: 'Burnished / Antique', approved: ['Yellow gold', 'Bronze', 'Copper'], prohibited: ['High-shine Silver', 'Platinum', 'White gold'] },
    metals_note: 'Burnished gold and antique bronze hold their own against your depth.',
    proof_best: 'Deeper, richer, more magnetic.',
    proof_less: 'Faded, thin, washed away.',
    seen_on_you: [{ lifts: 'Forest green coat', flattens: 'Pastel pink' }, { lifts: 'Burgundy knit', flattens: 'Powder blue' }, { lifts: 'Espresso tailoring', flattens: 'Stark white' }],
  },
  'Clear Winter': {
    family: 'cool',
    voice: 'Inspired by crisp, midnight light. Your palette is defined by high saturation and icy clarity. The engine focuses on pure jewel tones, sharp onyx, and optic whites to match your vivid natural presence.',
    summary: 'Icy, saturated, vivid — midnight clarity.',
    palette: [
      ['#F2F4F6', '#D8E4F0', '#B0CCEC', '#7CA8E4', '#4478D0', '#8890A0'],
      ['#48B0A8', '#189088', '#0C7864', '#186890', '#2050A8', '#3038A0'],
      ['#2C2C74', '#582890', '#8C2088', '#B01870', '#C82048', '#111114'],
    ],
    neutrals: [B('Pure white', '#FDFDFD'), B('Jet black', '#101012'), B('Charcoal', '#33373D'), B('Steel grey', '#6E7682'), B('Icy grey', '#D4D8DE'), B('Midnight navy', '#1A2440')],
    stars: [B('Emerald', '#0C8058'), B('Sapphire', '#1E4EA8'), B('Ruby red', '#C41E3E'), B('Hot pink', '#D8247C')],
    accents: [B('Icy blue', '#BCD6F0'), B('Violet', '#5C2E9C'), B('Optic white', '#FBFBFB'), B('True teal', '#0E7E86')],
    avoid: [B('Mustard', '#C89428'), B('Earthy olive', '#6E6A3E'), B('Warm camel', '#C29050'), B('Dusty coral', '#CC8470'), B('Oatmeal', '#DCCCB0'), B('Terracotta', '#B06438'), B('Warm taupe', '#A08A70')],
    avoid_note: 'Earthy, muted warmth dulls your edge.',
    metals: { finish: 'High-shine / Polished', approved: ['Silver', 'Chrome', 'White gold'], prohibited: ['Antique Gold', 'Bronze', 'Copper'] },
    metals_note: 'High-shine silver and chrome mirror your icy clarity.',
    proof_best: 'Sharper, clearer, electric.',
    proof_less: 'Muddy, softened, dimmed.',
    seen_on_you: [{ lifts: 'Emerald silk', flattens: 'Mustard' }, { lifts: 'Optic white shirt', flattens: 'Oatmeal' }, { lifts: 'Sapphire dress', flattens: 'Camel' }],
  },
  'True Winter': {
    family: 'cool',
    voice: 'Pure, unadulterated coolness. Your palette eliminates all traces of warmth, focusing entirely on stark silvers, electric blues, and icy pinks. The system treats these as your absolute wardrobe foundations.',
    summary: 'Stark, cool, uncompromising — pure winter.',
    palette: [
      ['#F4F6F8', '#DCE2EC', '#B8C4DC', '#8898C0', '#5870A8', '#8C94A8'],
      ['#4CA096', '#188478', '#0C6C5C', '#145C88', '#1C489C', '#282C90'],
      ['#242460', '#4C2084', '#801C80', '#A81468', '#BC1C44', '#0E0E12'],
    ],
    neutrals: [B('Pure white', '#FDFDFD'), B('Jet black', '#101012'), B('Dark slate', '#3A4250'), B('Midnight blue', '#182240'), B('Cool grey', '#9AA2AC'), B('Icy silver', '#DCE0E6')],
    stars: [B('Electric blue', '#2242C8'), B('Icy pink', '#E8B8CC'), B('True red', '#C01830'), B('Royal purple', '#4C2488')],
    accents: [B('Cool emerald', '#0E7858'), B('Stark silver', '#C8CED6'), B('Fuchsia', '#C41E78'), B('Ice lavender', '#C8C4E4')],
    avoid: [B('Neon orange', '#F06018'), B('Golden yellow', '#E0A828'), B('Brick red', '#963A2E'), B('Mustard', '#C89428'), B('Camel', '#C29050'), B('Olive', '#5A5836'), B('Terracotta', '#B06438')],
    avoid_note: 'Golden warmth has no place on your canvas.',
    metals: { finish: 'High-shine / Polished', approved: ['Silver', 'Platinum', 'White gold'], prohibited: ['Yellow Gold', 'Bronze', 'Copper'] },
    metals_note: 'Polished platinum and silver keep your look glacially precise.',
    proof_best: 'Crisper, brighter, defined.',
    proof_less: 'Sallow, warm, blurred.',
    seen_on_you: [{ lifts: 'True red coat', flattens: 'Brick red' }, { lifts: 'Icy pink silk', flattens: 'Golden yellow' }, { lifts: 'Black tailoring', flattens: 'Olive' }],
  },
  'Dark Winter': {
    family: 'cool',
    voice: 'A palette of profound depth and cool mystery. Your colors are dark and saturated—think rich bordeaux, midnight navy, and deep charcoal. The AI uses these dense tones to anchor your most powerful silhouettes.',
    summary: 'Dark, cool, saturated — profound depth.',
    palette: [
      ['#E8ECF0', '#C0CCDC', '#8CA0C0', '#5C74A0', '#3C5488', '#787E90'],
      ['#347C74', '#106456', '#0A5044', '#12486C', '#1A3684', '#242470'],
      ['#1C1C4C', '#3C1868', '#641468', '#8C1054', '#A01838', '#0C0C10'],
    ],
    neutrals: [B('Jet black', '#101012'), B('Pure white', '#FDFDFD'), B('Charcoal', '#2E3238'), B('Deep navy', '#141E38'), B('Dark plum', '#3A2440'), B('Graphite', '#4A4E56')],
    stars: [B('Bordeaux', '#5E1428'), B('Midnight navy', '#141E38'), B('Deep emerald', '#0C5844'), B('Blackberry', '#3C1C44')],
    accents: [B('Deep teal', '#0E4C54'), B('Icy contrast white', '#F6F8FA'), B('Dark fuchsia', '#901458'), B('Storm grey', '#585E68')],
    avoid: [B('Pastel yellow', '#F4ECB0'), B('Warm terracotta', '#B06438'), B('Camel', '#C29050'), B('Peach', '#F0B088'), B('Oatmeal', '#DCCCB0'), B('Warm tan', '#C89468'), B('Mustard', '#C89428')],
    avoid_note: 'Warm earth tones unravel your cool depth.',
    metals: { finish: 'Polished / High-shine', approved: ['White gold', 'Silver', 'Platinum'], prohibited: ['Antique Gold', 'Copper', 'Bronze'] },
    metals_note: 'Polished white gold cuts cleanly against your darkness.',
    proof_best: 'Powerful, sculpted, intense.',
    proof_less: 'Dusty, warm, diluted.',
    seen_on_you: [{ lifts: 'Bordeaux velvet', flattens: 'Camel' }, { lifts: 'Midnight tailoring', flattens: 'Oatmeal' }, { lifts: 'Emerald silk', flattens: 'Peach' }],
  },
};

// ── Undertone + contrast voice (from the Colour Harmony matrix sheet) ─
export const UNDERTONE_COPY = {
  'Cool': 'The permanent thermal tone beneath your surface skin is icy and crisp. Your features are electrified by silver hardware and clear, cool-toned pigments.',
  'Warm': 'Your skin possesses a golden, sun-baked undertone that radiates when paired with yellow gold, rich creams, and earthy pigments.',
  'Neutral-Cool': 'You sit precisely between cool and neutral, with a slight bias toward crisp undertones. You carry mixed metals beautifully, though silver grounds you.',
  'Neutral-Warm': 'A rare, highly versatile balance. Your skin thrives in soft gold, champagne finishes, and gentle, organic warmth.',
};

export const UNDERTONE_NOTE = {
  'Cool': 'Silver sits closer to your skin than gold. Coolness reads first.',
  'Warm': 'Gold sits closer to your skin than silver. Warmth reads first.',
  'Neutral-Cool': 'Mixed metals work, but silver grounds you.',
  'Neutral-Warm': 'Mixed metals work, but soft gold grounds you.',
};

export const CONTRAST_COPY = {
  'High': 'There is a striking value gap between your hair, skin, and eyes. You can wear bold, high-contrast pairings without the clothes wearing you.',
  'Extremely High': 'There is a striking value gap between your hair, skin, and eyes. You can wear bold, high-contrast pairings without the clothes wearing you.',
  'Medium': 'Your features possess a balanced, fluid depth. Your contrast formula thrives on intentional layers.',
  'Low': "Your features are naturally soft, muted, and blended. The engine layers sophisticated mid-tones to build expensive-looking dimension — never harsh black-and-white.",
};

// ── The 5-Body Archetype Design Matrix (Master Archetype Registry) ────
export const BODIES = {
  'Hourglass': {
    label: 'Symmetrical Balance',
    profile: 'Shoulders and hips match closely in horizontal alignment; the waist is significantly narrower and highly defined.',
    summary: 'Balanced top to bottom with a waist that wants showing.',
    traits: ['Balanced shoulders & hips', 'Defined waist', 'Proportional curves', 'Strong lower body'],
    dresses: [
      { name: 'True wrap dress', note: 'Articulates the waist' },
      { name: 'Tailored fit & flare', note: 'Releases below the waist' },
      { name: 'Belted midi', note: 'A clean vertical canvas' },
      { name: 'Contoured column', note: 'Darting, not compression' },
    ],
    necklines: ['Deep surplice V', 'Sculpted scoop', 'Architectural square', 'Collared V'],
    tips: ['Anchor the true waist', 'Mirror your volumes', 'Fluid, draping fabrics', 'Skin break at wrists'],
    maxims: [
      'Always anchor outfits at the true waist.',
      'Keep upper and lower body volumes perfectly mirrored.',
      'Prioritize fluid fabrics with natural drape — silk, viscose, tropical wool.',
      'Use the skin break technique at the wrists or ankles to lighten visual weight.',
    ],
  },
  'Pear': {
    label: 'Lower-Register Emphasis',
    profile: 'The horizontal plane of the hips is wider than the shoulders; the torso is typically lean with a distinct waist.',
    summary: 'A lean frame that settles into a strong, grounded lower line.',
    traits: ['Narrower shoulders', 'Defined waist', 'Fuller hips & thigh', 'Strong lower body'],
    dresses: [
      { name: 'Structured A-line', note: 'Skims the hips' },
      { name: 'Prominent-shoulder shift', note: 'Broadens the upper line' },
      { name: 'Empire-line maxi', note: 'Elongates the lower line' },
      { name: 'Panel-detail trapeze', note: 'Releases into panels' },
    ],
    necklines: ['Wide boatneck', 'Deep sweetheart', 'Off-the-shoulder', 'Horizontal cowl'],
    tips: ['Draw the eye upward', 'Matte, clean-cut bottoms', 'Crop outerwear high', 'Subtle shoulder structure'],
    maxims: [
      'Draw the eye upward with upper-body texture or horizontal necklines.',
      'Choose deep, matte, clean-cut fabrics for trousers and skirts.',
      'Ensure outerwear cuts either above the hip or below the widest point of the thigh.',
      'Use subtle shoulder padding to structurally balance the lower register.',
    ],
  },
  'Rectangle': {
    label: 'Linear Silhouette',
    profile: 'Shoulders, waist, and hips sit on a relatively even horizontal plane; the silhouette is highly linear with minimal waist definition.',
    summary: 'A sleek, linear frame built for architectural shape-making.',
    traits: ['Even shoulders & hips', 'Soft waist line', 'Straight, lean frame', 'Athletic balance'],
    dresses: [
      { name: 'Engineered panel sheath', note: 'Simulates a waist' },
      { name: 'Dropped-waist midi', note: 'Celebrates the torso' },
      { name: 'Asymmetric draped overlay', note: 'Breaks the line' },
      { name: 'Structured shift', note: 'Boxy, editorial drape' },
    ],
    necklines: ['High mock-neck', 'Deep V-neck', 'Halter', 'One-shoulder'],
    tips: ['Contrast colour blocking', 'Belt over structure only', 'Bias-cut slips', 'Crisp, heavy fabrics'],
    maxims: [
      'Use high-contrast color blocking to break the silhouette into dynamic proportions.',
      'Use oversized belts only over structured jackets or heavy knits to create artificial dimension.',
      'Embrace fluid, bias-cut slips that flow elegantly across a straight frame.',
      'Use crisp, heavy-weight fabrics — structured cotton, heavy linen, bonded wool — to build architectural shapes.',
    ],
  },
  'Inverted Triangle': {
    label: 'Upper-Register Emphasis',
    profile: 'Strong, broad shoulders and a prominent bustline tapering down to narrow hips and lean legs.',
    summary: 'A strong upper line tapering into lean hips and legs.',
    traits: ['Broader shoulders', 'Narrower hips', 'Lean lower body', 'Strong upper line'],
    dresses: [
      { name: 'Pleated-skirt shirt dress', note: 'Balances the lower half' },
      { name: 'Flared peplum midi', note: 'Structure at the hip' },
      { name: 'Tiered bohemian maxi', note: 'Weight at the hem' },
      { name: 'Tulip dress', note: 'Curves the lower line' },
    ],
    necklines: ['Deep vertical V', 'Clean scoop', 'One-shoulder', 'Raglan halter'],
    tips: ['Unadorned top half', 'Wide-leg trousers', 'Unbelted layers', 'Substantial footwear'],
    maxims: [
      'Keep the canvas on the top half entirely unadorned — no ruffles, heavy patterns, or wide lapels.',
      'Use wide-leg, cargo, or pleated trouser silhouettes to widen the lower stance.',
      'Opt for open, unstructured cardigans and trenches left unbelted to slice the shoulder width.',
      'Choose footwear with visual substance — chunky heels, platforms, or bold leather — to ground the look.',
    ],
  },
  'Apple': {
    label: 'Centric Volume',
    profile: 'Weight is distributed primarily around the midsection and upper torso; the legs and arms are typically very lean and beautifully sculpted.',
    summary: 'Centre-carried volume over beautifully lean legs and arms.',
    traits: ['Fuller midsection', 'Soft waist line', 'Slimmer legs', 'Balanced shoulders'],
    dresses: [
      { name: 'Raised empire midi', note: 'Floats over the middle' },
      { name: 'Crisp column shift', note: 'Attention on the legs' },
      { name: 'Asymmetric wrap', note: 'Diagonal lengthens' },
      { name: 'Box-pleat trapeze', note: 'Avant-garde ease' },
    ],
    necklines: ['Open V-neck', 'Deep scoop', 'Split neck', 'Portrait neckline'],
    tips: ['Column dressing', 'Show wrists & ankles', 'No tight waist belts', 'Fluid layering pieces'],
    maxims: [
      'Monochromatic or column dressing — same tone inside, open contrasting layer on top — is exceptionally powerful.',
      'Show off the leanest assets: sleeves cropped to 3/4 length, hemlines at the knee or midi-calf.',
      'Avoid tight belts across the midsection.',
      'Look for unstructured, fluid layering pieces — linen blazers, silk kimonos, fine-gauge duster cardigans.',
    ],
  },
};

// ── Classifiers (PRD §4.2 + §5.1) ─────────────────────────────────────

export function classifySeason({ undertone, contrast, chroma, lightness }) {
  const warm = undertone === 'Warm' || undertone === 'Neutral-Warm';
  const hi = contrast === 'High' || contrast === 'Extremely High';
  if (warm) {
    if (hi) {
      if (chroma === 'High') return 'Clear Spring';
      return 'Dark Autumn';
    }
    if (contrast === 'Medium') {
      if (chroma === 'High') return 'Warm Spring';
      return 'True Autumn';
    }
    if (lightness === 'High') return 'Light Spring';
    return 'Soft Autumn';
  }
  if (contrast === 'Extremely High') return 'Dark Winter';
  if (hi) {
    if (lightness === 'Low') return 'Dark Winter';
    if (chroma === 'High') return 'Clear Winter';
    return 'True Winter';
  }
  if (contrast === 'Medium') {
    if (chroma === 'High') return 'Clear Winter';
    return 'True Summer';
  }
  if (lightness === 'High') return 'Light Summer';
  return 'Soft Summer';
}

export function classifyBody({ shoulder_waist, hip_waist, shoulder_hip, loose_clothing }) {
  const sw = Number(shoulder_waist) || 1;
  const hw = Number(hip_waist) || 1;
  const sh = Number(shoulder_hip) || 1;
  if (sw >= 1.2 && hw >= 1.2 && sh >= 0.9 && sh <= 1.1) return { body_type: 'Hourglass', fallback_applied: false };
  if (1 / sh >= 1.10 && hw >= 1.20) return { body_type: 'Pear', fallback_applied: false };
  if (sh >= 1.15 && sw >= 1.20) return { body_type: 'Inverted Triangle', fallback_applied: false };
  if (sw <= 1 && hw <= 1) return { body_type: 'Apple', fallback_applied: false };
  const flat = Math.abs(sw - 1) <= 0.10 && Math.abs(hw - 1) <= 0.10 && Math.abs(sh - 1) <= 0.10;
  if (flat && loose_clothing) return { body_type: 'Rectangle', fallback_applied: true };
  if (flat) return { body_type: 'Rectangle', fallback_applied: false };
  // Nearest-neighbour resolution for shapes that sit between thresholds
  if (sh > 1.05 && sw > hw) return { body_type: 'Inverted Triangle', fallback_applied: false };
  if (sh < 0.95 && hw > sw) return { body_type: 'Pear', fallback_applied: false };
  if (sw >= 1.15 && hw >= 1.15) return { body_type: 'Hourglass', fallback_applied: false };
  return { body_type: 'Rectangle', fallback_applied: true };
}

// ── Composers: extraction primitives → render JSON + style_dna ────────

const CONTRAST_DISPLAY = { 'Low': 'Low, blended', 'Medium': 'Medium', 'High': 'High contrast', 'Extremely High': 'High contrast' };
const UNDERTONE_DISPLAY = { 'Warm': 'Warm', 'Cool': 'Cool', 'Neutral-Warm': 'Neutral', 'Neutral-Cool': 'Neutral' };

export function buildColorHarmony(x) {
  let undertone = UNDERTONE_COPY[x.undertone] ? x.undertone : (x.low_confidence ? 'Neutral-Warm' : 'Warm');
  const contrast = CONTRAST_COPY[x.contrast] ? x.contrast : 'Medium';
  const primitiveSeason = classifySeason({ undertone, contrast, chroma: x.chroma, lightness: x.lightness });
  // The model's holistic season call (reasoned against the full 12-season
  // rubric) wins over the coarse primitive mapping; the mapping stays as the
  // deterministic fallback and a cross-check recorded in the DNA.
  const season = SEASONS[x.season] ? x.season : primitiveSeason;
  const s = SEASONS[season];
  const warmSeason = s.family === 'warm';
  const warmUndertone = undertone === 'Warm' || undertone === 'Neutral-Warm';
  if (warmSeason !== warmUndertone) undertone = warmSeason ? 'Neutral-Warm' : 'Neutral-Cool';
  const best = s.stars.concat(s.accents);
  const render = {
    season,
    undertone: UNDERTONE_DISPLAY[undertone],
    contrast: CONTRAST_DISPLAY[contrast],
    summary: s.summary,
    undertone_note: UNDERTONE_NOTE[undertone],
    palette: s.palette.flat(),
    neutrals: s.neutrals,
    best_colours: best,
    avoid_colours: s.avoid,
    avoid_note: s.avoid_note,
    proof_best: s.proof_best,
    proof_less: s.proof_less,
    seen_on_you: s.seen_on_you,
    metals: s.metals.approved.map(name => ({ name, hexes: METAL_GRADIENTS[name] || METAL_GRADIENTS['Gold'] })),
    metals_note: s.metals_note,
  };
  const dna = {
    archetype_name: season,
    verified_undertone: undertone,
    calculated_contrast: contrast,
    refinement_needed: !!x.low_confidence,
    classification: {
      source: SEASONS[x.season] ? 'holistic' : 'primitive_mapping',
      primitive_season: primitiveSeason,
      agreement: primitiveSeason === season,
      reasoning: x.season_reasoning || null,
    },
    extracted_values: {
      skin_tone_hex: x.skin_tone_hex || null,
      hair_color_hex: x.hair_color_hex || null,
      eye_color_hex: x.eye_color_hex || null,
    },
    eighteen_shade_matrix: {
      row_1_warm_mutes: s.palette[0],
      row_2_earth_greens: s.palette[1],
      row_3_deep_velvets: s.palette[2],
    },
    functional_sub_palettes: {
      best_neutrals: s.neutrals.map(n => n.name),
      primary_stars: s.stars.map(n => n.name),
      secondary_accents: s.accents.map(n => n.name),
      avoid_list: s.avoid.map(n => n.name),
    },
    metals_rules: {
      finish_type: s.metals.finish,
      approved_metals: s.metals.approved,
      prohibited_metals: s.metals.prohibited,
    },
    stylist_voice: s.voice,
  };
  return { render, dna };
}

export function buildSilhouette(x) {
  const ratioResult = classifyBody(x);
  // The model's holistic, pose-corrected shape call wins over the raw width
  // ratios (which mirror-selfie arms and camera angle distort); ratios remain
  // the deterministic fallback and a cross-check recorded in the DNA.
  const holistic = BODIES[x.body_shape] ? x.body_shape : null;
  const body_type = holistic || ratioResult.body_type;
  const fallback_applied = holistic ? false : ratioResult.fallback_applied;
  const b = BODIES[body_type];
  const render = {
    body_type: body_type,
    summary: b.summary,
    traits: b.traits,
    dress_silhouettes: b.dresses,
    neckline_recommendations: b.necklines,
    styling_tips: b.tips,
  };
  const round = v => (Number.isFinite(Number(v)) ? Math.round(Number(v) * 100) / 100 : null);
  const dna = {
    body_type,
    fallback_applied,
    classification: {
      source: holistic ? 'holistic' : 'ratio_thresholds',
      ratio_body_type: ratioResult.body_type,
      agreement: ratioResult.body_type === body_type,
      reasoning: x.shape_reasoning || null,
    },
    geometric_ratios: {
      shoulder_to_waist: round(x.shoulder_waist),
      hip_to_waist: round(x.hip_waist),
      shoulder_to_hip: round(x.shoulder_hip),
    },
    visual_traits: b.traits,
    architectural_rules: {
      dress_silhouettes: b.dresses.map(d => d.name),
      necklines: b.necklines,
      styling_maxims: b.maxims,
    },
  };
  return { render, dna };
}

// ── Downstream prompt injection (PRD §6) ──────────────────────────────

export function styleDnaPromptBlock(styleDna, wardrobeCount = 0) {
  if (!styleDna || typeof styleDna !== 'object') return '';
  const ch = styleDna.color_harmony;
  const sp = styleDna.silhouette_proportions;
  if (!ch && !sp) return '';
  const lines = ['STYLE DNA — verified styling constraints for this user:'];
  if (ch) {
    const sub = ch.functional_sub_palettes || {};
    lines.push(`Colour archetype: ${ch.archetype_name} (undertone ${ch.verified_undertone}, contrast ${ch.calculated_contrast}).`);
    if (sub.best_neutrals) lines.push(`Foundation neutrals: ${sub.best_neutrals.join(', ')}.`);
    if (sub.primary_stars) lines.push(`Star colours: ${sub.primary_stars.join(', ')}. Accents: ${(sub.secondary_accents || []).join(', ')}.`);
    if (sub.avoid_list) lines.push(`Never style them in: ${sub.avoid_list.join(', ')}.`);
    if (ch.metals_rules) lines.push(`Metals: ${(ch.metals_rules.approved_metals || []).join(', ')} (${ch.metals_rules.finish_type}); never ${(ch.metals_rules.prohibited_metals || []).join(', ')}.`);
  }
  if (sp) {
    const ar = sp.architectural_rules || {};
    lines.push(`Body architecture: ${sp.body_type}. Best dress silhouettes: ${(ar.dress_silhouettes || []).join(', ')}. Best necklines: ${(ar.necklines || []).join(', ')}.`);
    if (ar.styling_maxims) lines.push(`Styling maxims: ${ar.styling_maxims.join(' ')}`);
  }
  // User corrections always outrank the photo-derived profile.
  const uo = styleDna.user_overrides || {};
  if (Array.isArray(uo.loved_colors) && uo.loved_colors.length) {
    lines.push(`The user has personally confirmed these colours work on them (they override the avoid list on conflict): ${uo.loved_colors.join(', ')}.`);
  }
  if (Array.isArray(uo.rejected_colors) && uo.rejected_colors.length) {
    lines.push(`The user has personally rejected these colours — never style them in: ${uo.rejected_colors.join(', ')}.`);
  }
  if (uo.measurements && typeof uo.measurements === 'object') {
    const m = Object.entries(uo.measurements).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ');
    if (m) lines.push(`Exact measurements supplied by the user — trust these over any photo estimate: ${m}.`);
  }
  lines.push(wardrobeCount >= 15
    ? `SYSTEM DIRECTIVE: The user has a mature digital closet (${wardrobeCount} items). Strictly optimise for mix-and-match modularity, combining their verified closet foundations with new pieces that obey the silhouette maxims above.`
    : 'SYSTEM DIRECTIVE: The user is in an onboarding state (closet < 15 items). Do NOT over-constrain to their few uploaded items — focus on fashion-house execution matching the colour archetype and silhouette rules above, producing ideal editorial combinations.');
  return lines.join('\n');
}
