import 'server-only';
import { ApiError } from '@robes/api';
import { Today } from '@robes/contracts';
import { nextStep } from '@robes/core/next-step';
import type { UserId } from '@robes/db';
import { repos } from './db';
import { toJobSnapshot } from './jobs';
import { toIdeas } from './looks';
import { loadPlan, todayIn } from './plan';

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

// One read for the home screen; every derivation happens here, never on the client (UX-14).
export async function loadToday(userId: UserId, now = new Date()): Promise<Today> {
  const profile = await repos.profiles.get(userId);
  if (!profile) throw new ApiError('not_found');
  const date = todayIn(profile.timezone, now);
  const [plan, readyPieces, looks, worn, jobs, ideaRows] = await Promise.all([
    loadPlan(userId, date, 7),
    repos.wardrobe.countReady(userId),
    repos.looks.count(userId),
    repos.looks.wornOn(userId, date),
    repos.jobs.recent(userId, ['key_piece', 'daily', 'look_render', 'stylenotes_analyse']),
    repos.ideas.list(userId, 3),
  ]);
  const todayEntries = (plan.days[0]?.entries ?? []).map((entry) => ({
    entry,
    worn: worn.includes(entry.look.id),
  }));
  // Rows never leave as-is (CLAUDE.md rule 8): parse through the contract.
  return Today.parse({
    date,
    hour: hourIn(profile.timezone, now),
    firstName: profile.firstName,
    nextStep: nextStep({
      readyPieces,
      looks,
      todayPinnedUnworn: todayEntries.some((e) => !e.worn),
      weekPlanned: plan.days.some((d) => d.entries.length > 0),
    }),
    today: todayEntries,
    week: plan.days.map((d) => ({ date: d.date, looks: d.entries.length })),
    tray: jobs.map(toJobSnapshot),
    ideas: await toIdeas(userId, ideaRows),
  });
}
