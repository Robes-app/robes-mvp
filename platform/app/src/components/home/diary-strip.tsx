'use client';

import type { DiaryDay } from '@robes/contracts';
import { diary as copy } from '@robes/copy';
import { diaryPages, weekdayLong, weekdayShort } from '@robes/core/calendar';
import { useLayoutEffect, useRef } from 'react';

const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The strip (Front Door design 3k, plan 2026-11-02 §1.4): a pager of seven-day pages, today's page
// centred so three days either side show; swipe for the week before and after. A cell carries one
// mark per look — a ring when planned, a dot once worn — and a day gone by recedes to `warm-past`.
// Felix's WeekStrip (redline 7 Nov): today always keeps the warm fill, the day picked adds the
// warm edge, and either one's weekday is 500 in ink-soft; a worn mark is `warm-past` (D11).
// The native twin is mobile/src/features/home/DiaryStrip.tsx.
export function DiaryStrip({
  days,
  today,
  selected,
  onSelect,
}: {
  days: readonly DiaryDay[];
  today: string;
  selected: string;
  onSelect: (date: string) => void;
}) {
  const scroller = useRef<HTMLElement>(null);
  const pages = diaryPages(days);
  const home = Math.max(
    0,
    pages.findIndex((p) => p.some((d) => d.date === today)),
  );
  // Today's page is the one on screen first; a swipe reaches the others.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scrolled once, when the strip mounts
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.clientWidth * home;
  }, []);
  return (
    <section
      ref={scroller}
      aria-label={copy.strip.label}
      data-testid="diary-strip"
      className="-mx-5 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {pages.map((page, i) => (
        <ol
          key={page[0]?.date ?? i}
          aria-label={copy.strip.page(i)}
          className="flex w-full shrink-0 snap-start snap-always justify-between px-5 py-px"
        >
          {page.map((d) => (
            <li key={d.date} className="flex">
              <DayCell
                day={d}
                isToday={d.date === today}
                past={d.date < today}
                selected={d.date === selected}
                onSelect={() => onSelect(d.date)}
              />
            </li>
          ))}
        </ol>
      ))}
    </section>
  );
}

function DayCell({
  day,
  isToday,
  past,
  selected,
  onSelect,
}: {
  day: DiaryDay;
  isToday: boolean;
  past: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const worn = day.entries.some((e) => e.worn);
  const label = isToday ? copy.today : weekdayLong(day.date);
  // Worn: one filled dot. Planned: a ring per look, its fill the cell's own ground.
  const marks = worn ? [{ filled: true }] : day.entries.map(() => ({ filled: false }));
  // Today keeps its fill wherever the selection goes; the day picked is outlined (Felix 3a).
  const ground = isToday ? 'bg-selected' : 'bg-bg';
  const current = isToday || selected;
  const dim = past && !selected;
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-current={isToday ? 'date' : undefined}
      aria-label={copy.strip.day(label, day.entries.length, worn)}
      data-testid={`diary-day-${day.date}`}
      onClick={onSelect}
      className={`flex w-[43px] flex-col items-center gap-[5px] rounded-sm border pt-2 pb-[7px] ${ground} ${
        selected ? 'border-selected-line' : 'border-transparent'
      } ${focus}`}
    >
      <span
        className={`font-sans text-[9px] uppercase tracking-[0.1em] ${
          current
            ? 'font-medium text-ink-muted'
            : `font-normal ${dim ? 'text-warm-past' : 'text-ink-faint'}`
        }`}
      >
        {isToday ? copy.today : weekdayShort(day.date)}
      </span>
      <span className={`type-day-number ${dim ? 'text-warm-past' : 'text-ink'}`}>
        {Number(day.date.slice(8))}
      </span>
      <span aria-hidden className="flex h-[5px] pl-0.5">
        {marks.map((m, i) => (
          <i
            // biome-ignore lint/suspicious/noArrayIndexKey: identical marks
            key={i}
            // Worn: a solid warm-past dot. Planned: an ink-soft ring on white (the warm fill in the
            // today's cell); a plan left on a past day keeps its ring, never reading as worn.
            className={`-ml-0.5 box-border block size-[5px] rounded-pill ${
              m.filled
                ? 'bg-warm-past'
                : `border border-ink-muted ${isToday ? 'bg-selected' : 'bg-surface-raised'}`
            } ${isToday ? 'shadow-[0_0_0_1px_var(--color-selected)]' : 'shadow-[0_0_0_1px_var(--color-bg)]'}`}
          />
        ))}
      </span>
    </button>
  );
}
