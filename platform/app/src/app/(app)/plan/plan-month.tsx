'use client';

import { useApi } from '@robes/api-client/react';
import { plan } from '@robes/copy';
import {
  daySummary,
  longDate,
  monthGrid,
  monthLabel,
  rangeLabel,
  type TripBand,
  tripBands,
  WEEKDAYS_SHORT,
} from '@robes/core/calendar';
import { Icon } from '@robes/icons/web';
import { ErrorText, Skeleton } from '@robes/ui';
import Link from 'next/link';
import { useFeatures } from '@/components/features';
import { LookImage } from '@/components/looks/look-image';
import { DayDots } from '@/components/plan/day-dots';
import { errorCopy } from '@/lib/error-copy';

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Month view (the native twin is mobile/src/features/plan/PlanMonth.tsx; legacy _dcCard compact,
// 2026-09-15/17). The day's state is its edge: a past day on cream behind a hairline, a day still
// ahead with nothing on it dashed (an invitation), a day ahead with looks white on a hairline.
// On the phone the cell is square and carries a numeral and a dot per look; on the web it is the
// day card — her name for the day, its looks' photographs, and a past day's "Filed · N pieces".
export function PlanMonth({ today, month }: { today: string; month: string }) {
  const grid = monthGrid(month);
  const query = useApi('plan.get', { input: { from: grid.from, days: grid.days } });
  const byDate = new Map(query.data?.days.map((d) => [d.date, d]) ?? []);
  // Trips draw only while the trip is live (hidden at launch, legacy 2eacfb4).
  const { trips: tripsOn } = useFeatures();
  const trips = useApi('trips.list', undefined, { enabled: tripsOn });
  const inMonth = (trips.data?.items ?? []).filter(
    (t) => t.dateTo >= grid.from && t.dateFrom.slice(0, 7) <= month,
  );
  const bands = tripBands(inMonth, grid.cells);

  return (
    <section aria-label={monthLabel(month)} className="flex flex-col gap-3">
      {query.isError ? <ErrorText>{errorCopy(query.error)}</ErrorText> : null}
      <div aria-hidden className="grid grid-cols-7 gap-1 md:gap-2">
        {WEEKDAYS_SHORT.map((d) => (
          <div key={d} className="text-center md:pl-0.5 md:text-left">
            <span className="font-sans text-[9px] tracking-[0.2em] text-ink-faint uppercase">
              {d}
            </span>
          </div>
        ))}
      </div>
      <ol aria-busy={!query.data} className="grid grid-cols-7 gap-1 md:gap-2">
        {grid.cells.map((date, i) => {
          // biome-ignore lint/suspicious/noArrayIndexKey: padding cells are fixed grid positions
          if (!date) return <li key={`pad-${i}`} aria-hidden />;
          const day = byDate.get(date);
          const entries = day?.entries ?? [];
          const looks = entries.length;
          const s = daySummary(entries, day?.name ?? null);
          const isToday = date === today;
          const past = date < today;
          const band = bands.get(date);
          const state = band
            ? 'border-transparent'
            : past
              ? 'border-hairline bg-surface'
              : looks || s.name
                ? 'border-hairline bg-surface-raised'
                : 'border-dashed border-rule-mid';
          return (
            <li key={date} className="relative">
              {band ? <Band band={band} /> : null}
              <Link
                href={`/plan/${date}`}
                aria-label={plan.week.day(longDate(date), looks)}
                aria-current={isToday ? 'date' : undefined}
                className={`relative flex aspect-square flex-col items-start gap-1 overflow-hidden rounded-soft border p-1.5 hover:border-border-control md:aspect-auto md:min-h-[132px] md:gap-2 md:p-3 ${state} ${
                  isToday && !band ? 'md:border-accent-inspire' : ''
                } ${band ? 'md:pt-9' : ''} ${focus}`}
              >
                <span
                  className={`flex items-center gap-1 font-display text-[17px] leading-none font-light ${
                    isToday ? 'text-ink' : 'text-ink-faint'
                  }`}
                >
                  {Number(date.slice(8))}
                  {isToday ? (
                    <i aria-hidden className="block size-1 rounded-pill bg-ink md:hidden" />
                  ) : null}
                </span>
                {/* The web's day card: her name (or the invitation on a day still ahead). */}
                {s.name ? (
                  <span className="hidden font-display text-ink text-sm leading-snug italic md:line-clamp-2">
                    {s.name}
                  </span>
                ) : !past ? (
                  <span className="hidden font-display text-ink-faint text-xs italic md:block">
                    {plan.list.nameTheDay}
                  </span>
                ) : null}
                {past && looks ? (
                  <span className="hidden font-sans text-[9px] text-ink-faint uppercase tracking-[0.18em] md:block">
                    {plan.monthFiled(s.pieces)}
                  </span>
                ) : null}
                {looks ? (
                  <span aria-hidden className="mt-auto hidden items-end gap-1.5 md:flex">
                    {entries.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className="w-6 overflow-hidden rounded-[3px] border border-hairline"
                      >
                        <LookImage look={e.look} sizes="24px" />
                      </span>
                    ))}
                    {looks > 3 ? (
                      <span className="font-display text-ink-faint text-sm">
                        {plan.monthMore(looks - 3)}
                      </span>
                    ) : null}
                  </span>
                ) : null}
                {!query.data ? (
                  <Skeleton shape="text" className="h-1.5 w-6" />
                ) : (
                  <span className="mt-auto md:hidden">
                    <DayDots looks={looks} past={date <= today} />
                  </span>
                )}
                {/* An empty day still ahead carries a faint + : the cell is the door. */}
                {!past && !looks && !s.name && !band ? (
                  <Icon
                    name="plus"
                    size={10}
                    className="absolute bottom-1.5 left-1.5 text-ink-faint md:hidden"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="text-center font-sans text-ink-muted text-xs">{plan.monthCaption}</p>
      {inMonth.length ? (
        <ul aria-label={plan.trips} className="flex flex-col gap-2 pt-3">
          {inMonth.map((t) => (
            <li key={t.id}>
              <Link
                href={`/trip/${t.id}`}
                className={`flex items-center gap-3 rounded-soft border border-hairline bg-surface-raised p-3 hover:border-border-control ${focus}`}
              >
                <span className="flex size-11 flex-col items-center justify-center rounded-crisp bg-accent-decor font-display text-lg leading-none text-ink">
                  {Number(t.dateFrom.slice(8))}
                </span>
                <span className="flex flex-col">
                  <span className="font-display text-lg text-ink">{t.destination}</span>
                  <span className="font-sans text-xs text-ink-muted">
                    {plan.tripLine(rangeOf(t), daysOf(t))}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

const rangeOf = (t: { dateFrom: string; dateTo: string }) => rangeLabel(t.dateFrom, t.dateTo);
const daysOf = (t: { dateFrom: string; dateTo: string }) =>
  Math.round((Date.parse(t.dateTo) - Date.parse(t.dateFrom)) / 86_400_000) + 1;

// The trip band fills the cell in mauve, bridging the gutters so a run reads as one colour; only
// the run's ends round. The web writes the name and range in each week's first cell.
function Band({ band }: { band: TripBand }) {
  return (
    <span
      aria-hidden
      className={`absolute inset-y-0 bg-accent-decor ${band.first ? 'left-0 rounded-l-crisp' : '-left-0.5'} ${
        band.last ? 'right-0 rounded-r-crisp' : '-right-0.5'
      }`}
    >
      {band.head ? (
        <span className="absolute inset-x-1.5 top-1.5 hidden truncate font-sans text-[10px] text-ink md:block">
          {band.title} · {band.range}
        </span>
      ) : null}
    </span>
  );
}
