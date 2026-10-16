'use client';

import { useApi } from '@robes/api-client/react';
import type { PlanEntry } from '@robes/contracts';
import { plan } from '@robes/copy';
import { daySummary, weekdayShort, weekGroups } from '@robes/core/calendar';
import { Icon } from '@robes/icons/web';
import { EmptyState, Skeleton, Text } from '@robes/ui';
import Link from 'next/link';
import { LookImage } from '@/components/looks/look-image';
import { errorCopy } from '@/lib/error-copy';

export const PLAN_DAYS = 30;

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The rolling 30 days as summary rows grouped by week (legacy ff87e89): every row opens its day.
export function PlanList({ today }: { today: string }) {
  const query = useApi('plan.get', { input: { from: today, days: PLAN_DAYS } });
  if (query.isError) {
    return (
      <Text role="alert" tone="danger">
        {errorCopy(query.error)}
      </Text>
    );
  }
  if (!query.data) return <PlanSkeleton />;
  const any = query.data.days.some((d) => d.entries.length > 0);
  return (
    <div className="flex flex-col gap-6">
      {any ? null : <EmptyState title={plan.empty.title} body={plan.empty.body} />}
      {weekGroups(query.data.days, today).map((g) => {
        const label = g.range ?? (g.wholeWeek ? plan.list.thisWeek : plan.list.restOfWeek);
        return (
          <section key={g.monday} aria-label={label} className="flex flex-col">
            <h2 className="mb-2 font-sans text-[10px] tracking-[0.24em] text-ink-faint uppercase">
              {label}
            </h2>
            <ol className="flex flex-col">
              {g.days.map((day) => (
                <li key={day.date}>
                  <DayRow date={day.date} today={today} entries={day.entries} />
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function DayRow({ date, today, entries }: { date: string; today: string; entries: PlanEntry[] }) {
  const isToday = date === today;
  const s = daySummary(entries);
  const title = s.name ?? (s.looks ? plan.list.looks(s.looks) : null);
  const label = isToday ? plan.today : weekdayShort(date);
  return (
    <Link
      href={`/plan/${date}`}
      aria-label={`${plan.list.open(`${label} ${Number(date.slice(8))}`)}${title ? `: ${title}` : ''}`}
      className={`grid min-h-16 grid-cols-[44px_auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-hairline py-3 hover:bg-surface ${focus}`}
    >
      <span className="flex flex-col items-center">
        <span
          className={`font-sans text-[9px] tracking-[0.18em] uppercase ${isToday ? 'text-accent-warm' : 'text-ink-faint'}`}
        >
          {label}
        </span>
        <span className="font-display text-2xl leading-none text-ink">{Number(date.slice(8))}</span>
      </span>
      <span className="flex">
        {entries.slice(0, 2).map((e, i) => (
          <span
            key={e.id}
            className={`w-[34px] overflow-hidden rounded-[4px] border border-bg ${i ? '-ml-3' : ''}`}
          >
            <LookImage look={e.look} sizes="34px" />
          </span>
        ))}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        {title ? (
          <span className="truncate font-display text-lg leading-tight text-ink">{title}</span>
        ) : (
          <span className="font-display text-lg leading-tight text-ink-faint italic">
            {plan.list.nameTheDay}
          </span>
        )}
        {s.looks ? (
          <span className="font-sans text-xs text-ink-muted">
            {plan.list.looks(s.looks)}
            {s.pieces ? ` · ${plan.list.pieces(s.pieces)}` : ''}
          </span>
        ) : null}
      </span>
      <Icon name="forward" size={16} className="text-ink-muted" />
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
