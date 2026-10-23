import { styleDnaPromptBlock } from '@robes/core/style-dna';
import { z } from 'zod';
import { fenceUserText } from '../../fence';

// Ported verbatim from legacy server.js POST /api/daily (the Context-to-Core framework).
// Versioned: change wording only via a new version.
export const FEATURE = 'today.daily';
export const VERSION = 1;

export type Gender = 'woman' | 'man' | 'unspecified';

export const DAILY_STEP_TITLES = [
  'The Anchor',
  'The Canvas',
  'The Texture',
  'The Accents',
] as const;
export type DailyStepTitle = (typeof DAILY_STEP_TITLES)[number];
export const LOOK_TAG_CLIMATES = ['spring_summer', 'autumn_winter', 'year_round'] as const;
export const LOOK_TAG_WEAR = [
  'everyday',
  'work',
  'evening',
  'occasion',
  'travel',
  'active',
  'lounge',
] as const;
export const LOOK_TAG_VIBE_SEEDS = [
  'powerhouse',
  'chic',
  'undone',
  'polished',
  'easy',
  'romantic',
  'sharp',
  'quiet',
  'statement',
  'off-duty',
];
export const BANNED_CONSTRUCTIONS_RULE = `BANNED CONSTRUCTIONS — never use these, in any field: the construction "X yet Y" (e.g. "comfortable yet refined"); benefit justification ("perfect for", "ideal for", "suitable for", "great for", "keeping you comfortable"); machine connectives ("ensuring", "while maintaining", "creating a", "allowing for", "centers around"); adverb inflation ("effortlessly", "seamlessly", "timelessly", "meticulously"); dead adjectives ("elevated", "versatile", "polished aesthetic", "vibrant spirit"); sustainability or virtue framing of any kind; quotation marks.`;
export const ROW_NOTE_RULE = `ROW NOTE: one sentence, 6–12 words maximum. Describes how THIS piece is worn in THIS look — the physical adjustment a stylist makes with her hands, not the reason for it. Verb-led; start with a participle where natural — Worn, Tucked, Belted, Cuffed, Carried, Layered, Left, Buttoned. Never state why the piece is good, who it suits, or what it achieves. Never repeat the item's name — the rack already names it. Never begin with "Perfect", "Ideal", "Great" or "A". Write for a woman who already has taste; she does not need convincing. Examples: "Worn open, sleeves cuffed once above the wrist." / "Belted at the natural waist, not the hip." / "Cuffed once at the ankle to show the shoe."`;
export const PANEL_NOTE_RULE = `PANEL NOTE: 30 words maximum, one or two sentences. Describes the logic of the look — how it balances, what register it sits in, what the weather or occasion asked for. Name garments by TYPE only (the wool, the knit, flat leather) — never list the pieces in order or name internal framework/formula steps; the rack already names them, with prices. Warm, direct and finished — she has been dressed, not sold to.`;

