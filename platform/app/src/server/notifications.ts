import 'server-only';
import { ApiError } from '@robes/api';
import type { DismissNotificationInput, NotificationItem, Notifications } from '@robes/contracts';
import { bell } from '@robes/copy';
import { weekdayLong } from '@robes/core/calendar';
import { BELL_NUDGE_DAYS, bellNudgeDays } from '@robes/core/home';
import type { UserId } from '@robes/db';
import { repos } from './db';
import { addDays, todayIn } from './plan';

// The bell (Front Door design 3k): computed on each read, never stored — receipts waiting in the
// Wardrobe inbox, then the days of the last week with no wear logged. A key names what she
// dismissed: a nudge's key is its date, so it never returns; the receipts key carries the count,
// so a new receipt brings the line back.
export async function loadNotifications(userId: UserId, now = new Date()): Promise<Notifications> {
  const profile = await repos.profiles.get(userId);
  if (!profile) throw new ApiError('not_found');
  const today = todayIn(profile.timezone, now);
  const since = todayIn(profile.timezone, profile.createdAt);
  const [inbox, wornDays, savedLooks, dismissed, overnight] = await Promise.all([
    repos.inbox.listHeld(userId),
    repos.looks.wornDays(userId, addDays(today, -BELL_NUDGE_DAYS), today),
    repos.looks.count(userId),
    repos.uiState.dismissed(userId),
    repos.dailyLooks.overnightFor(userId, today),
  ]);
  const items: NotificationItem[] = [];
  if (overnight) {
    items.push({
      key: `overnight:${overnight.id}`,
      kind: 'overnight',
      text: bell.overnight('today'),
      line: overnight.subtitle || overnight.title,
      date: today,
      lookId: overnight.id,
    });
  }
  const held = inbox;
  if (held.length) {
    items.push({
      key: `receipts:${held.length}`,
      kind: 'receipts',
      text: bell.receipts(held.length),
      line: bell.receiptsLine(held.flatMap((r) => (r.retailer ? [r.retailer] : []))),
      date: null,
      lookId: null,
    });
  }
  for (const day of bellNudgeDays({ today, since, wornDays, hasLooks: savedLooks > 0 })) {
    items.push({
      key: `diary:${day}`,
      kind: 'diary',
      text: bell.logWear(weekdayLong(day)),
      line: bell.logWearLine(Number(day.slice(8, 10))),
      date: day,
      lookId: null,
    });
  }
  return { items: items.filter((i) => !(i.key in dismissed)) };
}

// One item by its key, or the sheet's ✓: every item the bell holds right now (PRD rev 3 §10 12).
// A dismissed receipts line still leaves the receipts waiting in the Wardrobe inbox and its badge.
export async function dismissNotification(
  userId: UserId,
  input: DismissNotificationInput,
  now = new Date(),
): Promise<{ ok: true }> {
  if ('key' in input) await repos.uiState.dismiss(userId, input.key);
  else {
    const { items } = await loadNotifications(userId, now);
    await repos.uiState.dismiss(
      userId,
      items.map((i) => i.key),
    );
  }
  return { ok: true };
}
