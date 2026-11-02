'use client';

import type { DiaryDay, PlanEntry } from '@robes/contracts';
import { diary as copy } from '@robes/copy';
import { dayOotd } from '@robes/core/calendar';
import { Icon } from '@robes/icons/web';
import { IconButton } from '@robes/ui';
import Link from 'next/link';
import { LookTile } from '@/components/looks/look-tile';
import { imageSources } from '@/lib/image';

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The slot (design 3k, plan §1.5): the selected day's OOTD as one hero card, then the dashed Add
// look tile peeking at the edge; an empty day shows the tile alone, full width. Over the card:
// × takes the look off the day, the lookbook icon changes it from the drawer, and the +N stack
// of the day's other looks opens the day. The native twin is features/home/DaySlot.tsx.
export function DaySlot({
  day,
  dayWord,
  onAdd,
  onChange,
  onRemove,
}: {
  day: DiaryDay;
  // 'today' or the weekday, for the labels.
  dayWord: string;
  onAdd: () => void;
  onChange: (entry: PlanEntry) => void;
  onRemove: (entry: PlanEntry) => void;
}) {
  const ootd = dayOotd(day.entries);
  const others = day.entries.filter((e) => e !== ootd);
  return (
    <div
      data-testid="day-slot"
      data-state={ootd ? 'look' : 'empty'}
      className={`-mx-5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-11 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
        ootd ? '' : 'px-5'
      }`}
    >
      {ootd ? (
        <div className="w-full shrink-0 snap-center">
          <LookTile
            look={ootd.look}
            variant="ootd"
            sizes="(min-width: 640px) 560px, 80vw"
            href={`/look/${ootd.look.id}?day=${day.date}`}
            label={copy.slot.open(ootd.look.name)}
            testId="ootd-card"
            onImage={
              <>
                <button
                  type="button"
                  aria-label={copy.slot.change}
                  title={copy.slot.change}
                  onClick={() => onChange(ootd)}
                  className={`absolute bottom-3 left-3 z-10 flex size-9 items-center justify-center rounded-pill bg-bg/95 text-ink ${focus}`}
                >
                  <Icon name="book" size={15} />
                </button>
                {others.length ? (
                  <Stack entries={others} date={day.date} dayWord={dayWord} />
                ) : null}
              </>
            }
            corner={
              <IconButton
                icon="close"
                label={copy.slot.remove(ootd.look.name, dayWord)}
                onClick={() => onRemove(ootd)}
                className="size-7 bg-bg/50 text-ink/60 hover:bg-bg/80 hover:text-ink"
              />
            }
          />
        </div>
      ) : null}
      <AddLookTile dayWord={dayWord} onClick={onAdd} />
    </div>
  );
}

// The day's other looks, fanned at the corner of the OOTD: one door into the day.
function Stack({
  entries,
  date,
  dayWord,
}: {
  entries: PlanEntry[];
  date: string;
  dayWord: string;
}) {
  const rot = ['rotate(3deg)', 'rotate(-4deg)', 'rotate(6deg)'];
  return (
    <Link
      href={`/plan/${date}?from=today`}
      aria-label={copy.slot.moreLabel(entries.length, dayWord)}
      title={copy.slot.moreLabel(entries.length, dayWord)}
      data-testid="ootd-stack"
      className={`absolute right-3 bottom-3 z-10 flex flex-row-reverse items-end rounded-input ${focus}`}
    >
      {entries.slice(0, 3).map((e, i) => {
        const image = e.look.image ?? e.look.pieces.find((p) => p.piece.image)?.piece.image ?? null;
        const src = image ? imageSources(image.renditions) : null;
        return (
          <span
            key={e.id}
            style={{ transform: rot[i], zIndex: 10 - i, marginRight: i ? -30 : 0 }}
            className="relative aspect-[4/5] w-[58px] overflow-hidden rounded-input border-2 border-surface-raised bg-surface-sunk shadow-[0_6px_14px_-8px_color-mix(in_srgb,var(--color-ink)_45%,transparent)]"
          >
            {src ? (
              // biome-ignore lint/performance/noImgElement: a thumb of a rendition already sized
              <img src={src.src} alt="" className="size-full object-cover object-[50%_20%]" />
            ) : null}
          </span>
        );
      })}
    </Link>
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
