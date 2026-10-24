'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { looks as looksCopy } from '@robes/copy';
import { dayMonth, longDate } from '@robes/core/calendar';
import { wearDiff } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import { Button, ErrorText, Eyebrow, Field, IconButton, Skeleton, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { localToday } from '@/lib/dates';
import { errorCopy } from '@/lib/error-copy';

const copy = looksCopy.page.wears;

// The look's own record, under the rack and standing alone: a wear is a fact about a day, never
// part of the look's composition. Each row opens its day and says what that day held that the
// look no longer does — the wear keeps its own snapshot, so the record stays true as the look
// moves on.
export function WearRecord({ look }: { look: Look }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [day, setDay] = useState('');
  const [adding, setAdding] = useState(false);
  const query = useApi('looks.wears', { params: { id: look.id } });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.wears') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.get') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
  };
  const add = useApiMutation('looks.wear', {
    onSuccess: () => {
      setDay('');
      setAdding(false);
      toast({ message: copy.added });
      refresh();
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  const remove = useApiMutation('looks.unwear', {
    onSuccess: () => {
      toast({ message: copy.removed });
      refresh();
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });

  const items = query.data?.items ?? [];
  const labelOf = (id: string) => look.pieces.find((p) => p.piece.id === id)?.piece.label ?? null;

  const onAdd = (e: FormEvent) => {
    e.preventDefault();
    if (day) add.mutate({ params: { id: look.id }, input: { wornOn: day } });
  };

  return (
    <section
      aria-labelledby="look-wears"
      className="flex flex-col gap-3 rounded-crisp border border-hairline bg-surface p-4"
    >
      {/* The record's own head: what it is, and how often — the rows beneath are the days. */}
      <div className="flex items-baseline justify-between gap-3">
        <Eyebrow id="look-wears">{copy.title}</Eyebrow>
        {look.timesWorn > 0 ? (
          <Text size="caption" tone="faint" italic>
            {copy.count(look.timesWorn)}
          </Text>
        ) : null}
      </div>

      {query.isError ? (
        <ErrorText>{errorCopy(query.error)}</ErrorText>
      ) : query.isPending ? (
        <Skeleton shape="text" className="h-4 w-40" />
      ) : items.length === 0 ? (
        <Text size="small" tone="muted" italic>
          {copy.none}
        </Text>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((wear) => {
            const diff = wearDiff(
              wear.pieces,
              look.pieces.map((p) => ({ id: p.piece.id })),
              labelOf,
            );
            const date = longDate(wear.wornOn);
            return (
              <li
                key={wear.id}
                className="flex items-center gap-2 rounded-crisp border border-hairline bg-bg py-2 pr-1.5 pl-3"
              >
                <Link
                  href={`/plan/${wear.wornOn}`}
                  aria-label={copy.openDay(date)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-crisp focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                >
                  <Text size="small" className="shrink-0">
                    {dayMonth(wear.wornOn)}
                  </Text>
                  <Text size="caption" tone="faint" italic className="min-w-0 flex-1 truncate">
                    {diff.differs ? copy.diff(diff.instead, diff.without) : copy.asSaved}
                  </Text>
                  <Icon name="forward" size={15} className="shrink-0 text-ink-faint" />
                </Link>
                <IconButton
                  icon="close"
                  label={copy.remove(date)}
                  onClick={() => remove.mutate({ params: { id: look.id, date: wear.wornOn } })}
                />
              </li>
            );
          })}
        </ul>
      )}

      {/* A wear can be recorded after the fact; a day still ahead is a plan, not a wear. */}
      {adding ? (
        <form onSubmit={onAdd} className="flex flex-wrap items-end justify-end gap-2">
          <Field
            type="date"
            label={copy.addDateLabel}
            value={day}
            max={localToday()}
            onChange={(e) => setDay(e.target.value)}
          />
          <Button type="submit" variant="secondary" disabled={!day} loading={add.isPending}>
            {copy.add}
          </Button>
        </form>
      ) : (
        <div className="flex justify-end">
          <Button variant="quiet" onClick={() => setAdding(true)}>
            {copy.addDate}
          </Button>
        </div>
      )}
    </section>
  );
}
