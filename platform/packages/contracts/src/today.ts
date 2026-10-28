import { HOME_STEPS } from '@robes/core/home';
import { z } from 'zod';
import { JobSnapshot } from './jobs';
import { FrameStatus, Idea, Look } from './looks';
import { PlanEntry } from './plan';
import { Piece, PieceImage } from './wardrobe';

// Today (M5 task 1): everything the home screen needs in one read.
export const NextStep = z
  .object({
    rule: z.enum(['start', 'model', 'five', 'build', 'wear', 'week']),
    remaining: z.number().int().min(1).optional(),
    count: z.number().int().min(1).optional(),
    lookName: z.string().optional(),
    presence: z.enum(['woman', 'man', 'unspecified']).optional(),
  })
  .nullable();
export type NextStep = z.infer<typeof NextStep>;

export const HomeStep = z.enum(HOME_STEPS);
export type HomeStep = z.infer<typeof HomeStep>;

export const HomePiece = z.object({
  id: z.uuid(),
  label: z.string(),
  brand: z.string().nullable(),
  image: PieceImage.nullable(),
});
export type HomePiece = z.infer<typeof HomePiece>;

// The modular home (legacy 0478e63): her state for the resolver plus what each module paints.
export const Home = z.object({
  state: z.object({
    styleConfirmed: z.boolean(),
    twinOnFile: z.boolean(),
    pics: z.number().int().min(0),
    ownLookSaved: z.boolean(),
    // Any saved look: the week strip shows from the first (legacy 0.3).
    anyLook: z.boolean().optional(),
    snoozed: z.partialRecord(HomeStep, z.iso.datetime()),
  }),
  // O1's rows: her chips, three at most.
  rows: z.object({
    brands: z.array(z.string()).max(3),
    icons: z.array(z.string()).max(3),
    styles: z.array(z.string()).max(3),
  }),
  // O3: the last four photographed pieces. O4: three to build the first look around.
  recent: z.array(HomePiece).max(4),
  candidates: z.array(HomePiece).max(3),
  // H1: held receipts, and one line Robes noticed (after three saved looks).
  receipts: z
    .object({
      receipts: z.number().int().min(1),
      pieces: z.number().int().min(0),
      retailer: z.string().nullable(),
    })
    .nullable(),
  noticed: z.object({ id: z.uuid(), text: z.string() }).nullable(),
  // H4: Saved looks then Suggested, four each, whenever they have data.
  saved: z.array(Look).max(4),
  suggested: z.array(Look).max(4),
});
export type Home = z.infer<typeof Home>;

// H3's day card: the first look on the day.
export const WeekLook = z.object({
  id: z.uuid(),
  name: z.string(),
  image: PieceImage.nullable(),
  worn: z.boolean(),
});

export const Today = z.object({
  // Her calendar date (her timezone) and local hour, for the greeting.
  date: z.iso.date(),
  hour: z.number().int().min(0).max(23),
  firstName: z.string().nullable(),
  // Retired with the modular home (legacy b1808b0); kept optional for older clients.
  nextStep: NextStep.optional(),
  // Looks pinned to today; `worn` once she's recorded wearing it.
  today: z.array(z.object({ entry: PlanEntry, worn: z.boolean() })),
  // The next seven days (today first) with how many looks each holds.
  week: z
    .array(
      z.object({
        date: z.iso.date(),
        looks: z.number().int().min(0),
        first: WeekLook.nullable().default(null),
      }),
    )
    .length(7),
  // Generation tray: running jobs and ones that finished in the last 15 minutes.
  tray: z.array(JobSnapshot),
  ideas: z.array(Idea),
  // Pieces from forwarded receipts waiting for her (Wardrobe › Inbox).
  inboxCount: z.number().int().min(0),
  // The look Robes made for her date overnight (M5 task 3); opens the daily look page.
  overnight: z.object({ id: z.uuid(), title: z.string(), headline: z.string() }).nullable(),
  home: Home,
});
export type Today = z.infer<typeof Today>;

export const HomeLaterInput = z.object({ step: HomeStep });
export const HomeLater = z.object({ snoozed: Home.shape.state.shape.snoozed });

// The masthead's weather line: her home city's day (Open-Meteo); null without a city. `tempRange`
// and `condition` are the day's (the prompts and the day's advice read them). Today also carries the
// live reading — `nowC` the temperature now, `code` the WMO code now; a day ahead carries that day's
// code and no `nowC`. Both default to null so either side may be older than the other.
export const TodayWeather = z
  .object({
    city: z.string().nullable(),
    tempRange: z.string(),
    condition: z.string(),
    nowC: z.number().int().nullable().default(null),
    code: z.number().int().nullable().default(null),
  })
  .nullable();
export type TodayWeather = z.infer<typeof TodayWeather>;

// A day page asks for its own date; the forecast reaches about two weeks ahead.
export const TodayWeatherInput = z.object({ date: z.iso.date().optional() });

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
