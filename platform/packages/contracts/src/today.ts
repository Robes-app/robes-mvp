import { z } from 'zod';
import { JobSnapshot } from './jobs';
import { FrameStatus, Idea } from './looks';
import { PlanEntry } from './plan';
import { Piece, PieceImage } from './wardrobe';

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
  // Held Inbox rows waiting for her (Wardrobe › Inbox).
  inboxCount: z.number().int().min(0),
});
export type Today = z.infer<typeof Today>;

// Style it for today (M5 task 2, legacy /api/daily): her brief is the only free text.
export const TodayGenerateInput = z.object({
  prompt: z.string().trim().max(500).optional(),
  occasion: z.string().trim().max(120).optional(),
  // Pieces she locks into the look (restyle).
  lockedPieceIds: z.array(z.uuid()).max(8).optional(),
});
export type TodayGenerateInput = z.infer<typeof TodayGenerateInput>;

export const DAILY_STEPS = ['The Anchor', 'The Canvas', 'The Texture', 'The Accents'] as const;

export const DailyItem = z.object({
  name: z.string(),
  category: z.string(),
  brand: z.string(),
  how: z.string(),
  // Her piece when the look uses one she owns; otherwise a shopping suggestion.
  piece: Piece.nullable(),
  retailerHint: z.string(),
  pricePoint: z.string(),
  alternates: z.array(
    z.object({
      name: z.string(),
      brand: z.string(),
      retailerHint: z.string(),
      pricePoint: z.string(),
    }),
  ),
  // Robes' frame for this item; only the anchor is rendered up front, the rest on demand.
  image: PieceImage.nullable(),
  imageIndex: z.number().int().min(0),
  imageStatus: FrameStatus,
});
export type DailyItem = z.infer<typeof DailyItem>;

export const DailyLook = z.object({
  id: z.uuid(),
  jobId: z.uuid().nullable(),
  fallback: z.boolean(),
  occasionLabel: z.string(),
  headline: z.string(),
  stylistSummary: z.string(),
  transitionTip: z.string(),
  palette: z.array(z.string()),
  lookTags: z.object({
    climate: z.string(),
    wearFor: z.array(z.string()),
    vibe: z.array(z.string()),
  }),
  weather: z
    .object({
      city: z.string().nullable(),
      tempRange: z.string().nullable(),
      condition: z.string().nullable(),
    })
    .nullable(),
  steps: z.array(z.object({ title: z.enum(DAILY_STEPS), items: z.array(DailyItem) })),
  savedAt: z.iso.datetime().nullable(),
  expiresAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type DailyLook = z.infer<typeof DailyLook>;

export const DailyLookParams = z.object({ id: z.uuid() });
export const SaveDailyLookInput = z.object({ name: z.string().trim().min(1).max(120) });

export const DailyItemParams = z.object({
  id: z.uuid(),
  idx: z.coerce.number().int().min(0).max(20),
});
