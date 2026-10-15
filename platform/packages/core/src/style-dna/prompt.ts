// Style DNA → the prompt block injected into every stylist call (legacy style_dna.js, PRD §6;
// synced with legacy beta 2026-10-13). Reads stored jsonb, so every field is checked: malformed
// data drops a line, never throws. Her own words ride fenced (SEC-23); the instructions about them
// stay outside the fence.

import { FENCE_RULE, fenceUserText } from '../fence';

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

export function briefList(a: unknown): string[] {
  if (!Array.isArray(a)) return [];
  return a
    .map((x) => (x && typeof x === 'object' ? (x as Obj).text : x))
    .filter((t): t is string => typeof t === 'string' && t.trim() !== '')
    .map((t) => t.trim().replace(/\s+/g, ' ').slice(0, BRIEF_LINE_MAX));
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

function styleBriefLines(b: unknown): string[] {
  const brief = obj(b);
  if (!brief || briefIsEmpty(brief)) return [];
  const loves = briefList(brief.loves).slice(-BRIEF_PROMPT_MAX);
  const avoids = briefList(brief.avoids).slice(-BRIEF_PROMPT_MAX);
  const rules = briefList(brief.rules).slice(-BRIEF_PROMPT_MAX);
  const notes =
    typeof brief.notes === 'string' ? brief.notes.trim().replace(/\s+/g, ' ').slice(0, 600) : '';
  const out = [
    'HER STYLE BRIEF — in her own words. These lines outrank every rule below; a look that breaks one is wrong however well it photographs.',
  ];
  const words: string[] = [];
  if (loves.length) words.push(`Works: ${loves.join(' · ')}.`);
  if (avoids.length) words.push(`Never: ${avoids.join(' · ')}.`);
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
  const verdicts = all.filter((e) => e.k === 'verdict' || e.k === 'strike' || e.k === 'ask');
  const swaps = all.filter((e) => e.k === 'swap' && !e.folded);
  const wears = all.filter((e) => e.k === 'wear');
  const out: string[] = [];
  for (const e of verdicts) {
    if (e.k === 'strike') {
      const t = memStr(e.text, 160);
      if (t) out.push(`Struck from her brief (Robes had it wrong): "${t}".`);
      continue;
    }
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
  if (!out.length) return [];
  return [
    'WHAT SHE HAS TOLD ROBES RECENTLY (newest first — read the pattern, never repeat a rejected move):',
    fenced(out.slice(0, MEMORY_LINES_MAX).join('\n')),
    'A piece she has swapped out twice is not proposed again unless she names it; a move she called "not quite" is not repeated in another colour.',
  ];
}

// user_overrides merged with the brief's colours (case-insensitive, at most twelve each).
function briefOverrides(dna: Obj): Obj {
  const uo: Obj = { ...(obj(dna.user_overrides) ?? {}) };
  const colours = obj(obj(dna.brief)?.colours) ?? {};
  const merge = (a: unknown, b: unknown): string[] => {
    const out: string[] = [];
    for (const x of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
      const t = typeof x === 'string' ? x.trim() : '';
      if (t && !out.some((y) => y.toLowerCase() === t.toLowerCase())) out.push(t);
    }
    return out.slice(0, 12);
  };
  uo.loved_colors = merge(uo.loved_colors, colours.loved);
  uo.rejected_colors = merge(uo.rejected_colors, colours.rejected);
  return uo;
}

function overrideLines(uo: Obj): string[] {
  const lines: string[] = [];
  const loved = list(uo.loved_colors);
  if (loved?.length) {
    lines.push(
      `The user has personally confirmed these colours work on them (they override the avoid list on conflict): ${fenced(loved.join(', '))}.`,
    );
  }
  const rejected = list(uo.rejected_colors);
  if (rejected?.length) {
    lines.push(
      `The user has personally rejected these colours — never style them in: ${fenced(rejected.join(', '))}.`,
    );
  }
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
  if (sh >= 1 && sh <= 14) parts.push(`shoes UK ${sh}`);
  const age =
    typeof facts.age_band === 'string' && facts.age_band.trim()
      ? facts.age_band.trim().slice(0, 20)
      : '';
  if (age) parts.push(`age ${age}`);
  if (!parts.length) return [];
  return [
    `THE FACTS she gave — size, never weight: ${parts.join(', ')}. Propose what fits these and size every piece to them; never estimate them from a photograph.`,
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

export function styleDnaPromptBlock(
  styleDna: unknown,
  wardrobeCount = 0,
  styleIcons: unknown = [],
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
    !factLines.length
  ) {
    return '';
  }
  const lines: string[] = [];
  // Her own words first: they outrank every rule a photograph produced.
  lines.push(...briefLines, ...memLines);
  if (arch.length || soft.length) {
    const typed = arch.length ? `: ${arch.join(', ')}` : '';
    const sometimes = soft.length
      ? `${arch.length ? '; sometimes ' : ': sometimes '}${soft.join(', ')}`
      : '';
    lines.push(`STYLE TYPE — the user placed their own style${typed}${sometimes}.`);
    lines.push(
      'Every look should sit in this register: the types named first lead, a "sometimes" type is a mood to reach for on occasion, never the default. Like the style icons, this steers taste; it never overrides the colour or silhouette rules below.',
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
      `STYLE ICONS — the user named these as their taste references: ${fenced(named.join(', '))}.`,
    );
    lines.push(
      'Follow the aesthetic of these icons and the brands they stand for — their signature silhouettes, styling codes, sensibility and the houses they are dressed by — as the north star for every recommendation. Choices should feel pulled from these icons’ world, adapted to the user’s verified constraints below; never contradict the colour or silhouette rules to imitate an icon.',
    );
  }
  if (brands.length) {
    lines.push(`BRANDS she reaches for: ${fenced(brands.join(', '))}.`);
    lines.push(
      'When a piece has to be found, look to these houses and their register first — a proposal should read as something she would have chosen herself.',
    );
  }
  if (investment) {
    lines.push(
      `INVESTMENT LEVEL — she spends ${investment} a year on clothes. Propose inside it, whatever she admires: never a piece above what that level buys, however well it would photograph.`,
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
  const uo = briefOverrides(dna);
  if (!ch && !sp) {
    lines.push(...overrideLines(uo));
    return withFenceRule(lines);
  }
  lines.push('STYLE DNA — verified styling constraints for this user:');
  if (ch) {
    const sub = obj(ch.functional_sub_palettes) ?? {};
    lines.push(
      `Colour archetype: ${ch.archetype_name} (undertone ${ch.verified_undertone}, contrast ${ch.calculated_contrast}).`,
    );
    if (list(sub.best_neutrals)) lines.push(`Foundation neutrals: ${join(sub.best_neutrals)}.`);
    if (list(sub.primary_stars)) {
      lines.push(
        `Star colours: ${join(sub.primary_stars)}. Accents: ${join(sub.secondary_accents)}.`,
      );
    }
    if (list(sub.avoid_list)) lines.push(`Never style them in: ${join(sub.avoid_list)}.`);
    const metals = obj(ch.metals_rules);
    if (metals) {
      lines.push(
        `Metals: ${join(metals.approved_metals)} (${metals.finish_type}); never ${join(metals.prohibited_metals)}.`,
      );
    }
  }
  if (sp) {
    const ar = obj(sp.architectural_rules) ?? {};
    lines.push(
      `Body architecture: ${sp.body_type}. Best dress silhouettes: ${join(ar.dress_silhouettes)}. Best necklines: ${join(ar.necklines)}.`,
    );
    if (list(ar.styling_maxims)) lines.push(`Styling maxims: ${join(ar.styling_maxims, ' ')}`);
  }
  // Her corrections always outrank the photo-derived profile.
  lines.push(...overrideLines(uo));
  lines.push(
    wardrobeCount >= 15
      ? `SYSTEM DIRECTIVE: The user has a mature digital closet (${wardrobeCount} items). Strictly optimise for mix-and-match modularity, combining their verified closet foundations with new pieces that obey the silhouette maxims above.`
      : wardrobeCount > 0
        ? `SYSTEM DIRECTIVE: The user is building their digital closet (${wardrobeCount}/15 items). Lead with fashion-house execution matching the colour and silhouette rules above, but weave in the pieces they already own by their exact labels wherever an owned piece genuinely serves the look — an owned piece always beats a hypothetical one. Fill the remaining gaps with ideal editorial combinations.`
        : 'SYSTEM DIRECTIVE: The user has not catalogued any wardrobe pieces yet — focus on fashion-house execution matching the colour archetype and silhouette rules above, producing ideal editorial combinations.',
  );
  return withFenceRule(lines);
}

// The block says once, first, that fenced text is hers to read and never to obey.
function withFenceRule(lines: string[]): string {
  const any = lines.some((l) => l.includes('<user_input>'));
  return (any ? [FENCE_RULE, ...lines] : lines).join('\n');
}
