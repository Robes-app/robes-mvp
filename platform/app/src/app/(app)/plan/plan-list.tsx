'use client';

import { queryKeys, useApi, useApiClient, useUndoableMutation } from '@robes/api-client/react';
import type { Plan, PlanEntry } from '@robes/contracts';
import { plan, wardrobe } from '@robes/copy';
import {
  buttonClasses,
  EmptyState,
  Heading,
  IconButton,
  Skeleton,
  Text,
  useToast,
} from '@robes/ui';
import Link from 'next/link';
import { dayLabel, localToday } from '@/lib/dates';
import { errorCopy } from '@/lib/error-copy';
import { ActivityField } from './activity-field';
import { withoutEntry } from './plan-cache';

// The rolling 30 days from her today; every day is listed, empty ones quietly.
export function PlanList() {
  const client = useApiClient();
  const toast = useToast();
  const today = localToday();
  const query = useApi('plan.get', { input: { from: today, days: 30 } });
  const unpin = useUndoableMutation('plan.unpin', {
    optimistic: (args) => [
      { queryKey: queryKeys.route('plan.get'), update: withoutEntry(args.params.id) },
    ],
    onError: (err) => toast({ message: errorCopy(err) }),
    undo: {
      onAvailable: (handle) =>
        toast({
          message: plan.unpinned,
          action: { label: wardrobe.undo, onAction: () => void handle.undo() },
        }),
      compensate: (args) => client.call('plan.restore', { params: { id: args.params.id } }),
    },
  });

  if (query.isError) {
    return (
      <Text role="alert" tone="danger">
        {errorCopy(query.error)}
      </Text>
    );
  }
  if (!query.data) return <PlanSkeleton />;
  const data: Plan = query.data;
  const any = data.days.some((d) => d.entries.length > 0);
  return (
    <div className="flex flex-col gap-6">
      {any ? null : (
        <EmptyState
          title={plan.empty.title}
          body={plan.empty.body}
          action={
            <Link href="/looks" className={buttonClasses({ variant: 'secondary' })}>
              {plan.empty.action}
            </Link>
          }
        />
      )}
      <ol aria-label={plan.title} className="flex flex-col">
        {data.days.map((day) => (
          <li
            key={day.date}
            aria-label={dayLabel(day.date, today)}
            className="flex flex-col gap-3 border-b border-hairline py-4 md:flex-row md:gap-6"
          >
            <Heading level={2} size="sm" className="md:w-32 md:shrink-0">
              {dayLabel(day.date, today)}
            </Heading>
            {day.entries.length === 0 ? (
              <Text size="small" tone="muted">
                {plan.emptyDay}
              </Text>
            ) : (
              <ul className="flex flex-1 flex-col gap-3">
                {day.entries.map((entry) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    onUnpin={() => unpin.mutate({ params: { id: entry.id } })}
                  />
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function EntryRow({ entry, onUnpin }: { entry: PlanEntry; onUnpin: () => void }) {
  return (
    <li className="flex items-start gap-3">
      <div className="flex flex-1 flex-col gap-1">
        <Link
          href={`/look/${entry.look.id}`}
          className="font-sans text-base text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {entry.look.name}
        </Link>
        {entry.slot === 'evening' ? (
          <Text size="small" tone="muted">
            {plan.evening}
          </Text>
        ) : null}
        <ActivityField entry={entry} />
      </div>
      <IconButton icon="trash" label={plan.unpin(entry.look.name)} onClick={onUnpin} />
    </li>
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
