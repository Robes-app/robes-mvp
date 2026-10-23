// Style DNA deterministic mapping engine (PRD: Style DNA Core Profile Generation).
// Gemini extracts measurable primitives only; everything the user sees comes from
// this catalog so results are repeatable and editable in one place.

import { createRequire } from 'module';
// The colour and pattern model — the one source the Settings sheets, the
// analyse and this block all read (colour_model.cjs is CommonJS on purpose).
const CM = createRequire(import.meta.url)('./colour_model.cjs');

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
    voice: 'A sun-dappled, luminous canvas. Your features are bright, warm, and delicate. Robes steers clear of heavy, muddy colors, opting instead for buttermilk creams, soft peach, and warm, illuminated corals.',
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
    voice: 'Drenched in pure golden hour light. Your palette is rich, warm, and mid-toned. Robes anchors your wardrobe in luxurious camels, warm tan leathers, and glowing marigolds that pull out your natural vitality.',
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
    voice: 'Vibrant, energetic, and highly saturated. Your warm undertone meets high clarity, meaning you brilliantly carry striking hues like poppy red, bright apple green, and warm turquoise. Robes uses these as your statement anchors.',
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
    voice: 'An airy, ethereal spectrum. Your features thrive in light, cool, chalky pastels—soft lavender, ice blue, and seafoam. Robes pairs this palette with fluid, light-catching fabrics like silk and linen.',
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
    voice: 'The epitome of understated elegance. Your palette is crisp, cool, and mid-toned, dominated by sea blues, berry tones, and slaty taupes. Robes uses these to build a timeless, sophisticated uniform.',
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
    voice: 'Like a coastal landscape veiled in morning mist. Your palette is cool, soft, and beautifully desaturated. Robes sources heathered greys, dusty blues, and muted plums that feel effortlessly relaxed.',
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
    voice: "Inspired by nature's shifting light—rich, muted, and beautifully grounded. Your palette relies on sophisticated, organic mid-tones like sage, mauve, and oatmeal. Robes uses this to curate an incredibly cohesive, low-contrast wardrobe.",
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
    voice: 'Rich, spice-toned, and intensely warm. Your palette thrives on the heavy, saturated colors of changing leaves—terracotta, deep olive, and burnished copper. Robes weaves these textures through your tailoring and outerwear.',
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
    voice: 'An opulent, shadow-filled warmth. Your palette is deep and anchored in the earth—think forest green, dark chocolate wool, and rich espresso. Robes uses these heavy values to create grounding, luxurious columns of color.',
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
    voice: 'Inspired by crisp, midnight light. Your palette is defined by high saturation and icy clarity. Robes focuses on pure jewel tones, sharp onyx, and optic whites to match your vivid natural presence.',
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
    voice: 'Pure, unadulterated coolness. Your palette eliminates all traces of warmth, focusing entirely on stark silvers, electric blues, and icy pinks. Robes treats these as your absolute wardrobe foundations.',
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
    voice: 'A palette of profound depth and cool mystery. Your colors are dark and saturated—think rich bordeaux, midnight navy, and deep charcoal. Robes uses these dense tones to anchor your most powerful silhouettes.',
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
  'Low': "Your features are naturally soft, muted, and blended. Robes layers sophisticated mid-tones to build expensive-looking dimension — never harsh black-and-white.",
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

