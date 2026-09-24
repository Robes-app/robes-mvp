import { z } from 'zod';
import { JobSnapshot } from './jobs';
import { Idea } from './looks';
import { PlanEntry } from './plan';

// Today (M5 task 1): everything the home screen needs in one read.
export const NextStep = z
  .object({
    rule: z.enum(['start', 'five', 'build', 'wear', 'week']),
    remaining: z.number().int().min(1).optional(),
  })
  .nullable();
export type NextStep = z.infer<typeof NextStep>;

export const Today = z.object({
  // Her calendar date (her timezone) and local hour, for the greeting.
  date: z.iso.date(),
  hour: z.number().int().min(0).max(23),
  firstName: z.string().nullable(),
  nextStep: NextStep,
  // Looks pinned to today; `worn` once she's recorded wearing it.
  today: z.array(z.object({ entry: PlanEntry, worn: z.boolean() })),
  // The next seven days (today first) with how many looks each holds.
  week: z.array(z.object({ date: z.iso.date(), looks: z.number().int().min(0) })).length(7),
  // Generation tray: running jobs and ones that finished in the last 15 minutes.
  tray: z.array(JobSnapshot),
  ideas: z.array(Idea),
});
export type Today = z.infer<typeof Today>;
