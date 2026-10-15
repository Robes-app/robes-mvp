import 'server-only';
import { ApiError } from '@robes/api';
import { type PlanTripInput, type StartJobOutput, Trip, type TripList } from '@robes/contracts';
import type { TripLookToPin, UserId } from '@robes/db';
import { z } from 'zod';
import { repos } from './db';
import { startJob } from './jobs';
import { toPieces } from './wardrobe';

// What the travel job stores in artifacts.data (packages/jobs handlers/travel.ts, NormalEdit).
const StoredTrip = z.object({
  trip: z.object({
    destination: z.string(),
    dateFrom: z.iso.date(),
    dateTo: z.iso.date(),
    dateLine: z.string(),
    tripDays: z.number().int(),
  }),
  weather: z
    .object({
      city: z.string(),
      country: z.string(),
      tempRange: z.string().nullable(),
      condition: z.string().nullable(),
      seasonal: z.boolean(),
    })
    .nullable()
    .default(null),
  edit: z.object({
    tripLabel: z.string(),
    headline: z.string(),
    locationVibe: z.string(),
    stylistSummary: z.string(),
    suitcaseNote: z.string(),
    palette: z.array(z.string()),
    capsule: z.array(
      z.object({
        name: z.string(),
        tier: z.string(),
        category: z.string(),
        brand: z.string(),
        description: z.string(),
        reason: z.string(),
        bridge: z.string(),
        pieceId: z.string().nullable(),
        retailerHint: z.string(),
        pricePoint: z.string(),
      }),
    ),
    looks: z.array(
      z.object({
        occasion: z.string(),
        title: z.string(),
        how: z.string(),
        formula: z.array(
          z.object({ role: z.string(), itemIndex: z.number().int(), note: z.string() }),
        ),
      }),
    ),
  }),
  lookDates: z.array(z.iso.date()),
  pinned: z.object({ lookIds: z.array(z.uuid()) }).optional(),
});
type Stored = z.infer<typeof StoredTrip>;

type Row = NonNullable<Awaited<ReturnType<typeof repos.trips.get>>>;

// One text call (images are not rendered for trips yet).
const TRAVEL_QUOTA = { metric: 'generation.text', cost: 1 } as const;

export async function planTrip(
  userId: UserId,
  req: Request,
  input: PlanTripInput,
): Promise<StartJobOutput> {
  if (await repos.capacity.isExhausted(['gemini-flash-lite'])) throw new ApiError('capacity');
  // Key pieces must be hers; someone else's is indistinguishable from a missing one.
  for (const id of new Set(input.anchorPieceIds)) {
    if (!(await repos.wardrobe.get(userId, id))) throw new ApiError('not_found');
  }
  return startJob(userId, req, { kind: 'travel', input, quota: TRAVEL_QUOTA });
}

async function loadRow(userId: UserId, id: string): Promise<{ row: Row; stored: Stored }> {
  const row = await repos.trips.get(userId, id);
  if (!row) throw new ApiError('not_found');
  return { row, stored: StoredTrip.parse(row.data) };
}

export async function loadTrip(userId: UserId, id: string): Promise<Trip> {
  const { row, stored } = await loadRow(userId, id);
  const ids = [...new Set(stored.edit.capsule.flatMap((c) => (c.pieceId ? [c.pieceId] : [])))];
  const rows = (await Promise.all(ids.map((pid) => repos.wardrobe.get(userId, pid)))).filter(
    (p) => p !== undefined,
  );
  const pieces = new Map((await toPieces(userId, rows)).map((p) => [p.id, p]));
  // Rows never leave as-is (CLAUDE.md rule 8): parse through the contract.
  return Trip.parse({
    id: row.id,
    ...stored.trip,
    tripLabel: stored.edit.tripLabel,
    headline: stored.edit.headline,
    locationVibe: stored.edit.locationVibe,
    stylistSummary: stored.edit.stylistSummary,
    suitcaseNote: stored.edit.suitcaseNote,
    palette: stored.edit.palette,
    weather: stored.weather,
    capsule: stored.edit.capsule.map((c) => ({
      name: c.name,
      tier: c.tier,
      category: c.category,
      brand: c.brand,
      description: c.description,
      reason: c.reason,
      bridge: c.bridge,
      // A piece she has since deleted drops back to a suggestion.
      piece: (c.pieceId && pieces.get(c.pieceId)) || null,
      retailerHint: c.retailerHint,
      pricePoint: c.pricePoint,
    })),
    looks: stored.edit.looks.map((l, i) => ({
      date: stored.lookDates[i] ?? stored.trip.dateFrom,
      occasion: l.occasion,
      title: l.title,
      how: l.how,
      items: l.formula.map((f) => ({ role: f.role, note: f.note, capsuleIndex: f.itemIndex })),
    })),
    pinnedLookIds: stored.pinned?.lookIds ?? null,
    createdAt: row.createdAt.toISOString(),
  });
}

export async function listTrips(userId: UserId): Promise<TripList> {
  const rows = await repos.trips.list(userId);
  return {
    items: rows.flatMap((row) => {
      const parsed = StoredTrip.safeParse(row.data);
      if (!parsed.success) return [];
      const { trip, edit } = parsed.data;
      return [
        {
          id: row.id,
          destination: trip.destination,
          dateFrom: trip.dateFrom,
          dateTo: trip.dateTo,
          tripLabel: edit.tripLabel,
        },
      ];
    }),
  };
}

// Every trip look becomes a Look on its day (her owned capsule pieces, in formula order).
export async function pinTrip(userId: UserId, id: string): Promise<{ lookIds: string[] }> {
  const { stored } = await loadRow(userId, id);
  const looks: TripLookToPin[] = stored.edit.looks.map((l, i) => ({
    date: stored.lookDates[i] ?? stored.trip.dateFrom,
    name: l.title || l.occasion,
    note: l.how,
    pieceIds: l.formula.flatMap((f) => {
      const pieceId = stored.edit.capsule[f.itemIndex]?.pieceId;
      return pieceId ? [pieceId] : [];
    }),
  }));
  const lookIds = await repos.trips.pin(userId, id, looks);
  if (!lookIds) throw new ApiError('not_found');
  return { lookIds };
}
