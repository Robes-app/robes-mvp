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
import { daySummary, longDate } from '@robes/core/calendar';
import { Icon } from '@robes/icons/web';
import {
  ErrorText,
  Eyebrow,
  Heading,
  IconButton,
  InlineTitleField,
  Skeleton,
  Text,
  useToast,
} from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useHerPhoto } from '@/components/looks/her-photo';
import { LookTile } from '@/components/looks/look-tile';
import { OnPhoto } from '@/components/looks/look-tiles';
import { localToday } from '@/lib/dates';
import { errorCopy } from '@/lib/error-copy';
import { LookPicker } from '../look-picker';
import { withoutEntry } from '../plan-cache';

const copy = plan.day;
const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The day page (legacy ff87e89): the date as eyebrow, her name for the day with the pencil, the
// looks on it, and the door to add one or several.
export function DayView({ date }: { date: string }) {
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
  // The day's title is hers (beta): never borrowed from the one look on it.
  const title = words || null;

  async function commitName(value: string) {
    setNaming(false);
    const next = value || null;
    if ((next ?? '') === words) return;
    // The day keeps its name with or without looks; the looks on it carry it too (server-side).
    await rename.mutateAsync({ params: { date }, input: { name: next } }).catch(() => null);
    refresh();
  }

  const section = date === today ? copy.filedToday : date < today ? copy.filed : copy.planned;

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Eyebrow>{longDate(date)}</Eyebrow>
        <div className="flex items-center gap-2">
          {naming ? (
            <InlineTitleField
              value={words}
              label={copy.name}
              placeholder={copy.name}
              size="lg"
              italic
              onCommit={(v) => void commitName(v)}
              onCancel={() => setNaming(false)}
            />
          ) : (
            <Heading level={1} size="lg" italic tone={title ? 'default' : 'faint'}>
              {title ?? copy.name}
            </Heading>
          )}
          {/* Any day can be named, so she can plan a week before adding outfits. */}
          {!naming ? (
            <IconButton
              framed
              icon="pencil"
              label={title ? copy.rename : copy.name}
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
          <Skeleton className="aspect-[3/4]" />
          <Skeleton className="aspect-[3/4]" />
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {entries.map((entry, i) => (
            <li key={entry.id} className="flex">
              <DayLook
                entry={entry}
                n={i + 1}
                onLanded={refresh}
                onRemove={() => unpin.mutate({ params: { id: entry.id } })}
              />
            </li>
          ))}
          <li className={entries.length ? 'flex' : 'col-span-full'}>
            {entries.length ? (
              // Beta's slot for another moment: as tall as the card beside it, everything centred.
              <button
                type="button"
                onClick={() => setPicking(true)}
                className={`flex min-h-56 w-full flex-1 flex-col items-center justify-center gap-2 rounded-soft border border-dashed border-rule-mid bg-surface p-4 text-center hover:border-ink ${focus}`}
              >
                <Icon name="plus" size={18} className="text-ink-muted" />
                <span className="font-sans text-[10px] tracking-[0.22em] text-ink uppercase">
                  {copy.addAnother}
                </span>
                <span className="font-display text-ink-faint text-sm italic">
                  {copy.addAnotherHint}
                </span>
              </button>
            ) : (
              // On an empty day, one white door to her looks, its icon in a cream circle.
              <button
                type="button"
                onClick={() => setPicking(true)}
                className={`flex w-full items-center gap-4 rounded-soft border border-hairline bg-surface-raised p-4 text-left hover:border-border-control ${focus}`}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-surface-sunk text-ink-muted">
                  <Icon name="looks" size={18} />
                </span>
                <span className="flex flex-1 flex-col gap-1">
                  <span className="font-sans text-base text-ink">{copy.choose}</span>
                  <span className="font-display text-base text-ink-faint italic">
                    {copy.chooseHint}
                  </span>
                </span>
                <Icon name="forward" size={16} className="text-ink-muted" />
              </button>
            )}
          </li>
        </ul>
      )}
      <LookPicker
        date={picking ? date : null}
        title={title}
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

// A look on the day: ✕ takes it off the day; the camera on the photograph adds her photograph of
// it (beta's day card), kept on the LOOK — ↻ replaces it while her photograph is the record.
// Native twin: mobile/src/features/plan/DayView.tsx LookCard.
function DayLook({
  entry,
  n,
  onLanded,
  onRemove,
}: {
  entry: PlanEntry;
  n: number;
  onLanded: () => void;
  onRemove: () => void;
}) {
  const photo = useHerPhoto(entry.look, onLanded);
  const camera = !photo.hasPhoto || entry.look.record === 'photo';
  return (
    <>
      <LookTile
        look={entry.look}
        href={`/look/${entry.look.id}`}
        sizes="(min-width: 768px) 30vw, 50vw"
        aspect="3:4"
        eyebrow={copy.lookEyebrow(n)}
        badge={entry.worn ? copy.worn : null}
        meta={plan.list.pieces(entry.look.pieces.length)}
        className="flex-1"
        onImage={
          camera ? (
            <div className="absolute right-2 bottom-2">
              <OnPhoto
                icon={photo.hasPhoto ? 'swap' : 'camera'}
                label={photo.label}
                size={36}
                disabled={photo.busy}
                onClick={photo.pick}
              />
            </div>
          ) : null
        }
        corner={
          <IconButton
            icon="close"
            label={copy.remove(entry.look.name)}
            onClick={onRemove}
            className="bg-bg/90"
          />
        }
      />
      {photo.input}
    </>
  );
}