// Her own vibe set when she has one; otherwise the ten seeds.
export function vibeVocabLine(vibes: readonly string[] | null | undefined): string {
  const set = (vibes ?? [])
    .map((v) =>
      String(v || '')
        .trim()
        .toLowerCase(),
    )
    .filter(Boolean)
    .slice(0, 40);
  const list = set.length ? set : LOOK_TAG_VIBE_SEEDS;
  return `HER VIBE SET (map to exactly one of these wherever the brief's mood language reaches one of them, matching on meaning not spelling — "power CEO", "powerhouse" and "boss" are all the one tag): ${list.join(', ')}.`;
}
export const LOOK_TAGS_RULE = `- "look_tags" files the look for search — assign from the brief's intent and the pieces, never leave it generic. "climate" is thermal, not calendar, and is one of exactly three: "spring_summer" (lightweight, single-layer, warm weather), "autumn_winter" (layered, knits and coats, cold weather), "year_round" (reads correctly in any weather). "wear_for" is the lifestyle occasions the look is FOR — one or two of everyday, work, evening, occasion, travel, active, lounge; the sharpest matches only, never all of them. "vibe" is how she wants to FEEL in the look — one or two short lowercase words, never more. Read it from her own mood language in the brief ("I want to feel like a powerhouse CEO on Thursday" -> ["powerhouse"]) and map that onto her vibe set below wherever one of them carries the same meaning. Coin a new single word only when nothing in her set fits, and omit the field entirely rather than reaching.\n${vibeVocabLine(null)}`;
const FRAMEWORK = `You dress clients for real days using the Context-to-Core Framework. Never output a generic outfit — name exact cuts, fabrications and styling techniques (e.g. "French-tuck a heavyweight silk button-down into high-waisted wide-leg wool trousers").

THE FRAMEWORK — work through it in this order:
1. THE CONTEXT FILTERS. Fix the day's parameters before pulling a single garment: the agenda & mobility in the brief (what she physically does today), the atmospheric reality (the real-time weather provided — it dictates fabric weight and outerwear), and the psychological goal (how she needs to feel and be perceived).
2. THE ARCHITECTURAL FORMULA. Build the outfit as exactly four steps, in this exact order:
   - "The Anchor" — exactly 1 item: the hero structural piece that sets the register (blazer, coat, statement skirt, dress).
   - "The Canvas" — 1 or 2 items: the supporting, high-quality basics beneath the anchor (shirt, tee, knit, trousers, skirt).
   - "The Texture" — exactly 1 item: the layering element that adds tactile dimension (scarf, cardigan, fine knit, belt).
   - "The Accents" — exactly 2 items: the definitive footwear plus one piece of hardware (bag, jewellery) that finish the look.
3. THE GOLDEN RATIOS. Balance the build through body architecture: the Rule of Thirds (never a 50/50 visual split — aim for 1/3 : 2/3, e.g. a high-waisted trouser with a tucked-in top lengthens the leg line), Volume Balancing (an oversized or voluminous piece demands a point of structure or compression elsewhere), and Textural Contrast (mix matte, sheen and rough — silk + wool + leather — so the look never falls flat). Let this thinking show in the stylist_summary and item descriptions.
4. THE TRANSITION PROTOCOL. She moves between environments without going home. "transition_tip" is ONE concrete move — subtractive styling (drop a layer to lower the formality) or hardware swapping (daytime tote + sneakers → clutch + kitten heel) — that shifts today's look into its next scene.`;
const FIELD_RULES = `FIELD RULES:
- "occasion_label": 1–3 words, sentence case, naming the day's occasion (e.g. "Garden party", "Studio day").
- "headline": a short serif-worthy line naming place and occasion, sentence case, ending in a full stop (e.g. "A Dublin garden-party look."). Max 8 words.
- "stylist_summary" is this look's PANEL NOTE. ${PANEL_NOTE_RULE}
- "palette": exactly 3 hex colours drawn from the look, ordered neutral to accent.
- Each item: "name" is the piece itself (e.g. "Cream check blazer"); "brand" is ONE real brand suited to the piece's register (for owned pieces, the owned brand or ""); "description" is one internal reference sentence — cut, fabric, colour — used only to generate its photograph, never shown to her.
- "how" is this item's ROW NOTE. ${ROW_NOTE_RULE}
- Owned pieces: set "wardrobe_index" to the wardrobe list index, use the exact owned label as the name, and set retailer_hint and price_point to "". New pieces: "wardrobe_index": -1 with a real "retailer_hint" (e.g. "COS", "Net-a-Porter", "Arket") and a realistic EUR "price_point" (e.g. "€89").
- "alternates": exactly 2 per item — similar-but-distinct options for the SAME slot (a different colour, fabrication or register that still honours the palette, the weather and the DNA below), each with its own real brand, retailer_hint and EUR price_point. These power the flick-through rail, so make them genuinely wearable alternatives, never filler.
`;
const FALLBACK_RULE = `- "fallback": true ONLY if the brief is gibberish or random characters — then dress her for a pleasant, unremarkable day in the given context instead. A plain occasion, agenda or mood is a valid daily brief.`;

