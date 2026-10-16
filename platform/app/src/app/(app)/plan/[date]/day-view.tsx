'use client';

import {
  queryKeys,
  useApi,
  useApiClient,
  useApiMutation,
  useUndoableMutation,
} from '@robes/api-client/react';
import type { PlanEntry } from '@robes/contracts';
import { plan, wardrobe } from '@robes/copy';
import { daySummary, longDate, monthLabel } from '@robes/core/calendar';
import { Icon } from '@robes/icons/web';
import { Eyebrow, IconButton, Skeleton, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { BackLink } from '@/components/back-link';
import { LookImage } from '@/components/looks/look-image';
import { localToday } from '@/lib/dates';
import { errorCopy } from '@/lib/error-copy';
import { LookPicker } from '../look-picker';
import { withoutEntry } from '../plan-cache';

const copy = plan.day;
const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The day page (legacy ff87e89): the date as eyebrow, her name for the day with the pencil, the
// looks on it, and the door to add one or several.
export function DayView({ date, from }: { date: string; from: 'plan' | 'today' }) {
  const client = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const today = localToday();
  const query = useApi('plan.get', { input: { from: date, days: 1 } });
  const [picking, setPicking] = useState(false);
  const [naming, setNaming] = useState(false);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.get') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });
  };
  const rename = useApiMutation('plan.update', {
    onError: (err) => toast({ message: errorCopy(err) }),
  });
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

  const entries: PlanEntry[] = query.data?.days[0]?.entries ?? [];
  const s = daySummary(entries);
  const words = entries.find((e) => e.activity?.trim())?.activity?.trim() ?? '';

  async function commitName(value: string) {
    setNaming(false);
    const next = value.trim() || null;
    if ((next ?? '') === words) return;
    // The day's name is what's on that day: every look on it carries it.
    await Promise.all(
      entries.map((e) =>
        rename.mutateAsync({ params: { id: e.id }, input: { activity: next } }).catch(() => null),
      ),
    );
    refresh();
  }

  const back =
    from === 'today'
      ? { href: '/', label: plan.today }
      : { href: '/plan', label: monthLabel(date.slice(0, 7)) };
  const section = date === today ? copy.filedToday : date < today ? copy.filed : copy.planned;

  return (
    <article className="flex flex-col gap-6">
      <BackLink href={back.href} label={copy.back(back.label)} />
      <header className="flex flex-col gap-2">
        <Eyebrow>{longDate(date)}</Eyebrow>
        <div className="flex items-center gap-2">
          {naming ? (
            <input
              // biome-ignore lint/a11y/noAutofocus: the pencil asked for this field
              autoFocus
              aria-label={copy.nameLabel}
              defaultValue={words}
              maxLength={120}
              placeholder={copy.name}
              onBlur={(e) => void commitName(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') setNaming(false);
              }}
              className="min-h-11 w-full max-w-md border-b border-border-control bg-transparent font-display text-3xl text-ink italic placeholder:text-ink-faint focus-visible:border-ink focus-visible:outline-none"
            />
          ) : (
            <h1
              className={`font-display text-3xl leading-tight italic ${s.name ? 'text-ink' : 'text-ink-faint'}`}
            >
              {s.name ?? copy.name}
            </h1>
          )}
          {/* A day takes a name once a look is on it: the name rides on its looks. */}
          {!naming && entries.length ? (
            <IconButton
              icon="pencil"
              label={s.name ? copy.rename : copy.name}
              onClick={() => setNaming(true)}
            />
          ) : null}
        </div>
      </header>

      <div className="flex items-baseline justify-between border-b border-hairline pb-2">
        <span className="font-sans text-[10px] tracking-[0.24em] text-ink-faint uppercase">
          {section}
        </span>
        <span className="font-sans text-xs text-ink-muted">
          {s.looks ? copy.stat(s.looks, s.pieces) : ''}
        </span>
      </div>

      {query.isError ? (
        <Text role="alert" tone="danger">
          {errorCopy(query.error)}
        </Text>
      ) : !query.data ? (
        <div aria-busy className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Skeleton className="aspect-[4/5]" />
          <Skeleton className="aspect-[4/5]" />
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {entries.map((entry, i) => (
            <li key={entry.id} className="relative">
              <Link
                href={`/look/${entry.look.id}`}
                className={`flex flex-col gap-2 rounded-crisp ${focus}`}
              >
                <LookImage look={entry.look} sizes="(min-width: 768px) 30vw, 50vw" />
                <span className="font-sans text-[9px] tracking-[0.18em] text-ink-faint uppercase">
                  {copy.lookEyebrow(i + 1)}
                </span>
                <span className="font-display text-xl leading-tight text-ink">
                  {entry.look.name}
                </span>
                <span className="font-sans text-xs text-ink-muted">
                  {plan.list.pieces(entry.look.pieces.length)}
                </span>
              </Link>
              <IconButton
                icon="close"
                label={copy.remove(entry.look.name)}
                onClick={() => unpin.mutate({ params: { id: entry.id } })}
                className="absolute top-1.5 right-1.5 bg-bg/90"
              />
            </li>
          ))}
          <li className={entries.length ? '' : 'col-span-full'}>
            <button
              type="button"
              onClick={() => setPicking(true)}
              className={`flex w-full items-center gap-4 rounded-crisp border border-dashed border-border-control p-4 text-left hover:border-ink ${
                entries.length ? 'aspect-[4/5] flex-col justify-center text-center' : ''
              } ${focus}`}
            >
              <Icon name={entries.length ? 'plus' : 'looks'} size={20} className="text-ink-muted" />
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="font-display text-lg text-ink">
                  {entries.length ? copy.addAnother : copy.choose}
                </span>
                <span className="font-sans text-xs text-ink-muted">
                  {entries.length ? copy.addAnotherHint : copy.chooseHint}
                </span>
              </span>
              {entries.length ? null : <Icon name="forward" size={16} className="text-ink-muted" />}
            </button>
          </li>
        </ul>
      )}
      <LookPicker
        date={picking ? date : null}
        title={s.name}
        onClose={() => {
          setPicking(false);
          refresh();
        }}
      />
    </article>
  );
}
