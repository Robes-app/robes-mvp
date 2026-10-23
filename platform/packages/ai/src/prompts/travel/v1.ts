import { styleDnaPromptBlock } from '@robes/core/style-dna';
import { z } from 'zod';
import { fenceUserText } from '../../fence';
import {
  BANNED_CONSTRUCTIONS_RULE,
  type DailyClosetPiece,
  GENDER_DIRECTIVE,
  type Gender,
  HERO_RULE,
  type HeroRule,
  LOOK_TAG_CLIMATES,
  LOOK_TAG_WEAR,
  LOOK_TAGS_RULE,
  PANEL_NOTE_RULE,
  ROW_NOTE_RULE,
} from '../daily/v1';

// Ported from legacy server.js POST /api/travel (the StyleAlchemist 4-Core Pillars, looks-first
// revision 2026-07-30). Not ported: covered plans, packed looks and moodboard picks (the intake
// doesn't collect them yet). Versioned: change wording only via a new version.
export const FEATURE = 'travel.edit';
export const VERSION = 1;

export const TRAVEL_TIERS = [
  'Foundations & Tailoring',
  'Statement & Texture',
  'Footwear & Hardware',
] as const;
export const TRAVEL_ROLES = [
  'The Anchor',
  'The Canvas',
  'The Texture',
  'The Exclamation Point',
] as const;
const CATEGORIES = [
  'Tops',
  'Bottoms',
  'Dresses',
  'Outerwear',
  'Shoes',
  'Bags',
  'Accessories',
  'Swim',
  'Other',
] as const;

export interface TravelContext {
  firstName: string | null;
  gender: Gender;
  styleIcons: string[];
  styleDna: unknown;
  closet: DailyClosetPiece[];
  // Key pieces she must pack: ids from her closet.
  shortlistIds: string[];
}

export interface TripBrief {
  destination: string;
  dateFrom: string;
  dateTo: string;
  // Her plans for the trip ("Beach day", "Night out"): one look each.
  occasions: string[];
  brief?: string | undefined;
  vibe?: string | undefined;
}

export interface TripWeather {
  city: string;
  country: string;
  minC: number | null;
  maxC: number | null;
  tempRange: string | null;
  condition: string | null;
  seasonal: boolean;
}

const DAY_MS = 86_400_000;
const utc = (d: string) => new Date(`${d}T00:00:00Z`);

// The derived numbers the legacy prompt runs on (capMax, suggest, looksTarget, tier splits).
export function tripParams(trip: TripBrief, shortlist: number, now = new Date()) {
  const from = utc(trip.dateFrom);
  const to = utc(trip.dateTo);
  const validDates = !Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && to >= from;
  const tripDays = validDates
    ? Math.min(10, Math.round((to.getTime() - from.getTime()) / DAY_MS) + 1)
    : 7;
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const dateLine = validDates
    ? `${fmt(from)} – ${fmt(to)}${from.getUTCFullYear() !== now.getUTCFullYear() ? ` ${from.getUTCFullYear()}` : ''}`
    : '';
  const monthName = validDates
    ? from.toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' })
    : '';
  const plans = trip.occasions
    .map((p) => p.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 10);
  const looksTarget = plans.length
    ? Math.min(12, plans.length)
    : Math.min(12, Math.max(4, Math.min(tripDays + 2, 10)));
  const capMax = Math.max(16, shortlist + 3);
  const suggest = Math.max(8, Math.min(15, tripDays + 6));
  const foundations = Math.round(suggest * 0.36);
  const statements = Math.round(suggest * 0.28);
  return {
    validDates,
    tripDays,
    dateLine,
    monthName,
    plans,
    looksTarget,
    totalLooks: looksTarget,
    capMax,
    suggest,
    foundations,
    statements,
    hardware: suggest - foundations - statements,
  };
}
export type TripParams = ReturnType<typeof tripParams>;

const clip = (s: string | null | undefined, n: number) => (s ?? '').slice(0, n);