// The brief (style_dna.brief): {loves[], avoids[], rules[], notes, colours:{loved[], rejected[]}}
// — each list entry a string, or {text, source} where source ∈ drafted|edited|typed.
const BRIEF_LINE_MAX = 160;
// A line with no letters ("6" — a stray count from the walk's + Your own)
// is not a line; the same line twice ("You do not wear combat boots" kept
// from two observations) is one line.
export function briefList(a) {
  if (!Array.isArray(a)) return [];
  const seen = new Set();
  return a.map(x => (x && typeof x === 'object') ? x.text : x)
    .filter(t => typeof t === 'string' && /[a-z]/i.test(t))
    .map(t => t.trim().replace(/\s+/g, ' ').slice(0, BRIEF_LINE_MAX))
    .filter(t => { const k = t.toLowerCase().replace(/[.\s]+$/, ''); if (seen.has(k)) return false; seen.add(k); return true; });
}
export function briefIsEmpty(b) {
  if (!b || typeof b !== 'object') return true;
  return !briefList(b.loves).length && !briefList(b.avoids).length && !briefList(b.rules).length
    && !(typeof b.notes === 'string' && b.notes.trim());
}
// The hierarchy (Annie, 19 Oct — the prompt feedback): her hard nos are
// absolute and come first; her brief (what works, her rules, her words)
// outranks everything a photograph produced; her taste (type, icons)
// leads; colour and line are guidance. Nothing an observation drafted
// reaches here until she confirmed it — brief.pending is never rendered.
// The typed hard nos are the ONE absolute. A colour she avoids is SOFT
// (Annie, 22 Oct — the colour model, phase 4): it left this block for
// paletteLines, where what she owns in it is still styled.
function hardNoLines(b) {
  const avoids = briefList(b && b.avoids);
  if (!avoids.length) return [];
  return [
    'HER HARD NOS — non-negotiable. These override everything beneath them: her taste, her icons, the colour and line notes, the occasion. A look that carries one is wrong; a piece one excludes is never proposed, never listed, never "worth trying".',
    `Never: ${avoids.join(' · ')}.`,
  ];
}
function styleBriefLines(b) {
  if (briefIsEmpty(b)) return [];
  const loves = briefList(b.loves), rules = briefList(b.rules);
  const notes = typeof b.notes === 'string' ? b.notes.trim().replace(/\s+/g, ' ').slice(0, 600) : '';
  if (!loves.length && !rules.length && !notes) return [];
  const out = ['HER STYLE BRIEF — in her own words, confirmed by her. These lines outrank every note read from a photograph below; a look that breaks one is wrong however well it photographs.'];
  if (loves.length) out.push(`Works: ${loves.join(' · ')}.`);
  if (rules.length) out.push(`Rules: ${rules.join(' · ')}.`);
  if (notes) out.push(`In her words: ${notes}`);
  out.push('A rule above also governs what is PROPOSED — never suggest a piece she would have to find that a rule excludes.');
  return out;
}
// The memory (style_dna.memory, slice B 2026-09-30): {entries: [...], v: 1},
// newest first, capped at MEMORY_MAX. An entry is one thing she told Robes
// through the app — {t (ISO), k: verdict|swap|wear|strike, v (1 loved / 0
// not quite, verdicts only), on (what it was about), surface, text (her
// words), out / in / cat (a swap's pieces + category), look, pieces (a
// wear's count), folded (a swap already summarised by the fold)}.
export const MEMORY_MAX = 60;
const MEMORY_LINES_MAX = 12;
const MEMORY_KINDS = ['verdict', 'swap', 'wear', 'strike', 'ask'];
const memStr = (v, n) => typeof v === 'string' && v.trim() ? v.trim().replace(/\s+/g, ' ').slice(0, n) : '';
export function memoryEntries(m) {
  const a = m && typeof m === 'object' && Array.isArray(m.entries) ? m.entries : (Array.isArray(m) ? m : []);
  return a.filter(e => e && typeof e === 'object' && MEMORY_KINDS.includes(e.k))
    .slice(0, MEMORY_MAX);
}
// What she has told Robes lately, read as a pattern: verdicts and strikes
// first (they carry her words), then swaps (a category swapped out three
// times folds to one line), then wears. Never more than twelve lines — the
// memory steers the next look, it is not a transcript.
function memoryLines(m) {
  const all = memoryEntries(m);
  if (!all.length) return [];
  // A struck observation does not exist — it never reaches the prompt (it
  // used to read "Robes had it wrong: X", which told the model the opposite
  // of X; her call is final, not a hint). The strike stays on the memory
  // for the drafter's never-repeat list.
  const verdicts = all.filter(e => e.k === 'verdict' || e.k === 'ask');
  const swaps = all.filter(e => e.k === 'swap' && !e.folded);
  const wears = all.filter(e => e.k === 'wear');
  const out = [];
  verdicts.forEach(e => {
    // What she asked of a look in the box (the look prompt) — her words, verbatim.
    if (e.k === 'ask') { const t = memStr(e.text, 200), on = memStr(e.on, 90); if (t) out.push(`Asked${on ? ` — ${on}` : ''}: "${t}".`); return; }
    const on = memStr(e.on, 90) || memStr(e.look, 90);
    const t = memStr(e.text, 200);
    const verdict = e.v === 1 ? 'Loved' : e.v === 0 ? 'Not quite' : '';
    if (!verdict && !t) return;
    out.push(`${verdict || 'Said'}${on ? ` — ${on}` : ''}${t ? `: "${t}"` : '.'}`);
  });
  // Swaps: three or more of one category read as a pattern, not three events.
  const byCat = {};
  swaps.forEach(e => { const c = memStr(e.cat, 40).toLowerCase(); if (c) byCat[c] = (byCat[c] || 0) + 1; });
  const folded = new Set(Object.keys(byCat).filter(c => byCat[c] >= 3));
  folded.forEach(c => out.push(`Has swapped out ${c} ${byCat[c] === 3 ? 'three' : byCat[c] === 4 ? 'four' : byCat[c]} times — read that as a rule, not a coincidence.`));
  swaps.forEach(e => {
    const c = memStr(e.cat, 40).toLowerCase();
    if (c && folded.has(c)) return;
    const o = memStr(e.out, 90), i = memStr(e.in, 90);
    if (!o && !i) return;
    out.push(`Swapped ${o ? `out ${o}` : 'a piece'}${i ? ` for her ${i}` : ''}${c ? ` (${c})` : ''}.`);
  });
  wears.slice(0, 4).forEach(e => {
    const l = memStr(e.look, 90);
    if (l) out.push(`Wore "${l}"${e.pieces ? ` (${e.pieces} pieces)` : ''} — a look she reaches for.`);
  });
  // The same ask twice ("Button up the jacket" sent again) is one line.
  const seenL = new Set();
  const uniq = out.filter(l => { const k = l.toLowerCase(); if (seenL.has(k)) return false; seenL.add(k); return true; });
  if (!uniq.length) return [];
  return [
    'WHAT SHE HAS TOLD ROBES RECENTLY (newest first — read the pattern, never repeat a rejected move):',
    ...uniq.slice(0, MEMORY_LINES_MAX),
    'A piece she has swapped out twice is not proposed again unless she names it; a move she called "not quite" is not repeated in another colour. Her brief today outranks all of this — what she asks for by name, she gets.',
  ];
}
// The colour and pattern model (phase 4, 2026-10-23): style_dna.palette =
// {fam:{blues:1}, shade:{cobalt:-1}, print:{stripes:1}} — -1 avoid, 1 love,
// a shade with no key follows its family. Until Settings has mapped them,
// the 19 Oct lists (brief.colours) and the legacy user_overrides colours
// read through the same resolver, best effort: a shade name lands on its
// shade, a plain colour word on its family, anything else is dropped.
function paletteOf(dna) {
  const clean = o => { const out = {}; if (o && typeof o === 'object') Object.keys(o).forEach(k => { const v = Number(o[k]); if (v === -1 || v === 0 || v === 1) out[k] = v; }); return out; };
  const p = dna.palette && typeof dna.palette === 'object' ? dna.palette : null;
  if (p) return { fam: clean(p.fam), shade: clean(p.shade), print: clean(p.print) };
  const out = { fam: {}, shade: {}, print: {} };
  const land = (w, v) => { const r = CM.preference(w); if (!r) return; if (r.shade) out.shade[r.shade] = v; else out.fam[r.family] = v; };
  const c = dna.brief && typeof dna.brief === 'object' && dna.brief.colours && typeof dna.brief.colours === 'object' ? dna.brief.colours : {};
  const uo = dna.user_overrides && typeof dna.user_overrides === 'object' ? dna.user_overrides : {};
  const lst = a => Array.isArray(a) ? a.filter(x => typeof x === 'string') : [];
  lst(c.rejected).concat(lst(uo.rejected_colors)).forEach(w => land(w, -1));
  lst(c.loved).concat(lst(uo.loved_colors)).forEach(w => land(w, 1));
  return out;
}
// What love and avoid MEAN (the brief, 22 Oct): love is weighted up when
// Robes styles her own pieces and when it proposes new ones; avoid is soft
// — what she owns is still styled, never singled out, and nothing new is
// suggested in it. A shade she set overrides its family.
export function paletteLines(dna) {
  const p = paletteOf(dna && typeof dna === 'object' ? dna : {});
  const eff = s => (s.id in p.shade ? p.shade[s.id] : (p.fam[s.family] || 0));
  const side = v => {
    const fams = CM.FAMILIES.filter(f => (p.fam[f.id] || 0) === v).map(f => {
      const ex = f.shades.filter(s => s.id in p.shade && p.shade[s.id] !== v).map(s => s.name.toLowerCase());
      return f.name + (ex.length ? ' (not ' + ex.join(', ') + ')' : '');
    });
    const shades = CM.SHADES.filter(s => (p.fam[s.family] || 0) !== v && eff(s) === v).map(s => s.name.toLowerCase());
    return fams.concat(shades);
  };
  const love = side(1), avoid = side(-1);
  const pl = CM.PATTERNS.filter(x => (p.print[x.id] || 0) === 1).map(x => x.name.toLowerCase());
  const pa = CM.PATTERNS.filter(x => (p.print[x.id] || 0) === -1).map(x => x.name.toLowerCase());
  const lines = [];
  if (love.length) lines.push(`HER COLOURS — the ones she loves: ${love.join(', ')}. Weight them up: reach for them first among her own pieces, and lead with them when a piece has to be found. These outrank the colouring read — a colour she loves is right whatever the archetype says.`);
  if (avoid.length) lines.push(`COLOURS SHE'D RATHER NOT BUY — ${avoid.join(', ')}. Never propose a NEW piece in one, and never build a look around one. A piece she already owns in one is hers to wear: style it like any other, never single it out, never apologise for it. A shade she set overrides its family — loving Blues and avoiding cobalt means blues are weighted up and cobalt is never suggested.`);
  if (pl.length) lines.push(`PRINTS she loves: ${pl.join(', ')} — reach for them, among her pieces and in anything proposed.`);
  if (pa.length) lines.push(`PRINTS she'd rather not buy: ${pa.join(', ')} — never a new piece in one; one she owns is styled like any other.`);
  return lines;
}
// The one override slot left: exact measurements she supplied.
function overrideLines(uo) {
  const lines = [];
  if (uo && uo.measurements && typeof uo.measurements === 'object') {
    const m = Object.entries(uo.measurements).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(', ');
    if (m) lines.push(`Exact measurements supplied by the user — trust these over any photo estimate: ${m}.`);
  }
  return lines;
}

