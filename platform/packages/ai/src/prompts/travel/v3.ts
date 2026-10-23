import { HERO_RULE } from '../daily/v3';
import { buildSystem as buildSystemV1, type TravelContext, type TripBrief } from './v1';

// v3: legacy sync 2026-10-19 — the daily v3 loved-pieces rule (taste, never a default).
export * from './v1';
export const VERSION = 3;

export function buildSystem(ctx: TravelContext, trip: TripBrief, correctiveNote?: string): string {
  return buildSystemV1(ctx, trip, correctiveNote, HERO_RULE);
}