function stateDirective(n: number): string {
  if (n === 0) {
    return `WARDROBE STATE: EMPTY. Build a fully aspirational capsule — a curated shopping brief. Every item gets "wardrobe_index": -1 plus a real "retailer_hint" and "price_point". "left_behind" must be [].`;
  }
  if (n < 15) {
    return `WARDROBE STATE: GROWING (${n}/15). Hybrid capsule: wherever an owned piece genuinely serves the trip, use it — set its "wardrobe_index" and use its exact label as the name. Fill true gaps with editorially matched acquisitions (wardrobe_index -1, real retailer_hint + price_point). When an owned piece and a hypothetical piece would both work, ALWAYS pack the owned piece. "left_behind" must be [].`;
  }
  return `WARDROBE STATE: COMPLETE (${n} pieces). Closet-first capsule: pack primarily from the digitised wardrobe — most items should carry a valid "wardrobe_index" and their exact owned label. Suggest a new piece (wardrobe_index -1) only for a true gap the trip exposes. "left_behind" must be [].`;
}

export function shortlistIndexes(ctx: TravelContext): number[] {
  const closet = ctx.closet.slice(0, 60);
  return ctx.shortlistIds.map((id) => closet.findIndex((p) => p.id === id)).filter((i) => i >= 0);
}

export function buildSystem(
  ctx: TravelContext,
  trip: TripBrief,
  correctiveNote?: string,
  heroRule: HeroRule = HERO_RULE,
): string {
  const closet = ctx.closet.slice(0, 60);
  const n = closet.length;
  const short = shortlistIndexes(ctx);
  const p = tripParams(trip, short.length);
  const who = ctx.firstName ? `The user's name is ${ctx.firstName.slice(0, 60)}. ` : '';
  const dna = styleDnaPromptBlock(ctx.styleDna, n, ctx.styleIcons);
  const hero = closet.some((c) => c.hero) ? heroRule.directive : '';
  const state = short.length ? '' : stateDirective(n);
  const closetBlock = n
    ? `THE USER'S DIGITISED WARDROBE (${n} pieces, referenced by wardrobe_index):\n${closet
        .map(
          (c, idx) =>
            `${idx}: ${clip(c.label, 120)}${c.category ? ` [${c.category}]` : ''}${c.color ? `, ${clip(c.color, 60)}` : ''}${c.brand ? `, ${clip(c.brand, 80)}` : ''}${c.timesWorn > 0 ? `, worn ${c.timesWorn}×` : ''}${heroRule.mark(c)}`,
        )
        .join('\n')}`
    : 'THE USER HAS NOT CATALOGUED ANY WARDROBE PIECES YET.';
  const firstShort = short[0] !== undefined ? closet[short[0]] : undefined;
  const looksSection = `THE LOOKS — a look is styled ONCE and worn wherever it suits; she pins each look to the days of her trip herself, so looks are FLAT and day-agnostic (no day numbers, no Day/Evening pairs, never mention a specific day). Return ${p.plans.length ? `EXACTLY ${p.looksTarget} look${p.looksTarget === 1 ? '' : 's'} in "looks" — one per plan below, dressed for exactly what it is, never an extra she didn't ask for` : `~${p.looksTarget} looks in "looks", built around the moments this trip plausibly holds`}. Each look: "occasion" (${p.plans.length ? 'EXACTLY one of her plan labels below' : 'a 1–3 word moment label like "Beach day" or "Night out"'}), "title" (a NAME for the look — 2–4 words in Title Case, never a sentence, never a trailing full stop; "Golden Hour", "Harbour Dinner" — NOT "Effortless exploration ensemble."), "how" (this look's PANEL NOTE) and the "formula". ${PANEL_NOTE_RULE}`;
  const plansBlock = p.plans.length
    ? `HER PLANS — the trip's moments, in her own labels. AUTHORITATIVE: dress each plan for exactly what it is, and use the label verbatim as that look's "occasion":\n${p.plans.map((x) => `- ${x}`).join('\n')}\n\n`
    : '';
  const keyBlock = short.length
    ? `HER KEY PIECES — everything that MUST be in the case (${short.length} owned pieces, by wardrobe_index):
${short
  .map((i) => {
    const c = closet[i] as DailyClosetPiece;
    return `${i}: ${clip(c.label, 120)}${c.category ? ` [${c.category}]` : ''}${c.color ? `, ${clip(c.color, 60)}` : ''}`;
  })
  .join('\n')}
