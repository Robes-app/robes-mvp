import { type SystemRepositories, verifiedUserId } from '@robes/db';
import type { JobLogger } from './logger';

// D23 (Annie, 6 Nov): a saved look pinned to a day is filed as worn once that day has ended in
// her timezone. Runs hourly (infra `pins-worn`), so every zone's midnight is followed within the
// hour; each run looks back PASSED_PINS_CATCH_UP_DAYS days, so a missed run or a failed pin is
// retried, and no further, so an old pin never surfaces months later.
//
// Only days that pass after this ships: no pin on a day before PASSED_PINS_FROM is filed. It is
// the first calendar day eligible and must be on or after the day this reaches production; were
// it earlier, the catch-up window would file at most that many pre-ship days.
export const PASSED_PINS_FROM = '2026-11-09';
export const PASSED_PINS_CATCH_UP_DAYS = 2;
export const PASSED_PINS_PAGE = 200;

export interface PassedPinsDeps {
  passedPins: SystemRepositories['passedPins'];
  logger: JobLogger;
  // At most this many pages per run (a backstop; the next hour carries on).
  maxPages?: number;
}

export async function filePassedPins(
  deps: PassedPinsDeps,
  now = new Date(),
  opts: { userIds?: readonly string[] } = {},
): Promise<{ filed: number; skipped: number; failed: number }> {
  let filed = 0;
  let skipped = 0;
  let failed = 0;
  let afterId: string | undefined;
  for (let page = 0; page < (deps.maxPages ?? 50); page++) {
    const due = await deps.passedPins.due({
      now,
      earliest: PASSED_PINS_FROM,
      catchUpDays: PASSED_PINS_CATCH_UP_DAYS,
      limit: PASSED_PINS_PAGE,
      afterId,
      userIds: opts.userIds,
    });
    for (const pin of due) {
      try {
        if (await deps.passedPins.file(verifiedUserId(pin.userId), pin.id)) filed++;
        else skipped++;
      } catch (err) {
        failed++;
        deps.logger.warn(
          { reason: err instanceof Error ? err.message.slice(0, 60) : 'unknown' },
          'passed_pin_failed',
        );
      }
    }
    afterId = due.at(-1)?.id;
    if (due.length < PASSED_PINS_PAGE) break;
  }
  if (filed || failed) deps.logger.info({ filed, skipped, failed }, 'passed_pins_filed');
  return { filed, skipped, failed };
}
