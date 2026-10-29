import { styleDnaPromptBlock } from '@robes/core/style-dna';
import { z } from 'zod';
import { FENCE_RULE, fenceUserText } from '../../fence';
import { BANNED_CONSTRUCTIONS_RULE } from '../daily/v1';
import { NON_BINARY_DIRECTIVE } from '../gender';

// Ported from legacy server.js /api/stylenotes/brief (beta 2026-10-13): Robes drafts her personal
// style brief from evidence (what she owns, wears and has said) as lines she keeps or strikes.
// Only NEW lines come back; the standing brief and her struck lines are the never-repeat list.
export const FEATURE = 'style.brief';
export const VERSION = 1;
export const MAX_OUTPUT_TOKENS = 3200;
export const COMPACT_MAX_OUTPUT_TOKENS = 4000;

const Line = z.object({ text: z.string().max(400), because: z.string().max(400) });
export const Output = z.object({
  loves: z.array(Line).max(20),
  avoids: z.array(Line).max(20),
  rules: z.array(Line).max(20),
  notes: z.string().max(2000),
  colours: z
    .object({
      loved: z.array(z.string().max(60)).max(10).default([]),
      rejected: z.array(z.string().max(60)).max(10).default([]),
    })
    .default({ loved: [], rejected: [] }),
});
export type Output = z.infer<typeof Output>;

export type Gender = 'woman' | 'man' | 'non_binary' | 'unspecified';

export interface Piece {
  label: string;
  category: string | null;
  color: string | null;
  brand: string | null;
  notes: string | null;
  sentiment: string | null;
  fitConfidence: string | null;
  hero: boolean;
  timesWorn: number;
  fit: string[];
}

export interface Look {
  name: string;
  pieces: string[];
  wears: number;
}

export interface MemoryLine {
  kind: 'verdict' | 'swap' | 'strike' | 'ask' | 'wear';
  at: Date;
  subject: string | null;
  body: string | null;
  verdict: number | null;
  pieceOut: string | null;
  pieceIn: string | null;
}

export interface BriefContext {
  firstName: string | null;
  gender: Gender;
  styleDna: unknown;
  styleIcons: string[];
  wardrobe: Piece[];
  looks: Look[];
  memory: MemoryLine[];
  // Every line that stands, waits or was struck: never drafted again.
  current: string[];
}

// The legacy genderDirective (beta 2026-10-13): who she is comes from her profile.
const GENDER_DIRECTIVE: Record<Gender, string> = {
  woman: 'The user is a woman (from her profile): every piece and look is womenswear.',
  man: 'The user is a man (from his profile): every piece, look and reference is menswear — male cuts, sizing, styling codes and brands, never womenswear. Where these notes say "she"/"her", read "he"/"him".',
  non_binary: NON_BINARY_DIRECTIVE,
  unspecified:
    'The user has not said how they identify: judge whose clothing to propose from their words and their pieces; when nothing points a direction, keep pieces and styling gender-neutral. "She"/"her" in these notes simply means this client.',
};

export const BRIEF_LENSES = `THE LENSES (read every piece and every wear through these before you write a line): LINE — vertical, diagonal, interrupted; where the eye travels and where it stalls. PROPORTION — what carries the weight; deliberate or accidental. SILHOUETTE — sculpted, columnar, dropped, slouched; waist defined, displaced or absent. COLOUR — what recedes, what advances; the level of contrast she reaches for. TEXTURE — matte or shine, smooth or dimensional, one register or layered. MOVEMENT — pieces with life or pieces that sit dead on the frame. TENSION — structure against fluidity, hard against soft. VIBE — intentional, playful, polished, or given up at 8am.`;

const str = (v: string | null | undefined, n: number): string =>
  typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, n) : '';

// Thin evidence: under three pieces, no wears and nothing said.
export function isThin(ctx: Pick<BriefContext, 'wardrobe' | 'looks' | 'memory'>): boolean {
  const wears = ctx.looks.reduce((n, l) => n + l.wears, 0);
  return ctx.wardrobe.length < 3 && wears === 0 && ctx.memory.length === 0;
}