export const GENDER_DIRECTIVE: Record<Gender, string> = {
  man: 'The user identifies as a man. Every piece, look and recommendation must be menswear — male cuts, sizing and styling codes, menswear brands and male style references throughout. Never suggest womenswear. Where these instructions use "she"/"her" generically, they refer to this male client — read them as "he"/"him".',
  unspecified:
    'The user has not said how they identify. Use your best judgement from their words, their pieces and their wardrobe to decide whose clothing to recommend; when nothing points a direction, keep pieces and styling gender-neutral. Where these instructions use "she"/"her" generically, they simply refer to this client.',
  woman: 'Unless the brief clearly indicates a male wearer, style for a woman.',
};

export const SEASON_BAND_LABELS: Record<string, string> = {
  spring_summer: 'Spring/Summer',
  autumn_winter: 'Autumn/Winter',
  year_round: 'Year-round',
};

export interface DailyClosetPiece {
  id: string;
  label: string;
  category: string | null;
  color: string | null;
  brand: string | null;
  timesWorn: number;
  hero: boolean;
  seasonBand: string | null;
}

export interface DailyContext {
  firstName: string | null;
  gender: Gender;
  styleIcons: string[];
  styleDna: unknown;
  closet: DailyClosetPiece[];
  vibes?: string[];
  // Pieces she locked into the look (restyle): ids from her closet.
  lockedPieceIds?: string[];
}

export interface Weather {
  city: string | null;
  month: string | null;
  tempRange: string | null;
  condition: string | null;
}

export function heroMark(p: Pick<DailyClosetPiece, 'hero' | 'seasonBand'>): string {
  if (!p.hero) return '';
  return `, ★ HERO (${SEASON_BAND_LABELS[p.seasonBand ?? ''] ?? 'Year-round'})`;
}

export const HERO_DIRECTIVE = `HERO PIECES: the wardrobe items marked ★ HERO are her Hero Rack — the pieces she reaches for first, the spine of her wardrobe. Whenever a hero piece genuinely suits the occasion AND the season/climate in play, PRIORITISE it over any other comparable owned piece and let it lead the look. The bracket names the season band each hero belongs to — Spring/Summer, Autumn/Winter, or Year-round. Its priority only applies when the look's season or climate matches that band (Year-round always matches); never force an off-season hero into a look.`;

// The mark and the directive are one rule: a directive that names the mark is only true while the
// closet lines carry it, so a later version replaces both together.
export interface HeroRule {
  directive: string;
  mark: (p: Pick<DailyClosetPiece, 'hero' | 'seasonBand'>) => string;
}
export const HERO_RULE: HeroRule = { directive: HERO_DIRECTIVE, mark: heroMark };

function stateDirective(n: number): string {
  if (n === 0) {
    return `WARDROBE STATE: EMPTY. Build a fully aspirational, editorial look — this look doubles as a shopping brief. Every item gets "wardrobe_index": -1 plus a real "retailer_hint" and "price_point".`;
  }
  if (n < 15) {
    return `WARDROBE STATE: GROWING (${n}/15). Hybrid build: wherever an owned piece genuinely serves the brief, use it — set its "wardrobe_index" and use its exact label as the name. Fill true gaps with aspirational pieces (wardrobe_index -1, real retailer_hint + price_point). When an owned piece and a hypothetical piece would both work, ALWAYS choose the owned piece.`;
  }
  return `WARDROBE STATE: COMPLETE (${n} pieces). Closet-first build: compose the look primarily from the digitised wardrobe — nearly every item should carry a valid "wardrobe_index" and its exact owned label. Introduce a new piece (wardrobe_index -1) only for a true gap or the finishing exclamation point.`;
}

// Closet labels are her words: they sit in the system turn by index, as legacy did, but capped.
const clip = (s: string | null | undefined, n: number) => (s ?? '').slice(0, n);

