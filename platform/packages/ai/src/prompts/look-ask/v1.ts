import { styleDnaPromptBlock } from '@robes/core/style-dna';
import { z } from 'zod';
import { FENCE_RULE, fenceUserText } from '../../fence';
import { genderDirective } from '../style-piece/v3';

// Ported from legacy server.js POST /api/look/ask (the look prompt, docs/look-prompt-brief.md,
// 2026-10-01 → 10-13). ONE call behind the box on every look: her words, the rack as it stands and
// the pool she may draw from go in; an EDIT comes back — never a new look. The intent order is the
// beta feedback corpus sorted. A rule is in HER voice and waits as a Robes-noticed line.
export const FEATURE = 'looks.ask';
export const VERSION = 1;
export const MAX_OUTPUT_TOKENS = 900;
export const TEMPERATURE = 0.2;
export const RACK_MAX = 14;
export const POOL_MAX = 80;
export const THREAD_MAX = 6;
// Rack, pool and context are her words too: fenced in the system turn (SEC-23).
const FENCED_MAX = 24_000;

export const INTENTS = ['swap', 'back', 'rule', 'styled', 'clarify', 'draft', 'none'] as const;
export type Intent = (typeof INTENTS)[number];
const CATEGORIES = [
  'Tops',
  'Bottoms',
  'Dresses',
  'Outerwear',
  'Shoes',
  'Bags',
  'Accessories',
  'Other',
] as const;

export const Output = z.object({
  intent: z.string().max(20),
  reply: z.string().max(800),
  swaps: z
    .array(
      z.object({
        i: z.number().int(),
        pool_index: z.number().int(),
        name: z.string().max(200),
        brand: z.string().max(120),
        retailer_hint: z.string().max(120),
        price_point: z.string().max(40),
        category: z.string().max(40),
      }),
    )
    .max(20),
  back: z.array(z.number().int()).max(20),
  styled: z.array(z.object({ i: z.number().int(), note: z.string().max(240) })).max(20),
  draft: z.string().max(600),
  rule: z.string().max(400),
});
export type Output = z.infer<typeof Output>;

export interface RackRow {
  name: string;
  category: string;
  // A piece she owns; a KEEP row is anchored and never changes.
  owned: boolean;
  keep: boolean;
  was: string | null;
  styled: string | null;
}

export interface PoolItem {
  label: string;
  category: string | null;
  color: string | null;
  brand: string | null;
}

export interface AskContext {
  gender: 'woman' | 'man' | 'non_binary' | 'unspecified';
  styleDna: unknown;
  styleIcons: string[];
  // 'capsule' = a trip's packed case: only these pieces may go on the look.
  pool: { kind: 'wardrobe' | 'capsule'; items: PoolItem[] };
  rack: RackRow[];
  context: { day?: string; weather?: string; occasion?: string; trip?: string } | null;
  thread: { who: 'her' | 'robes'; text: string }[];
}

const BANNED_CONSTRUCTIONS_RULE = `BANNED CONSTRUCTIONS — never use these, in any field: the construction "X yet Y" (e.g. "comfortable yet refined"); benefit justification ("perfect for", "ideal for", "suitable for", "great for", "keeping you comfortable"); machine connectives ("ensuring", "while maintaining", "creating a", "allowing for", "centers around"); adverb inflation ("effortlessly", "seamlessly", "timelessly", "meticulously"); dead adjectives ("elevated", "versatile", "polished aesthetic", "vibrant spirit"); sustainability or virtue framing of any kind; quotation marks.`;

const clip = (v: string | null | undefined, n: number) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, n);

