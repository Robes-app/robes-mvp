// Style DNA catalog, ported verbatim from legacy style_dna.js (M4 task 2); edit here, not there.
// Gemini extracts measurable primitives only; everything she sees comes from this catalog.
import type { Body, BodyType, Contrast, MetalName, Season, SeasonName, Undertone } from './types';

export const METAL_GRADIENTS: Record<MetalName, readonly [string, string, string]> = {
  Gold: ['#E4C878', '#C6A24C', '#9C7E36'],
  'Yellow gold': ['#EED27E', '#D2A845', '#A87F2E'],
  Bronze: ['#C99670', '#A9744E', '#7E5436'],
  'Rose gold': ['#E0AE98', '#C98F78', '#A06B58'],
  Copper: ['#D89870', '#B87048', '#8E5230'],
  Silver: ['#E8EAEC', '#B9BEC4', '#8A9098'],
  Platinum: ['#E6E4DE', '#C2BFB8', '#96938C'],
  'White gold': ['#F0EEE6', '#CFCBC0', '#A29E92'],
  Pewter: ['#C8C8C6', '#98989A', '#6E6E72'],
  Chrome: ['#F2F4F6', '#C0C6CE', '#848C98'],
};

// The 12-season archetype catalog (Colour Harmony matrix).
export const SEASONS: Record<SeasonName, Season> = {
  'Light Spring': {
    family: 'warm',
    voice:
      'A sun-dappled, luminous canvas. Your features are bright, warm, and delicate. Robes steers clear of heavy, muddy colors, opting instead for buttermilk creams, soft peach, and warm, illuminated corals.',
    summary: 'Bright, warm, delicate — lit like early morning.',
    palette: [
      ['#F2E3C4', '#F0D5A8', '#EEC28E', '#E8A87C', '#E09266', '#D8C878'],
      ['#C4D49A', '#9CBE84', '#7CB89C', '#82C4C0', '#8CC4D8', '#9CB8DC'],
      ['#8898C8', '#A490C8', '#C89CC0', '#DC94A8', '#E89C94', '#ECB2A0'],
    ],
    neutrals: [
      {
        name: 'Soft white',
        hex: '#F6F1E4',
      },
      {
        name: 'Buttermilk',
        hex: '#F0E4C0',
      },
      {
        name: 'Light sand',
        hex: '#E4D2AC',
      },
      {
        name: 'Camel',
        hex: '#C8A26E',
      },
      {
        name: 'Dove grey',
        hex: '#C2BEB4',
      },
      {
        name: 'Warm mocha',
        hex: '#8E7458',
      },
    ],
    stars: [
      {
        name: 'Warm coral',
        hex: '#E8836C',
      },
      {
        name: 'Peach',
        hex: '#F0B088',
      },
      {
        name: 'Apple green',
        hex: '#9CC468',
      },
      {
        name: 'Aqua',
        hex: '#7CC4C8',
      },
    ],
    accents: [
      {
        name: 'Buttermilk',
        hex: '#F0E0A8',
      },
      {
        name: 'Warm ivory',
        hex: '#F4EBD4',
      },
      {
        name: 'Soft turquoise',
        hex: '#84C8C0',
      },
      {
        name: 'Light camel',
        hex: '#D2B084',
      },
    ],
    avoid: [
      {
        name: 'Jet black',
        hex: '#111111',
      },
      {
        name: 'Charcoal',
        hex: '#3A3E42',
      },
      {
        name: 'Deep burgundy',
        hex: '#5A2430',
      },
      {
        name: 'Fuchsia',
        hex: '#B23A72',
      },
      {
        name: 'Cool grey',
        hex: '#9AA0A6',
      },
      {
        name: 'Icy blue',
        hex: '#C2D8E8',
      },
      {
        name: 'Dark navy',
        hex: '#1A2438',
      },
    ],
    avoid_note: 'Heavy, dark values swallow your light.',
    metals: {
      finish: 'Shiny / Polished',
      approved: ['Yellow gold', 'Rose gold', 'Gold'],
      prohibited: ['Pewter', 'Chrome', 'Gunmetal'],
    },
    metals_note: 'Light, polished golds catch the brightness your skin already carries.',
    proof_best: 'Fresher, brighter, more awake.',
    proof_less: 'Shadowed, heavy, washed down.',
    seen_on_you: [
      {
        lifts: 'Peach blouse',
        flattens: 'Black crew',
      },
      {
        lifts: 'Camel trench',
        flattens: 'Charcoal coat',
      },
      {
        lifts: 'Aqua knit',
        flattens: 'Deep burgundy',
      },
    ],
  },
  'Warm Spring': {
    family: 'warm',
    voice:
      'Drenched in pure golden hour light. Your palette is rich, warm, and mid-toned. Robes anchors your wardrobe in luxurious camels, warm tan leathers, and glowing marigolds that pull out your natural vitality.',
    summary: 'Golden, sunny, mid-toned — pure golden hour.',
    palette: [
      ['#F0DCA8', '#E8C878', '#E0AE5A', '#D89440', '#C87834', '#B8A048'],
      ['#A8B468', '#84A054', '#5E9460', '#4E9C88', '#4A94A0', '#5484A8'],
      ['#5870A0', '#7C6AA0', '#A87498', '#C07484', '#D08070', '#E09A6C'],
    ],
    neutrals: [
      {
        name: 'Cream',
        hex: '#F4EAD0',
      },
      {
        name: 'Warm sand',
        hex: '#E2CCA0',
      },
      {
        name: 'Camel',
        hex: '#C89E62',
      },
      {
        name: 'Golden brown',
        hex: '#A0784A',
      },
      {
        name: 'Warm marine',
        hex: '#3E5A6E',
      },
      {
        name: 'Chestnut',
        hex: '#6E4E32',
      },
    ],
    stars: [
      {
        name: 'Marigold',
        hex: '#E8A83C',
      },
      {
        name: 'Warm tan',
        hex: '#C89468',
      },
      {
        name: 'Grass green',
        hex: '#7CA050',
      },
      {
        name: 'Warm turquoise',
        hex: '#3EA0A0',
      },
    ],
    accents: [
      {
        name: 'Tomato red',
        hex: '#D05438',
      },
      {
        name: 'Golden cream',
        hex: '#F0E0B0',
      },
      {
        name: 'Amber',
        hex: '#D28C38',
      },
      {
        name: 'Warm navy',
        hex: '#34506E',
      },
    ],
    avoid: [
      {
        name: 'Icy pink',
        hex: '#F2D6DF',
      },
      {
        name: 'Pure white',
        hex: '#FFFFFF',
      },
      {
        name: 'Cool charcoal',
        hex: '#3E4248',
      },
      {
        name: 'Magenta',
        hex: '#B23A72',
      },
      {
        name: 'Cool lavender',
        hex: '#C9C2E0',
      },
      {
        name: 'Icy blue',
        hex: '#C6DAE8',
      },
      {
        name: 'Jet black',
        hex: '#111111',
      },
    ],
    avoid_note: 'Icy, blue-based tones fight your glow.',
    metals: {
      finish: 'Bright / Polished',
      approved: ['Yellow gold', 'Bronze', 'Copper'],
      prohibited: ['High-shine Silver', 'Platinum', 'Chrome'],
    },
    metals_note: 'Bright yellow gold and polished bronze glow with your warmth.',
    proof_best: 'Golden, vital, lit from within.',
    proof_less: 'Cooler, flatter, drained.',
    seen_on_you: [
      {
        lifts: 'Marigold shirt',
        flattens: 'Icy pink',
      },
      {
        lifts: 'Tan leather',
        flattens: 'Pure white',
      },
      {
        lifts: 'Turquoise dress',
        flattens: 'Cool charcoal',
      },
    ],
  },
  'Clear Spring': {
    family: 'warm',
    voice:
      'Vibrant, energetic, and highly saturated. Your warm undertone meets high clarity, meaning you brilliantly carry striking hues like poppy red, bright apple green, and warm turquoise. Robes uses these as your statement anchors.',
    summary: 'Vivid, clear, high-contrast — colour at full volume.',
    palette: [
      ['#F4E6B4', '#F0C868', '#E8A43C', '#E07C2C', '#D05028', '#C0B040'],
      ['#94C048', '#54A448', '#289C6C', '#20A0A0', '#2088B8', '#3068B0'],
      ['#2E4A9C', '#5C3E9C', '#8C3E94', '#B03878', '#C83C54', '#E06848'],
    ],
    neutrals: [
      {
        name: 'Cream',
        hex: '#F4ECD8',
      },
      {
        name: 'Slate grey',
        hex: '#5E6672',
      },
      {
        name: 'Warm charcoal',
        hex: '#44403C',
      },
      {
        name: 'Navy',
        hex: '#26324E',
      },
      {
        name: 'Warm taupe',
        hex: '#A08A70',
      },
      {
        name: 'Espresso',
        hex: '#3E2E22',
      },
    ],
    stars: [
      {
        name: 'Poppy red',
        hex: '#D83C30',
      },
      {
        name: 'Apple green',
        hex: '#68B044',
      },
      {
        name: 'Warm turquoise',
        hex: '#20A4A8',
      },
      {
        name: 'Marigold',
        hex: '#ECA82C',
      },
    ],
    accents: [
      {
        name: 'Violet',
        hex: '#6448A8',
      },
      {
        name: 'Hot coral',
        hex: '#E85C48',
      },
      {
        name: 'Bright navy',
        hex: '#2A3C74',
      },
      {
        name: 'Warm white',
        hex: '#F6F0E0',
      },
    ],
    avoid: [
      {
        name: 'Dusty mauve',
        hex: '#B090A8',
      },
      {
        name: 'Muted sage',
        hex: '#A8AC90',
      },
      {
        name: 'Pastel lavender',
        hex: '#D2C8E4',
      },
      {
        name: 'Oatmeal',
        hex: '#DCCCB0',
      },
      {
        name: 'Dusty rose',
        hex: '#C89AA0',
      },
      {
        name: 'Heathered grey',
        hex: '#A8A4A0',
      },
      {
        name: 'Muted olive',
        hex: '#8A8468',
      },
    ],
    avoid_note: 'Dusty, muted tones dim your clarity.',
    metals: {
      finish: 'High-shine / Polished',
      approved: ['Yellow gold', 'Rose gold', 'Gold'],
      prohibited: ['Matte Pewter', 'Brushed Silver', 'Antique finishes'],
    },
    metals_note: 'High-shine gold matches your clarity — never matte, never antique.',
    proof_best: 'Sharper, brighter, more present.',
    proof_less: 'Muddy, faded, softened away.',
    seen_on_you: [
      {
        lifts: 'Poppy red knit',
        flattens: 'Dusty mauve',
      },
      {
        lifts: 'Bright navy blazer',
        flattens: 'Muted sage',
      },
      {
        lifts: 'Turquoise silk',
        flattens: 'Oatmeal',
      },
    ],
  },
  'Light Summer': {
    family: 'cool',
    voice:
      'An airy, ethereal spectrum. Your features thrive in light, cool, chalky pastels—soft lavender, ice blue, and seafoam. Robes pairs this palette with fluid, light-catching fabrics like silk and linen.',
    summary: 'Airy, cool, chalky — light as sea glass.',
    palette: [
      ['#EAE4DC', '#DCD8E4', '#C8D2E4', '#B0C6E0', '#9CB8D8', '#C4CCD8'],
      ['#B8D4CC', '#9CC8B8', '#84BCB4', '#88B4C8', '#94A8CC', '#A89CC8'],
      ['#B894BC', '#C88CA8', '#D094A0', '#C4A0B0', '#A8A0C0', '#8C98B8'],
    ],
    neutrals: [
      {
        name: 'Soft white',
        hex: '#F2F0EC',
      },
      {
        name: 'Rose beige',
        hex: '#E0CEC4',
      },
      {
        name: 'Light slate',
        hex: '#AAB2BE',
      },
      {
        name: 'Cool taupe',
        hex: '#B0A49C',
      },
      {
        name: 'Dove grey',
        hex: '#C6C4C2',
      },
      {
        name: 'Cocoa',
        hex: '#7A6458',
      },
    ],
    stars: [
      {
        name: 'Soft lavender',
        hex: '#B0A0CC',
      },
      {
        name: 'Ice blue',
        hex: '#A8C8E0',
      },
      {
        name: 'Seafoam',
        hex: '#9CC8B8',
      },
      {
        name: 'Powder pink',
        hex: '#E0B4C0',
      },
    ],
    accents: [
      {
        name: 'Light periwinkle',
        hex: '#98A8D4',
      },
      {
        name: 'Dusty rose',
        hex: '#C898A4',
      },
      {
        name: 'Soft aqua',
        hex: '#8CC0C4',
      },
      {
        name: 'Cloud grey',
        hex: '#C8CCD2',
      },
    ],
    avoid: [
      {
        name: 'Mustard',
        hex: '#C89428',
      },
      {
        name: 'Deep terracotta',
        hex: '#A85434',
      },
      {
        name: 'Jet black',
        hex: '#111111',
      },
      {
        name: 'Electric blue',
        hex: '#2244CC',
      },
      {
        name: 'Warm camel',
        hex: '#C29050',
      },
      {
        name: 'Brick red',
        hex: '#963A2E',
      },
      {
        name: 'Golden yellow',
        hex: '#E0A828',
      },
    ],
    avoid_note: 'Hot, heavy earth tones overpower your lightness.',
    metals: {
      finish: 'Brushed / Matte',
      approved: ['Silver', 'Platinum', 'White gold'],
      prohibited: ['Yellow Gold', 'Bronze', 'Copper'],
    },
    metals_note: 'Brushed silver settles softly into your cool light.',
    proof_best: 'Luminous, rested, softly lifted.',
    proof_less: 'Sallow, heavy, overpowered.',
    seen_on_you: [
      {
        lifts: 'Ice blue shirt',
        flattens: 'Mustard',
      },
      {
        lifts: 'Lavender knit',
        flattens: 'Terracotta',
      },
      {
        lifts: 'Seafoam dress',
        flattens: 'Jet black',
      },
    ],
  },
  'True Summer': {
    family: 'cool',
    voice:
      'The epitome of understated elegance. Your palette is crisp, cool, and mid-toned, dominated by sea blues, berry tones, and slaty taupes. Robes uses these to build a timeless, sophisticated uniform.',
    summary: 'Crisp, cool, mid-toned — quiet sophistication.',
    palette: [
      ['#E4E0DC', '#CCD2DC', '#A8BCD4', '#8AA8C8', '#7090B4', '#98A4B8'],
      ['#A0C0B8', '#7CACA4', '#5C9898', '#5088A4', '#5C7CA8', '#68709C'],
      ['#786CA0', '#8C6494', '#A06088', '#B06C8C', '#A87890', '#94809C'],
    ],
    neutrals: [
      {
        name: 'Soft white',
        hex: '#F0EEEA',
      },
      {
        name: 'Slate',
        hex: '#6E7888',
      },
      {
        name: 'Cool taupe',
        hex: '#A89C94',
      },
      {
        name: 'Rose brown',
        hex: '#8E6E68',
      },
      {
        name: 'Grey flannel',
        hex: '#8A8C90',
      },
      {
        name: 'Deep slate',
        hex: '#4A5464',
      },
    ],
    stars: [
      {
        name: 'Sea blue',
        hex: '#4880A8',
      },
      {
        name: 'True berry',
        hex: '#A04870',
      },
      {
        name: 'Slate blue',
        hex: '#68809C',
      },
      {
        name: 'Cool rose',
        hex: '#C08498',
      },
    ],
    accents: [
      {
        name: 'Soft teal',
        hex: '#5C9498',
      },
      {
        name: 'Plum',
        hex: '#7C5878',
      },
      {
        name: 'Powder blue',
        hex: '#A0BCD4',
      },
      {
        name: 'Mauve',
        hex: '#A88098',
      },
    ],
    avoid: [
      {
        name: 'Neon orange',
        hex: '#F06018',
      },
      {
        name: 'Golden yellow',
        hex: '#E0A828',
      },
      {
        name: 'Brick red',
        hex: '#963A2E',
      },
      {
        name: 'Mustard',
        hex: '#C89428',
      },
      {
        name: 'Warm camel',
        hex: '#C29050',
      },
      {
        name: 'Rust',
        hex: '#A8603C',
      },
      {
        name: 'Olive',
        hex: '#5A5836',
      },
    ],
    avoid_note: 'Hot, golden tones clash with your coolness.',
    metals: {
      finish: 'Brushed / Matte',
      approved: ['Silver', 'Pewter', 'White gold'],
      prohibited: ['Yellow Gold', 'Copper', 'Bronze'],
    },
    metals_note: 'Brushed silver and matte pewter read as quietly expensive on you.',
    proof_best: 'Even, polished, quietly lifted.',
    proof_less: 'Flushed, hot, out of tune.',
    seen_on_you: [
      {
        lifts: 'Sea blue shirt',
        flattens: 'Golden yellow',
      },
      {
        lifts: 'Berry knit',
        flattens: 'Rust',
      },
      {
        lifts: 'Slate blazer',
        flattens: 'Warm camel',
      },
    ],
  },
  'Soft Summer': {
    family: 'cool',
    voice:
      'Like a coastal landscape veiled in morning mist. Your palette is cool, soft, and beautifully desaturated. Robes sources heathered greys, dusty blues, and muted plums that feel effortlessly relaxed.',
    summary: 'Misty, muted, cool — coastal morning light.',
    palette: [
      ['#E2DEDA', '#CCC8CC', '#B0B4C0', '#94A0B0', '#7C8CA0', '#9C9AA4'],
      ['#A4B4AC', '#8AA098', '#708C88', '#68848C', '#6C7C90', '#747490'],
      ['#7C6C8C', '#8C6880', '#986C7C', '#A47C84', '#94808C', '#847C94'],
    ],
    neutrals: [
      {
        name: 'Soft white',
        hex: '#F0EEEA',
      },
      {
        name: 'Rose beige',
        hex: '#DCCAC0',
      },
      {
        name: 'Heather grey',
        hex: '#B4B0AE',
      },
      {
        name: 'Light slate',
        hex: '#9AA2AE',
      },
      {
        name: 'Mushroom',
        hex: '#A89A90',
      },
      {
        name: 'Cocoa',
        hex: '#7A6458',
      },
    ],
    stars: [
      {
        name: 'Dusty blue',
        hex: '#7C94AC',
      },
      {
        name: 'Muted plum',
        hex: '#8C6880',
      },
      {
        name: 'Soft sage',
        hex: '#96A894',
      },
      {
        name: 'Heathered rose',
        hex: '#B08C94',
      },
    ],
    accents: [
      {
        name: 'Slate teal',
        hex: '#68888C',
      },
      {
        name: 'Dusty mauve',
        hex: '#A4889C',
      },
      {
        name: 'Smoke blue',
        hex: '#8C9CB0',
      },
      {
        name: 'Grey pearl',
        hex: '#C4C2C6',
      },
    ],
    avoid: [
      {
        name: 'Neon orange',
        hex: '#F06018',
      },
      {
        name: 'Golden yellow',
        hex: '#E0A828',
      },
      {
        name: 'Brick red',
        hex: '#963A2E',
      },
      {
        name: 'Mustard',
        hex: '#C89428',
      },
      {
        name: 'Jet black',
        hex: '#111111',
      },
      {
        name: 'Bright white',
        hex: '#FFFFFF',
      },
      {
        name: 'Electric blue',
        hex: '#2244CC',
      },
    ],
    avoid_note: 'Loud, saturated colour drowns your softness.',
    metals: {
      finish: 'Brushed / Satin',
      approved: ['Silver', 'Platinum', 'White gold'],
      prohibited: ['Yellow Gold', 'Copper', 'High-shine Chrome'],
    },
    metals_note: 'Satin platinum and brushed silver blend into your mist, never glare.',
    proof_best: 'Softer, smoother, harmonised.',
    proof_less: 'Harsh, stark, washed out.',
    seen_on_you: [
      {
        lifts: 'Dusty blue shirt',
        flattens: 'Bright white',
      },
      {
        lifts: 'Plum knit',
        flattens: 'Golden yellow',
      },
      {
        lifts: 'Sage dress',
        flattens: 'Jet black',
      },
    ],
  },
  'Soft Autumn': {
    family: 'warm',
    voice:
      "Inspired by nature's shifting light—rich, muted, and beautifully grounded. Your palette relies on sophisticated, organic mid-tones like sage, mauve, and oatmeal. Robes uses this to curate an incredibly cohesive, low-contrast wardrobe.",
    summary: 'Warm, low in contrast, a little dusty.',
    palette: [
      ['#DCC8AC', '#C8A982', '#C2925A', '#B5774A', '#9C5638', '#8A8048'],
      ['#7E8E6E', '#5A6E50', '#3E5E48', '#2E6A66', '#2C5E66', '#355A66'],
      ['#2E3A52', '#3A3450', '#4E3A50', '#5E3340', '#7A3A42', '#9A5A4E'],
    ],
    neutrals: [
      {
        name: 'Cream',
        hex: '#EDE5D5',
      },
      {
        name: 'Oat',
        hex: '#D8C7AC',
      },
      {
        name: 'Wheat',
        hex: '#B89A78',
      },
      {
        name: 'Taupe',
        hex: '#8E7458',
      },
      {
        name: 'Olive grey',
        hex: '#6E6A52',
      },
      {
        name: 'Cocoa',
        hex: '#4A3A2C',
      },
    ],
    stars: [
      {
        name: 'Sage',
        hex: '#6E7E64',
      },
      {
        name: 'Olive',
        hex: '#5A5836',
      },
      {
        name: 'Teal',
        hex: '#2C6066',
      },
      {
        name: 'Rust',
        hex: '#A8603C',
      },
    ],
    accents: [
      {
        name: 'Muted coral',
        hex: '#C97A5E',
      },
      {
        name: 'Camel',
        hex: '#C2925A',
      },
      {
        name: 'Warm taupe',
        hex: '#8A7458',
      },
      {
        name: 'Soft navy',
        hex: '#33405C',
      },
    ],
    avoid: [
      {
        name: 'Bright white',
        hex: '#FFFFFF',
      },
      {
        name: 'Icy pink',
        hex: '#F2D6DF',
      },
      {
        name: 'Cool lavender',
        hex: '#C9C2E0',
      },
      {
        name: 'Bright blue',
        hex: '#2E54C8',
      },
      {
        name: 'Fuchsia',
        hex: '#B23A72',
      },
      {
        name: 'Cool grey',
        hex: '#9AA0A6',
      },
      {
        name: 'Jet black',
        hex: '#111111',
      },
    ],
    avoid_note: 'They pull focus from your warmth.',
    metals: {
      finish: 'Brushed / Matte',
      approved: ['Gold', 'Bronze', 'Rose gold'],
      prohibited: ['High-shine Silver', 'Chrome', 'Platinum'],
    },
    metals_note:
      'Brushed, not bright. Warm metals settle into your skin instead of sitting on top of it.',
    proof_best: 'Warmer, healthier, more even.',
    proof_less: 'Cooler, duller, more redness.',
    seen_on_you: [
      {
        lifts: 'Olive shirt',
        flattens: 'Pale blue',
      },
      {
        lifts: 'Rust knit',
        flattens: 'Hot pink',
      },
      {
        lifts: 'Camel blazer',
        flattens: 'Cool grey',
      },
    ],
  },
  'True Autumn': {
    family: 'warm',
    voice:
      'Rich, spice-toned, and intensely warm. Your palette thrives on the heavy, saturated colors of changing leaves—terracotta, deep olive, and burnished copper. Robes weaves these textures through your tailoring and outerwear.',
    summary: 'Rich, spiced, intensely warm — changing leaves.',
    palette: [
      ['#E0C494', '#D0A860', '#C08840', '#B06830', '#984C28', '#907C34'],
      ['#788048', '#5C6C38', '#48602C', '#3E6A54', '#3C6468', '#48586C'],
      ['#3E4460', '#563C58', '#6E3C4C', '#84383C', '#9A4838', '#B06844'],
    ],
    neutrals: [
      {
        name: 'Cream',
        hex: '#F0E4C8',
      },
      {
        name: 'Coffee',
        hex: '#6E5238',
      },
      {
        name: 'Warm terracotta',
        hex: '#B06438',
      },
      {
        name: 'Olive',
        hex: '#5E5A34',
      },
      {
        name: 'Camel',
        hex: '#C09258',
      },
      {
        name: 'Dark chocolate',
        hex: '#44301F',
      },
    ],
    stars: [
      {
        name: 'Terracotta',
        hex: '#B85C34',
      },
      {
        name: 'Deep olive',
        hex: '#5A5E2C',
      },
      {
        name: 'Burnished copper',
        hex: '#A86234',
      },
      {
        name: 'Forest teal',
        hex: '#2E5C58',
      },
    ],
    accents: [
      {
        name: 'Mustard',
        hex: '#C89430',
      },
      {
        name: 'Warm burgundy',
        hex: '#7A3A34',
      },
      {
        name: 'Pumpkin',
        hex: '#C87838',
      },
      {
        name: 'Deep navy',
        hex: '#2A3A52',
      },
    ],
    avoid: [
      {
        name: 'Icy blue',
        hex: '#C6DAE8',
      },
      {
        name: 'Stark white',
        hex: '#FFFFFF',
      },
      {
        name: 'Magenta',
        hex: '#B23A72',
      },
      {
        name: 'Hot fuchsia',
        hex: '#D8388C',
      },
      {
        name: 'Cool lavender',
        hex: '#C9C2E0',
      },
      {
        name: 'Cool grey',
        hex: '#9AA0A6',
      },
      {
        name: 'Icy pink',
        hex: '#F2D6DF',
      },
    ],
    avoid_note: 'Icy, blue-based colour argues with your fire.',
    metals: {
      finish: 'Antique / Textured',
      approved: ['Gold', 'Bronze', 'Copper'],
      prohibited: ['High-shine Silver', 'Platinum', 'Chrome'],
    },
    metals_note: 'Antique gold and textured bronze deepen your natural spice.',
    proof_best: 'Richer, grounded, glowing.',
    proof_less: 'Chalky, cold, disconnected.',
    seen_on_you: [
      {
        lifts: 'Terracotta knit',
        flattens: 'Icy blue',
      },
      {
        lifts: 'Olive jacket',
        flattens: 'Stark white',
      },
      {
        lifts: 'Copper silk',
        flattens: 'Magenta',
      },
    ],
  },
  'Dark Autumn': {
    family: 'warm',
    voice:
      'An opulent, shadow-filled warmth. Your palette is deep and anchored in the earth—think forest green, dark chocolate wool, and rich espresso. Robes uses these heavy values to create grounding, luxurious columns of color.',
    summary: 'Deep, warm, shadowed — opulent earth.',
    palette: [
      ['#C8A870', '#B08848', '#986C34', '#845428', '#6C3E20', '#6E6428'],
      ['#585C2C', '#404E24', '#2C441E', '#24483E', '#204048', '#2C3A50'],
      ['#26304A', '#3C2C48', '#502C40', '#602830', '#742E2C', '#8C4630'],
    ],
    neutrals: [
      {
        name: 'Cream',
        hex: '#EEE2C4',
      },
      {
        name: 'Black-brown',
        hex: '#2E2018',
      },
      {
        name: 'Deep olive',
        hex: '#4A482A',
      },
      {
        name: 'Mahogany',
        hex: '#5E3226',
      },
      {
        name: 'Espresso',
        hex: '#3A2A1E',
      },
      {
        name: 'Warm stone',
        hex: '#A89474',
      },
    ],
    stars: [
      {
        name: 'Forest green',
        hex: '#2C4A2E',
      },
      {
        name: 'Dark chocolate',
        hex: '#4A3222',
      },
      {
        name: 'Burgundy',
        hex: '#642832',
      },
      {
        name: 'Burnt orange',
        hex: '#A85428',
      },
    ],
    accents: [
      {
        name: 'Deep teal',
        hex: '#1E4A4C',
      },
      {
        name: 'Aubergine',
        hex: '#46283E',
      },
      {
        name: 'Antique gold',
        hex: '#B08838',
      },
      {
        name: 'Dark camel',
        hex: '#A07C48',
      },
    ],
    avoid: [
      {
        name: 'Pastel pink',
        hex: '#F2D0DA',
      },
      {
        name: 'Icy lavender',
        hex: '#DCD4EC',
      },
      {
        name: 'Stark white',
        hex: '#FFFFFF',
      },
      {
        name: 'Neon blue',
        hex: '#2848E8',
      },
      {
        name: 'Powder blue',
        hex: '#B8D0E4',
      },
      {
        name: 'Cool grey',
        hex: '#9AA0A6',
      },
      {
        name: 'Icy mint',
        hex: '#C8ECD8',
      },
    ],
    avoid_note: 'Pale pastels evaporate against your depth.',
    metals: {
      finish: 'Burnished / Antique',
      approved: ['Yellow gold', 'Bronze', 'Copper'],
      prohibited: ['High-shine Silver', 'Platinum', 'White gold'],
    },
    metals_note: 'Burnished gold and antique bronze hold their own against your depth.',
    proof_best: 'Deeper, richer, more magnetic.',
    proof_less: 'Faded, thin, washed away.',
    seen_on_you: [
      {
        lifts: 'Forest green coat',
        flattens: 'Pastel pink',
      },
      {
        lifts: 'Burgundy knit',
        flattens: 'Powder blue',
      },
      {
        lifts: 'Espresso tailoring',
        flattens: 'Stark white',
      },
    ],
  },
  'Clear Winter': {
    family: 'cool',
    voice:
      'Inspired by crisp, midnight light. Your palette is defined by high saturation and icy clarity. Robes focuses on pure jewel tones, sharp onyx, and optic whites to match your vivid natural presence.',
    summary: 'Icy, saturated, vivid — midnight clarity.',
    palette: [
      ['#F2F4F6', '#D8E4F0', '#B0CCEC', '#7CA8E4', '#4478D0', '#8890A0'],
      ['#48B0A8', '#189088', '#0C7864', '#186890', '#2050A8', '#3038A0'],
      ['#2C2C74', '#582890', '#8C2088', '#B01870', '#C82048', '#111114'],
    ],
    neutrals: [
      {
        name: 'Pure white',
        hex: '#FDFDFD',
      },
      {
        name: 'Jet black',
        hex: '#101012',
      },
      {
        name: 'Charcoal',
        hex: '#33373D',
      },
      {
        name: 'Steel grey',
        hex: '#6E7682',
      },
      {
        name: 'Icy grey',
        hex: '#D4D8DE',
      },
      {
        name: 'Midnight navy',
        hex: '#1A2440',
      },
    ],
    stars: [
      {
        name: 'Emerald',
        hex: '#0C8058',
      },
      {
        name: 'Sapphire',
        hex: '#1E4EA8',
      },
      {
        name: 'Ruby red',
        hex: '#C41E3E',
      },
      {
        name: 'Hot pink',
        hex: '#D8247C',
      },
    ],
    accents: [
      {
        name: 'Icy blue',
        hex: '#BCD6F0',
      },
      {
        name: 'Violet',
        hex: '#5C2E9C',
      },
      {
        name: 'Optic white',
        hex: '#FBFBFB',
      },
      {
        name: 'True teal',
        hex: '#0E7E86',
      },
    ],
    avoid: [
      {
        name: 'Mustard',
        hex: '#C89428',
      },
      {
        name: 'Earthy olive',
        hex: '#6E6A3E',
      },
      {
        name: 'Warm camel',
        hex: '#C29050',
      },
      {
        name: 'Dusty coral',
        hex: '#CC8470',
      },
      {
        name: 'Oatmeal',
        hex: '#DCCCB0',
      },
      {
        name: 'Terracotta',
        hex: '#B06438',
      },
      {
        name: 'Warm taupe',
        hex: '#A08A70',
      },
    ],
    avoid_note: 'Earthy, muted warmth dulls your edge.',
    metals: {
      finish: 'High-shine / Polished',
      approved: ['Silver', 'Chrome', 'White gold'],
      prohibited: ['Antique Gold', 'Bronze', 'Copper'],
    },
    metals_note: 'High-shine silver and chrome mirror your icy clarity.',
    proof_best: 'Sharper, clearer, electric.',
    proof_less: 'Muddy, softened, dimmed.',
    seen_on_you: [
      {
        lifts: 'Emerald silk',
        flattens: 'Mustard',
      },
      {
        lifts: 'Optic white shirt',
        flattens: 'Oatmeal',
      },
      {
        lifts: 'Sapphire dress',
        flattens: 'Camel',
      },
    ],
  },
  'True Winter': {
    family: 'cool',
    voice:
      'Pure, unadulterated coolness. Your palette eliminates all traces of warmth, focusing entirely on stark silvers, electric blues, and icy pinks. Robes treats these as your absolute wardrobe foundations.',
    summary: 'Stark, cool, uncompromising — pure winter.',
    palette: [
      ['#F4F6F8', '#DCE2EC', '#B8C4DC', '#8898C0', '#5870A8', '#8C94A8'],
      ['#4CA096', '#188478', '#0C6C5C', '#145C88', '#1C489C', '#282C90'],
      ['#242460', '#4C2084', '#801C80', '#A81468', '#BC1C44', '#0E0E12'],
    ],
    neutrals: [
      {
        name: 'Pure white',
        hex: '#FDFDFD',
      },
      {
        name: 'Jet black',
        hex: '#101012',
      },
      {
        name: 'Dark slate',
        hex: '#3A4250',
      },
      {
        name: 'Midnight blue',
        hex: '#182240',
      },
      {
        name: 'Cool grey',
        hex: '#9AA2AC',
      },
      {
        name: 'Icy silver',
        hex: '#DCE0E6',
      },
    ],
    stars: [
      {
        name: 'Electric blue',
        hex: '#2242C8',
      },
      {
        name: 'Icy pink',
        hex: '#E8B8CC',
      },
      {
        name: 'True red',
        hex: '#C01830',
      },
      {
        name: 'Royal purple',
        hex: '#4C2488',
      },
    ],
    accents: [
      {
        name: 'Cool emerald',
        hex: '#0E7858',
      },
      {
        name: 'Stark silver',
        hex: '#C8CED6',
      },
      {
        name: 'Fuchsia',
        hex: '#C41E78',
      },
      {
        name: 'Ice lavender',
        hex: '#C8C4E4',
      },
    ],
    avoid: [
      {
        name: 'Neon orange',
        hex: '#F06018',
      },
      {
        name: 'Golden yellow',
        hex: '#E0A828',
      },
      {
        name: 'Brick red',
        hex: '#963A2E',
      },
      {
        name: 'Mustard',
        hex: '#C89428',
      },
      {
        name: 'Camel',
        hex: '#C29050',
      },
      {
        name: 'Olive',
        hex: '#5A5836',
      },
      {
        name: 'Terracotta',
        hex: '#B06438',
      },
    ],
    avoid_note: 'Golden warmth has no place on your canvas.',
    metals: {
      finish: 'High-shine / Polished',
      approved: ['Silver', 'Platinum', 'White gold'],
      prohibited: ['Yellow Gold', 'Bronze', 'Copper'],
    },
    metals_note: 'Polished platinum and silver keep your look glacially precise.',
    proof_best: 'Crisper, brighter, defined.',
    proof_less: 'Sallow, warm, blurred.',
    seen_on_you: [
      {
        lifts: 'True red coat',
        flattens: 'Brick red',
      },
      {
        lifts: 'Icy pink silk',
        flattens: 'Golden yellow',
      },
      {
        lifts: 'Black tailoring',
        flattens: 'Olive',
      },
    ],
  },
  'Dark Winter': {
    family: 'cool',
    voice:
      'A palette of profound depth and cool mystery. Your colors are dark and saturated—think rich bordeaux, midnight navy, and deep charcoal. Robes uses these dense tones to anchor your most powerful silhouettes.',
    summary: 'Dark, cool, saturated — profound depth.',
    palette: [
      ['#E8ECF0', '#C0CCDC', '#8CA0C0', '#5C74A0', '#3C5488', '#787E90'],
      ['#347C74', '#106456', '#0A5044', '#12486C', '#1A3684', '#242470'],
      ['#1C1C4C', '#3C1868', '#641468', '#8C1054', '#A01838', '#0C0C10'],
    ],
    neutrals: [
      {
        name: 'Jet black',
        hex: '#101012',
      },
      {
        name: 'Pure white',
        hex: '#FDFDFD',
      },
      {
        name: 'Charcoal',
        hex: '#2E3238',
      },
      {
        name: 'Deep navy',
        hex: '#141E38',
      },
      {
        name: 'Dark plum',
        hex: '#3A2440',
      },
      {
        name: 'Graphite',
        hex: '#4A4E56',
      },
    ],
    stars: [
      {
        name: 'Bordeaux',
        hex: '#5E1428',
      },
      {
        name: 'Midnight navy',
        hex: '#141E38',
      },
      {
        name: 'Deep emerald',
        hex: '#0C5844',
      },
      {
        name: 'Blackberry',
        hex: '#3C1C44',
      },
    ],
    accents: [
      {
        name: 'Deep teal',
        hex: '#0E4C54',
      },
      {
        name: 'Icy contrast white',
        hex: '#F6F8FA',
      },
      {
        name: 'Dark fuchsia',
        hex: '#901458',
      },
      {
        name: 'Storm grey',
        hex: '#585E68',
      },
    ],
    avoid: [
      {
        name: 'Pastel yellow',
        hex: '#F4ECB0',
      },
      {
        name: 'Warm terracotta',
        hex: '#B06438',
      },
      {
        name: 'Camel',
        hex: '#C29050',
      },
      {
        name: 'Peach',
        hex: '#F0B088',
      },
      {
        name: 'Oatmeal',
        hex: '#DCCCB0',
      },
      {
        name: 'Warm tan',
        hex: '#C89468',
      },
      {
        name: 'Mustard',
        hex: '#C89428',
      },
    ],
    avoid_note: 'Warm earth tones unravel your cool depth.',
    metals: {
      finish: 'Polished / High-shine',
      approved: ['White gold', 'Silver', 'Platinum'],
      prohibited: ['Antique Gold', 'Copper', 'Bronze'],
    },
    metals_note: 'Polished white gold cuts cleanly against your darkness.',
    proof_best: 'Powerful, sculpted, intense.',
    proof_less: 'Dusty, warm, diluted.',
    seen_on_you: [
      {
        lifts: 'Bordeaux velvet',
        flattens: 'Camel',
      },
      {
        lifts: 'Midnight tailoring',
        flattens: 'Oatmeal',
      },
      {
        lifts: 'Emerald silk',
        flattens: 'Peach',
      },
    ],
  },
};

