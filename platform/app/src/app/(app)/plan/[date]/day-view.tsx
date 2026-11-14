'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { DayCard as DayCardData } from '@robes/contracts';
import { diary as copy } from '@robes/copy';
import { longDate } from '@robes/core/calendar';
import { ErrorText, InlineTitleField, Skeleton, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DayCard } from '@/components/home/day-card';
import { DayPlace } from '@/components/home/day-place';
import { errorCopy } from '@/lib/error-copy';

// The day's cache with one look taken off it (optimistic; the server read follows).
function withoutEntry(id: string) {
  return (old: DayCardData | undefined): DayCardData | undefined =>
    old && { ...old, day: { ...old.day, entries: old.day.entries.filter((e) => e.id !== id) } };
}

// The day page (design "Diary & Day", 14 Nov): the date and where she is that day on one eyebrow,
// her name for the day as a standing field, then the day exactly as Home draws it — `DayCard`,
// its looks with Swap · Edit and her model with Capture · Create · Pick. Native twin:
// mobile/src/features/plan/DayView.tsx.
export function DayView({ date }: { date: string }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const query = useApi(
    'plan.day',
    { params: { date } },
    {
      // Back from a drawer (Create, Edit) the day is read again.
      refetchOnMount: 'always',
      // The draft Robes is making for the day (plan 2026-11-03): read every 2 s.
      refetchInterval: (q) => {
        const draft = q.state.data?.day.draft;
        return draft?.jobId || draft?.look?.framePending ? 2_000 : false;
      },
    },
  );
  // The draft drawer opens over this page (the `@drawer` slot) and leaves it mounted: when the
  // address is the day's again, the day is read again.
  const pathname = usePathname();
  const { refetch } = query;
  useEffect(() => {
    if (pathname === `/plan/${date}`) void refetch();
  }, [pathname, date, refetch]);
  // Escape puts the field back to her name for the day.
  const [rev, setRev] = useState(0);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.day') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.get') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });
  };
  const rename = useApiMutation('plan.nameDay', {
    onSuccess: refresh,
    onError: (err) => toast({ message: errorCopy(err) }),
  });

  if (query.isError) return <ErrorText>{errorCopy(query.error)}</ErrorText>;
  const card = query.data;
  const day = card?.day;
  const words = day?.name ?? day?.entries.find((e) => e.activity?.trim())?.activity?.trim() ?? '';

  return (
    <article
      className="mx-auto flex w-full max-w-[640px] flex-col gap-6 pt-2.5 pb-8"
      data-testid="day-page"
    >
      <header className="relative flex flex-col gap-4">
        <h1 className="sr-only">{longDate(date)}</h1>
        <div className="flex flex-wrap items-center gap-2 font-sans text-[10px] leading-tight tracking-[0.2em] text-accent-warm uppercase">
          <span aria-hidden>{longDate(date)}</span>
          {card && day ? (
            <>
              <span aria-hidden>·</span>
              <DayPlace day={day} today={card.today} home={card.home} />
            </>
          ) : null}
        </div>
        {/* Any day can be named, so she can plan a week before adding outfits. */}
        <InlineTitleField
          key={`${words}:${rev}`}
          value={words}
          label={copy.day.name}
          placeholder={copy.day.name}
          size="md"
          autoFocus={false}
          bare
          onCommit={(value) => {
            if (value !== words)
              rename.mutate({ params: { date }, input: { name: value || null } });
          }}
          onCancel={() => setRev((r) => r + 1)}
          className="-my-2.5 placeholder:text-ink-muted placeholder:italic"
        />
      </header>

      {card && day ? (
        <DayCard
          origin="diary"
          day={day}
          today={card.today}
          forget={(id) =>
            queryClient.setQueryData(
              queryKeys.call('plan.day', { params: { date } }),
              withoutEntry(id),
            )
          }
          refresh={refresh}
        />
      ) : (
        <Skeleton aria-busy className="aspect-[4/5] rounded-tile" />
      )}
    </article>
  );
}
