import { z } from 'zod';
import { Look } from './looks';

// Plan (M5 task 4): a rolling list of days, each holding the looks pinned to it.
const day = z.iso.date();
export const PlanSlot = z.enum(['day', 'evening']);

export const PlanEntry = z.object({
  id: z.uuid(),
  date: day,
  slot: PlanSlot,
  activity: z.string().nullable(),
  // She wore this look on this day (a wear on the same date): the card's Worn ✓.
  worn: z.boolean().default(false),
  // The day's order (plan 2026-11-02): 0 is the OOTD that leads on home; older servers send none.
  position: z.number().int().min(0).default(0),
  look: Look,
});
export type PlanEntry = z.infer<typeof PlanEntry>;

export const GetPlanInput = z.object({
  // Defaults to today in her timezone.
  from: day.optional(),
  days: z.coerce.number().int().min(1).max(62).default(30),
});

export const Plan = z.object({
  from: day,
  to: day,
  // Every date in the range, empty ones included, so clients never derive a calendar.
  // `name` is her name for the day, set with or without looks on it.
  days: z.array(z.object({ date: day, name: z.string().nullable(), entries: z.array(PlanEntry) })),
});
export type Plan = z.infer<typeof Plan>;

export const PinLookInput = z.object({
  dates: z.array(day).min(1).max(31),
  slot: PlanSlot.default('day'),
  activity: z.string().trim().max(120).nullable().optional(),
});
export const PinnedEntries = z.object({ entries: z.array(PlanEntry) });

export const PlanEntryParams = z.object({ id: z.uuid() });

// Her name for a day; an empty name clears it. Looks pinned to the day carry it too.
export const PlanDayParams = z.object({ date: day });
export const NameDayInput = z.object({
  name: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .transform((v) => v || null),
});
export const DayName = z.object({ date: day, name: z.string().nullable() });
export const UpdatePlanEntryInput = z
  .object({ activity: z.string().trim().max(120).nullable(), slot: PlanSlot })
  .partial();

// Make this look the day's OOTD: it takes position 0 and the rest keep their order.
export const SetOotdInput = z.object({ entryId: z.uuid() });

// Where she is on a day (the prompt's place chip; "For Tuesday 3 only"). The coordinates are the
// place's, from the geocoder, rounded as her home is; null clears the day back to home.
export const DiaryPlace = z.object({
  city: z.string().trim().min(1).max(120),
  country: z.string().trim().max(120).nullable().default(null),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});
export type DiaryPlace = z.infer<typeof DiaryPlace>;
export const DayPlaceInput = z.object({ place: DiaryPlace.nullable() });
export const DayPlace = z.object({ date: day, place: DiaryPlace.nullable() });

// The place picker's search: cities by name, each with the asked day's weather when known.
export const PlaceSearchInput = z.object({
  q: z.string().trim().min(1).max(60),
  date: day.optional(),
});
export const PlaceHit = DiaryPlace.extend({
  weather: z.object({ tempRange: z.string(), code: z.number().int().nullable() }).nullable(),
});
export type PlaceHit = z.infer<typeof PlaceHit>;
export const PlaceHits = z.object({ items: z.array(PlaceHit).max(8) });
export type PlaceHits = z.infer<typeof PlaceHits>;
