import type { Balance } from '@robes/core/looks';
import { styleDnaPromptBlock } from '@robes/core/style-dna';
import { fenceUserText } from '../../fence';
import {
  FALLBACK_PIECE,
  genderDirective,
  type Mode,
  type ClosetPiece as V3ClosetPiece,
  type StyleContext as V3StyleContext,
} from './v3';

// v4 (legacy beta 2026-10-19): a second ask is a second answer. She says where the pieces come
// from (her wardrobe, a mix, new pieces, or her own words) and that answer leads the brief and
// governs every owned-first clause; the sets Robes already made ride as ALREADY SHOWN; no two ways
// share an Anchor; her starred pieces are a taste signal, never a default to build around.
export * from './v3';
export const VERSION = 4;

export interface ClosetPiece extends V3ClosetPiece {
  hero?: boolean;
  seasonBand?: string | null;
}
export interface StyleContext extends Omit<V3StyleContext, 'closet'> {
  closet: ClosetPiece[];
}

// A set Robes already made for her (loaded from her own artifacts, never from the request).
export interface RecentSet {
  prompt: string | null;
  ways: { title: string; pieces: string[] }[];
}

export interface Steer {
  balance?: Balance | null;
  balanceNote?: string | null;
  recent?: readonly RecentSet[];
}

const BAND_LABELS: Record<string, string> = {
  spring_summer: 'Spring/Summer',
  autumn_winter: 'Autumn/Winter',
  year_round: 'Year-round',
};
const heroMark = (p: ClosetPiece) =>
  p.hero ? `, ★ loved (${BAND_LABELS[p.seasonBand ?? ''] ?? 'Year-round'})` : '';

export const HERO_DIRECTIVE =
  'THE PIECES SHE LOVES: the wardrobe items marked ★ are the pieces she has starred — what she loves most. Read their cut, colour, fabric and register as the clearest signal of her taste, and let that taste steer every piece you choose or propose, owned or new. A starred piece is never a default to build a look around and never a reason to repeat a look: it earns its place like any other piece, when the occasion and the season fit, and a look without one is a fine look.';

export function balanceDirective(balance: Balance | null, note: string | null): string {
  const lines: string[] = [];
  if (balance === 'owned') {
    lines.push(
      'WHERE THE PIECES COME FROM — all hers: every look is built entirely from her wardrobe, each piece by its exact label. A new piece appears only where a slot cannot be filled from what she owns at all, and then one, named as the gap it fills. A small wardrobe is varied by combination, by how a piece is worn and by the scene, never by inventing pieces.',
    );
  } else if (balance === 'mix') {
    lines.push(
      'WHERE THE PIECES COME FROM — a mix: her pieces wherever they serve the look, by exact label, and new pieces for the gaps — every look holds BOTH, at least one piece of hers and at least one she has yet to find. When an owned piece and one to buy would both fit, the owned piece is the one listed.',
    );
  } else if (balance === 'new') {
    lines.push(
      'WHERE THE PIECES COME FROM — she asked for NEW pieces. Her wardrobe is context for her taste, never the brief: in EVERY look the Anchor and at least one more piece are pieces she has yet to find (wardrobe_index -1, with brand, retailer and price, from her houses and their register), and the Exclamation Point is new where it can be; an owned piece fills a slot only where it is plainly the right one, by its exact label, and never more than half the look. A look built from her wardrobe alone is the wrong answer to this ask.',
    );
  }
  if (note) {
    lines.push(
      `${balance ? 'And in her own words' : 'WHERE THE PIECES COME FROM — in her own words'}: ${fenceUserText(note, 160)} Follow that.`,
    );
  }
  return lines.join(' ');
}

const clip = (s: string, n: number) => s.replace(/\s+/g, ' ').trim().slice(0, n);

export function recentBlock(recent: readonly RecentSet[], balance: Balance | null): string {
  const rows: string[] = [];
  for (const set of recent.slice(0, 6)) {
    const ask = clip(set.prompt ?? '', 80);
    for (const w of set.ways.slice(0, 3)) {
      const title = clip(w.title, 60);
      const pieces = w.pieces
        .map((p) => clip(p, 60))
        .filter(Boolean)
        .slice(0, 6);
      if (!title && !pieces.length) continue;
      rows.push(
        `- ${title ? `"${title}"` : 'A look'}${pieces.length ? `: ${pieces.join(', ')}` : ''}${ask ? ` (asked: "${ask}")` : ''}`,
      );
    }
  }
  if (!rows.length) return '';
  const lead =
    balance === 'new'
      ? 'Each new look leads with a NEW piece she has yet to find — never an owned piece these looks already led with.'
      : 'Each new look leads with a different owned piece where the wardrobe allows; where it does not, the same piece is paired differently, worn differently, in a different scene — and the scene line says what is new.';
  return `ALREADY SHOWN — the looks Robes has already made for her, newest first. They exist; never return one again, and never the same set of pieces under a new name. ${lead}\n${fenceUserText(rows.slice(0, 18).join('\n'), 4000)}`;
}