KEEP EVERY SHORTLISTED PIECE — she has already decided what to bring; NEVER cut, drop or leave behind a shortlisted piece. Each one goes in "capsule" with its wardrobe_index, exact owned label and a one-line "reason" naming the wears it earns and what it anchors. "left_behind" must be []. Work every piece as hard as the 1:3 rule allows — a weaker piece still gets styled into the trip, not cut.
WORTH ADDING — the SMALLEST group, and it may be EMPTY: suggest a new piece (wardrobe_index -1, real retailer_hint + price_point) ONLY for a genuine gap the packed pieces expose that no shortlisted piece can fill. Never more than 3. Every NEW piece must justify itself as a bridge: set its "bridge" field to one clause naming what it connects and how many looks it unlocks (e.g. "Bridges the linen tailoring and the evening slip — unlocks 5 looks").
Do not pack owned pieces she did not shortlist — she chose from her full wardrobe already.

`
    : '';
  return `You are Robes' head stylist — elite, editorial, precise. ${who}${GENDER_DIRECTIVE[ctx.gender]} You are building a Capsule Packing Edit & Lookbook for a trip, governed by the StyleAlchemist 4-Core Pillars. Never output a generic outfit — ban flat phrasing ("jeans and a top"); render every look with high descriptive specificity (e.g. "Deep-V tuck the oversized alabaster silk button-down into the wide-leg linen trousers, cinched with the molten gold waist-belt").

THE PILLARS — all four are hard constraints:
1. THE 1:3 HIGH-YIELD RULE. Every capsule item must appear in AT LEAST THREE different outfits across the lookbook, in at least two distinct dress codes. No single-outfit passengers — if a piece can't earn three wears, it doesn't get packed.
2. THE CAPSULE MATRIX. YOU decide the pack count — the smallest capsule that dresses every moment of the trip under the 1:3 rule. For this ${p.tripDays}-day trip that is typically around ${p.suggest} items (never more than ${p.capMax}); the maths must hold: pieces × 3 wears ≥ ~${p.totalLooks} looks × ~4 formula slots (her own packed looks below count). Split the capsule across the three tiers: "${TRAVEL_TIERS[0]}" (~${p.foundations} items — architectural basics, tailoring, versatile one-pieces), "${TRAVEL_TIERS[1]}" (~${p.statements} items — the tactile hero pieces: statement dresses, crochet, plissé, prints), "${TRAVEL_TIERS[2]}" (~${p.hardware} items — shoes, bags, belts, jewellery that seal silhouettes).${short.length ? ' The tier targets are guidance for shaping what you KEEP — never pad the capsule to hit a number.' : ''}
3. THE 4-STEP DRESSING FORMULA. Every outfit's "formula" is built ONLY from capsule items referenced by "item_index" (0-based index into the capsule array — never invent an item that isn't packed): "The Anchor" ×1 (the context-driven hero), "The Canvas" ×1–2 (the grounding basics), "The Texture" ×1 (the tactile dimension layer), "The Exclamation Point" ×1–2 (footwear/hardware that finish it). Swim or sleep-adjacent looks may drop to 3 entries, never fewer. Each entry's "note" is that piece's ROW NOTE. ${ROW_NOTE_RULE} ${LOOK_TAGS_RULE.replace(/^- /, "Each look's ")}
4. CONTEXT ENGINEERING. Ingest three vectors at once: the Location Vibe (name it in "location_vibe", e.g. "Refined Mediterranean Minimalism"), the Micro-Climate provided, and the client's proportional architecture / style DNA below. Everything packed answers to all three.

${looksSection}

${plansBlock}${[state, hero].filter(Boolean).join('\n\n')}

