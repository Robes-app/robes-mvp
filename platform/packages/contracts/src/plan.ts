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
  days: z.array(z.object({ date: day, entries: z.array(PlanEntry) })),
});
export type Plan = z.infer<typeof Plan>;

export const PinLookInput = z.object({
  dates: z.array(day).min(1).max(31),
  slot: PlanSlot.default('day'),
  activity: z.string().trim().max(120).nullable().optional(),
});
export const PinnedEntries = z.object({ entries: z.array(PlanEntry) });

export const PlanEntryParams = z.object({ id: z.uuid() });
export const UpdatePlanEntryInput = z
  .object({ activity: z.string().trim().max(120).nullable(), slot: PlanSlot })
  .partial();
