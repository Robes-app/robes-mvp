'use client';

import { useApi } from '@robes/api-client/react';
import type { PlanEntry } from '@robes/contracts';
import { plan } from '@robes/copy';
import { daySummary, weekdayShort, weekGroups } from '@robes/core/calendar';
import { Icon } from '@robes/icons/web';
import { EmptyState, ErrorText, Skeleton } from '@robes/ui';
import Link from 'next/link';
import { LookImage } from '@/components/looks/look-image';
import { errorCopy } from '@/lib/error-copy';

export const PLAN_DAYS = 30;

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The rolling 30 days as white week cards of summary rows (beta parity canvas, 04 Diary; the
// native twin is mobile/src/features/plan/PlanView.tsx PlanList): every row opens its day.
export function PlanList({ today }: { today: string }) {
  const query = useApi('plan.get', { input: { from: today, days: PLAN_DAYS } });
  if (query.isError) {
    return <ErrorText>{errorCopy(query.error)}</ErrorText>;
  }
  if (!query.data) return <PlanSkeleton />;
  const any = query.data.days.some((d) => d.entries.length > 0 || d.name);
  return (
    <div className="flex flex-col gap-3">
      {any ? null : (
        <EmptyState
          title={
            <>
              {plan.empty.title} <em>{plan.empty.titleEm}</em>
            </>
          }
          body={plan.empty.body}
        />
      )}
      {weekGroups(query.data.days, today).map((g) => {
        const label = g.range ?? (g.wholeWeek ? plan.list.thisWeek : plan.list.restOfWeek);
        return (
          // A week is one white card, flush: its range on a hairline, then a row per day
          // edge to edge (legacy .dy-wk / .dy-wk-h).
          <section
            key={g.monday}
            aria-label={label}
            className="overflow-hidden rounded-soft border border-hairline bg-surface-raised"
          >
            <h2 className="border-b border-hairline px-4 pt-3 pb-2.5 font-sans text-[9.5px] leading-none tracking-[0.2em] text-ink-faint uppercase">
              {label}
            </h2>
            <ol className="flex flex-col">
              {g.days.map((day, i) => (
                <li key={day.date} className={i ? 'border-t border-hairline' : undefined}>
                  <DayRow date={day.date} today={today} name={day.name} entries={day.entries} />
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

// One row of a week card: the weekday over its numeral, up to two looks' photographs when they are
// on the day, her name for it (or the faint invitation) and what it holds. Today carries the rose
// spine and label.
function DayRow({
  date,
  today,
  name,
  entries,
}: {
  date: string;
  today: string;
  name: string | null;
  entries: PlanEntry[];
}) {
  const isToday = date === today;
  const s = daySummary(entries, name);
  const title = s.name ?? (s.looks ? plan.list.looks(s.looks) : null);
  const label = isToday ? plan.today : weekdayShort(date);
  // Up to two looks' photographs, overlapping (legacy .dy-r-th).
  const thumbs = entries.slice(0, 2);
  return (
    <Link
      href={`/plan/${date}`}
      aria-label={`${plan.list.open(`${label} ${Number(date.slice(8))}`)}${title ? `: ${title}` : ''}`}
      className={`flex min-h-14 items-center gap-3.5 py-3 pr-3.5 hover:bg-surface ${
        isToday ? 'border-l-[3px] border-l-accent-inspire pl-[13px]' : 'pl-4'
      } ${focus}`}
    >
      <span className="flex w-[34px] shrink-0 flex-col items-center">
        <span
          className={`font-sans text-[9px] font-normal tracking-[0.14em] uppercase ${isToday ? 'text-accent-warm' : 'text-ink-faint'}`}
        >
          {label}
        </span>
        <span className="mt-1 font-display text-[22px] leading-none text-ink">
          {Number(date.slice(8))}
        </span>
      </span>
      {thumbs.length ? (
        <span className="flex shrink-0">
          {thumbs.map((e, i) => (
            <span
              key={e.look.id}
              className={`w-[34px] overflow-hidden rounded-[5px] border-[1.5px] border-surface-raised ring-1 ring-hairline ${i ? '-ml-3' : ''}`}
            >
              <LookImage look={e.look} sizes="34px" />
            </span>
          ))}
        </span>
      ) : null}
      <span className="flex min-w-0 grow flex-col gap-px">
        {title ? (
          <span className="truncate font-display text-lg leading-tight text-ink">{title}</span>
        ) : (
          <span className="font-display text-lg leading-tight text-ink-faint italic">
            {plan.list.nameTheDay}
          </span>
        )}
        {s.looks ? (
          <span className="truncate font-sans text-[11px] text-ink-faint">
            {plan.list.looks(s.looks)}
            {s.pieces ? ` · ${plan.list.pieces(s.pieces)}` : ''}
          </span>
        ) : null}
      </span>
      <Icon name="forward" size={16} className="shrink-0 text-ink-muted" />
    </Link>
  );
}

function PlanSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      {['a', 'b', 'c', 'd'].map((k) => (
        <Skeleton key={k} shape="text" className="h-12" />
      ))}
    </div>
  );
}
