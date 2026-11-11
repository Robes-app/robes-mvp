import type { Balance } from '@robes/core/looks';
import { fenceUserText } from '../../fence';
import {
  buildSystem as buildSystemV6,
  type DayPlace,
  type Steer as V6Steer,
  type StyleContext as V6StyleContext,
} from './v6';

// v7 (Front Door PRD rev 3 §4.6, plan 2026-11-09 R1): the Shop toggle. Off is `owned`, as v4
// wrote it. On is `mix`, and the pieces on her wishlist ride along as THE PIECES SHE WANTS: a
// look may be built around one, named by its exact label, so the handler can file it as hers.
// Nothing else changes: the system text without wishes is v6's.
export * from './v6';
export const VERSION = 7;

export interface WantedPiece {
  id: string;
  label: string;
  category: string | null;
  color: string | null;
  brand: string | null;
}

export interface StyleContext extends V6StyleContext {
  // Her wishlist, read from her own rows (never from the request).
  wishes?: readonly WantedPiece[];
}

export type Steer = V6Steer;

export const WANTS_LEAD =
  'THE PIECES SHE WANTS — on her wishlist, not hers yet. Shop is on, so a look may be built around one: where a wished piece serves the look, list it by its EXACT label below (wardrobe_index -1, with its brand; the retailer and price may be left empty), and prefer it to inventing a piece of the same kind. Never list a wished piece where a piece she owns does the same job.';

export function wantsBlock(wishes: readonly WantedPiece[]): string {
  const lines = wishes
    .slice(0, 40)
    .map(
      (w) =>
        `${w.label}${w.category ? ` [${w.category}]` : ''}${w.color ? `, ${w.color}` : ''}${w.brand ? `, ${w.brand}` : ''}`,
    )
    .filter(Boolean);
  if (lines.length === 0) return '';
  return `${WANTS_LEAD}\n${fenceUserText(lines.join('; '), 4000)}`;
}

// With Shop on, a wished piece Robes named is hers to file: matched by its exact label.
export function wantedByLabel(
  name: string,
  wishes: readonly WantedPiece[] | undefined,
): WantedPiece | null {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  return wishes?.find((w) => w.label.trim().toLowerCase() === key) ?? null;
}

export function buildSystem(
  ctx: StyleContext,
  mode: Parameters<typeof buildSystemV6>[1],
  steer: Steer = {},
  place: Parameters<typeof buildSystemV6>[3] = null,
): string {
  const s = buildSystemV6(ctx, mode, steer, place);
  const balance: Balance | null = steer.balance ?? null;
  const block = balance === 'mix' && ctx.wishes?.length ? wantsBlock(ctx.wishes) : '';
  if (!block) return s;
  const at = s.indexOf('\n\nTHE FORMULA —');
  if (at < 0) throw new Error('style-piece v7: expected THE FORMULA');
  return `${s.slice(0, at)}\n\n${block}${s.slice(at)}`;
}

export type { DayPlace };
