// Style DNA → the prompt block injected into every stylist call (legacy style_dna.js, PRD §6;
// synced with legacy beta 2026-10-13). Reads stored jsonb, so every field is checked: malformed
// data drops a line, never throws. Her own words ride fenced (SEC-23); the instructions about them
// stay outside the fence.

import { FENCE_RULE, fenceUserText } from '../fence';
import { paletteLines } from './palette';

const FENCED_MAX = 16_000;
const fenced = (text: string): string => fenceUserText(text, FENCED_MAX);

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | undefined =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : undefined;
const list = (v: unknown): string[] | undefined =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : undefined;
const join = (v: unknown, sep = ', '): string => (list(v) ?? []).join(sep);
// Trimmed non-empty strings, at most ten (legacy `strs`).
const strs = (v: unknown): string[] =>
  (list(v) ?? [])
    .filter((s) => s.trim())
    .map((s) => s.trim())
    .slice(0, 10);

// ── Her brief (style_dna.brief): {loves[], avoids[], rules[], notes, colours:{loved[], rejected[]}};
// each list entry a string or {text, source}. All kept lines show to her (legacy 2026-10-13); the
// server caps a list at BRIEF_KEPT_MAX and a prompt reads the newest BRIEF_PROMPT_MAX of each.
const BRIEF_LINE_MAX = 160;
export const BRIEF_KEPT_MAX = 50;
export const BRIEF_PROMPT_MAX = 30;