export function buildSystem(ctx: DailyContext, heroRule: HeroRule = HERO_RULE): string {
  const closet = ctx.closet.slice(0, 60);
  const n = closet.length;
  const who = ctx.firstName ? `The user's name is ${ctx.firstName.slice(0, 60)}. ` : '';
  const hero = closet.some((p) => p.hero) ? heroRule.directive : '';
  const locked = closet
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => ctx.lockedPieceIds?.includes(p.id))
    .slice(0, 8);
  const lockedBlock = locked.length
    ? `ANCHORED PIECES — the user has LOCKED these into today's look. Every one of them MUST appear in the final look exactly as given (same piece, same name), placed in the architectural step where it belongs; restyle everything AROUND them:\n${locked
        .map(
          ({ p, idx }) =>
            `- ${clip(p.label, 120)}${p.category ? ` [${p.category}]` : ''}${p.brand ? `, ${clip(p.brand, 80)}` : ''} (wardrobe index ${idx} — set its wardrobe_index)`,
        )
        .join('\n')}`
    : '';
  const closetBlock = n
    ? `THE USER'S DIGITISED WARDROBE (${n} pieces, referenced by index):\n${closet
        .map(
          (p, idx) =>
            `${idx}: ${clip(p.label, 120)}${p.category ? ` [${p.category}]` : ''}${p.color ? `, ${clip(p.color, 60)}` : ''}${p.brand ? `, ${clip(p.brand, 80)}` : ''}${p.timesWorn > 0 ? `, worn ${p.timesWorn}×` : ''}${heroRule.mark(p)}`,
        )
        .join('\n')}`
    : 'THE USER HAS NOT CATALOGUED ANY WARDROBE PIECES YET.';
  const dna = styleDnaPromptBlock(ctx.styleDna, n, ctx.styleIcons);
  return `You are Robes' head stylist — elite, editorial, precise. ${who}${GENDER_DIRECTIVE[ctx.gender]} ${FRAMEWORK}

${stateDirective(n)}${hero ? `\n\n${hero}` : ''}${lockedBlock ? `\n\n${lockedBlock}` : ''}

${FIELD_RULES}${LOOK_TAGS_RULE}
${vibeVocabLine(ctx.vibes)}
${FALLBACK_RULE}${dna ? `\n\n${dna}` : ''}

${BANNED_CONSTRUCTIONS_RULE}

${closetBlock}`;
}

export function weatherLine(w: Weather | null): string {
  if (!w || !(w.city || w.tempRange)) return '';
  const place = [w.city, w.month].filter(Boolean).join(' · ');
  return `REAL-TIME CONTEXT: ${place}${w.tempRange ? ` | ${w.tempRange}` : ''}${w.condition ? ` | ${w.condition}` : ''}. This is the atmospheric reality — fabric weight, layers and footwear must answer to it.`;
}

// Her brief is the only free text, fenced in the user turn (SEC-23).
export function buildUser(brief: string | undefined, weather: Weather | null): string {
  const rt = weatherLine(weather);
  const text = brief?.trim() || 'A regular day — no fixed plans.';
  return `${rt ? `${rt}\n\n` : ''}The user's brief for today: ${fenceUserText(text, 500)}

Dress her for this exact day, start to finish, through the four architectural steps.`;
}

const Alternate = z.object({
  name: z.string().max(200),
  brand: z.string().max(120),
  retailer_hint: z.string().max(120),
  price_point: z.string().max(40),
});

const Item = z.object({
  name: z.string().max(200),
  category: z.enum([
    'Tops',
    'Bottoms',
    'Dresses',
    'Outerwear',
    'Shoes',
    'Bags',
    'Accessories',
    'Other',
  ]),
  brand: z.string().max(120),
  description: z.string().max(600).optional(),
  how: z.string().max(600),
  wardrobe_index: z.number().int(),
  retailer_hint: z.string().max(120),
  price_point: z.string().max(40),
  alternates: z.array(Alternate).max(6),
});
export type DailyItem = z.infer<typeof Item>;

