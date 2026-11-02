'use client';

import {
  queryKeys,
  useApi,
  useApiClient,
  useApiMutation,
  useUndoableMutation,
} from '@robes/api-client/react';
import type { PlanEntry } from '@robes/contracts';
import { diary as copy, plan, wardrobe } from '@robes/copy';
import { longDate } from '@robes/core/calendar';
import { WEATHER_STALE_MS, weatherWord } from '@robes/core/weather';
import { Icon } from '@robes/icons/web';
import {
  ErrorText,
  Eyebrow,
  Heading,
  IconButton,
  InlineTitleField,
  Skeleton,
  useToast,
} from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { LookTile } from '@/components/looks/look-tile';
import { localToday } from '@/lib/dates';
import { errorCopy } from '@/lib/error-copy';
import { LookPicker } from '../look-picker';
import { withoutEntry } from '../plan-cache';

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The day page (Front Door design 3k, plan 2026-11-02 §1.10): the date as a rose eyebrow, her
// name for the day, the day's weather, then every look on it — the OOTD starred, the others a
// tap from leading — with × to take one off and a dashed door to add more. Native twin:
// mobile/src/features/plan/DayView.tsx.
export function DayView({ date }: { date: string }) {
  const client = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const today = localToday();
  const query = useApi('plan.get', { input: { from: date, days: 1 } });
  const weather = useApi('today.weather', { input: { date } }, { staleTime: WEATHER_STALE_MS });
  const wx = weather.data;
  const [picking, setPicking] = useState(false);
  const [naming, setNaming] = useState(false);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.get') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });
  };
  const rename = useApiMutation('plan.nameDay', {
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  const star = useApiMutation('plan.ootd', {
    onSuccess: refresh,
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
  const words = dayName ?? entries.find((e) => e.activity?.trim())?.activity?.trim() ?? '';
  // The day's title is hers (beta): never borrowed from the one look on it.
  const title = words || null;

  async function commitName(value: string) {
    setNaming(false);
    const next = value || null;
    if ((next ?? '') === words) return;
    await rename.mutateAsync({ params: { date }, input: { name: next } }).catch(() => null);
    refresh();
  }

  // A wear is the record (immutable): a worn look leaves the day through the drawer, not ×.
  const remove = (entry: PlanEntry) => {
    if (entry.worn) {
      void client
        .call('looks.unwear', { params: { id: entry.look.id, date } })
        .then(refresh)
        .catch((err) => toast({ message: errorCopy(err) }));
      return;
    }
    unpin.mutate({ params: { id: entry.id } });
  };

  return (
    <article className="flex flex-col gap-6" data-testid="day-page">
      <header className="flex flex-col gap-2.5">
        <Eyebrow className="text-accent-warm">{longDate(date)}</Eyebrow>
        <div className="flex items-center gap-2">
          {naming ? (
            <InlineTitleField
              value={words}
              label={copy.day.name}
              placeholder={copy.day.name}
              size="lg"
              italic
              onCommit={(v) => void commitName(v)}
              onCancel={() => setNaming(false)}
            />
          ) : (
            <Heading level={1} size="lg" italic tone={title ? 'default' : 'muted'}>
              {title ?? copy.day.name}
            </Heading>
          )}
          {/* Any day can be named, so she can plan a week before adding outfits. */}
          {!naming ? (
            <IconButton
              framed
              icon="pencil"
              label={title ? plan.day.rename : copy.day.name}
              onClick={() => setNaming(true)}
            />
          ) : null}
        </div>
        {wx ? (
          <p className="font-sans text-[11.5px] text-ink-muted" data-testid="day-weather">
            {copy.day.weather(wx.city, weatherWord(wx), wx.tempRange)}
          </p>
        ) : null}
      </header>

      <div className="flex items-baseline justify-between border-b border-hairline pb-2.5">
        <span className="font-sans text-[9px] font-medium tracking-[0.2em] text-ink-muted uppercase">
          {copy.day.looksFor}
        </span>
        <span className="font-sans text-[11px] text-ink-faint">
          {copy.day.count(entries.length)}
        </span>
      </div>

      {query.isError ? (
        <ErrorText>{errorCopy(query.error)}</ErrorText>
      ) : !query.data ? (
        <div aria-busy className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
          <Skeleton className="aspect-[4/5]" />
          <Skeleton className="aspect-[4/5]" />
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
          {entries.map((entry, i) => (
            <li key={entry.id} className="flex">
              <DayLook
                entry={entry}
                hero={i === 0}
                n={i + 1}
                onStar={() => star.mutate({ params: { date }, input: { entryId: entry.id } })}
                onRemove={() => remove(entry)}
              />
            </li>
          ))}
          <li className={entries.length ? 'flex' : 'col-span-full'}>
            <button
              type="button"
              onClick={() => setPicking(true)}
              data-testid="day-add"
              className={`flex w-full flex-1 flex-col items-center justify-center gap-1.5 rounded-[3px] border border-dashed border-selected-line bg-surface text-center hover:border-ink ${
                entries.length ? 'aspect-[4/5]' : 'min-h-40'
              } ${focus}`}
            >
              <Icon name="plus" size={20} className="text-ink" />
              <span className="font-sans text-[9px] font-medium tracking-[0.2em] text-ink uppercase">
                {copy.day.add}
              </span>
            </button>
          </li>
        </ul>
      )}
      <LookPicker
        date={picking ? date : null}
        today={today}
        mode="add"
        onClose={() => setPicking(false)}
        onChanged={refresh}
      />
    </article>
  );
}

// A look on the day: ★ marks the OOTD (position 0, the one that leads home); ☆ on the others
// makes them it; × takes a look off the day. Native twin: DayView.tsx LookCard.
function DayLook({
  entry,
  hero,
  n,
  onStar,
  onRemove,
}: {
  entry: PlanEntry;
  hero: boolean;
  n: number;
  onStar: () => void;
  onRemove: () => void;
}) {
  return (
    <LookTile
      look={entry.look}
      href={`/look/${entry.look.id}`}
      sizes="(min-width: 768px) 30vw, 50vw"
      eyebrow={hero ? copy.day.ootd : copy.day.look(n)}
      eyebrowTone={hero ? 'warm' : 'faint'}
      className={`flex-1 ${hero ? 'border-selected-line bg-selected' : ''}`}
      testId={hero ? 'day-ootd' : undefined}
      onImage={
        hero ? (
          <span
            aria-label={copy.day.isOotd}
            title={copy.day.isOotd}
            className="absolute top-2 left-2 z-10 flex size-[30px] items-center justify-center rounded-pill border border-selected-line bg-selected text-ink"
          >
            <Icon name="star" size={14} />
          </span>
        ) : (
          <button
            type="button"
            aria-label={copy.day.makeOotd(entry.look.name)}
            title={copy.day.makeOotd(entry.look.name)}
            onClick={onStar}
            className={`absolute top-2 left-2 z-10 flex size-[30px] items-center justify-center rounded-pill border border-rule-mid bg-surface-raised/95 text-ink-muted hover:text-ink ${focus}`}
          >
            <Icon name="star" size={14} />
          </button>
        )
      }
      corner={
        <IconButton
          icon="close"
          label={copy.day.takeOff(entry.look.name)}
          onClick={onRemove}
          className="size-7 border border-rule-mid bg-surface-raised text-ink-muted"
        />
      }
    />
  );
}
