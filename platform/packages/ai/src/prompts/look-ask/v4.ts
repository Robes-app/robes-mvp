import { categoryFromWords } from '@robes/core/taxonomy';
import { z } from 'zod';
import * as v3 from './v3';

// v4 (testing, 14 Nov: "Add high heels" on a look with no shoes). Until now the prompt could only
// swap a row for another: asked to ADD a piece to a look with no row of its kind it could only say
// it "needs a slot" and write the change out as a draft sentence, and a vague ask was answered
// with a draft too. On the look's own prompt that reads as Robes talking instead of styling. v4:
//   1. "adds" — a piece put on the look as a new row, from the pool or (Shop on) proposed new.
//   2. A vague ask is made, not drafted: the change lands and Robes asks about it.
//   3. "From my wardrobe" means pieces she owns only.
// Everything else is v3's, byte for byte: only the sentences named in REPLACED change.
export * from './v3';
export const VERSION = 4;

const ADDS_MAX = 4;
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

export const Output = v3.Output.extend({
  adds: z
    .array(
      z.object({
        pool_index: z.number().int(),
        name: z.string().max(200),
        brand: z.string().max(120),
        retailer_hint: z.string().max(120),
        price_point: z.string().max(40),
        category: z.string().max(40),
      }),
    )
    .max(8)
    .default([]),
});
export type Output = z.infer<typeof Output>;

export interface Answer extends v3.Answer {
  // Pieces put on the look as new rows; nothing is taken off for them.
  adds: v3.Target[];
}

const ADD_BY_SWAP =
  'A piece to ADD: swap the weakest non-KEEP row of that category, or if the look has no row of it, reply that Robes would need a slot and write the add as a draft.';
const ADD_A_ROW =
  'A piece to ADD ("add high heels", "I want shoes", "it needs a bag"): put it in "adds" — a NEW row on the look; nothing is taken off for it and no other row changes. Each entry: "pool_index" a pool piece that fits, else -1 with a real "name", "brand", "retailer_hint", "price_point" (EUR, like "€120") and "category" for ONE new piece, when the pool rule above allows a new piece. Only when the look already has a row doing that same job (she asks for shoes and it has shoes) swap that row instead. Never refuse an add for want of a slot, and never write an add as a draft.';
const VAGUE_DRAFT =
  'intent "draft". NOTHING changes. Decide which pieces make it feel that way and what Robes would swap them for (from the pool first), say so in the reply in one sentence, then write the change as "draft": one plain sentence naming each swap explicitly ("Change the wide-leg trouser for the dark straight jean, and the grey merino for the camel cardigan").';
const VAGUE_DONE =
  'intent "swap": MAKE the change, never describe it. Decide which pieces make it feel that way and swap them (from the pool first), changing as few rows as it takes; "draft" stays "".';
const UNUSED = 'Unused fields: "swaps" [], "back" [], "styled" [], "draft" "", "rule" "".';
const UNUSED_ADDS =
  'Unused fields: "swaps" [], "adds" [], "back" [], "styled" [], "draft" "", "rule" "".';

// The v1 sentences this version replaces; the test holds that each is still found.
export const REPLACED = [ADD_BY_SWAP, VAGUE_DRAFT, UNUSED] as const;

export function buildSystem(ctx: v3.AskContext): string {
  return `${v3
    .buildSystem(ctx)
    .replace(ADD_BY_SWAP, ADD_A_ROW)
    .replace(VAGUE_DRAFT, VAGUE_DONE)
    .replace(UNUSED, UNUSED_ADDS)}

FROM HER WARDROBE: when she asks for a piece "from my wardrobe", "out of my wardrobe" or "that I own", use ONLY pool pieces she owns — never a wishlist piece, never a new one. If none she owns fits, intent "none": say so in one short sentence and change nothing.
THE EXCHANGE SO FAR is context only: a change Robes described earlier and did not make is NOT on the look. Read THE LOOK AS IT STANDS for what is on it, and act on her newest words.`;
}

const clip = (v: string | null | undefined, n: number) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, n);

export function normaliseAnswer(out: Output, ctx: Pick<v3.AskContext, 'rack' | 'pool'>): Answer {
  const answer = v3.normaliseAnswer(out, ctx);
  // A held pool (her case, or Shop off) never takes a new piece; one row per pool piece.
  const held = ctx.pool.kind !== 'wardrobe';
  const poolN = ctx.pool.items.length;
  const taken = new Set(answer.swaps.flatMap((s) => ('poolIndex' in s.to ? [s.to.poolIndex] : [])));
  const adds: v3.Target[] = [];
  if (answer.intent === 'swap') {
    for (const a of out.adds ?? []) {
      if (adds.length >= ADDS_MAX) break;
      if (a.pool_index >= 0 && a.pool_index < poolN) {
        if (taken.has(a.pool_index)) continue;
        taken.add(a.pool_index);
        adds.push({ poolIndex: a.pool_index });
        continue;
      }
      if (held) continue;
      const name = clip(a.name, 120);
      if (!name) continue;
      adds.push({
        proposal: {
          name,
          category: (() => {
            const c = categoryFromWords(a.category, name);
            return (CATEGORIES as readonly string[]).includes(c) ? c : 'Other';
          })(),
          brand: clip(a.brand, 60),
          retailerHint: clip(a.retailer_hint, 60),
          pricePoint: clip(a.price_point, 20),
        },
      });
    }
  }
  // Robes' question follows an add as it follows any other change.
  const followUp =
    answer.followUp ||
    (adds.length
      ? String(out.follow_up ?? '')
          .replace(/["“”]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 120)
      : '');
  return { ...answer, adds, followUp };
}

// Offline fixture: v3's, with nothing added; "add …" on a look with no row to swap adds the
// first pool piece, so the flow runs without a key.
export function fakeOutput(system: string, user: string): Output {
  const out = v3.fakeOutput(system, user);
  const said = (/She says: <user_input>\n([\s\S]*?)\n<\/user_input>/.exec(user)?.[1] ?? '')
    .toLowerCase()
    .trim();
  const hasPool = /THE POOL SHE CAN SWAP FROM[^\n]*\n[^\n]*\n\[0\] /.test(system);
  if (said.startsWith('add ') && out.swaps.length === 0) {
    return {
      ...out,
      intent: 'swap',
      reply: '',
      draft: '',
      adds: [
        hasPool
          ? { pool_index: 0, name: '', brand: '', retailer_hint: '', price_point: '', category: '' }
          : {
              pool_index: -1,
              name: said.replace(/^add /, '').slice(0, 80),
              brand: 'Aeyde',
              retailer_hint: 'aeyde.com',
              price_point: '€295',
              category: 'Shoes',
            },
      ],
      follow_up: 'How does it look now?',
    };
  }
  return { ...out, adds: [] };
}