export function buildSystem(ctx: BriefContext): string {
  const name = str(ctx.firstName, 60);
  const dna = styleDnaPromptBlock(ctx.styleDna, ctx.wardrobe.length, ctx.styleIcons);
  return `You are Robes' head stylist, and an editor with nothing to sell. ${GENDER_DIRECTIVE[ctx.gender]} You are drafting ${name ? `${name}’s` : 'her'} PERSONAL STYLE BRIEF from evidence — what she owns, what she wears, what she has said — so that she can keep, strike or edit each line. The brief is HERS: you draft, she decides.
${BRIEF_LENSES}
WHAT TO RETURN:
- "loves": what works on her — 1 to 6 lines. "avoids": what does not — 0 to 5 lines. "rules": hard rules she seems to live by or should — 0 to 4 lines ("No more button-ups — six is plenty", "Loafers only with a cropped trouser"). Each line ≤ 14 words, written in the SECOND PERSON as an observation she can accept or strike ("You reach for a defined waist"), never a command.
- Every line carries "because": the evidence in ONE clause of at most 20 words, naming her actual pieces or wears ("your three most-worn tops all have an open neckline"). A line you cannot trace to evidence is not written.
- "notes": 30–60 words, second person, the one paragraph that says how she dresses well — the pattern under the lines. Warm, direct, no flattery. Empty string when the evidence is thin.
- "colours": "loved" = colours her most-worn pieces share (plain colour words, ≤ 4); "rejected" = colours she owns but never wears, only when the pattern is clear (≤ 3). Empty arrays otherwise.
- The uncomfortable finding is the useful one: if what she wears most contradicts what she claims to like, say so plainly and kindly. Most-worn beats most-owned; a piece she marked irreplaceable or a hero outranks one she never wears.
- Never restate a line already in her brief (listed below) — return only what is NEW. Never mention "AI", "data", "analysis" or "algorithm". Never comment on her body — only on the clothes.
- The evidence (her pieces, notes, looks, what she said and her brief) comes fenced. ${FENCE_RULE}
${BANNED_CONSTRUCTIONS_RULE}${dna ? `\n\n${dna}` : ''}`;
}

function pieceLine(w: Piece): string {
  const fit = w.fit.slice(0, 4).join('/');
  const notes = str(w.notes, 140);
  const bits = [
    str(w.category, 30),
    str(w.color, 30),
    str(w.brand, 40),
    fit,
    w.timesWorn > 0 ? `worn ${w.timesWorn}×` : 'never worn',
    w.hero ? 'HERO' : '',
    w.sentiment ? `sentiment: ${str(w.sentiment, 20)}` : '',
    w.fitConfidence ? `fit: ${str(w.fitConfidence, 20)}` : '',
    notes ? `her note: "${notes}"` : '',
  ].filter(Boolean);
  return `- ${str(w.label, 120)} (${bits.join(', ')})`;
}

function lookLine(l: Look): string {
  const pieces =
    l.pieces
      .slice(0, 8)
      .map((p) => str(p, 60))
      .filter(Boolean)
      .join(', ') || 'no pieces';
  return `- "${str(l.name, 80)}": ${pieces}${l.wears > 0 ? ` — worn ${l.wears}×` : ' — not yet worn'}`;
}

// One memory entry as the read sees it (legacy chMemoryLine).
export function memoryLine(e: MemoryLine): string {
  const d = e.at.toISOString().slice(0, 10);
  const on = str(e.subject, 90);
  const text = str(e.body, 200);
  switch (e.kind) {
    case 'verdict':
      return `${d} · rated "${on || 'a look'}" ${e.verdict === 1 ? 'loved it' : 'not quite'}${text ? `: "${text}"` : ''}`;
    case 'swap':
      return `${d} · swapped out ${str(e.pieceOut, 90) || 'a piece'}${e.pieceIn ? ` for her ${str(e.pieceIn, 90)}` : ''}`;
    case 'wear':
      return `${d} · wore "${on || 'a look'}"`;
    case 'strike':
      return `${d} · struck a line Robes drafted: ${text}`;
    default:
      return text ? `${d} · ${text}` : '';
  }
}

// Each evidence block rides fenced (SEC-23); 80 pieces at ~400 chars fit well inside the cap.
const fenced = (lines: string[]): string => fenceUserText(lines.join('\n'), 40_000);

