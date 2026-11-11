import 'server-only';
import { ApiError } from '@robes/api';
import { type Diary, type DiaryDraft, type Look, Today } from '@robes/contracts';
import { DIARY_PAGE, diaryWindow } from '@robes/core/calendar';
import type { UserId } from '@robes/db';
import { z } from 'zod';
import { repos } from './db';
import { isFlagEnabled } from './flags';
import { loadHome } from './home';
import { toJobSnapshot } from './jobs';
import { toIdeas } from './looks';
import { toLooks } from './looks-entity';
import { entriesOn, loadPlan, todayIn } from './plan';
import { loadDiaryWeather } from './weather';

// A key_piece job the prompt box started (plan 2026-11-03): it lives in the day's slot as the
// draft tile, never in the tray.
const DraftJobInput = z.object({
  mode: z.literal('prompt'),
  draft: z.literal(true),
  date: z.iso.date().optional(),
});
function draftJobDate(job: { kind: string; input: unknown }, today: string): string | null {
  if (job.kind !== 'key_piece') return null;
  const parsed = DraftJobInput.safeParse(job.input);
  return parsed.success ? (parsed.data.date ?? today) : null;
}
const TRAY_LIMIT = 5;

function hourIn(timezone: string, now: Date): number {
  return (
    Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        hourCycle: 'h23',
      }).format(now),
    ) % 24
  );
}

// One read for the home screen (the modular home retired the next-step line, legacy b1808b0); every derivation happens here, never on the client (UX-14).
export async function loadToday(userId: UserId, now = new Date()): Promise<Today> {
  const profile = await repos.profiles.get(userId);
  if (!profile) throw new ApiError('not_found');
  const date = todayIn(profile.timezone, now);
  const tripsOn = await isFlagEnabled('trips');
  // One plan read covers the diary's window; this week is its middle page (old clients).
  const window = diaryWindow(date);
  const [whole, places, looks, worn, jobs, ideaRows, inboxCount, overnight, draftRows] =
    await Promise.all([
      loadPlan(userId, window.from, window.days.length),
      repos.plan.places(userId, window.from, window.to),
      repos.looks.count(userId),
      repos.looks.wornOn(userId, date),
      repos.jobs.recent(
        userId,
        [
          'key_piece',
          'daily',
          'look_render',
          'stylenotes_analyse',
          ...(tripsOn ? (['travel'] as const) : []),
        ],
        TRAY_LIMIT + 3,
      ),
      repos.ideas.list(userId, 3),
      repos.inbox.piecesWaiting(userId),
      repos.dailyLooks.overnightFor(userId, date),
      repos.looks.draftsFor(userId, window.from, window.to),
    ]);
  const plan = { ...whole, days: whole.days.slice(DIARY_PAGE, DIARY_PAGE * 2) };
  // The prompt box's draft per day: the newest look Robes made for it, and the job while it runs
  // (before the look is minted there is only the job).
  const draftOf = new Map<string, Look>();
  for (const look of await toLooks(userId, draftRows)) {
    if (look.dateHint && !draftOf.has(look.dateHint)) draftOf.set(look.dateHint, look);
  }
  const draftJobOf = new Map<string, string>();
  for (const job of jobs) {
    const day = draftJobDate(job, date);
    const running = job.status === 'queued' || job.status === 'running';
    if (day && running && !draftJobOf.has(day)) draftJobOf.set(day, job.id);
  }
  const draftFor = (day: string): DiaryDraft | null => {
    const look = draftOf.get(day) ?? null;
    const jobId = draftJobOf.get(day) ?? null;
    return look || jobId ? { look, jobId } : null;
  };
  const tray = jobs.filter((j) => draftJobDate(j, date) === null).slice(0, TRAY_LIMIT);
  const placeOf = new Map(
    places.map((p) => [p.dayDate, { city: p.city, country: p.country, lat: p.lat, lon: p.lon }]),
  );
  const weather = await loadDiaryWeather(
    whole.days.map((d) => ({ date: d.date, place: placeOf.get(d.date) ?? null })),
    {
      city: profile.homeCity,
      lat: profile.homeLat === null ? null : Number(profile.homeLat),
      lon: profile.homeLon === null ? null : Number(profile.homeLon),
    },
    window,
  );
  const diary: Diary = {
    from: whole.from,
    to: whole.to,
    days: whole.days.map((d) => ({
      date: d.date,
      name: d.name,
      place: placeOf.get(d.date) ?? null,
      weather: weather.get(d.date) ?? null,
      entries: d.entries,
      draft: draftFor(d.date),
    })),
  };
  const todayEntries = entriesOn(whole.days, date).map((entry) => ({
    entry,
    worn: worn.includes(entry.look.id),
  }));
  // Rows never leave as-is (CLAUDE.md rule 8): parse through the contract.
  return Today.parse({
    date,
    hour: hourIn(profile.timezone, now),
    firstName: profile.firstName,
    today: todayEntries,
    week: plan.days.map((d) => {
      const first = d.entries.find((e) => e.slot === 'day') ?? d.entries[0];
      return {
        date: d.date,
        looks: d.entries.length,
        first: first
          ? {
              id: first.look.id,
              name: d.name ?? first.activity ?? first.look.name,
              image: first.look.image ?? first.look.pieces[0]?.piece.image ?? null,
              worn: d.date === date && worn.includes(first.look.id),
            }
          : null,
      };
    }),
    tray: tray.map(toJobSnapshot),
    ideas: await toIdeas(userId, ideaRows),
    inboxCount,
    overnight: overnight
      ? { id: overnight.id, title: overnight.title, headline: overnight.subtitle }
      : null,
    home: await loadHome(userId, profile, looks),
    diary,
  });
}
