'use client';

import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { PlanEntry } from '@robes/contracts';
import { diary as copy, filters as filterCopy } from '@robes/copy';
import { weekdayDayMonth, weekdayLong } from '@robes/core/calendar';
import { lookFacets } from '@robes/core/filters';
import { pickerOrder } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import { buttonClasses, Heading, Sheet, Skeleton, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FilterRow } from '@/components/filters/filter-row';
import { FilterSheet } from '@/components/filters/filter-sheet';
import { useLookFilters } from '@/components/filters/use-look-filters';
import { LookTile } from '@/components/looks/look-tile';
import { dayQuestion, dayWordOf, drawerCta, drawerLine, type PickerMode } from '@/lib/diary';
import { errorCopy } from '@/lib/error-copy';

const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The Pick / Swap sheet (Front Door PRD rev 3 §4.5; design 3k): her saved looks for a day, the
// day's own looks ticked as Scheduled, the shared filter row and search under the question. From
// Pick (`add`) and from Swap on a look (`change`) alike she ticks one or several; ✓ applies. Past
// days file wears, never pins (the wear is the record); unticking takes a look off the day. One
// door for the Diary too: the day page's + Add a look. The native twin is
// mobile/src/features/plan/LookPicker.tsx.
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
  const [sheet, setSheet] = useState(false);
  const looks = useApi('looks.list', { input: { limit: 60 } }, { enabled: open });
  const day = useApi('plan.get', { input: { from: date ?? '', days: 1 } }, { enabled: open });
  const all = useMemo(() => (looks.data?.items ?? []).map(lookFacets), [looks.data]);
  const filters = useLookFilters(all);
  const { clear } = filters;
  useEffect(() => {
    if (open) {
      setPicks(null);
      setSheet(false);
      clear();
    }
  }, [open, clear]);
  const entries: PlanEntry[] = day.data?.days[0]?.entries ?? [];
  const onDay = entries.map((e) => e.look.id);
  // The day's looks start ticked; her taps move from there. Filtering only changes what shows:
  // a look ticked before a filter hid it is still applied on ✓.
  const chosen = picks ?? onDay;
  const changed = chosen.length !== onDay.length || chosen.some((id) => !onDay.includes(id));

  const toggle = (id: string) =>
    setPicks(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);

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

  const items = pickerOrder(filters.filtered, true);
  const question = date ? dayQuestion(date, today) : '';
  const cta = date
    ? drawerCta({ mode, date, today, picks: chosen.length, changed })
    : { label: '', ready: false };
  const eyebrow = date
    ? copy.drawer.eyebrow(date === today ? copy.today : weekdayLong(date), weekdayDayMonth(date))
    : '';
  return (
    <Sheet
      title={eyebrow}
      open={open}
      onOpenChange={(o) => (o ? undefined : onClose())}
      // × · TODAY · MON 2 NOV · ✓: the ✓ is grey until her picks change the day, then ink (PRD §4.5).
      done={{
        label: cta.ready ? cta.label : copy.drawer.done,
        onClick: () => void apply(),
        disabled: !cta.ready || saving,
        testId: 'drawer-done',
      }}
    >
      {!looks.data ? (
        <div aria-busy className="grid grid-cols-2 gap-2.5">
          <Skeleton className="aspect-[4/5]" />
          <Skeleton className="aspect-[4/5]" />
        </div>
      ) : all.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="font-display font-light text-2xl text-ink">{copy.drawer.empty}</p>
          <p className="font-sans text-ink-muted text-sm">{copy.drawer.emptyLine}</p>
          <Link href="/looks" className={buttonClasses({ variant: 'outline' })}>
            {copy.drawer.toLooks}
          </Link>
        </div>
      ) : (
        <div className="-mt-2 flex flex-col gap-3.5" data-testid="look-picker">
          <Heading level={2} size="md" className="leading-[1.15]">
            {question}
          </Heading>
          <FilterRow
            label={copy.drawer.search}
            sheetCount={filters.sheetCount}
            onOpenSheet={() => setSheet(true)}
            seasons={filters.state.seasons}
            onRemoveSeason={filters.toggleSeason}
            quick={filters.quick}
            active={filters.state.wearFor}
            onToggle={filters.toggleWear}
            allCount={filters.allCount}
            onAll={filters.clearWear}
          />
          <label className="flex h-10 items-center gap-2 rounded-pill border-[0.5px] border-rule-mid bg-surface-raised px-3.5">
            <Icon name="search" size={13} className="shrink-0 text-ink-muted" />
            <input
              type="search"
              value={filters.state.query}
              onChange={(e) => filters.setQuery(e.currentTarget.value)}
              placeholder={copy.drawer.search}
              aria-label={copy.drawer.search}
              className="min-w-0 flex-1 bg-transparent font-sans text-ink text-xs placeholder:text-ink-faint focus:outline-none"
            />
          </label>
          {items.length === 0 ? (
            <p className="py-6 text-center font-sans text-ink-muted text-xs">
              {filterCopy.noLooks}{' '}
              <button
                type="button"
                onClick={filters.clear}
                className={`border-ink-faint border-b text-ink ${focus}`}
              >
                {filterCopy.clear}
              </button>
            </p>
          ) : (
            <ul aria-label={question} className="grid grid-cols-2 gap-2.5">
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
          <FilterSheet
            open={sheet}
            onClose={() => setSheet(false)}
            sections={[
              {
                key: 'season',
                title: filterCopy.season,
                options: filters.seasonSection,
                selected: filters.state.seasons,
                onToggle: (v) => filters.toggleSeason(v as (typeof filters.state.seasons)[number]),
              },
              {
                key: 'wear',
                title: filterCopy.wearFor,
                options: filters.wearSection,
                selected: filters.state.wearFor,
                onToggle: filters.toggleWear,
              },
            ]}
            onClear={filters.clear}
            clearable={filters.active}
            cta={filterCopy.showLooks(filters.filtered.length)}
            ctaDisabled={filters.filtered.length === 0}
          />
        </div>
      )}
    </Sheet>
  );
}