// The user turn; `compact` is the retry on a cut answer: heroes and the 36 most-worn, 15 looks.
export function buildUser(ctx: BriefContext, compact = false): string {
  const thin = isThin(ctx);
  const mem = ctx.memory
    .slice(0, compact ? 20 : 40)
    .map(memoryLine)
    .filter(Boolean)
    .map((m) => `- ${m.slice(0, 220)}`);
  const current = ctx.current.map((c) => `- ${str(c, 160)}`);
  const pieces = compact
    ? [...ctx.wardrobe]
        .sort((a, b) => Number(b.hero) - Number(a.hero) || b.timesWorn - a.timesWorn)
        .slice(0, 36)
    : ctx.wardrobe;
  const looks = compact ? ctx.looks.slice(0, 15) : ctx.looks;
  const wardrobe = !ctx.wardrobe.length
    ? 'HER WARDROBE: nothing filed yet.'
    : compact
      ? `HER WARDROBE (${pieces.length} of ${ctx.wardrobe.length} pieces — her heroes and most-worn):\n${fenced(pieces.map(pieceLine))}`
      : `HER WARDROBE (${pieces.length} pieces):\n${fenced(pieces.map(pieceLine))}`;
  return [
    thin && !compact
      ? 'EVIDENCE IS THIN — she has filed almost nothing yet. Draft from her style type and icons alone, at most two "loves" lines and no rules, and say so in "because".'
      : '',
    wardrobe,
    looks.length ? `HER LOOKS:\n${fenced(looks.map(lookLine))}` : '',
    mem.length ? `WHAT SHE HAS TOLD ROBES (newest first):\n${fenced(mem)}` : '',
    current.length ? `ALREADY IN HER BRIEF (never repeat these):\n${fenced(current)}` : '',
    compact
      ? 'Find the patterns. What actually works, what fails, and why. Draft the lines — keep every "because" short.'
      : 'Find the patterns. What actually works, what fails, and why. Draft the lines.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export interface Drafted {
  loves: { text: string; because: string }[];
  avoids: { text: string; because: string }[];
  rules: { text: string; because: string }[];
  notes: string;
  colours: { loved: string[]; rejected: string[] };
}

// A model's \uXXXX escapes leak into strings now and then (legacy deEscDeep).
const deEsc = (s: string): string =>
  s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(Number.parseInt(h, 16)));

// Clamped and deduped against everything that stands, waits or was struck.
export function normalise(out: Output, current: readonly string[]): Drafted {
  const seen = new Set(current.map((c) => c.trim().toLowerCase()));
  const lines = (a: Output['loves'], max: number) =>
    a
      .map((x) => ({ text: str(deEsc(x.text), 160), because: str(deEsc(x.because), 200) }))
      .filter((x) => x.text)
      .slice(0, max)
      .filter((x) => {
        const k = x.text.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
  const colour = (a: string[], max: number) =>
    a
      .map((c) => str(deEsc(c), 24))
      .filter(Boolean)
      .slice(0, max);
  return {
    loves: lines(out.loves, 6),
    avoids: lines(out.avoids, 5),
    rules: lines(out.rules, 4),
    notes: str(deEsc(out.notes), 600),
    colours: { loved: colour(out.colours.loved, 4), rejected: colour(out.colours.rejected, 3) },
  };
}

// A line is never sliced mid-word: over the cap it ends at the last sentence end, else the last
// word, before it (legacy cutWords).
export function cutWords(s: string, n: number): string {
  if (s.length <= n) return s;
  const head = s.slice(0, n);
  const sent = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '));
  if (sent > n * 0.4) return head.slice(0, sent + 1);
  const sp = head.lastIndexOf(' ');
  return (sp > 0 ? head.slice(0, sp) : head).replace(/[,;:\s]+$/, '');
}

// An observation is one sentence: the notes paragraph waits as its first (legacy firstSentence).
export function firstSentence(s: string): string {
  const m = s.trim().match(/^[^.!?]*[.!?]/);
  return m ? m[0].trim() : cutWords(s.trim(), 160);
}

// Offline fixture so the read runs without Gemini.
export function fakeOutput(): Output {
  return {
    loves: [
      {
        text: 'You reach for a defined waist',
        because: 'your most-worn pieces all mark the waist',
      },
      { text: 'One thing that disrupts the line', because: 'a sharp shoe or bag on every look' },
    ],
    avoids: [{ text: 'Anything that reads polite', because: 'the twinsets you never wear' }],
    rules: [{ text: 'Loafers only with a cropped trouser', because: 'the looks you wear most' }],
    notes:
      'You dress well when the structure is already there. A defined shoulder or waist does the work, and one sharp piece keeps the rest quiet.',
    colours: { loved: ['navy', 'cream'], rejected: ['mustard'] },
  };
}
