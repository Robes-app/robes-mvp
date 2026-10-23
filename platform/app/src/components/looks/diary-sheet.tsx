'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import {
  diaryPick,
  longDate,
  monthGrid,
  monthLabel,
  monthOf,
  shiftMonth,
} from '@robes/core/calendar';
import { Icon } from '@robes/icons/web';
import { Button, Dialog, IconButton, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { formatDay, localToday } from '@/lib/dates';
import { errorCopy } from '@/lib/error-copy';

const CELL =
  'relative flex aspect-square flex-col items-center justify-center gap-1 rounded-soft font-sans text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Save opens the diary every time (legacy 0.2): beta's month, any day one tap, a day gone by
// records it as worn, and "I wore this today" beneath. Closing it writes nothing.
export function DiarySheet({ look, onClose }: { look: Look | null; onClose: () => void }) {
  const today = localToday();
  const [month, setMonth] = useState(() => monthOf(look?.dateHint ?? today));
  const [picked, setPicked] = useState<string | null>(null);
  const day = picked ?? look?.dateHint ?? today;
  const toast = useToast();
  const queryClient = useQueryClient();

  // The month's filed days, for the dots: one call per month, as the Plan page makes.
  const grid = monthGrid(month);
  const plan = useApi(
    'plan.get',
    { input: { from: grid.from, days: grid.days } },
    { enabled: look !== null },
  );
  const filled = new Set(
    (plan.data?.days ?? []).filter((d) => d.entries.length > 0).map((d) => d.date),
  );
  const pins = new Set(
    (plan.data?.days ?? [])
      .filter((d) => d.entries.some((e) => e.look.id === look?.id))
      .map((d) => d.date),
  );
  // This look's own wears count as filed days too, so a month shows its history.
  const worn = new Set(look?.lastWornOn ? [look.lastWornOn] : []);
  for (const d of worn) filled.add(d);

  const state = diaryPick(day, today, {
    pinned: pins.has(day),
    worn: worn.has(day),
    filed: filled.has(day),
  });

  const close = () => {
    setPicked(null);
    onClose();
  };
  const settle = (message: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.get') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
    toast({ message });
    close();
  };
  const pin = useApiMutation('plan.pin', {
    onSuccess: () => settle(copy.diary.inDiaryFor(look?.name ?? '', formatDay(day))),
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  const wear = useApiMutation('looks.wear', {
    onSuccess: (w) => settle(copy.diary.recordedOn(formatDay(w.wornOn))),
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  const busy = pin.isPending || wear.isPending;

  const act = () => {
    if (!look) return;
    if (state.action === 'recorded') return;
    if (state.action === 'record') {
      wear.mutate({ params: { id: look.id }, input: { wornOn: day } });
      return;
    }
    // Already pinned: the day page is where it lives, so go there rather than pin it twice.
    if (state.action === 'already') {
      close();
      window.location.assign(`/plan/${day}`);
      return;
    }
    pin.mutate({ params: { id: look.id }, input: { dates: [day], slot: 'day' } });
  };

  return (
    <Dialog
      open={look !== null}
      onOpenChange={(o) => {
        if (!o) close();
      }}
      eyebrow={copy.diary.eyebrow}
      title={copy.diary.title}
      description={look?.name}
      footer={
        <>
          <Button variant="quiet" onClick={close}>
            {copy.diary.notYet}
          </Button>
          <Button
            variant="primary"
            disabled={state.action === 'recorded'}
            loading={busy}
            onClick={act}
          >
            {copy.diary[state.action]}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-display text-ink text-lg">{monthLabel(month)}</span>
          <span className="flex items-center gap-1">
            <IconButton
              icon="back"
              label={copy.diary.prevMonth}
              onClick={() => setMonth(shiftMonth(month, -1))}
            />
            <IconButton
              icon="forward"
              label={copy.diary.nextMonth}
              onClick={() => setMonth(shiftMonth(month, 1))}
            />
          </span>
        </div>
        <div aria-hidden className="grid grid-cols-7 gap-1 text-center">
          {copy.diary.weekdays.map((w) => (
            <span key={w} className="font-sans text-ink-faint text-xs">
              {w}
            </span>
          ))}
        </div>
        <ol aria-busy={!plan.data} className="grid grid-cols-7 gap-1">
          {grid.cells.map((date, i) =>
            date === null ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: padding cells are fixed grid positions
              <li key={`pad-${i}`} aria-hidden />
            ) : (
              <li key={date}>
                <button
                  type="button"
                  aria-pressed={date === day}
                  aria-label={longDate(date)}
                  aria-current={date === today ? 'date' : undefined}
                  onClick={() => setPicked(date)}
                  className={`${CELL} w-full ${
                    date === day
                      ? 'border border-selected-line bg-selected'
                      : date === today
                        ? 'border border-hairline'
                        : 'border border-transparent'
                  } ${date < today ? 'text-ink-muted' : 'text-ink'}`}
                >
                  <span>{Number(date.slice(8))}</span>
                  {/* A filed day carries a dot, so her diary reads at a glance. */}
                  <span
                    aria-hidden
                    className={`size-1 rounded-pill ${filled.has(date) ? 'bg-accent-inspire' : ''}`}
                  />
                </button>
              </li>
            ),
          )}
        </ol>
        <p role="status" className="font-display text-base text-ink-muted italic">
          {copy.diary.picked(longDate(day), day === today, state.suffix)}
        </p>
        {worn.has(today) ? (
          <span className="flex items-center gap-1.5 font-sans text-ink-muted text-sm">
            <Icon name="check" size={14} />
            {copy.diary.woreTodayDone}
          </span>
        ) : (
          <Button
            variant="quiet"
            className="self-start"
            disabled={busy}
            onClick={() => {
              if (look) wear.mutate({ params: { id: look.id }, input: { wornOn: today } });
            }}
          >
            {copy.diary.woreToday}
          </Button>
        )}
      </div>
    </Dialog>
  );
}
