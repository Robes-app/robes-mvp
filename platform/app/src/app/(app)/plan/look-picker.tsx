'use client';

import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { PlanEntry } from '@robes/contracts';
import { diary as copy, lookbook } from '@robes/copy';
import { weekdayDayMonth, weekdayLong } from '@robes/core/calendar';
import { lookMatches, lookWearFor, pickerOrder, wearForOptions } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import { Button, buttonClasses, Pill, pillClasses, Sheet, Skeleton, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LookTile } from '@/components/looks/look-tile';
import { dayQuestion, dayWordOf, drawerCta, drawerLine, type PickerMode } from '@/lib/diary';
import { errorCopy } from '@/lib/error-copy';

const BANDS = ['spring_summer', 'autumn_winter', 'year_round'] as const;
type Band = (typeof BANDS)[number];
const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The drawer (design 3k, plan §1.7): her saved looks for a day, the day's own looks ticked as
// Scheduled. From Pick Look (`add`) she ticks one or several; from the lookbook icon on the OOTD
// (`change`) a tap replaces the look. Past days file wears, never pins (the wear is the record);
// unticking takes a look off the day. One door for the Diary too: the day page's + Add a look.
// The native twin is mobile/src/features/plan/LookPicker.tsx.
export function LookPicker({
  date,
  today,
  mode = 'add',
  onClose,
  onChanged,
}: {
  date: string | null;
  today: string;
  mode?: PickerMode;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const open = date !== null;
  const [picks, setPicks] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastWornFirst, setLastWornFirst] = useState(true);
  const [refining, setRefining] = useState(false);
  const [q, setQ] = useState('');
  const [bands, setBands] = useState<Band[]>([]);
  const [wear, setWear] = useState<string[]>([]);
  useEffect(() => {
    if (open) {
      setPicks(null);
      setRefining(false);
      setQ('');
      setBands([]);
      setWear([]);
    }
  }, [open]);
  const looks = useApi('looks.list', { input: { limit: 60 } }, { enabled: open });
  const day = useApi('plan.get', { input: { from: date ?? '', days: 1 } }, { enabled: open });
  const entries: PlanEntry[] = day.data?.days[0]?.entries ?? [];
  const onDay = entries.map((e) => e.look.id);
  // The day's looks start ticked; her taps move from there.
  const chosen = picks ?? onDay;
  const changed = chosen.length !== onDay.length || chosen.some((id) => !onDay.includes(id));

  const toggle = (id: string) => {
    const on = chosen.includes(id);
    if (mode === 'change') setPicks(on ? [] : [id]);
    else setPicks(on ? chosen.filter((x) => x !== id) : [...chosen, id]);
  };

  async function apply() {
    if (!date || !changed) return;
    const past = date < today;
    const dayWord = dayWordOf(date, today);
    setSaving(true);
    try {
      const removed = entries.filter((e) => !chosen.includes(e.look.id));
      const added = chosen.filter((id) => !onDay.includes(id));
      for (const e of removed) {
        if (e.worn) await api.call('looks.unwear', { params: { id: e.look.id, date } });
        else await api.call('plan.unpin', { params: { id: e.id } });
      }
      for (const id of added) {
        if (past) await api.call('looks.wear', { params: { id }, input: { wornOn: date } });
        else await api.call('plan.pin', { params: { id }, input: { dates: [date] } });
      }
      toast({
        message:
          mode === 'add'
            ? copy.drawer.added(added.length, dayWord)
            : chosen.length === 0
              ? copy.drawer.cleared(dayWord)
              : past
                ? copy.drawer.worn(dayWord)
                : copy.drawer.changed(dayWord),
      });
      onChanged?.();
      onClose();
    } catch (err) {
      toast({ message: errorCopy(err) });
    } finally {
      setSaving(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.get') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
    }
  }

  const all = looks.data?.items ?? [];
  const filters = (q.trim() ? 1 : 0) + bands.length + wear.length;
  const wearOpts = wearForOptions(all);
  const items = pickerOrder(
    all.filter(
      (l) =>
        lookMatches(l, q) &&
        (!bands.length || bands.includes(l.climateBand as Band)) &&
        (!wear.length || lookWearFor(l).some((t) => wear.includes(t))),
    ),
    lastWornFirst,
  );
  const question = date ? dayQuestion(date, today) : '';
  const cta = date
    ? drawerCta({ mode, date, today, picks: chosen.length, changed })
    : { label: '', ready: false };
  return (
    <Sheet
      title={question}
      eyebrow={
        date
          ? copy.drawer.eyebrow(
              date === today ? copy.today : weekdayLong(date),
              weekdayDayMonth(date),
            )
          : undefined
      }
      open={open}
      onOpenChange={(o) => (o ? undefined : onClose())}
      footer={
        all.length ? (
          cta.ready ? (
            <Button variant="primary" loading={saving} onClick={() => void apply()}>
              {cta.label}
            </Button>
          ) : (
            // The foot waits where the button will stand, saying what a tap does.
            <p
              className="flex min-h-12 w-full items-center justify-center rounded-pill border border-rule-mid px-4 font-sans text-ink-muted text-sm"
              data-testid="drawer-idle"
            >
              {cta.label}
            </p>
          )
        ) : undefined
      }
    >
      {!looks.data ? (
        <div aria-busy className="grid grid-cols-2 gap-2.5">
          <Skeleton className="aspect-[4/5]" />
          <Skeleton className="aspect-[4/5]" />
        </div>
      ) : all.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="font-display text-2xl font-light text-ink">{copy.drawer.empty}</p>
          <p className="font-sans text-ink-muted text-sm">{copy.drawer.emptyLine}</p>
          <Link href="/looks" className={buttonClasses({ variant: 'secondary' })}>
            {copy.drawer.toLooks}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between border-b border-hairline pb-2.5">
            <span className="font-sans text-[9px] font-medium text-accent-warm uppercase tracking-[0.2em]">
              {copy.drawer.yourLooks}
            </span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`${copy.drawer.sortLabel}: ${lastWornFirst ? copy.drawer.lastWorn : copy.drawer.firstWorn}`}
                onClick={() => setLastWornFirst((v) => !v)}
                className={pillClasses({ size: 'sm' })}
              >
                {lastWornFirst ? copy.drawer.lastWorn : copy.drawer.firstWorn}
              </button>
              <button
                type="button"
                aria-expanded={refining}
                onClick={() => setRefining((v) => !v)}
                className={pillClasses({ selected: refining || filters > 0, size: 'sm' })}
              >
                {filters ? copy.drawer.refineOn(filters) : copy.drawer.refine}
              </button>
            </span>
          </div>
          {refining ? (
            <div className="flex flex-col gap-3.5 rounded-soft border border-hairline bg-surface-raised p-3.5">
              <label className="flex h-[38px] items-center gap-2 rounded-pill bg-surface-sunk px-3.5">
                <Icon name="search" size={12} className="shrink-0 text-ink-muted" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.currentTarget.value)}
                  placeholder={copy.drawer.search}
                  aria-label={copy.drawer.search}
                  className="min-w-0 flex-1 bg-transparent font-sans text-ink text-xs placeholder:text-ink-faint focus:outline-none"
                />
              </label>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 font-sans text-[9px] font-medium text-ink-muted uppercase tracking-[0.2em]">
                  {copy.drawer.season}
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {BANDS.map((b) => (
                    <Pill
                      key={b}
                      size="sm"
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
              {wearOpts.length ? (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 font-sans text-[9px] font-medium text-ink-muted uppercase tracking-[0.2em]">
                    {copy.drawer.wearFor}
                  </legend>
                  <div className="flex flex-wrap gap-1.5">
                    {wearOpts.map((t) => (
                      <Pill
                        key={t}
                        size="sm"
                        selected={wear.includes(t)}
                        onClick={() =>
                          setWear(wear.includes(t) ? wear.filter((x) => x !== t) : [...wear, t])
                        }
                      >
                        {t}
                      </Pill>
                    ))}
                  </div>
                </fieldset>
              ) : null}
            </div>
          ) : null}
          {items.length === 0 ? (
            <p className="py-6 text-center font-sans text-ink-muted text-xs">
              {copy.drawer.none}{' '}
              <button
                type="button"
                onClick={() => {
                  setQ('');
                  setBands([]);
                  setWear([]);
                }}
                className={`border-b border-ink-faint text-ink ${focus}`}
              >
                {copy.drawer.clear}
              </button>
            </p>
          ) : (
            <ul aria-label={copy.drawer.yourLooks} className="grid grid-cols-2 gap-2.5">
              {items.map((look) => {
                const had = onDay.includes(look.id);
                const on = chosen.includes(look.id);
                return (
                  <li key={look.id} className="flex">
                    <LookTile
                      look={look}
                      sizes="160px"
                      className="flex-1"
                      selected={on}
                      onSelect={() => toggle(look.id)}
                      meta={drawerLine(look, on, had)}
                      testId={`drawer-look-${look.id}`}
                      onImage={
                        // Every tile carries its tick: hollow until picked, the check once it is.
                        <span
                          aria-hidden
                          className={`absolute top-2 right-2 z-10 flex size-[22px] items-center justify-center rounded-pill border text-ink ${
                            on
                              ? 'border-selected-line bg-selected'
                              : 'border-surface-raised bg-surface-raised/70'
                          }`}
                        >
                          {on ? <Icon name="check" size={12} /> : null}
                        </span>
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