FIELD RULES:
- "trip_label": destination + month, ALL CAPS (e.g. "IBIZA · JULY").
- "headline": a short serif-worthy line naming the trip, sentence case, full stop, max 9 words (e.g. "A week in Ibiza, packed once.").
- "stylist_summary": 2–3 sentences opening with the climate + vibe read, then how the capsule multiplies (reference the 1:3 maths — the pieces kept vs the ~${p.totalLooks} looks they earn).${firstShort ? ` Open by VALIDATING the strongest kept piece ("Your ${clip(firstShort.label, 120).toLowerCase()} is exactly right for…") before describing what the edit unlocks.` : ''}
- "reason": for KEPT owned pieces — one warm, specific line on why it made the cut (the wears it earns, what it anchors). New pieces: "".
- "bridge": for NEW pieces only (wardrobe_index -1) — one clause naming what it connects in the capsule and how many looks it unlocks. Owned pieces: "".
- "suitcase_note": ONE practical packing move (rolling, garment bags, what flies in what) in stylist voice.
- "palette": exactly 3 hex colours the capsule is built on, neutral to accent.
- Capsule items: "name" is the piece (for owned pieces the exact owned label); "brand" ONE real brand (owned brand or ""); "description" one hyper-specific sentence — cut, fabrication, colour, why it earns its place. Owned: wardrobe_index set, retailer_hint and price_point "". New: wardrobe_index -1, real "retailer_hint" (e.g. "COS", "Net-a-Porter", "Arket") and realistic EUR "price_point" (e.g. "€145").
- "fallback": true ONLY if the destination/brief is gibberish — then pack for a pleasant week away somewhere temperate instead.${dna ? `\n\n${dna}` : ''}

${BANNED_CONSTRUCTIONS_RULE}

${keyBlock}${closetBlock}${correctiveNote ? `\n\n${correctiveNote}` : ''}`;
}

export function weatherLine(w: TripWeather | null): string {
  if (!w?.tempRange) return '';
  return `MICRO-CLIMATE (${w.seasonal ? 'seasonal average for these dates' : 'live forecast'}): ${w.city}${w.country ? `, ${w.country}` : ''} — daytime highs to ${w.maxC}°C, evening lows to ${w.minC}°C, mostly ${w.condition || 'mixed conditions'}. Fabric weights, layers and evening cover-ups must answer to this.`;
}

// Destination, brief and vibe are her words: fenced in the user turn (SEC-23).
export function buildUser(trip: TripBrief, shortlist: number, weather: TripWeather | null): string {
  const p = tripParams(trip, shortlist);
  const wx = weatherLine(weather);
  const brief =
    trip.brief?.trim() || 'No further notes — read the destination and season for the vibe.';
  return `${wx ? `${wx}\n\n` : ''}THE TRIP BRIEF: ${fenceUserText(trip.destination, 120)}${p.dateLine ? `, ${p.dateLine}` : ''}${p.monthName ? ` (${p.monthName})` : ''}, ${p.tripDays} day${p.tripDays > 1 ? 's' : ''}. ${fenceUserText(brief, 600)}${trip.vibe?.trim() ? `\nTHE VIBE, IN HER WORDS: ${fenceUserText(trip.vibe, 240)}` : ''}