function formula(wantsNew: boolean): string {
  const select = wantsNew
    ? 'Her brief, and her answer that NEW pieces are welcome, decide WHAT you select'
    : 'Her brief and what she owns decide WHAT you select';
  const pick = wantsNew
    ? 'Choosing between an owned piece and one to find, the new piece is the one listed unless hers is plainly the right one.'
    : 'Choosing between an owned piece and one to buy, the owned piece is the one listed.';
  const threeWays = wantsNew
    ? 'THREE WAYS, THREE LOOKS — no two ways share the same Anchor, and every Anchor is a NEW piece she has yet to find, three different pieces from three different houses; the three differ in register (one easier, one sharper, one unexpected), never three colourways of one idea, never three ways of dressing the same owned pieces.'
    : 'THREE WAYS, THREE LOOKS — no two ways share the same Anchor; where her wardrobe holds three candidates, each way leads with a different owned piece; the three differ in register (one easier, one sharper, one unexpected), never three colourways of one idea. A small wardrobe is varied by combination, by how a piece is worn and by the scene — never by inventing pieces she did not ask for.';
  return `THE FORMULA — every look layers 1) THE ANCHOR, the hero piece for the weather and agenda; 2) THE CANVAS, premium supporting basics; 3) THE TEXTURE, one depth-adding element; 4) THE EXCLAMATION POINT, the footwear, bag and hardware that inject identity. Name exact cuts, fabrications and how a piece is worn — never "jeans and a top".

SANITY CHECK — every styling move is one a respected stylist would shoot on the street, in the key piece's natural register: sporty pieces stay elevated-casual (no belted knitwear over athletic shorts, no waist-cinching tricks on a sporty silhouette, no tailoring over gym wear). ${select}; the colour and line notes only tilt a choice between pieces that both fit, and never dictate how a piece is contorted. A trick that needs explaining is dropped.

THE PIECES ARE THE LOOK — "pieces" is the complete outfit head to toe, three to six entries in the order Canvas → Anchor → Texture → Exclamation Point (one "role" each; the key piece is always one of them). "name" is the piece as worn ("Ivory silk shirt"); "color" a plain word, "color_hex" one hex. "wardrobe_index" is the owned piece's number from her wardrobe (its exact label as the name), else -1. Only a piece she must find carries "brand", "retailer_hint" and "price_point" (EUR, "€89"); leave them empty on an owned piece. ONE PIECE PER SLOT: exactly one pair of shoes, at most one bag, one bottom or one dress, one top under a layer — a look never lists two of the same kind (never two pairs of shoes, never a second bottom). ${pick}

${threeWays}

THE SCENE — one sentence under thirty words: the occasion, the setting, the mood, how the pieces are worn (tucked, open, sleeves pushed). It names no garment, shoe, bag or accessory, not even by type — the pieces list carries them and the two must never disagree. "A late dinner in the Marais, the top tucked and the jacket worn open, understated and unhurried." is the register; "paired with a pencil skirt and loafers" is forbidden.`;
}

function closetBlock(closet: readonly ClosetPiece[], steer: string): string {
  const items = closet.slice(0, 60);
  if (items.length === 0) return '';
  const lines = items.map(
    (p, n) =>
      `[${n}] ${p.label}${p.category ? ` [${p.category}]` : ''}${p.color ? `, ${p.color}` : ''}${p.timesWorn > 0 ? `, worn ${p.timesWorn}×` : ''}${heroMark(p)}`,
  );
  const hero = items.some((p) => p.hero) ? ` ${HERO_DIRECTIVE}` : '';
  // Her answer restates after the list, so recency agrees with primacy.
  const directive =
    steer ||
    (items.length >= 15
      ? 'Build primarily from her wardrobe, naming owned pieces by their exact labels; add a new piece only for a true gap or the Exclamation Point.'
      : 'Wherever an owned piece serves the look, use it by its exact label — owned always beats hypothetical. Fill only true gaps with new pieces.');
  return `HER WARDROBE (${items.length} pieces, numbered from 0): ${lines.join('; ')}.${hero}\n${directive}`;
}

export function buildSystem(ctx: StyleContext, mode: Mode, steer: Steer = {}): string {
  const daily = mode === 'dress-me';
  const balance = steer.balance ?? null;
  const note = steer.balanceNote?.trim() || null;
  const who = ctx.firstName ? `Her name is ${ctx.firstName.slice(0, 60)}.` : '';
  const brief = daily
    ? 'She is dressing for a real day. Build three complete, wearable outfits for it — each a distinct mood or register, all right for the occasion and the forecast given.'
    : 'Given a key piece, build three distinct, wearable looks around it — each with a clear occasion and mood, specific about drape, texture and why each pairing works.';
  // Her answer frames the whole brief, said first: only when there is a wardrobe to answer about.
  const steerLine = ctx.closet.length && (balance || note) ? balanceDirective(balance, note) : '';
  const fallbackRule = daily
    ? '"fallback" is true only for gibberish; a plain occasion, agenda or mood is a valid brief.'
    : `"fallback" is true when the input is gibberish, names no identifiable garment or accessory, or is too vague to style (a lone colour, a generic word, a non-fashion idea) — then style a ${FALLBACK_PIECE} instead. Otherwise false.`;
  const wearerRule =
    ctx.gender === 'unspecified'
      ? ' Set "wearer" ("woman" or "man") to your judgement of who the looks are for, from her words and the piece alone.'
      : '';
  const dna = styleDnaPromptBlock(ctx.styleDna, ctx.wardrobeCount, ctx.styleIcons, {
    balance: steerLine ? (balance ?? 'words') : null,
  });
  const closet = closetBlock(ctx.closet, steerLine);
  const shown = recentBlock(steer.recent ?? [], balance);
  return `You are Robes' head stylist — elegant, directional, precise; warm, editorial copy. ${genderDirective(ctx.gender)}${who ? ` ${who}` : ''}

${brief}${steerLine ? `\n\n${steerLine}` : ''}

${formula(balance === 'new')}

${fallbackRule}${wearerRule}${dna ? `\n\n${dna}` : ''}${closet ? `\n\n${closet}` : ''}${shown ? `\n\n${shown}` : ''}`;
}