// DAILY_SCHEMA: step titles stay free strings here so an unknown title is dropped by
// normalisation rather than failing the whole call (legacy filtered them the same way).
export const Output = z.object({
  fallback: z.boolean(),
  occasion_label: z.string().max(80),
  headline: z.string().max(160),
  stylist_summary: z.string().max(600),
  transition_tip: z.string().max(400),
  palette: z.array(z.string().max(20)).max(6),
  look_tags: z.object({
    climate: z.string().max(40),
    wear_for: z.array(z.string().max(40)).max(12),
    vibe: z.array(z.string().max(60)).max(8).optional(),
  }),
  steps: z.array(z.object({ title: z.string().max(60), items: z.array(Item).max(6) })).max(8),
});
export type Output = z.infer<typeof Output>;

export interface NormalItem {
  name: string;
  category: DailyItem['category'];
  brand: string;
  description: string;
  how: string;
  // Her piece id when the model used an owned piece.
  pieceId: string | null;
  retailerHint: string;
  pricePoint: string;
  alternates: { name: string; brand: string; retailerHint: string; pricePoint: string }[];
  imageIndex: number;
}

export interface NormalLook {
  fallback: boolean;
  occasionLabel: string;
  headline: string;
  stylistSummary: string;
  transitionTip: string;
  palette: string[];
  lookTags: { climate: string; wearFor: string[]; vibe: string[] };
  steps: { title: DailyStepTitle; items: NormalItem[] }[];
}

const HEX = /^#[0-9a-f]{6}$/i;

// Legacy normalisation: canonical step order, ≤2 items per step, wardrobe_index → her piece id,
// `how` ≤160, alternates ≤3, sequential image indexes; tags clamped to the vocabularies.
export function normalise(out: Output, closet: readonly { id: string }[]): NormalLook | null {
  const steps = out.steps
    .filter(
      (s): s is typeof s & { title: DailyStepTitle } =>
        (DAILY_STEP_TITLES as readonly string[]).includes(s.title) && s.items.length > 0,
    )
    .sort((a, b) => DAILY_STEP_TITLES.indexOf(a.title) - DAILY_STEP_TITLES.indexOf(b.title));
  let imageIndex = 0;
  const normal = steps.map((s) => ({
    title: s.title,
    items: s.items.slice(0, 2).map((it) => {
      const owned = it.wardrobe_index >= 0 ? closet[it.wardrobe_index] : undefined;
      return {
        name: it.name.slice(0, 120),
        category: it.category,
        brand: it.brand,
        description: it.description ?? '',
        how: it.how.slice(0, 160),
        pieceId: owned?.id ?? null,
        retailerHint: owned ? '' : it.retailer_hint,
        pricePoint: owned ? '' : it.price_point,
        alternates: it.alternates
          .filter((a) => a.name)
          .slice(0, 3)
          .map((a) => ({
            name: a.name.slice(0, 120),
            brand: a.brand,
            retailerHint: a.retailer_hint,
            pricePoint: a.price_point,
          })),
        imageIndex: imageIndex++,
      };
    }),
  }));
  if (imageIndex === 0) return null;
  const tags = out.look_tags;
  const vibe: string[] = [];
  for (const v of tags.vibe ?? []) {
    const clean = v
      .replace(/^vibe:/i, '')
      .trim()
      .slice(0, 28)
      .toLowerCase();
    if (clean && !vibe.includes(clean) && vibe.length < 4) vibe.push(clean);
  }
  return {
    fallback: out.fallback,
    occasionLabel: out.occasion_label,
    headline: out.headline,
    stylistSummary: out.stylist_summary,
    transitionTip: out.transition_tip,
    palette: out.palette.filter((c) => HEX.test(c)).slice(0, 3),
    lookTags: {
      climate: (LOOK_TAG_CLIMATES as readonly string[]).includes(tags.climate) ? tags.climate : '',
      wearFor: [
        ...new Set(tags.wear_for.filter((w) => (LOOK_TAG_WEAR as readonly string[]).includes(w))),
      ].slice(0, 8),
      vibe,
    },
    steps: normal,
  };
}

