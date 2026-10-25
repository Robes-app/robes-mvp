'use client';

import { useApi } from '@robes/api-client/react';
import type { PlanEntry } from '@robes/contracts';
import { plan } from '@robes/copy';
import { daySummary, weekdayShort, weekGroups } from '@robes/core/calendar';
import { Icon } from '@robes/icons/web';
import { Card, EmptyState, ErrorText, Skeleton } from '@robes/ui';
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
          <Card as="section" key={g.monday} aria-label={label}>
            <h2 className="px-4 pt-3 pb-1.5 font-sans text-[11px] tracking-[0.22em] text-ink-faint uppercase">
              {label}
            </h2>
            <ol className="flex flex-col">
              {g.days.map((day, i) => (
                <li key={day.date} className={i ? 'border-t border-hairline' : undefined}>
                  <DayRow date={day.date} today={today} name={day.name} entries={day.entries} />
                </li>
              ))}
            </ol>
          </Card>
        );
      })}
    </div>
  );
}

// One row of a week card: the weekday over its numeral, the first look's photograph when one is
// on the day, her name for it (or the faint invitation) and what it holds. Today carries the rose
// rule and label, and the one full-ink numeral.
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
  const lead = entries[0];
  return (
    <Link
      href={`/plan/${date}`}
      aria-label={`${plan.list.open(`${label} ${Number(date.slice(8))}`)}${title ? `: ${title}` : ''}`}
      className={`flex items-center gap-3 pr-3 hover:bg-surface ${
        isToday ? 'min-h-[68px] border-l-2 border-l-accent-inspire py-2 pl-3.5' : 'min-h-14 pl-4'
      } ${focus}`}
    >
      <span className="flex w-10 shrink-0 flex-col">
        <span
          className={`font-sans text-[9px] font-normal tracking-[0.14em] uppercase ${isToday ? 'text-accent-warm' : 'text-ink-faint'}`}
        >
          {label}
        </span>
        <span
          className={`font-display font-light leading-none ${isToday ? 'text-2xl text-ink' : 'text-[22px] text-ink-muted'}`}
        >
          {Number(date.slice(8))}
        </span>
      </span>
      {lead ? (
        <span className="w-10 shrink-0 overflow-hidden rounded-[4px]">
          <LookImage look={lead.look} sizes="40px" />
        </span>
      ) : null}
      <span className="flex min-w-0 grow flex-col gap-px">
        {title ? (
          <span className="truncate font-display text-[21px] leading-tight font-light text-ink">
            {title}
          </span>
        ) : (
          <span className="font-display text-[19px] leading-tight font-light text-ink-faint italic">
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
