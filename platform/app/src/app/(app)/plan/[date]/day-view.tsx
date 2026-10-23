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
import { ErrorText, Eyebrow, IconButton, Skeleton, Text, useToast } from '@robes/ui';
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
  const ahead = date >= today;
  const weather = useApi(
    'today.weather',
    { input: { date } },
    { enabled: ahead, staleTime: 3_600_000 },
  );
  const wx = ahead ? weather.data : null;
  const [picking, setPicking] = useState(false);
  const [naming, setNaming] = useState(false);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.get') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });
  };
  const rename = useApiMutation('plan.nameDay', {
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
  const dayName = query.data?.days[0]?.name ?? null;
  const s = daySummary(entries, dayName);
  const words = dayName ?? entries.find((e) => e.activity?.trim())?.activity?.trim() ?? '';

  async function commitName(value: string) {
    setNaming(false);
    const next = value.trim() || null;
    if ((next ?? '') === words) return;
    // The day keeps its name with or without looks; the looks on it carry it too (server-side).
    await rename.mutateAsync({ params: { date }, input: { name: next } }).catch(() => null);
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
          {/* Any day can be named, so she can plan a week before adding outfits. */}
          {!naming ? (
            <IconButton
              icon="pencil"
              label={s.name ? copy.rename : copy.name}
              onClick={() => setNaming(true)}
            />
          ) : null}
        </div>
        {wx ? (
          <div className="flex flex-col gap-1">
            <Text size="caption" tone="muted" className="font-medium uppercase tracking-[0.16em]">
              {[wx.city, wx.condition, wx.tempRange].filter(Boolean).join(' · ')}
            </Text>
            <Text size="small" tone="muted" italic>
              {copy.advice(wx.condition, wx.tempRange)}
            </Text>
          </div>
        ) : null}
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
        <ErrorText>{errorCopy(query.error)}</ErrorText>
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
                <span className="font-display text-lg text-ink-faint italic">
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
      {ahead ? (
        // Beta's floating door: a new look for this day, from the box on Today.
        <Link
          href={`/?dress=${date}`}
          className={`fixed right-4 bottom-24 z-30 inline-flex min-h-11 items-center gap-2 rounded-pill border border-border-control bg-bg px-5 font-display text-ink text-lg italic shadow-sm md:bottom-8 ${focus}`}
        >
          <Icon name="looks" size={18} />
          {copy.dress}
        </Link>
      ) : null}
    </article>
  );
}