const FULL_BODY_FRAME =
  'FULL-LENGTH FRAMING, HEAD TO TOE: the entire figure fits inside the frame — the full head and hair visible with clear space above, both shoes fully visible with clear space below. Never crop the face, head, hands or feet. Subject standing, centred, photographed from far enough back to capture the whole body.';

const WEARER: Record<Gender, { noun: string; wears: string }> = {
  woman: { noun: 'woman', wears: 'She wears' },
  man: { noun: 'man', wears: 'He wears' },
  unspecified: { noun: 'person', wears: 'They wear' },
};

// Image prompts are built from validated, capped fields only (SEC-23).
export function buildAnchorPrompt(opts: {
  gender: Gender;
  look: NormalLook;
  styleIcons: string[];
  city: string | null;
}): string {
  const items = opts.look.steps.flatMap((s) => s.items);
  const anchor = opts.look.steps.find((s) => s.title === 'The Anchor')?.items[0] ?? items[0];
  const icons = opts.styleIcons
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);
  const iconLine = icons.length
    ? `The styling sensibility channels ${icons.join(', ')} — their signature silhouettes and fashion codes. `
    : '';
  const scene = [opts.look.occasionLabel.toLowerCase().slice(0, 60), opts.city?.slice(0, 80)]
    .filter(Boolean)
    .join(' in ');
  const w = WEARER[opts.gender];
  return `PORTRAIT ORIENTATION ONLY. Single editorial fashion photograph — one ${w.noun}, alone, one scene, no collage, no split panels, no text overlays. ${FULL_BODY_FRAME} ${iconLine}${w.wears} the complete outfit: ${items.map((i) => i.name).join(', ')}. The ${anchor?.name ?? 'look'} leads the frame. ${scene ? `Setting: ${scene}. ` : ''}Soft natural light, luxury campaign aesthetic.`;
}

export function buildStillLifePrompt(item: NormalItem): string {
  return `Editorial still-life photograph of a single ${item.name}${item.brand ? ` by ${item.brand}` : ''} — ${item.description.slice(0, 300)}. The garment styled alone on a neutral cream-linen surface, soft daylight, quiet luxury catalogue aesthetic. No model, no text, no collage, one item only.`;
}

// Offline fixture: owned pieces are used by index when she has them.
export function fakeOutput(closetSize = 0): Output {
  const owned = (i: number) => (i < closetSize ? i : -1);
  const item = (name: string, category: DailyItem['category'], idx: number): DailyItem => ({
    name,
    category,
    brand: idx >= 0 ? '' : 'COS',
    description: `${name}, clean lines, natural fabric.`,
    how: 'Worn open, sleeves cuffed once above the wrist.',
    wardrobe_index: idx,
    retailer_hint: idx >= 0 ? '' : 'COS',
    price_point: idx >= 0 ? '' : '€89',
    alternates: [
      { name: `${name} in navy`, brand: 'Arket', retailer_hint: 'Arket', price_point: '€79' },
      { name: `${name} in ecru`, brand: 'COS', retailer_hint: 'COS', price_point: '€99' },
    ],
  });
  return {
    fallback: false,
    occasion_label: 'Studio day',
    headline: 'A quiet studio-day look.',
    stylist_summary: 'Wool over cotton keeps the line long; the flat leather grounds it.',
    transition_tip: 'Swap the tote for a small clutch after six.',
    palette: ['#EDE5D5', '#8E7458', '#33405C'],
    look_tags: { climate: 'year_round', wear_for: ['work'], vibe: ['quiet'] },
    steps: [
      {
        title: 'The Canvas',
        items: [item('Cream knit', 'Tops', owned(1)), item('Wide-leg trousers', 'Bottoms', -1)],
      },
      { title: 'The Anchor', items: [item('Camel coat', 'Outerwear', owned(0))] },
      { title: 'The Texture', items: [item('Silk scarf', 'Accessories', -1)] },
      {
        title: 'The Accents',
        items: [item('Leather loafers', 'Shoes', -1), item('Structured tote', 'Bags', -1)],
      },
    ],
  };
}