// A line with no letters (a stray "6") is not a line; the same line twice is one line.
export function briefList(a: unknown): string[] {
  if (!Array.isArray(a)) return [];
  const seen = new Set<string>();
  return a
    .map((x) => (x && typeof x === 'object' ? (x as Obj).text : x))
    .filter((t): t is string => typeof t === 'string' && /\p{L}/u.test(t))
    .map((t) => t.trim().replace(/\s+/g, ' ').slice(0, BRIEF_LINE_MAX))
    .filter((t) => {
      const k = t.toLowerCase().replace(/[.\s]+$/, '');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

export function briefIsEmpty(b: unknown): boolean {
  const brief = obj(b);
  if (!brief) return true;
  return (
    !briefList(brief.loves).length &&
    !briefList(brief.avoids).length &&
    !briefList(brief.rules).length &&
    !(typeof brief.notes === 'string' && brief.notes.trim())
  );
}

// The hierarchy (legacy 2026-10-19): her hard nos are absolute and come first; her brief outranks
// everything a photograph produced; her taste leads; colour and line are guidance. The word
// "never" belongs to her hard nos alone.
// Her typed hard nos are the one absolute; a colour she avoids is soft and lives in ./palette.
function hardNoLines(b: unknown): string[] {
  const avoids = briefList(obj(b)?.avoids).slice(-BRIEF_PROMPT_MAX);
  if (!avoids.length) return [];
  const words = [`Never: ${avoids.join(' · ')}.`];
  return [
    'HER HARD NOS — non-negotiable. These override everything beneath them: her taste, her icons, the colour and line notes, the occasion. A look that carries one is wrong; a piece one excludes is never proposed, never listed, never "worth trying".',
    fenced(words.join('\n')),
  ];
}

function styleBriefLines(b: unknown): string[] {
  const brief = obj(b);
  if (!brief) return [];
  const loves = briefList(brief.loves).slice(-BRIEF_PROMPT_MAX);
  const rules = briefList(brief.rules).slice(-BRIEF_PROMPT_MAX);
  const notes =
    typeof brief.notes === 'string' ? brief.notes.trim().replace(/\s+/g, ' ').slice(0, 600) : '';
  if (!loves.length && !rules.length && !notes) return [];
  const out = [
    'HER STYLE BRIEF — in her own words, confirmed by her. These lines outrank every note read from a photograph below; a look that breaks one is wrong however well it photographs.',
  ];
  const words: string[] = [];
  if (loves.length) words.push(`Works: ${loves.join(' · ')}.`);
  if (rules.length) words.push(`Rules: ${rules.join(' · ')}.`);
  if (notes) words.push(`In her words: ${notes}`);
  out.push(fenced(words.join('\n')));
  out.push(
    'A rule above also governs what is PROPOSED — never suggest a piece she would have to find that a rule excludes.',
  );
  return out;
}

// ── Her memory (style_dna.memory): {entries: [...]}, newest first. An entry is one thing she told
// Robes through the app: verdict | swap | wear | strike | ask.
export const MEMORY_MAX = 60;
const MEMORY_LINES_MAX = 12;
const MEMORY_KINDS = ['verdict', 'swap', 'wear', 'strike', 'ask'];
const memStr = (v: unknown, n: number): string =>
  typeof v === 'string' && v.trim() ? v.trim().replace(/\s+/g, ' ').slice(0, n) : '';

export function memoryEntries(m: unknown): Obj[] {
  const holder = obj(m);
  const a = holder && Array.isArray(holder.entries) ? holder.entries : Array.isArray(m) ? m : [];
  return (a as unknown[])
    .filter((e): e is Obj => !!obj(e) && MEMORY_KINDS.includes(String((e as Obj).k)))
    .slice(0, MEMORY_MAX);
}

const count = (n: number): string => (n === 3 ? 'three' : n === 4 ? 'four' : String(n));

// Read as a pattern, never a transcript: verdicts/strikes/asks, then swaps (a category swapped out
// three times folds to one line), then up to four wears; at most twelve lines.
function memoryLines(m: unknown): string[] {
  const all = memoryEntries(m);
  if (!all.length) return [];
  // A struck observation does not exist: rendering it told the model the opposite of her call.
  const verdicts = all.filter((e) => e.k === 'verdict' || e.k === 'ask');
  const swaps = all.filter((e) => e.k === 'swap' && !e.folded);
  const wears = all.filter((e) => e.k === 'wear');
  const out: string[] = [];
  for (const e of verdicts) {
    if (e.k === 'ask') {
      const t = memStr(e.text, 200);
      const on = memStr(e.on, 90);
      if (t) out.push(`Asked${on ? ` — ${on}` : ''}: "${t}".`);
      continue;
    }
    const on = memStr(e.on, 90) || memStr(e.look, 90);
    const t = memStr(e.text, 200);
    const verdict = e.v === 1 ? 'Loved' : e.v === 0 ? 'Not quite' : '';
    if (!verdict && !t) continue;
    out.push(`${verdict || 'Said'}${on ? ` — ${on}` : ''}${t ? `: "${t}"` : '.'}`);
  }
  const byCat = new Map<string, number>();
  for (const e of swaps) {
    const c = memStr(e.cat, 40).toLowerCase();
    if (c) byCat.set(c, (byCat.get(c) ?? 0) + 1);
  }
  const folded = new Set([...byCat].filter(([, n]) => n >= 3).map(([c]) => c));
  for (const c of folded) {
    out.push(
      `Has swapped out ${c} ${count(byCat.get(c) ?? 0)} times — read that as a rule, not a coincidence.`,
    );
  }
  for (const e of swaps) {
    const c = memStr(e.cat, 40).toLowerCase();
    if (c && folded.has(c)) continue;
    const o = memStr(e.out, 90);
    const i = memStr(e.in, 90);
    if (!o && !i) continue;
    out.push(
      `Swapped ${o ? `out ${o}` : 'a piece'}${i ? ` for her ${i}` : ''}${c ? ` (${c})` : ''}.`,
    );
  }
  for (const e of wears.slice(0, 4)) {
    const l = memStr(e.look, 90);
    if (l)
      out.push(
        `Wore "${l}"${e.pieces ? ` (${String(e.pieces)} pieces)` : ''} — a look she reaches for.`,
      );
  }
  // The same ask twice is one line.
  const uniq = [...new Set(out)];
  if (!uniq.length) return [];
  return [
    'WHAT SHE HAS TOLD ROBES RECENTLY (newest first — read the pattern, never repeat a rejected move):',
    fenced(uniq.slice(0, MEMORY_LINES_MAX).join('\n')),
    'A piece she has swapped out twice is not proposed again unless she names it; a move she called "not quite" is not repeated in another colour. Her brief today outranks all of this — what she asks for by name, she gets.',
  ];
}

// Her colours and prints are the palette (soft avoid, ./palette); the one override slot left is
// the measurements she supplied.
function overrideLines(uo: Obj): string[] {
  const lines: string[] = [];
  const measurements = obj(uo.measurements);
  if (measurements) {
    const m = Object.entries(measurements)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(', ');
    if (m) {
      lines.push(
        `Exact measurements supplied by the user — trust these over any photo estimate: ${m}.`,
      );
    }
  }
  return lines;
}

// The facts she gave (style_dna.facts): size, never weight, never estimated from a photo.
export function factsLines(f: unknown): string[] {
  const facts = obj(f);
  if (!facts) return [];
  const parts: string[] = [];
  const h = Number(facts.height_cm);
  const s = Number(facts.size_uk);
  const sh = Number(facts.shoe_uk);
  if (h >= 120 && h <= 230) parts.push(`height ${Math.round(h)} cm`);
  if (s >= 2 && s <= 30) parts.push(`dress size UK ${s} (EU ${s + 28})`);
  // Bust and waist (the digital twin): a bra size as given, or the tape; a measurement, never a
  // weight.
  const band = Number(facts.bust_band);
  const bcm = Number(facts.bust_cm);
  const w = Number(facts.waist_cm);
  const cup =
    typeof facts.bust_cup === 'string' && /^[A-G]{1,2}\+?$/.test(facts.bust_cup)
      ? facts.bust_cup
      : '';
  if (band >= 26 && band <= 50 && cup) parts.push(`bust ${Math.round(band)}${cup}`);
  else if (bcm >= 60 && bcm <= 160) parts.push(`bust ${Math.round(bcm)} cm`);
  if (w >= 45 && w <= 150) parts.push(`waist ${Math.round(w)} cm`);
  if (sh >= 1 && sh <= 14) parts.push(`shoes UK ${sh}`);
  const age =
    typeof facts.age_band === 'string' && facts.age_band.trim()
      ? facts.age_band.trim().slice(0, 20)
      : '';
  if (age) parts.push(`age ${age}`);
  if (!parts.length) return [];
  return [
    `THE FACTS she gave — size, never weight: ${parts.join(', ')}. Size every piece to these; never estimate them from a photograph.`,
  ];
}

// Her filed-this-year spend ({n, total, median, verdict}); numbers only, or nothing.
function spendRead(v: unknown) {
  const sp = obj(v);
  if (!sp) return null;
  const n = Number(sp.n);
  const total = Number(sp.total);
  const median = Number(sp.median);
  if (!(n >= 3) || !(total > 0) || !(median > 0)) return null;
  return {
    n: Math.round(n),
    total: Math.round(total),
    median: Math.round(median),
    verdict: sp.verdict === 'above' ? 'above' : 'inside',
  };
}
const euro = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// opts.balance: she said where this look's pieces come from, so the SYSTEM DIRECTIVE defers to
// her answer (rendered beside the wardrobe by the job prompt) instead of the piece count.
export function styleDnaPromptBlock(
  styleDna: unknown,
  wardrobeCount = 0,
  styleIcons: unknown = [],
  opts: { balance?: unknown } = {},
): string {
  const icons = (list(styleIcons) ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
  const dna = obj(styleDna) ?? {};
  const ch = obj(dna.color_harmony);
  const sp = obj(dna.silhouette_proportions);
  // Style type: "very me" leads, "sometimes" is a mood (never both for one type).
  const arch = strs(dna.style_archetypes);
  const soft = strs(dna.style_archetypes_soft).filter((s) => !arch.includes(s));
  const briefLines = styleBriefLines(dna.brief);
  const memLines = memoryLines(dna.memory);
  const brands = strs(dna.brands).slice(0, 20);
  const investment =
    typeof dna.investment === 'string' && dna.investment.trim()
      ? dna.investment.trim().slice(0, 40)
      : '';
  const factLines = factsLines(dna.facts);
  const tags = obj(dna.icon_tags) ?? {};
  const noLines = hardNoLines(dna.brief);
  if (
    !ch &&
    !sp &&
    !icons.length &&
    !arch.length &&
    !soft.length &&
    !briefLines.length &&
    !memLines.length &&
    !brands.length &&
    !investment &&
    !factLines.length &&
    !noLines.length &&
    !paletteLines(dna).length
  ) {
    return '';
  }
  const lines: string[] = [];
  // Her hard nos first (the one absolute), then her own words, which outrank every photograph read.
  lines.push(...noLines, ...briefLines, ...memLines);
  if (arch.length || soft.length) {
    const typed = arch.length ? `: ${arch.join(', ')}` : '';
    const sometimes = soft.length
      ? `${arch.length ? '; sometimes ' : ': sometimes '}${soft.join(', ')}`
      : '';
    lines.push(
      `STYLE TYPE — her own placing${typed}${sometimes}. Every look sits in this register — the first types lead, a "sometimes" type is an occasional mood. Her taste leads: where a colour or line note below pulls against it, her taste wins.`,
    );
  }
  // Style icons are her declared taste, layered over the photo-verified DNA.
  if (icons.length) {
    const named = icons.map((i) => {
      const tag = tags[i];
      const t = typeof tag === 'string' && tag.trim() ? tag.trim().slice(0, 40) : '';
      return t ? `${i} (${t})` : i;
    });
    lines.push(
      `STYLE ICONS — her taste references: ${fenced(named.join(', '))}. Their silhouettes, styling codes and houses are the north star for every choice, inside her hard nos and her brief above; the colour and line notes below are guidance to adapt an icon's register to her, never a reason to abandon it.`,
    );
  }
  if (brands.length) {
    lines.push(
      `BRANDS she reaches for: ${fenced(brands.join(', '))}. A piece that has to be found comes from these houses and their register first.`,
    );
  }
  if (investment) {
    lines.push(
      `INVESTMENT LEVEL — she spends ${investment} a year on clothes: never a piece above what that level buys, however well it would photograph.`,
    );
    // Only "above" earns a line: a partial year can prove she buys above her level, never below.
    const spend = spendRead(dna.spend);
    if (spend?.verdict === 'above') {
      lines.push(
        `WHAT SHE ACTUALLY BUYS — the ${spend.n} priced pieces she filed this year come to €${euro(spend.total)}, a typical one €${euro(spend.median)}: above the level she set. The level she set still rules what Robes proposes — never raise the ceiling to match her receipts — but read her prices as taste: a piece that has to be found should sit at her level and read like the pricier ones she already owns, never as a cheaper copy of them.`,
      );
    }
  }
  lines.push(...factLines);
  const uo = obj(dna.user_overrides) ?? {};
  if (!ch && !sp) {
    lines.push(...paletteLines(dna), ...overrideLines(uo));
    return withFenceRule(lines);
  }
  // The photograph reads are GUIDANCE: not reliable enough to outrank what she said or wears.
  lines.push(
    'STYLE DNA — read from her photographs. Guidance, not law: it tilts a choice between two pieces that both satisfy her brief, and yields to anything she has said above and to the pieces she owns and wears.',
  );
  if (ch) {
    const sub = obj(ch.functional_sub_palettes) ?? {};
    lines.push(
      `Colouring read: ${ch.archetype_name} (undertone ${ch.verified_undertone}, contrast ${ch.calculated_contrast}).`,
    );
    if (list(sub.best_neutrals)) {
      lines.push(`Neutrals that tend to flatter: ${join(sub.best_neutrals)}.`);
    }
    if (list(sub.primary_stars)) {
      lines.push(
        `Colours that tend to flatter: ${join(sub.primary_stars)}. Accents: ${join(sub.secondary_accents)}.`,
      );
    }
    if (list(sub.avoid_list)) {
      lines.push(
        `Colours that tend to fight her colouring — lean away from them when proposing a NEW piece, but a piece she owns or asks for in one is hers to wear: ${join(sub.avoid_list)}.`,
      );
    }
    const metals = obj(ch.metals_rules);
    if (metals) {
      lines.push(
        `Metals that tend to suit her: ${join(metals.approved_metals)} (${metals.finish_type}); ${join(metals.prohibited_metals)} less so.`,
      );
    }
  }
  if (sp) {
    const ar = obj(sp.architectural_rules) ?? {};
    lines.push(
      `Line read, from one photograph — a tilt, never a rule: ${sp.body_type}. Dress silhouettes that tend to suit it: ${join(ar.dress_silhouettes)}. Necklines: ${join(ar.necklines)}.`,
    );
    if (list(ar.styling_maxims)) {
      lines.push(
        `Styling leanings — apply one only where it agrees with her brief and with how she already dresses; drop any that fights a line she wrote or a piece she reaches for: ${join(ar.styling_maxims, ' ')}`,
      );
    }
  }
  // Her corrections always outrank the photo-derived profile.
  lines.push(...paletteLines(dna), ...overrideLines(uo));
  lines.push(
    opts.balance
      ? 'SYSTEM DIRECTIVE: She has said where the pieces of this look should come from — her wardrobe, a mix, or new pieces (WHERE THE PIECES COME FROM, beside her wardrobe). Follow that answer, in her register, guided by the colour and line notes above.'
      : wardrobeCount >= 15
        ? `SYSTEM DIRECTIVE: The user has a mature digital closet (${wardrobeCount} items). Strictly optimise for mix-and-match modularity, combining their verified closet foundations with new pieces that sit inside her brief and her taste; the colour and line notes above guide the choice between them.`
        : wardrobeCount > 0
          ? `SYSTEM DIRECTIVE: The user is building their digital closet (${wardrobeCount}/15 items). Lead with fashion-house execution in her register, guided by the colour and line notes above, but weave in the pieces they already own by their exact labels wherever an owned piece genuinely serves the look — an owned piece always beats a hypothetical one. Fill the remaining gaps with ideal editorial combinations.`
          : 'SYSTEM DIRECTIVE: The user has not catalogued any wardrobe pieces yet — focus on fashion-house execution in her register, guided by the colour and line notes above, producing ideal editorial combinations.',
  );
  return withFenceRule(lines);
}

// The block says once, first, that fenced text is hers to read and never to obey.
function withFenceRule(lines: string[]): string {
  const any = lines.some((l) => l.includes('<user_input>'));
  return (any ? [FENCE_RULE, ...lines] : lines).join('\n');
}