export const UNDERTONE_COPY: Record<Undertone, string> = {
  Cool: 'The permanent thermal tone beneath your surface skin is icy and crisp. Your features are electrified by silver hardware and clear, cool-toned pigments.',
  Warm: 'Your skin possesses a golden, sun-baked undertone that radiates when paired with yellow gold, rich creams, and earthy pigments.',
  'Neutral-Cool':
    'You sit precisely between cool and neutral, with a slight bias toward crisp undertones. You carry mixed metals beautifully, though silver grounds you.',
  'Neutral-Warm':
    'A rare, highly versatile balance. Your skin thrives in soft gold, champagne finishes, and gentle, organic warmth.',
};

export const UNDERTONE_NOTE: Record<Undertone, string> = {
  Cool: 'Silver sits closer to your skin than gold. Coolness reads first.',
  Warm: 'Gold sits closer to your skin than silver. Warmth reads first.',
  'Neutral-Cool': 'Mixed metals work, but silver grounds you.',
  'Neutral-Warm': 'Mixed metals work, but soft gold grounds you.',
};

export const CONTRAST_COPY: Record<Contrast, string> = {
  High: 'There is a striking value gap between your hair, skin, and eyes. You can wear bold, high-contrast pairings without the clothes wearing you.',
  'Extremely High':
    'There is a striking value gap between your hair, skin, and eyes. You can wear bold, high-contrast pairings without the clothes wearing you.',
  Medium:
    'Your features possess a balanced, fluid depth. Your contrast formula thrives on intentional layers.',
  Low: 'Your features are naturally soft, muted, and blended. Robes layers sophisticated mid-tones to build expensive-looking dimension — never harsh black-and-white.',
};