// The facts (style_dna.facts, Settings 2026-10-07): {height_cm, size_uk,
// shoe_uk, age_band}. Size, never weight — and never estimated from a
// photograph: these are hers, given.
export function factsLines(f) {
  if (!f || typeof f !== 'object') return [];
  const parts = [];
  const h = Number(f.height_cm), s = Number(f.size_uk), sh = Number(f.shoe_uk);
  if (h >= 120 && h <= 230) parts.push(`height ${Math.round(h)} cm`);
  if (s >= 2 && s <= 30) parts.push(`dress size UK ${s} (EU ${s + 28})`);
  // Bust and waist (the digital twin, 2026-10-20): a bra size as given, or
  // the tape in cm; a measurement, never a weight.
  const band = Number(f.bust_band), bcm = Number(f.bust_cm), w = Number(f.waist_cm);
  const cup = typeof f.bust_cup === 'string' && /^[A-G]{1,2}\+?$/.test(f.bust_cup) ? f.bust_cup : '';
  if (band >= 26 && band <= 50 && cup) parts.push(`bust ${Math.round(band)}${cup}`);
  else if (bcm >= 60 && bcm <= 160) parts.push(`bust ${Math.round(bcm)} cm`);
  if (w >= 45 && w <= 150) parts.push(`waist ${Math.round(w)} cm`);
  if (sh >= 1 && sh <= 14) parts.push(`shoes UK ${sh}`);
  const age = typeof f.age_band === 'string' && f.age_band.trim() ? f.age_band.trim().slice(0, 20) : '';
  if (age) parts.push(`age ${age}`);
  if (!parts.length) return [];
  return [`THE FACTS she gave — size, never weight: ${parts.join(', ')}. Size every piece to these; never estimate them from a photograph.`];
}

