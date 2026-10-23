import {
  buildSystem as buildSystemV1,
  type DailyClosetPiece,
  type DailyContext,
  type HeroRule,
  SEASON_BAND_LABELS,
} from './v1';

// v3: legacy sync 2026-10-19 — her starred pieces are a TASTE signal, never a default. v2's rule
// (build around at most one, rotated by recent wears) is what read as repeat-dressing — the
// complaint it was written to kill. One rule across every stylist prompt: style-piece v4 carries
// this text verbatim and the test here pins the two together.
export * from './v1';
export const VERSION = 3;

export function heroMark(p: Pick<DailyClosetPiece, 'hero' | 'seasonBand'>): string {
  if (!p.hero) return '';
  return `, ★ loved (${SEASON_BAND_LABELS[p.seasonBand ?? ''] ?? 'Year-round'})`;
}

export const HERO_DIRECTIVE =
  'THE PIECES SHE LOVES: the wardrobe items marked ★ are the pieces she has starred — what she loves most. Read their cut, colour, fabric and register as the clearest signal of her taste, and let that taste steer every piece you choose or propose, owned or new. A starred piece is never a default to build a look around and never a reason to repeat a look: it earns its place like any other piece, when the occasion and the season fit, and a look without one is a fine look.';

export const HERO_RULE: HeroRule = { directive: HERO_DIRECTIVE, mark: heroMark };

export function buildSystem(ctx: DailyContext): string {
  return buildSystemV1(ctx, HERO_RULE);
}
