'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import { lookbook, plan } from '@robes/copy';
import { weekdayLong } from '@robes/core/calendar';
import { lookMatches, pickerOrder } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import { Button, buttonClasses, Pill, pillClasses, Sheet, Skeleton, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LookTile } from '@/components/looks/look-tile';
import { formatDay } from '@/lib/dates';
import { errorCopy } from '@/lib/error-copy';

const copy = plan.picker;
const BANDS = ['spring_summer', 'autumn_winter', 'year_round'] as const;
type Band = (typeof BANDS)[number];
const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The Add-a-look picker (legacy ff87e89, saved looks only since 2026-10-10): tap looks to tick
// them, add one or several at once; a look already on the day is shown, never offered twice.
export function LookPicker({
  date,
  title,
  onClose,
}: {
  date: string | null;
  title?: string | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const open = date !== null;
  const [picks, setPicks] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastWornFirst, setLastWornFirst] = useState(true);
  const [refining, setRefining] = useState(false);
  const [q, setQ] = useState('');
  const [bands, setBands] = useState<Band[]>([]);
  useEffect(() => {
    if (open) {
      setPicks([]);
      setRefining(false);
      setQ('');
      setBands([]);
    }
  }, [open]);
  const looks = useApi('looks.list', { input: { limit: 60 } }, { enabled: open });
  // A day takes saved looks only; the ones still waiting in Suggested are named, one tap away.
  const suggested = useApi(
    'looks.list',
    { input: { limit: 60, status: 'suggested' } },
    { enabled: open },
  );
  const day = useApi('plan.get', { input: { from: date ?? '', days: 1 } }, { enabled: open });
  const onDay = new Set(day.data?.days[0]?.entries.map((e) => e.look.id) ?? []);
  const pin = useApiMutation('plan.pin');

  async function add() {
    if (!date || picks.length === 0) return;
    setSaving(true);
    try {
      for (const id of picks) await pin.mutateAsync({ params: { id }, input: { dates: [date] } });
      toast({ message: copy.added(picks.length, weekdayLong(date)) });
      onClose();
    } catch (err) {
      toast({ message: errorCopy(err) });
    } finally {
      setSaving(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.get') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });
    }
  }

  const all = looks.data?.items ?? [];
  const filters = (q.trim() ? 1 : 0) + bands.length;
  const items = pickerOrder(
    all.filter(
      (l) => lookMatches(l, q) && (!bands.length || bands.includes(l.climateBand as Band)),
    ),
    lastWornFirst,
  );
  const suggN = suggested.data?.items.length ?? 0;
  return (
    <Sheet
      title={title || copy.title}
      eyebrow={date ? copy.eyebrow(formatDay(date)) : undefined}
      open={open}
      onOpenChange={(o) => (o ? undefined : onClose())}
      footer={
        items.length ? (
          picks.length ? (
            <Button variant="primary" loading={saving} onClick={() => void add()}>
              {copy.add(picks.length)}
            </Button>
          ) : (
            // Beta's foot: the hint waits in the place the Add button will take.
            <p className="flex min-h-12 w-full items-center justify-center rounded-pill border border-rule-mid px-4 font-sans text-ink-muted text-sm">
              {copy.hint}
            </p>
          )
        ) : undefined
      }
    >
      {!looks.data ? (
        <div aria-busy className="grid grid-cols-3 gap-3">
          <Skeleton className="aspect-[4/5]" />
          <Skeleton className="aspect-[4/5]" />
          <Skeleton className="aspect-[4/5]" />
        </div>
      ) : all.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          {suggN ? <SuggestedLine n={suggN} onGo={onClose} /> : null}
          <p className="font-display text-2xl font-light text-ink">
            {copy.emptyTitle} <em>{copy.emptyTitleEm}</em>
          </p>
          <p className="font-sans text-ink-muted text-sm">{copy.emptyBody}</p>
          <Link href="/looks" className={buttonClasses({ variant: 'secondary' })}>
            {copy.toLooks}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {suggN ? <SuggestedLine n={suggN} onGo={onClose} /> : null}
          <div className="flex flex-wrap items-center gap-2 border-b border-hairline pb-3">
            <span className="font-sans text-[10px] text-ink-faint uppercase tracking-[0.24em]">
              {copy.yourLooks}
            </span>
            <span className="font-display text-ink-faint text-sm italic">
              {plan.list.looks(all.length)}
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                aria-label={`${copy.sortLabel}: ${lastWornFirst ? copy.lastWornFirst : copy.firstWornFirst}`}
                onClick={() => setLastWornFirst((v) => !v)}
                className={`${pillClasses()} min-h-9 px-3 text-xs`}
              >
                {lastWornFirst ? copy.lastWornFirst : copy.firstWornFirst}
              </button>
              <button
                type="button"
                aria-expanded={refining}
                onClick={() => setRefining((v) => !v)}
                className={`${pillClasses({ selected: refining || filters > 0 })} min-h-9 px-3 text-xs`}
              >
                {filters ? copy.refineOn(filters) : copy.refine}
              </button>
            </span>
          </div>
          {refining ? (
            <div className="flex flex-col gap-3 rounded-soft border border-hairline bg-surface-raised p-3">
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.currentTarget.value)}
                placeholder={copy.search}
                aria-label={copy.search}
                className={`min-h-11 rounded-pill border border-rule-mid bg-surface-raised px-4 font-sans text-ink text-sm placeholder:text-ink-faint ${focus}`}
              />
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 font-sans text-[10px] text-ink-faint uppercase tracking-[0.18em]">
                  {lookbook.refine.season}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {BANDS.map((b) => (
                    <Pill
                      key={b}
                      selected={bands.includes(b)}
                      onClick={() =>
                        setBands(bands.includes(b) ? bands.filter((x) => x !== b) : [...bands, b])
                      }
                    >
                      {lookbook.refine.seasons[b]}
                    </Pill>
                  ))}
                </div>
              </fieldset>
              <div className="flex items-center justify-between">
                <Button
                  variant="quiet"
                  disabled={!filters}
                  onClick={() => {
                    setQ('');
                    setBands([]);
                  }}
                >
                  {copy.clear}
                </Button>
                <span className="font-display text-ink-faint text-sm italic">
                  {plan.list.looks(items.length)}
                </span>
              </div>
            </div>
          ) : null}
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-6 text-center">
              <p className="font-display text-ink text-xl">{copy.noneTitle}</p>
              <p className="font-sans text-ink-muted text-sm">{copy.noneBody}</p>
            </div>
          ) : (
            <ul aria-label={copy.yourLooks} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((look) => {
                const had = onDay.has(look.id);
                const on = picks.includes(look.id);
                return (
                  <li key={look.id} className="flex">
                    <LookTile
                      look={look}
                      sizes="160px"
                      className="flex-1"
                      selected={on}
                      dimmed={had}
                      disabled={had}
                      onSelect={() =>
                        setPicks((p) => (on ? p.filter((x) => x !== look.id) : [...p, look.id]))
                      }
                      meta={
                        had
                          ? copy.already
                          : look.lastWornOn
                            ? copy.lastWorn(formatDay(look.lastWornOn))
                            : copy.neverWorn
                      }
                      onImage={
                        had ? null : (
                          // Every tile carries its tick: hollow until picked, the check once it is.
                          <span
                            aria-hidden
                            className={`absolute top-2 right-2 z-10 flex size-6 items-center justify-center rounded-pill border bg-surface-raised text-ink ${
                              on ? 'border-selected-line' : 'border-rule-mid'
                            }`}
                          >
                            {on ? <Icon name="check" size={14} /> : null}
                          </span>
                        )
                      }
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Sheet>
  );
}

function SuggestedLine({ n, onGo }: { n: number; onGo: () => void }) {
  return (
    <Link
      href="/looks?tab=suggested"
      onClick={onGo}
      className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-soft border border-hairline bg-surface-raised px-4 py-3 text-left font-sans text-ink-muted text-sm hover:border-border-control ${focus}`}
    >
      {copy.suggested(n)}
      <Icon name="forward" size={14} />
    </Link>
  );
}