export function buildSystem(ctx: AskContext): string {
  const held = ctx.pool.kind === 'capsule';
  const rack = ctx.rack.slice(0, RACK_MAX);
  const rackBlock = rack
    .map(
      (r, i) =>
        `[${i}] ${clip(r.name, 80)}${r.category ? ` [${clip(r.category, 24)}]` : ''}${r.keep ? ' — KEEP (anchored, never changes)' : r.owned ? ' (hers)' : ' (a piece Robes proposed, not hers yet)'}${r.was ? ` — just changed; was: ${clip(r.was, 80)}` : ''}${r.styled ? ` — worn: ${clip(r.styled, 100)}` : ''}`,
    )
    .join('\n');
  const pool = ctx.pool.items.slice(0, POOL_MAX);
  const poolBlock = pool.length
    ? pool
        .map(
          (p, idx) =>
            `[${idx}] ${clip(p.label, 80)}${p.category ? ` [${clip(p.category, 24)}]` : ''}${p.color ? `, ${clip(p.color, 30)}` : ''}${p.brand ? `, ${clip(p.brand, 40)}` : ''}`,
        )
        .join('\n')
    : '(nothing)';
  const ctxLines: string[] = [];
  if (ctx.context?.day) ctxLines.push(`The day: ${clip(ctx.context.day, 40)}.`);
  if (ctx.context?.weather) ctxLines.push(`The weather: ${clip(ctx.context.weather, 60)}.`);
  if (ctx.context?.occasion) ctxLines.push(`What it is for: ${clip(ctx.context.occasion, 80)}.`);
  if (ctx.context?.trip) ctxLines.push(`The trip: ${clip(ctx.context.trip, 60)}.`);
  const dna = styleDnaPromptBlock(
    ctx.styleDna,
    ctx.pool.kind === 'wardrobe' ? pool.length : 0,
    ctx.styleIcons,
  );
  return `You are Robes — a stylist editing ONE look she already has, in her own words. ${genderDirective(ctx.gender)} You answer in sentences, as Robes, in the third person ("Robes would change both"). Never "I", never "AI", never "assistant". Name pieces as she would ("the grey merino", "the wide-leg trouser", "her black pointed flats") — never role names. No exclamation marks. One or two sentences. Lead an applied change with "Done." then what is on the look now. Never flatter her, never judge her. ${BANNED_CONSTRUCTIONS_RULE}
${FENCE_RULE} Piece names, notes and the context below are fenced the same way.

THE LOOK AS IT STANDS (indexed; "hers" = a piece she owns; KEEP = anchored, it never changes; "worn:" = how it is styled):
${fenceUserText(rackBlock, FENCED_MAX)}

THE POOL SHE CAN SWAP FROM (indexed by pool_index)${held ? ' — THIS IS THE CASE SHE PACKED. ONLY these pieces may go on the look; never propose a piece outside it. If nothing in the case fits, say so plainly, offer the nearest piece in the case as a draft, and change nothing.' : ' — her wardrobe. Prefer a piece she owns whenever one fits; otherwise propose ONE new piece with a real brand, a retailer and a realistic EUR price (pool_index -1).'}:
${fenceUserText(poolBlock, FENCED_MAX)}
${ctxLines.length ? `\nCONTEXT:\n${fenceUserText(ctxLines.join('\n'), FENCED_MAX)}\n` : ''}
READ HER WORDS IN THIS ORDER — the first that matches decides the intent:
1. PUT BACK ("back", "undo", "as it was", "put the X back"): intent "back". "back" lists the indexes of the rows she names among those marked "just changed"; names none → an EMPTY list means every changed row. Reply: "Done. The {piece} is back on the look." Nothing changed on the look → intent "none", reply that nothing has changed yet so there is nothing to put back.
2. A STANDING RULE ("remember", "don't like", "never", "always", "from now on", "in future"): intent "rule". "rule" is the rule in a few words, in HER voice as she would write it in her own style notes ("No grey", "No double denim", "A sock with cropped trousers, always") — never "Robes" as its subject. Nothing changes on the look, and the rule is NOT filed: it waits for her to keep it. Reply: "Noted — keep it under Robes noticed and it becomes a rule.", and if the rule touches a piece on the look now, offer the fix as "draft" (a concrete swap sentence she can press Enter on), naming it in the reply.
3. HOW IT'S WORN ("tuck", "untucked", "sock", "roll", "sleeve", "cuff", "under the", "over the", "open", "belted", "knotted"): intent "styled". "styled" holds {i, note} per piece — a short styling note ("tucked at the front", "worn over the jeans"). Same pieces. Reply: "Done." then how it is worn now.
4. A CLEAR SWAP (a piece named to change, and what for — "for / with / to / instead", or a plain "not the loafers", "lose the scarf", "add a jacket"): intent "swap". One entry per change: "i" the row, "pool_index" a pool piece that fits, else -1 with a real "name", "brand", "retailer_hint", "price_point" (EUR, like "€120") and "category". A piece she names to REMOVE with nothing in its place: swap it for the plainest pool piece that fits, or if none, for a new simple piece — never leave a hole. A piece to ADD: swap the weakest non-KEEP row of that category, or if the look has no row of it, reply that Robes would need a slot and write the add as a draft. Reply: "Done. {piece(s)} on the look now. Say if you want anything back." — then one short reason at most.
5. TWO READINGS (an "or" with no piece Robes can resolve, or two things that cannot both be true): intent "clarify". One plain question. Nothing changes.
6. ANYTHING VAGUE ("too dressy", "restyle the whole day", "more me", "not casual enough", "too warm", "doesn't match", "boring", "something fun"): intent "draft". NOTHING changes. Decide which pieces make it feel that way and what Robes would swap them for (from the pool first), say so in the reply in one sentence, then write the change as "draft": one plain sentence naming each swap explicitly ("Change the wide-leg trouser for the dark straight jean, and the grey merino for the camel cardigan"). Read "me" against her brief and her recent verdicts above. On a trip the draft names case pieces only.
A KEEP row is never changed, never put in a draft. Never invent a piece in the pool. Unused fields: "swaps" [], "back" [], "styled" [], "draft" "", "rule" "".
${dna ? `\n${dna}` : ''}`;
}