${shortlist ? `Pack every key piece, map the wears each one earns, add only what's genuinely missing — and build` : 'Build the capsule and'} ${p.plans.length ? `exactly ${p.looksTarget}` : `~${p.looksTarget}`} new look${p.looksTarget === 1 ? '' : 's'}${p.plans.length ? ' around her plans' : ''}.`;
}

const CapsuleItem = z.object({
  name: z.string().max(200),
  tier: z.string().max(60),
  category: z.enum(CATEGORIES),
  brand: z.string().max(120),
  description: z.string().max(600),
  reason: z.string().max(400).optional(),
  bridge: z.string().max(400).optional(),
  wardrobe_index: z.number().int(),
  retailer_hint: z.string().max(120),
  price_point: z.string().max(40),
});

// TRAVEL_SCHEMA: roles and tiers stay free strings so one bad value is normalised, not fatal.
export const Output = z.object({
  fallback: z.boolean(),
  trip_label: z.string().max(120),
  headline: z.string().max(160),
  location_vibe: z.string().max(160),
  stylist_summary: z.string().max(900),
  suitcase_note: z.string().max(400),
  palette: z.array(z.string().max(20)).max(6),
  capsule: z.array(CapsuleItem).max(30),
  left_behind: z.array(z.object({ wardrobe_index: z.number().int(), reason: z.string() })).max(30),
  looks: z
    .array(
      z.object({
        occasion: z.string().max(120),
        title: z.string().max(120),
        how: z.string().max(600),
        look_tags: z.object({
          climate: z.string().max(40),
          wear_for: z.array(z.string().max(40)).max(12),
          vibe: z.array(z.string().max(60)).max(8).optional(),
        }),
        formula: z
          .array(
            z.object({
              role: z.string().max(60),
              item_index: z.number().int(),
              note: z.string().max(400),
            }),
          )
          .max(10),
      }),
    )
    .max(20),
});
export type Output = z.infer<typeof Output>;

export interface NormalCapsuleItem {
  name: string;
  tier: (typeof TRAVEL_TIERS)[number];
  category: (typeof CATEGORIES)[number];
  brand: string;
  description: string;
  reason: string;
  bridge: string;
  // Her piece id when the model packed an owned piece.
  pieceId: string | null;
  retailerHint: string;
  pricePoint: string;
}

export interface NormalTripLook {
  occasion: string;
  title: string;
  how: string;
  lookTags: { climate: string; wearFor: string[] };
  formula: { role: (typeof TRAVEL_ROLES)[number]; itemIndex: number; note: string }[];
}

export interface NormalEdit {
  fallback: boolean;
  tripLabel: string;
  headline: string;
  locationVibe: string;
  stylistSummary: string;
  suitcaseNote: string;
  palette: string[];
  capsule: NormalCapsuleItem[];
  looks: NormalTripLook[];
}

const HEX = /^#[0-9a-f]{6}$/i;

// Legacy normalise(): tier defaults to Foundations, owned matches resolved, looks ≤14, formula ≤6
// with valid roles and indexes only; "left_behind" is deprecated and ignored.
export function normalise(
  out: Output,
  closet: readonly { id: string }[],
  capMax: number,
  destination: string,
): NormalEdit {
  const capsule = out.capsule
    .filter((it) => it.name)
    .slice(0, capMax)
    .map((it): NormalCapsuleItem => {
      const owned = it.wardrobe_index >= 0 ? closet[it.wardrobe_index] : undefined;
      return {
        name: it.name.slice(0, 120),
        tier: (TRAVEL_TIERS as readonly string[]).includes(it.tier)
          ? (it.tier as NormalCapsuleItem['tier'])
          : TRAVEL_TIERS[0],
        category: it.category,
        brand: it.brand,
        description: it.description,
        reason: owned ? (it.reason ?? '') : '',
        bridge: owned ? '' : (it.bridge ?? ''),
        pieceId: owned?.id ?? null,
        retailerHint: owned ? '' : it.retailer_hint,
        pricePoint: owned ? '' : it.price_point,
      };
    });
  const looks = out.looks
    .slice(0, 14)
    .map(
      (l): NormalTripLook => ({
        occasion: l.occasion.slice(0, 60),
        title: l.title.slice(0, 80),
        how: l.how.slice(0, 240),
        lookTags: {
          climate: (LOOK_TAG_CLIMATES as readonly string[]).includes(l.look_tags.climate)
            ? l.look_tags.climate
            : '',
          wearFor: [
            ...new Set(
              l.look_tags.wear_for.filter((w) => (LOOK_TAG_WEAR as readonly string[]).includes(w)),
            ),
          ].slice(0, 8),
        },
        formula: l.formula
          .filter(
            (f) =>
              (TRAVEL_ROLES as readonly string[]).includes(f.role) &&
              f.item_index >= 0 &&
              f.item_index < capsule.length,
          )
          .slice(0, 6)
          .map((f) => ({
            role: f.role as (typeof TRAVEL_ROLES)[number],
            itemIndex: f.item_index,
            note: f.note.slice(0, 240),
          })),
      }),
    )
    .filter((l) => l.formula.length > 0);
  return {
    fallback: out.fallback,
    tripLabel: out.trip_label || destination.toUpperCase(),
    headline: out.headline,
    locationVibe: out.location_vibe,
    stylistSummary: out.stylist_summary,
    suitcaseNote: out.suitcase_note,
    palette: out.palette.filter((c) => HEX.test(c)).slice(0, 3),
    capsule,
    looks,
  };
}

// The 1:3 rule (legacy travelUnderusedItems): capsule indexes worn in fewer than three looks;
// only meaningful with six or more looks.
export function underusedItems(edit: Pick<NormalEdit, 'capsule' | 'looks'>): number[] {
  if (edit.looks.length < 6) return [];
  const uses = edit.capsule.map(() => 0);
  for (const look of edit.looks) {
    for (const i of new Set(look.formula.map((f) => f.itemIndex))) uses[i] = (uses[i] ?? 0) + 1;
  }
  return uses.flatMap((u, i) => (u < 3 ? [i] : []));
}

// Shortlisted pieces missing from the capsule (every key piece must be kept).
export function missingKeyPieces(
  edit: Pick<NormalEdit, 'capsule'>,
  shortlistIds: string[],
): string[] {
  const packed = new Set(edit.capsule.flatMap((c) => (c.pieceId ? [c.pieceId] : [])));
  return shortlistIds.filter((id) => !packed.has(id));
}

export function correctiveNote(edit: NormalEdit, under: number[], missingLabels: string[]): string {
  return `VALIDATION FAILURE ON YOUR LAST ATTEMPT — ${[
    under.length
      ? `these packed items were worn in fewer than 3 looks: ${under.map((i) => edit.capsule[i]?.name).join(', ')}`
      : '',
    missingLabels.length
      ? `these key pieces were missing from the capsule: ${missingLabels.join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join(
      '; ',
    )}. Rework the edit so EVERY key piece is kept in the capsule, and EVERY capsule item earns at least three wears.`;
}

// Offline fixture: one look per plan (or four), each built from a small capsule.
export function fakeOutput(occasions: string[], closetSize = 0): Output {
  const plans = occasions.length
    ? occasions.slice(0, 12)
    : ['Arrival', 'Beach day', 'Dinner', 'Market'];
  const owned = (i: number) => (i < closetSize ? i : -1);
  const item = (
    name: string,
    category: (typeof CATEGORIES)[number],
    tier: number,
    idx: number,
  ) => ({
    name,
    tier: TRAVEL_TIERS[tier] as string,
    category,
    brand: idx >= 0 ? '' : 'COS',
    description: `${name}, clean lines, natural fabric.`,
    reason: idx >= 0 ? 'Earns four wears and anchors the evenings.' : '',
    bridge: idx >= 0 ? '' : 'Bridges day and evening — unlocks 3 looks.',
    wardrobe_index: idx,
    retailer_hint: idx >= 0 ? '' : 'COS',
    price_point: idx >= 0 ? '' : '€89',
  });
  return {
    fallback: false,
    trip_label: 'THE TRIP',
    headline: 'A trip, packed once.',
    location_vibe: 'Relaxed Coastal Minimalism',
    stylist_summary: 'Warm days, cool evenings; five pieces earn every look.',
    suitcase_note: 'Roll the knits; the linen travels folded in tissue.',
    palette: ['#EDE5D5', '#8E7458', '#33405C'],
    capsule: [
      item('Linen shirt', 'Tops', 0, owned(0)),
      item('Wide-leg trousers', 'Bottoms', 0, owned(1)),
      item('Silk slip dress', 'Dresses', 1, -1),
      item('Leather sandals', 'Shoes', 2, -1),
    ],
    left_behind: [],
    looks: plans.map((occasion, i) => ({
      occasion,
      title: ['Golden Hour', 'Harbour Dinner', 'Market Morning', 'Slow Start'][i % 4] as string,
      how: 'Linen over silk keeps it cool; the flat leather grounds it.',
      look_tags: { climate: 'spring_summer', wear_for: ['travel'] },
      formula: [
        {
          role: 'The Anchor',
          item_index: i % 2 === 0 ? 0 : 2,
          note: 'Worn open over the shoulders.',
        },
        { role: 'The Canvas', item_index: 1, note: 'Cuffed once at the ankle.' },
        { role: 'The Exclamation Point', item_index: 3, note: 'Buckled loosely.' },
      ],
    })),
  };
}

// Looks are day-agnostic; for the trip page they're laid across her dates in order.
export function assignDays(looks: number, dateFrom: string, tripDays: number): string[] {
  return Array.from({ length: looks }, (_, i) => {
    const d = utc(dateFrom);
    d.setUTCDate(d.getUTCDate() + (i % Math.max(1, tripDays)));
    return d.toISOString().slice(0, 10);
  });
}