// The client's spend read: {n, total, median, verdict} — numbers only, or nothing.
function spendRead(sp) {
  if (!sp || typeof sp !== 'object') return null;
  const n = Number(sp.n), total = Number(sp.total), median = Number(sp.median);
  if (!(n >= 3) || !(total > 0) || !(median > 0)) return null;
  return { n: Math.round(n), total: Math.round(total), median: Math.round(median), verdict: sp.verdict === 'above' ? 'above' : 'inside' };
}
function euro(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

// opts.balance (2026-10-19): where she said the pieces should come from on
// this ask ('owned' | 'mix' | 'new' | 'words') — the SYSTEM DIRECTIVE then
// defers to her answer (rendered beside the wardrobe by the route) instead
// of deciding the posture from the piece count.
export function styleDnaPromptBlock(styleDna, wardrobeCount = 0, styleIcons = [], opts = {}) {
  const icons = Array.isArray(styleIcons) ? styleIcons.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim()).slice(0, 12) : [];
  const dna = styleDna && typeof styleDna === 'object' ? styleDna : {};
  const ch = dna.color_harmony;
  const sp = dna.silhouette_proportions;
  // Style type (the archetype chapter, 2026-09-25): `style_archetypes` is
  // what she called "very me", `style_archetypes_soft` her "sometimes".
  // Written by the Style notes chapters; before this line nothing read them.
  const strs = a => Array.isArray(a) ? a.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim()).slice(0, 10) : [];
  const arch = strs(dna.style_archetypes);
  const soft = strs(dna.style_archetypes_soft).filter(s => !arch.includes(s));
  const briefLines = styleBriefLines(dna.brief);
  const memLines = memoryLines(dna.memory);
  // The Style DNA page (Settings, 2026-10-07): the brands she reaches for,
  // the one investment level, the facts she gave (size, never weight) and a
  // tag per icon — all on the same jsonb, all read here.
  const brands = strs(dna.brands).slice(0, 20);
  const investment = typeof dna.investment === 'string' && dna.investment.trim() ? dna.investment.trim().slice(0, 40) : '';
  const factLines = factsLines(dna.facts);
  const tags = dna.icon_tags && typeof dna.icon_tags === 'object' ? dna.icon_tags : {};
  const uo = dna.user_overrides && typeof dna.user_overrides === 'object' ? dna.user_overrides : {};
  const palLines = paletteLines(dna);
  const noLines = hardNoLines(dna.brief);
  if (!ch && !sp && !icons.length && !arch.length && !soft.length && !briefLines.length && !memLines.length && !brands.length && !investment && !factLines.length && !noLines.length && !palLines.length && !overrideLines(uo).length) return '';
  const lines = [];
  // Her hard nos FIRST — the one absolute block (her typed nos and the
  // observations she confirmed as nos). Her colours are not here: avoid is
  // soft, and lives with HER COLOURS below.
  if (noLines.length) lines.push(...noLines);
  // Her brief, in her own words (the In-your-words chapter, 2026-09-30):
  // second, and said to outrank every note a photograph produced. Empty
  // when she has kept nothing yet.
  if (briefLines.length) lines.push(...briefLines);
  // What she told Robes lately (the memory, slice B): beneath her brief,
  // above every rule a photograph produced.
  if (memLines.length) lines.push(...memLines);
  // Her style type steers taste the way the icons do — a register, never a
  // constraint on colour or line.
  if (arch.length || soft.length) {
    lines.push(`STYLE TYPE — her own placing${arch.length ? ': ' + arch.join(', ') : ''}${soft.length ? (arch.length ? '; sometimes ' : ': sometimes ') + soft.join(', ') : ''}. Every look sits in this register — the first types lead, a "sometimes" type is an occasional mood. Her taste leads: where a colour or line note below pulls against it, her taste wins.`);
  }
  // Style icons are the user's declared taste — they steer the aesthetic of
  // every downstream recommendation, layered over the photo-verified DNA.
  if (icons.length) {
    const named = icons.map(i => { const t = typeof tags[i] === 'string' && tags[i].trim() ? tags[i].trim().slice(0, 40) : ''; return t ? `${i} (${t})` : i; });
    lines.push(`STYLE ICONS — her taste references: ${named.join(', ')}. Their silhouettes, styling codes and houses are the north star for every choice, inside her hard nos and her brief above; the colour and line notes below are guidance to adapt an icon's register to her, never a reason to abandon it.`);
  }
  // The houses she reaches for, the ceiling she set, the facts she gave.
  if (brands.length) {
    lines.push(`BRANDS she reaches for: ${brands.join(', ')}. A piece that has to be found comes from these houses and their register first.`);
  }
  if (investment) {
    lines.push(`INVESTMENT LEVEL — she spends ${investment} a year on clothes: never a piece above what that level buys, however well it would photograph.`);
    // The investment-vs-memory line (cut C, 2026-10-09): the client compiles
    // `spend` at send time from the EUR prices on what she filed this year
    // (never written to the profile); only "above" earns a line — a partial
    // year can prove she buys above her level, never below it.
    const sp = spendRead(dna.spend);
    if (sp && sp.verdict === 'above') {
      lines.push(`WHAT SHE ACTUALLY BUYS — the ${sp.n} priced pieces she filed this year come to €${euro(sp.total)}, a typical one €${euro(sp.median)}: above the level she set. The level she set still rules what Robes proposes — never raise the ceiling to match her receipts — but read her prices as taste: a piece that has to be found should sit at her level and read like the pricier ones she already owns, never as a cheaper copy of them.`);
    }
  }
  if (factLines.length) lines.push(...factLines);
  // Her colours and prints (the model) render with or without a read.
  if (!ch && !sp) {
    lines.push(...palLines, ...overrideLines(uo));
    return lines.join('\n');
  }
  // The photograph reads are GUIDANCE (Annie, 19 Oct): the analysis is not
  // reliable enough to outrank what she has said or what she owns and
  // wears. Never "never" here — that word belongs to her hard nos.
  lines.push('STYLE DNA — read from her photographs. Guidance, not law: it tilts a choice between two pieces that both satisfy her brief, and yields to anything she has said above and to the pieces she owns and wears.');
  if (ch) {
    const sub = ch.functional_sub_palettes || {};
    lines.push(`Colouring read: ${ch.archetype_name} (undertone ${ch.verified_undertone}, contrast ${ch.calculated_contrast}).`);
    if (sub.best_neutrals) lines.push(`Neutrals that tend to flatter: ${sub.best_neutrals.join(', ')}.`);
    if (sub.primary_stars) lines.push(`Colours that tend to flatter: ${sub.primary_stars.join(', ')}. Accents: ${(sub.secondary_accents || []).join(', ')}.`);
    if (sub.avoid_list) lines.push(`Colours that tend to fight her colouring — lean away from them when proposing a NEW piece, but a piece she owns or asks for in one is hers to wear: ${sub.avoid_list.join(', ')}.`);
    if (ch.metals_rules) lines.push(`Metals that tend to suit her: ${(ch.metals_rules.approved_metals || []).join(', ')} (${ch.metals_rules.finish_type}); ${(ch.metals_rules.prohibited_metals || []).join(', ')} less so.`);
  }
  if (sp) {
    const ar = sp.architectural_rules || {};
    lines.push(`Line read, from one photograph — a tilt, never a rule: ${sp.body_type}. Dress silhouettes that tend to suit it: ${(ar.dress_silhouettes || []).join(', ')}. Necklines: ${(ar.necklines || []).join(', ')}.`);
    if (ar.styling_maxims) lines.push(`Styling leanings — apply one only where it agrees with her brief and with how she already dresses; drop any that fights a line she wrote or a piece she reaches for: ${ar.styling_maxims.join(' ')}`);
  }
  // Her colours always outrank the photo-derived read.
  lines.push(...palLines, ...overrideLines(uo));
  lines.push(opts && opts.balance
    ? 'SYSTEM DIRECTIVE: She has said where the pieces of this look should come from — her wardrobe, a mix, or new pieces (WHERE THE PIECES COME FROM, beside her wardrobe). Follow that answer, in her register, guided by the colour and line notes above.'
    : wardrobeCount >= 15
    ? `SYSTEM DIRECTIVE: The user has a mature digital closet (${wardrobeCount} items). Strictly optimise for mix-and-match modularity, combining their verified closet foundations with new pieces that sit inside her brief and her taste; the colour and line notes above guide the choice between them.`
    : wardrobeCount > 0
      ? `SYSTEM DIRECTIVE: The user is building their digital closet (${wardrobeCount}/15 items). Lead with fashion-house execution in her register, guided by the colour and line notes above, but weave in the pieces they already own by their exact labels wherever an owned piece genuinely serves the look — an owned piece always beats a hypothetical one. Fill the remaining gaps with ideal editorial combinations.`
      : 'SYSTEM DIRECTIVE: The user has not catalogued any wardrobe pieces yet — focus on fashion-house execution in her register, guided by the colour and line notes above, producing ideal editorial combinations.');
  return lines.join('\n');
}
