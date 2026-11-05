'use client';

import type { DiaryDay, PlanEntry } from '@robes/contracts';
import { diary as copy, lookbook } from '@robes/copy';
import { dayOotd } from '@robes/core/calendar';
import { Icon } from '@robes/icons/web';
import { IconButton } from '@robes/ui';
import { LookTile } from '@/components/looks/look-tile';
import { DraftTile } from './draft-tile';

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The slot (design 3k, plan 2026-11-02 §1.5; 2026-11-03 §7 D7): the selected day's looks as
// cards in one scroller — the OOTD first, then the others — then the draft Robes is making for
// the day (plan 2026-11-03 §1.2), then the dashed Add look tile peeking at the edge; an empty day
// shows the tile alone, full width. Over a card: × takes the look off the day, the lookbook icon
// changes it from the drawer. The native twin is features/home/DaySlot.tsx.
export function DaySlot({
  day,
  today,
  dayWord,
  justSaved = null,
  onAdd,
  onChange,
  onRemove,
  onAnother,
  anotherBusy = false,
}: {
  day: DiaryDay;
  today: string;
  // 'today' or the weekday, for the labels.
  dayWord: string;
  // The look just saved from the draft: its card says so for a moment.
  justSaved?: string | null;
  onAdd: () => void;
  onChange: (entry: PlanEntry) => void;
  onRemove: (entry: PlanEntry) => void;
  onAnother: (lookId: string) => void;
  anotherBusy?: boolean;
}) {
  const ootd = dayOotd(day.entries);
  const cards = ootd ? [ootd, ...day.entries.filter((e) => e !== ootd)] : [];
  const draft = day.date >= today ? day.draft : null;
  const scrolls = cards.length > 0 || draft !== null;
  return (
    <div
      data-testid="day-slot"
      data-state={cards.length ? 'look' : draft ? 'draft' : 'empty'}
      className={`-mx-5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
        scrolls ? 'px-11' : 'px-5'
      }`}
    >
      {cards.map((entry, i) => (
        <div key={entry.id} className="w-full shrink-0 snap-center">
          <LookTile
            look={entry.look}
            variant="ootd"
            sizes="(min-width: 640px) 560px, 80vw"
            href={`/look/${entry.look.id}?day=${day.date}`}
            label={copy.slot.open(entry.look.name)}
            testId={i === 0 ? 'ootd-card' : `day-card-${entry.id}`}
            onImage={
              <>
                <button
                  type="button"
                  aria-label={copy.slot.change}
                  title={copy.slot.change}
                  onClick={() => onChange(entry)}
                  className={`absolute bottom-3 left-3 z-10 flex size-9 items-center justify-center rounded-pill bg-bg/95 text-ink ${focus}`}
                >
                  <Icon name="book" size={15} />
                </button>
                {justSaved === entry.look.id ? (
                  <span
                    data-testid="saved-badge"
                    className="absolute top-2.5 left-2.5 z-10 rounded-pill bg-surface-raised/95 px-2.5 py-1.5 font-medium font-sans text-[9px] text-accent-plan uppercase tracking-[0.2em]"
                  >
                    ✓ {lookbook.draft.badgeSaved}
                  </span>
                ) : null}
              </>
            }
            corner={
              <IconButton
                icon="close"
                label={copy.slot.remove(entry.look.name, dayWord)}
                onClick={() => onRemove(entry)}
                className="size-7 bg-bg/50 text-ink/60 hover:bg-bg/80 hover:text-ink"
              />
            }
          />
        </div>
      ))}
      {draft ? (
        <DraftTile
          draft={draft}
          day={day}
          today={today}
          onAnother={onAnother}
          anotherBusy={anotherBusy}
        />
      ) : null}
      <AddLookTile dayWord={dayWord} onClick={onAdd} />
    </div>
  );
}

// The dashed tile: white on the warm dashed edge, a + in a raised circle, ADD LOOK beneath.
function AddLookTile({ dayWord, onClick }: { dayWord: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copy.slot.addLabel(dayWord)}
      data-testid="add-look"
      className={`flex w-full shrink-0 snap-center flex-col overflow-hidden rounded-[6px] border border-dashed border-selected-line bg-surface-raised text-left ${focus}`}
    >
      <span className="flex aspect-[4/5] items-center justify-center border-b border-dashed border-selected-line bg-surface">
        <span className="flex size-[52px] items-center justify-center rounded-pill border border-rule-mid bg-surface-raised text-ink shadow-[0_6px_16px_-6px_color-mix(in_srgb,var(--color-ink)_30%,transparent)]">
          <Icon name="plus" size={20} />
        </span>
      </span>
      <span className="flex min-h-[45px] items-center justify-center bg-surface px-3.5 font-sans text-[10px] font-medium uppercase tracking-[0.16em] text-ink-faint">
        {copy.slot.add}
      </span>
    </button>
  );
}
