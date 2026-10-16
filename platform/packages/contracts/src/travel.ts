import { z } from 'zod';
import { Piece } from './wardrobe';

// Trips (M5 task 6): a capsule packing edit and a lookbook for up to ten days away.
const day = z.iso.date();
const DAY_MS = 86_400_000;

export const PlanTripInput = z
  .object({
    destination: z.string().trim().min(1).max(120),
    dateFrom: day,
    dateTo: day,
    // Her plans for the trip ("Beach day", "Night out"): one look each.
    occasions: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
    // Key pieces she must pack.
    anchorPieceIds: z.array(z.uuid()).max(8).default([]),
    brief: z.string().trim().max(600).optional(),
    vibe: z.string().trim().max(240).optional(),
  })
  .refine((t) => t.dateTo >= t.dateFrom, { path: ['dateTo'], message: 'ends before it starts' })
  .refine(
    (t) =>
      Date.parse(`${t.dateTo}T00:00:00Z`) - Date.parse(`${t.dateFrom}T00:00:00Z`) <= 9 * DAY_MS,
    { path: ['dateTo'], message: 'at most ten days' },
  );
export type PlanTripInput = z.infer<typeof PlanTripInput>;

export const TripParams = z.object({ id: z.uuid() });

export const TripCapsuleItem = z.object({
  name: z.string(),
  tier: z.string(),
  category: z.string(),
  brand: z.string(),
  description: z.string(),
  reason: z.string(),
  bridge: z.string(),
  // Her piece when the stylist packed one she owns.
  piece: Piece.nullable(),
  retailerHint: z.string(),
  pricePoint: z.string(),
});

export const TripLook = z.object({
  date: day,
  occasion: z.string(),
  title: z.string(),
  how: z.string(),
  items: z.array(z.object({ role: z.string(), note: z.string(), capsuleIndex: z.number().int() })),
});

export const Trip = z.object({
  id: z.uuid(),
  destination: z.string(),
  dateFrom: day,
  dateTo: day,
  dateLine: z.string(),
  tripDays: z.number().int().min(1).max(10),
  tripLabel: z.string(),
  headline: z.string(),
  locationVibe: z.string(),
  stylistSummary: z.string(),
  suitcaseNote: z.string(),
  palette: z.array(z.string()),
  weather: z
    .object({
      city: z.string(),
      country: z.string(),
      tempRange: z.string().nullable(),
      condition: z.string().nullable(),
      seasonal: z.boolean(),
    })
    .nullable(),
  capsule: z.array(TripCapsuleItem),
  looks: z.array(TripLook),
  // Set once she has pinned the trip's looks to her plan.
  pinnedLookIds: z.array(z.uuid()).nullable(),
  createdAt: z.iso.datetime(),
});
export type Trip = z.infer<typeof Trip>;

export const TripList = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      destination: z.string(),
      dateFrom: day,
      dateTo: day,
      tripLabel: z.string(),
    }),
  ),
});
export type TripList = z.infer<typeof TripList>;

export const PinnedTrip = z.object({ lookIds: z.array(z.uuid()) });
