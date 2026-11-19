import 'server-only';
import { ApiError } from '@robes/api';
import {
  type BellCardKind,
  type DismissNotificationInput,
  type NotificationItem,
  NotificationKind,
  type Notifications,
} from '@robes/contracts';
import { bell } from '@robes/copy';
import { weekdayLong } from '@robes/core/calendar';
import {
  BELL_NUDGE_DAYS,
  bellNudgeDays,
  bellUnseen,
  onboardingRound,
  styleDnaProgress,
} from '@robes/core/home';
import type { UserId } from '@robes/db';
import { serverAnalytics } from './analytics';
import { repos } from './db';
import { logger } from './logger';
import { addDays, todayIn } from './plan';

// The bell (Front Door design 3k): computed on each read, never stored — receipts waiting in the
// Wardrobe inbox, then the days of the last week with no wear logged. A key names what she
// dismissed: a nudge's key is its date, so it never returns; the receipts key carries the count,
// so a new receipt brings the line back. `cards` is the sheet as drawn now (design "Onboarding
// notifications", 19 Nov): the Twin, Style DNA and Observations cards lead, each card saying
// whether it stood when she last opened the sheet; `items` keeps the three older kinds for the
// phone apps already out.
export async function loadNotifications(userId: UserId, now = new Date()): Promise<Notifications> {
  const profile = await repos.profiles.get(userId);
  if (!profile) throw new ApiError('not_found');
  const today = todayIn(profile.timezone, now);
  const since = todayIn(profile.timezone, profile.createdAt);
  const [inbox, wornDays, savedLooks, dismissed, overnight, bellState, model, pendingSince] =
    await Promise.all([
      repos.inbox.listHeld(userId),
      repos.looks.wornDays(userId, addDays(today, -BELL_NUDGE_DAYS), today),
      repos.looks.count(userId),
      repos.uiState.dismissed(userId),
      repos.dailyLooks.overnightFor(userId, today),
      repos.uiState.bell(userId),
      repos.model.get(userId),
      repos.styleDna.pendingSince(userId),
    ]);
  const seenAt = bellState.seenAt?.toISOString() ?? null;
  const seenDay = bellState.seenAt ? todayIn(profile.timezone, bellState.seenAt) : undefined;
  const iso = (d: Date | string | null | undefined) =>
    d ? new Date(d).toISOString() : profile.createdAt.toISOString();

  type Built = Omit<NotificationItem, 'kind'> & {
    kind: BellCardKind;
    since?: string;
    day?: string;
  };
  const built: Built[] = [];
  const card = (kind: BellCardKind, key: string, text: string, since: string) =>
    built.push({ kind, key, text, since, line: null, date: null, lookId: null });

  // Her own twin on file (her close-up, a twin drawn, or one drawing — native hasTwinOnFile).
  const twinOnFile = Boolean(
    model?.headshotAssetId || model?.twinAssetId || model?.twinDrawStatus === 'pending',
  );
  if (twinOnFile && !bellState.cards.twinHad) {
    await repos.uiState.markTwinHad(userId);
    // Her first twin, counted once: accounts with one before this shipped were marked by migration.
    serverAnalytics
      .capture(userId, 'twin_created')
      .catch(() => logger.warn('analytics_capture_failed'));
  }
  const twinRound =
    twinOnFile || bellState.cards.twinHad ? null : onboardingRound(bellState.cards.twin, now);
  if (twinRound)
    card('twin', `twin:${twinRound.round}`, bell.twin, iso(twinRound.since ?? profile.createdAt));

  const dna = styleDnaProgress({
    gender: profile.genderIdentity,
    age: profile.ageBand,
    investment: profile.investmentLevel,
    types: profile.styleArchetypes ?? [],
    brands: profile.styleBrands ?? [],
  });
  const dnaRound = dna.next ? onboardingRound(bellState.cards.dna, now) : null;
  if (dnaRound) {
    card(
      'dna',
      `dna:${dnaRound.round}`,
      bell.dna(dna.answered),
      iso(dnaRound.since ?? profile.createdAt),
    );
  }

  if (pendingSince) {
    card(
      'observations',
      `observations:${pendingSince.toISOString()}`,
      bell.observations,
      iso(pendingSince),
    );
  }

  if (overnight) {
    built.push({
      kind: 'overnight',
      since: iso(overnight.createdAt),
      key: `overnight:${overnight.id}`,
      text: bell.overnight('today'),
      line: overnight.subtitle || overnight.title,
      date: today,
      lookId: overnight.id,
    });
  }
  if (inbox.length) {
    built.push({
      kind: 'receipts',
      // Held receipts come newest first.
      since: iso(inbox[0]?.receivedAt),
      key: `receipts:${inbox.length}`,
      text: bell.receipts(inbox.length),
      line: bell.receiptsLine(inbox.flatMap((r) => (r.retailer ? [r.retailer] : []))),
      date: null,
      lookId: null,
    });
  }
  const dismissedDays = Object.keys(dismissed).flatMap((k) =>
    k.startsWith('diary:') ? [k.slice('diary:'.length)] : [],
  );
  for (const day of bellNudgeDays({
    today,
    since,
    wornDays,
    dismissed: dismissedDays,
    hasLooks: savedLooks > 0,
  })) {
    built.push({
      kind: 'diary',
      day,
      key: `diary:${day}`,
      text: bell.logWear(weekdayLong(day)),
      line: bell.logWearLine(Number(day.slice(8, 10))),
      date: day,
      lookId: null,
    });
  }

  const shown = built.filter((b) => !(b.key in dismissed));
  const base = ({ since: _s, day: _d, ...rest }: Built) => rest;
  return {
    items: shown.flatMap((b) => {
      const { kind, ...rest } = base(b);
      return isOlderKind(kind) ? [{ ...rest, kind }] : [];
    }),
    cards: shown.map((b) => ({
      ...base(b),
      seen: !bellUnseen({ since: b.since, day: b.day }, seenAt, seenDay),
      section: b.kind === 'dna' ? dna.next : null,
    })),
  };
}

const isOlderKind = (k: BellCardKind): k is NotificationKind =>
  (NotificationKind.options as readonly string[]).includes(k);

// She opened the sheet: everything it shows now stops lighting the dot.
export async function markBellSeen(userId: UserId, now = new Date()): Promise<{ ok: true }> {
  await repos.uiState.markBellSeen(userId, now);
  return { ok: true };
}

// One item by its key, or the sheet's ✓: every item the bell holds right now (PRD rev 3 §10 12).
// A dismissed receipts line still leaves the receipts waiting in the Wardrobe inbox and its badge.
export async function dismissNotification(
  userId: UserId,
  input: DismissNotificationInput,
  now = new Date(),
): Promise<{ ok: true }> {
  if ('key' in input) {
    // The Twin and Style DNA cards are put away by round: a week, then for good.
    const round = /^(twin|dna):([12])$/.exec(input.key);
    if (round) {
      await repos.uiState.putAwayCard(
        userId,
        round[1] as 'twin' | 'dna',
        Number(round[2]) as 1 | 2,
        now,
      );
    } else await repos.uiState.dismiss(userId, input.key);
  } else {
    // The ✓ of phone apps already out: it never reached the onboarding cards, which they don't show.
    const { items } = await loadNotifications(userId, now);
    await repos.uiState.dismiss(
      userId,
      items.map((i) => i.key),
    );
  }
  return { ok: true };
}