// Her words only in the user turn, fenced (SEC-23); the exchange so far rides the same way.
export function buildUser(opts: {
  name: string;
  surface: string;
  text: string;
  thread: AskContext['thread'];
}): string {
  const turns = opts.thread
    .slice(-THREAD_MAX)
    .map((t) => `${t.who === 'her' ? 'SHE SAID' : 'ROBES SAID'}: ${clip(t.text, 240)}`);
  const earlier = turns.length
    ? `EARLIER IN THIS EXCHANGE (newest last):\n${fenceUserText(turns.join('\n'), 1800)}\n\n`
    : '';
  return `${earlier}The look is "${clip(opts.name, 80) || 'this look'}" (on the ${clip(opts.surface, 20)}). She says: ${fenceUserText(opts.text, 240)}`;
}

export type Target =
  | { poolIndex: number }
  | {
      proposal: {
        name: string;
        category: string;
        brand: string;
        retailerHint: string;
        pricePoint: string;
      };
    };

export interface Answer {
  intent: Intent;
  reply: string;
  swaps: { i: number; to: Target }[];
  back: number[];
  styled: { i: number; note: string }[];
  draft: string;
  rule: string;
}

// Made safe against what was sent (legacy server-side normalisation): a KEEP row never changes,
// a held pool never takes a new piece, one change per row, fields only for the intent that uses them.
export function normaliseAnswer(out: Output, ctx: Pick<AskContext, 'rack' | 'pool'>): Answer {
  const intent: Intent = (INTENTS as readonly string[]).includes(out.intent)
    ? (out.intent as Intent)
    : 'clarify';
  const held = ctx.pool.kind === 'capsule';
  const rack = ctx.rack.slice(0, RACK_MAX);
  const poolN = Math.min(ctx.pool.items.length, POOL_MAX);
  const row = (i: number) => (Number.isInteger(i) && i >= 0 && i < rack.length ? rack[i] : null);
  const seen = new Set<number>();
  const swaps: Answer['swaps'] = [];
  for (const s of out.swaps) {
    const r = row(s.i);
    if (!r || r.keep || seen.has(s.i)) continue;
    if (s.pool_index >= 0 && s.pool_index < poolN) {
      swaps.push({ i: s.i, to: { poolIndex: s.pool_index } });
      seen.add(s.i);
      continue;
    }
    if (held) continue;
    const name = clip(s.name, 120);
    if (!name) continue;
    const category = (CATEGORIES as readonly string[]).includes(s.category)
      ? s.category
      : r.category || 'Other';
    swaps.push({
      i: s.i,
      to: {
        proposal: {
          name,
          category,
          brand: clip(s.brand, 60),
          retailerHint: clip(s.retailer_hint, 60),
          pricePoint: clip(s.price_point, 20),
        },
      },
    });
    seen.add(s.i);
  }
  const back = out.back.filter((i) => row(i) !== null);
  const styled = out.styled
    .filter((s) => row(s.i) !== null && clip(s.note, 120))
    .map((s) => ({ i: s.i, note: clip(s.note, 120) }));
  return {
    intent,
    reply: clip(out.reply, 400),
    // A rule never changes the look on its own — its fix rides as a draft.
    swaps: intent === 'swap' ? swaps : [],
    back: intent === 'back' ? back : [],
    styled: intent === 'styled' || intent === 'swap' ? styled : [],
    draft: ['draft', 'rule', 'clarify'].includes(intent) ? clip(out.draft, 240) : '',
    rule: intent === 'rule' ? clip(out.rule, 160) : '',
  };
}

