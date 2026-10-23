import { heroMark } from '../daily/v1';
import { HERO_DIRECTIVE } from '../daily/v2';
import { buildSystem as buildSystemV1, type TravelContext, type TripBrief } from './v1';

// v2: legacy sync 2026-10-13 — the daily v2 hero rule (one signature per look, rotated).
export * from './v1';
export const VERSION = 2;

export function buildSystem(ctx: TravelContext, trip: TripBrief, correctiveNote?: string): string {
  return buildSystemV1(ctx, trip, correctiveNote, { directive: HERO_DIRECTIVE, mark: heroMark });
}
