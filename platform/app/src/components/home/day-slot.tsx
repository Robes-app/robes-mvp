'use client';

import type { DiaryDay, Model, PlanEntry } from '@robes/contracts';
import { diary as copy, lookbook } from '@robes/copy';
import { dayOotd } from '@robes/core/calendar';
import { Icon } from '@robes/icons/web';
import { ActionDisc, ActionDiscs, Skeleton } from '@robes/ui';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { LookTile } from '@/components/looks/look-tile';
import { PHOTO_ACCEPT } from '@/lib/upload';
import { DraftTile } from './draft-tile';
import { ModelStack } from './model-stack';

const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

export interface DayActions {
  // Into a look (the last page): her photograph, her words (today and ahead only), her lookbook.
  onCapture: (file: File) => void;
  onDescribe: (() => void) | null;
  onPick: () => void;
  // Onto a look: Swap from the lookbook, Edit on its page (a link), × off the day.
  onSwap: (entry: PlanEntry) => void;
  onRemove: (entry: PlanEntry) => void;
  // The model under the day's looks (Felix ModelStack → ModelPicker, D10).
  onModel: () => void;
}

// The day on home (Felix 3a · 3k, D7): one page per look — the OOTD first, then the others — each
// the content width on the tile radius, Swap · Edit standing half over its foot and its name
// beneath; then the draft Robes is making for the day; and last her model with Capture · Describe
// · Pick, the way into another look (on an empty day the only page). Pager dots when there is
// more than one. The native twin is features/home/DaySlot.tsx.
export function DaySlot({
  day,
  today,
  dayWord,
  justSaved = null,
  model,
  actions,
  onAnother,
  anotherBusy = false,
}: {
  day: DiaryDay;
  today: string;
  // 'today' or the weekday, for the labels.
  dayWord: string;
  // The look just saved from the draft: its page says so for a moment.
  justSaved?: string | null;
  model: Model | undefined;
  actions: DayActions;
  onAnother: (lookId: string) => void;
  anotherBusy?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const ootd = dayOotd(day.entries);
  const looks = ootd ? [ootd, ...day.entries.filter((e) => e !== ootd)] : [];
  const draft = day.date >= today ? day.draft : null;
  const pages = looks.length + (draft ? 1 : 0) + 1;
  return (
    <div className="flex flex-col gap-4">
      <div
        ref={scroller}
        data-testid="day-slot"
        data-state={looks.length ? 'look' : draft ? 'draft' : 'empty'}
        onScroll={(e) => {
          const el = e.currentTarget;
          setPage(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-5 px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {looks.map((entry, i) => (
          <div
            key={entry.id}
            className="w-full shrink-0 snap-start"
            data-testid={i === 0 ? 'ootd-page' : `day-page-${entry.id}`}
          >
            <LookTile
              look={entry.look}
              variant="ootd"
              sizes="(min-width: 640px) 600px, 100vw"
              href={`/look/${entry.look.id}?day=${day.date}`}
              label={copy.slot.open(entry.look.name)}
              testId={i === 0 ? 'ootd-card' : `day-card-${entry.id}`}
              onImage={
                justSaved === entry.look.id ? (
                  <span
                    data-testid="saved-badge"
                    className="type-label absolute top-2.5 left-2.5 z-10 rounded-pill bg-surface-raised/95 px-2.5 py-1.5 text-accent-plan"
                  >
                    ✓ {lookbook.draft.badgeSaved}
                  </span>
                ) : null
              }
              corner={
                // Felix's 28 veil-mid disc with the × in ink-mute; its hit area 44.
                <button
                  type="button"
                  aria-label={copy.slot.remove(entry.look.name, dayWord)}
                  onClick={() => actions.onRemove(entry)}
                  className={`relative flex size-7 items-center justify-center rounded-pill bg-veil-mid text-ink-mute after:absolute after:-inset-2 after:content-[''] ${focus}`}
                >
                  <Icon name="close" size={12} />
                </button>
              }
            />
            <ActionDiscs>
              <ActionDisc
                icon="book"
                label={copy.discs.swap}
                ariaLabel={copy.discs.swapLabel(entry.look.name)}
                onClick={() => actions.onSwap(entry)}
                {...(i === 0 ? { testId: 'ootd-swap' } : {})}
              />
              <EditDisc
                href={`/looks/draft/${entry.look.id}?day=${day.date}`}
                name={entry.look.name}
                {...(i === 0 ? { testId: 'ootd-edit' } : {})}
              />
            </ActionDiscs>
            {/* Felix's caption: her look's name, sentence case, under the discs. */}
            <p className="type-meta mt-3 truncate text-center text-ink-muted">{entry.look.name}</p>
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
        <AddPage dayWord={dayWord} model={model} actions={actions} another={looks.length > 0} />
      </div>
      {pages > 1 ? <Pager pages={pages} page={Math.min(page, pages - 1)} /> : null}
    </div>
  );
}

// Edit goes to the look's page in Editing: a link that looks like a disc.
function EditDisc({ href, name, testId }: { href: string; name: string; testId?: string }) {
  return (
    <Link
      href={href}
      aria-label={copy.discs.editLabel(name)}
      data-testid={testId}
      className={`group flex flex-col items-center gap-2 rounded-pill ${focus}`}
    >
      <span className="flex size-14 items-center justify-center rounded-pill bg-surface-sunk text-ink-muted shadow-disc group-hover:opacity-90">
        <Icon name="pencil" size={19} />
      </span>
      <span className="type-label tracking-[0.16em] text-ink-muted">{copy.discs.edit}</span>
    </Link>
  );
}

// The way into a look: her model on the day's photograph, the model stack at its top left until
// her twin stands, Capture · Describe · Pick on its foot.
function AddPage({
  dayWord,
  model,
  actions,
  another,
}: {
  dayWord: string;
  model: Model | undefined;
  actions: DayActions;
  another: boolean;
}) {
  const stand = model?.stand;
  const portrait = stand?.imageUrl ?? null;
  return (
    <section
      aria-label={another ? copy.discs.add : undefined}
      data-testid="add-page"
      className="w-full shrink-0 snap-start"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-tile bg-surface-sunk">
        {portrait ? (
          // biome-ignore lint/performance/noImgElement: a signed portrait in a fixed frame
          <img src={portrait} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <Skeleton className="absolute inset-0 rounded-none" />
        )}
        {stand && stand.on !== 'twin' ? (
          <ModelStack portrait={portrait} onOpen={actions.onModel} />
        ) : null}
      </div>
      <ActionDiscs>
        <ActionDisc
          icon="capture"
          label={copy.discs.capture}
          ariaLabel={copy.discs.captureLabel(dayWord)}
          onFile={actions.onCapture}
          accept={PHOTO_ACCEPT}
          capture="environment"
          testId="disc-capture"
        />
        {actions.onDescribe ? (
          <ActionDisc
            icon="describe"
            label={copy.discs.describe}
            ariaLabel={copy.discs.describeLabel(dayWord)}
            onClick={actions.onDescribe}
            testId="disc-describe"
          />
        ) : null}
        <ActionDisc
          icon="book"
          label={copy.discs.pick}
          ariaLabel={copy.discs.pickLabel(dayWord)}
          onClick={actions.onPick}
          testId="disc-pick"
        />
      </ActionDiscs>
    </section>
  );
}

// The pager under the day (frame 3k): the current page an ink bar, the rest small cream dots.
// Decorative: each page names itself.
function Pager({ pages, page }: { pages: number; page: number }) {
  return (
    <div aria-hidden className="flex items-center justify-center gap-1.5" data-testid="day-pager">
      {Array.from({ length: pages }, (_, i) => i).map((i) => (
        <span
          key={i}
          className={`h-1 rounded-pill ${i === page ? 'w-4 bg-ink' : 'w-1 bg-cream400'}`}
        />
      ))}
    </div>
  );
}