// Offline fixture: reads her words the way the prompt orders them, so every flow runs without a
// key. `rack`/`pool` are read back from the system prompt's indexed lines.
export function fakeOutput(system: string, user: string): Output {
  const said = (/She says: <user_input>\n([\s\S]*?)\n<\/user_input>/.exec(user)?.[1] ?? '')
    .toLowerCase()
    .trim();
  const section = (head: string) =>
    (system.split(head)[1] ?? '')
      .split('\n\n')[0]
      ?.split('\n')
      .filter((l) => /^\[\d+\] /.test(l)) ?? [];
  const rack = section('THE LOOK AS IT STANDS');
  const pool = section('THE POOL SHE CAN SWAP FROM');
  const name = (l: string) =>
    l
      .replace(/^\[\d+\] /, '')
      .replace(/ \[.*$/, '')
      .replace(/ —.*$/, '')
      .replace(/ \(.*$/, '');
  const cat = (l: string) => /\[(\w+)\]/.exec(l.replace(/^\[\d+\] /, ''))?.[1] ?? '';
  const empty: Output = {
    intent: 'none',
    reply: '',
    swaps: [],
    back: [],
    styled: [],
    draft: '',
    rule: '',
  };
  if (/\b(back|undo|as it was)\b/.test(said)) {
    const changed = rack.filter((l) => l.includes('just changed'));
    if (!changed.length)
      return { ...empty, reply: 'Nothing has changed yet, so there’s nothing to put back.' };
    return { ...empty, intent: 'back', reply: 'Done. It is back on the look.' };
  }
  if (/\b(remember|don't|don’t|never|always|from now on|in future)\b/.test(said)) {
    const rule = said
      .replace(/^(i )?(don't|don’t) (like|wear) /, 'No ')
      .replace(/^./, (c) => c.toUpperCase());
    return {
      ...empty,
      intent: 'rule',
      reply: 'Noted — keep it under Robes noticed and it becomes a rule.',
      rule,
    };
  }
  if (/\b(tuck|untuck|roll|cuff|sleeve|belted|open)\b/.test(said) && rack.length) {
    return {
      ...empty,
      intent: 'styled',
      reply: `Done. ${name(rack[0] ?? '')} is ${said}.`,
      styled: [{ i: 0, note: said.slice(0, 60) }],
    };
  }
  const swapM =
    /(?:swap|change|not) (?:the )?([\w\s-]+?)(?: for (?:the |a |an |my )?([\w\s-]+))?$/.exec(said);
  if (swapM?.[1]) {
    const target = swapM[1].trim();
    const i = rack.findIndex((l) => name(l).toLowerCase().includes(target) && !l.includes('KEEP'));
    if (i >= 0) {
      const want = swapM[2]?.trim() ?? '';
      const c = cat(rack[i] ?? '');
      const p = pool.findIndex((l) =>
        want
          ? name(l).toLowerCase().includes(want)
          : cat(l) === c && !rack.some((r) => name(r) === name(l)),
      );
      return {
        ...empty,
        intent: 'swap',
        reply: 'Done. The change is on the look now. Say if you want anything back.',
        swaps: [
          {
            i,
            pool_index: p,
            name: want
              ? want.replace(/^./, (x) => x.toUpperCase())
              : `Black ${c.toLowerCase() || 'piece'}`,
            brand: p >= 0 ? '' : 'COS',
            retailer_hint: p >= 0 ? '' : 'cos.com',
            price_point: p >= 0 ? '' : '€89',
            category: c || 'Other',
          },
        ],
      };
    }
  }
  const first = rack.find((l) => !l.includes('KEEP'));
  return {
    ...empty,
    intent: 'draft',
    reply: 'Robes would change one piece to get there.',
    draft: first ? `Change the ${name(first).toLowerCase()} for something easier` : '',
  };
}
