import { buildSystem as buildSystemV1, type DailyContext } from './v1';

// v2: legacy sync 2026-10-13 — heroes are signatures, at most one per look, rotated by recent wears.
export * from './v1';
export const VERSION = 2;

export const HERO_DIRECTIVE = `HERO PIECES: the wardrobe items marked ★ HERO are the pieces she loves — her signatures. A hero is a signature, never a default: build AT MOST ONE hero into a look, as the piece the look is built around, and never put two heroes side by side. Rotate them: when the look's occasion and season fit, prefer the hero the recent wears above do NOT show, and never build two looks in a row around the same hero. The bracket names the season band each hero belongs to — Spring/Summer, Autumn/Winter, or Year-round; a hero only ever leads a look whose season or climate matches that band (Year-round always matches), and an off-season hero is never forced in. A look with no hero in it is a fine look.`;

export function buildSystem(ctx: DailyContext): string {
  return buildSystemV1(ctx, HERO_DIRECTIVE);
}