// The 5-body archetype design matrix.
export const BODIES: Record<BodyType, Body> = {
  Hourglass: {
    label: 'Symmetrical Balance',
    profile:
      'Shoulders and hips match closely in horizontal alignment; the waist is significantly narrower and highly defined.',
    summary: 'Balanced top to bottom with a waist that wants showing.',
    traits: [
      'Balanced shoulders & hips',
      'Defined waist',
      'Proportional curves',
      'Strong lower body',
    ],
    dresses: [
      {
        name: 'True wrap dress',
        note: 'Articulates the waist',
      },
      {
        name: 'Tailored fit & flare',
        note: 'Releases below the waist',
      },
      {
        name: 'Belted midi',
        note: 'A clean vertical canvas',
      },
      {
        name: 'Contoured column',
        note: 'Darting, not compression',
      },
    ],
    necklines: ['Deep surplice V', 'Sculpted scoop', 'Architectural square', 'Collared V'],
    tips: [
      'Anchor the true waist',
      'Mirror your volumes',
      'Fluid, draping fabrics',
      'Skin break at wrists',
    ],
    maxims: [
      'Always anchor outfits at the true waist.',
      'Keep upper and lower body volumes perfectly mirrored.',
      'Prioritize fluid fabrics with natural drape — silk, viscose, tropical wool.',
      'Use the skin break technique at the wrists or ankles to lighten visual weight.',
    ],
  },
  Pear: {
    label: 'Lower-Register Emphasis',
    profile:
      'The horizontal plane of the hips is wider than the shoulders; the torso is typically lean with a distinct waist.',
    summary: 'A lean frame that settles into a strong, grounded lower line.',
    traits: ['Narrower shoulders', 'Defined waist', 'Fuller hips & thigh', 'Strong lower body'],
    dresses: [
      {
        name: 'Structured A-line',
        note: 'Skims the hips',
      },
      {
        name: 'Prominent-shoulder shift',
        note: 'Broadens the upper line',
      },
      {
        name: 'Empire-line maxi',
        note: 'Elongates the lower line',
      },
      {
        name: 'Panel-detail trapeze',
        note: 'Releases into panels',
      },
    ],
    necklines: ['Wide boatneck', 'Deep sweetheart', 'Off-the-shoulder', 'Horizontal cowl'],
    tips: [
      'Draw the eye upward',
      'Matte, clean-cut bottoms',
      'Crop outerwear high',
      'Subtle shoulder structure',
    ],
    maxims: [
      'Draw the eye upward with upper-body texture or horizontal necklines.',
      'Choose deep, matte, clean-cut fabrics for trousers and skirts.',
      'Ensure outerwear cuts either above the hip or below the widest point of the thigh.',
      'Use subtle shoulder padding to structurally balance the lower register.',
    ],
  },
  Rectangle: {
    label: 'Linear Silhouette',
    profile:
      'Shoulders, waist, and hips sit on a relatively even horizontal plane; the silhouette is highly linear with minimal waist definition.',
    summary: 'A sleek, linear frame built for architectural shape-making.',
    traits: [
      'Even shoulders & hips',
      'Soft waist line',
      'Straight, lean frame',
      'Athletic balance',
    ],
    dresses: [
      {
        name: 'Engineered panel sheath',
        note: 'Simulates a waist',
      },
      {
        name: 'Dropped-waist midi',
        note: 'Celebrates the torso',
      },
      {
        name: 'Asymmetric draped overlay',
        note: 'Breaks the line',
      },
      {
        name: 'Structured shift',
        note: 'Boxy, editorial drape',
      },
    ],
    necklines: ['High mock-neck', 'Deep V-neck', 'Halter', 'One-shoulder'],
    tips: [
      'Contrast colour blocking',
      'Belt over structure only',
      'Bias-cut slips',
      'Crisp, heavy fabrics',
    ],
    maxims: [
      'Use high-contrast color blocking to break the silhouette into dynamic proportions.',
      'Use oversized belts only over structured jackets or heavy knits to create artificial dimension.',
      'Embrace fluid, bias-cut slips that flow elegantly across a straight frame.',
      'Use crisp, heavy-weight fabrics — structured cotton, heavy linen, bonded wool — to build architectural shapes.',
    ],
  },
  'Inverted Triangle': {
    label: 'Upper-Register Emphasis',
    profile:
      'Strong, broad shoulders and a prominent bustline tapering down to narrow hips and lean legs.',
    summary: 'A strong upper line tapering into lean hips and legs.',
    traits: ['Broader shoulders', 'Narrower hips', 'Lean lower body', 'Strong upper line'],
    dresses: [
      {
        name: 'Pleated-skirt shirt dress',
        note: 'Balances the lower half',
      },
      {
        name: 'Flared peplum midi',
        note: 'Structure at the hip',
      },
      {
        name: 'Tiered bohemian maxi',
        note: 'Weight at the hem',
      },
      {
        name: 'Tulip dress',
        note: 'Curves the lower line',
      },
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
  Apple: {
    label: 'Centric Volume',
    profile:
      'Weight is distributed primarily around the midsection and upper torso; the legs and arms are typically very lean and beautifully sculpted.',
    summary: 'Centre-carried volume over beautifully lean legs and arms.',
    traits: ['Fuller midsection', 'Soft waist line', 'Slimmer legs', 'Balanced shoulders'],
    dresses: [
      {
        name: 'Raised empire midi',
        note: 'Floats over the middle',
      },
      {
        name: 'Crisp column shift',
        note: 'Attention on the legs',
      },
      {
        name: 'Asymmetric wrap',
        note: 'Diagonal lengthens',
      },
      {
        name: 'Box-pleat trapeze',
        note: 'Avant-garde ease',
      },
    ],
    necklines: ['Open V-neck', 'Deep scoop', 'Split neck', 'Portrait neckline'],
    tips: [
      'Column dressing',
      'Show wrists & ankles',
      'No tight waist belts',
      'Fluid layering pieces',
    ],
    maxims: [
      'Monochromatic or column dressing — same tone inside, open contrasting layer on top — is exceptionally powerful.',
      'Show off the leanest assets: sleeves cropped to 3/4 length, hemlines at the knee or midi-calf.',
      'Avoid tight belts across the midsection.',
      'Look for unstructured, fluid layering pieces — linen blazers, silk kimonos, fine-gauge duster cardigans.',
    ],
  },
};
