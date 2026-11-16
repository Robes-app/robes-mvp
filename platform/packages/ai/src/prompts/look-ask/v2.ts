import { z } from 'zod';
import * as v1 from './v1';

// v2 (look prompt PRD F3, F8, F11, 14 Nov): the reasons she taps after a thumbs down, and Robes'
// one question about the change it made. A reason is a clear instruction — the aspect to change,
// the rest kept — never the vague ask v1 answers with a draft. Everything else is v1's, byte for
// byte: the system text below is v1's with two paragraphs after it.
export * from './v1';
export const VERSION = 2;

// What each reason tells the model, in plain words; the keys are the contract's.
export const REASONS = {
  dressy: 'it is too dressy',
  casual: 'it is too casual',
  colours: 'the colours are not right',
  fit: 'the fit or the shape is not right',
  piece: 'there is a piece she does not like',
  weather: 'it is not right for the weather',
} as const;
export type Reason = keyof typeof REASONS;
export const REASONS_MAX = 3;

export const Output = v1.Output.extend({ follow_up: z.string().max(200).default('') });
export type Output = z.infer<typeof Output>;

export interface AskContext extends v1.AskContext {
  reasons?: readonly Reason[];
}

export interface Answer extends v1.Answer {
  // One short question about the change, when the look changed; '' otherwise.
  followUp: string;
}

const TAPPED = 'SHE TAPPED WHAT IS NOT RIGHT WITH THIS LOOK';

export function buildSystem(ctx: AskContext): string {
  const reasons = (ctx.reasons ?? []).slice(0, REASONS_MAX);
  const tapped = reasons.length
    ? `\n\n${TAPPED}: ${reasons.map((r) => REASONS[r]).join('; ')}. This is a CLEAR instruction and it comes before the order above: never answer it with a "draft". Change ONLY the pieces that make the look read that way — intent "swap", or "styled" when how a piece is worn fixes it — and KEEP every other row exactly as it is. Change as few rows as it takes. Her words, when she typed any, steer the same change and name the piece when they name one.${
        reasons.includes('piece')
          ? ' For a piece she does not like: change the piece her words name; if they name none, intent "clarify" and ask which piece — nothing changes.'
          : ''
      }${reasons.includes('weather') ? ' For the weather: read the weather in CONTEXT.' : ''}`
    : '';
  return `${v1.buildSystem(ctx)}${tapped}

FOLLOW-UP: when the look changed (intent "swap", "styled" or "back"), "follow_up" is ONE short question to her about that change, eight words at most, naming what changed ("How do the new shoes look?"). No quotation marks. Otherwise "follow_up" is "".`;
}

// Her words in the user turn, as v1 fences them; with only reasons tapped there are none to fence.
export function buildUser(opts: Parameters<typeof v1.buildUser>[0]): string {
  if (opts.text.trim()) return v1.buildUser(opts);
  return v1
    .buildUser({ ...opts, text: '-' })
    .replace(/She says: [\s\S]*$/, 'She typed nothing: read what she tapped.');
}

export function normaliseAnswer(out: Output, ctx: Pick<AskContext, 'rack' | 'pool'>): Answer {
  const answer = v1.normaliseAnswer(out, ctx);
  const changed = answer.swaps.length + answer.back.length + answer.styled.length > 0;
  return {
    ...answer,
    followUp:
      changed || answer.intent === 'back'
        ? String(out.follow_up ?? '')
            .replace(/["“”]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 120)
        : '',
  };
}

// Offline fixture: a tapped reason swaps the first row that may change for a pool piece of its
// category (a new piece when the pool has none), so the thread runs without a key.
export function fakeOutput(system: string, user: string): Output {
  if (!system.includes(`${TAPPED}:`)) {
    const out = v1.fakeOutput(system, user);
    return {
      ...out,
      follow_up: ['swap', 'styled', 'back'].includes(out.intent) ? 'How does it look now?' : '',
    };
  }
  const lines = (head: string) =>
    (system.split(head)[1] ?? '')
      .split('\n\n')[0]
      ?.split('\n')
      .filter((l) => /^\[\d+\] /.test(l)) ?? [];
  const rack = lines('THE LOOK AS IT STANDS');
  const pool = lines('THE POOL SHE CAN SWAP FROM');
  const cat = (l: string) => /\[(\w+)\]/.exec(l.replace(/^\[\d+\] /, ''))?.[1] ?? '';
  const i = rack.findIndex((l) => !l.includes('KEEP'));
  const empty = { back: [], styled: [], draft: '', rule: '' };
  if (i < 0) {
    return {
      ...empty,
      intent: 'none',
      reply: 'Nothing on the look can change.',
      swaps: [],
      follow_up: '',
    };
  }
  const c = cat(rack[i] ?? '');
  const p = pool.findIndex((l) => cat(l) === c);
  const newOk = !system.includes('Shop is OFF');
  if (p < 0 && !newOk) {
    return { ...empty, intent: 'none', reply: 'Nothing she owns fits.', swaps: [], follow_up: '' };
  }
  return {
    ...empty,
    intent: 'swap',
    reply: 'Done. The change is on the look now. Say if you want anything back.',
    swaps: [
      {
        i,
        pool_index: p,
        name: p >= 0 ? '' : `Black ${c.toLowerCase() || 'piece'}`,
        brand: p >= 0 ? '' : 'COS',
        retailer_hint: p >= 0 ? '' : 'cos.com',
        price_point: p >= 0 ? '' : '€89',
        category: c || 'Other',
      },
    ],
    follow_up: 'How does the change look?',
  };
}
