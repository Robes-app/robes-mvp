'use client';

import type { Look } from '@robes/contracts';
import { lookbook as copy, nav } from '@robes/copy';
import { type LookSort, SORT_FROM, SORTS, sortLooks } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import {
  Button,
  buttonClasses,
  CardSkeleton,
  EmptyState,
  ErrorText,
  Eyebrow,
  IconButton,
  Pill,
  SegmentedControl,
} from '@robes/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { useLetGo, useLooksByStatus, useRestyle } from '@/lib/look-states';
import { DiarySheet } from './diary-sheet';
import { NewLookBox } from './look-prompt-box';
import { DraftTile, SavedTile, SuggestedTile } from './look-tiles';

export type LookbookTab = 'saved' | 'suggested';
const TABS = [
  { value: 'saved', label: copy.tabs.saved },
  { value: 'suggested', label: copy.tabs.suggested },
] as const;
const SKELETONS = ['a', 'b', 'c'] as const;
// The only axis a saved look can be narrowed by today; Wear-it-for and Vibe need look tags.
const SEASON_BANDS = ['spring_summer', 'autumn_winter', 'year_round'] as const;
type SeasonBandId = (typeof SEASON_BANDS)[number];

// A tool pill on the count row (beta's Last worn · Filter): 36px white on the fine edge, the
// label ink-muted, the hit area reaching 44px. The native twin is LooksView.tsx ToolPill.
function toolPill(expanded: boolean): string {
  return `relative inline-flex h-9 items-center gap-1.5 rounded-pill border bg-surface-raised px-3 font-sans text-xs text-ink-muted after:absolute after:inset-x-0 after:-inset-y-1 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
    expanded ? 'border-selected-line' : 'border-rule-mid'
  }`;
}

// The Lookbook (legacy F2–F7; native parity canvas 02 — the native twin is LooksView.tsx):
// Saved | Suggested pinned under the header, the italic count with Last worn · Filter, drafts as a
// small dashed In progress row, then the grid.
export function Lookbook({ tab }: { tab: LookbookTab }) {
  const router = useRouter();
  const saved = useLooksByStatus('saved');
  const drafts = useLooksByStatus('draft');
  const suggested = useLooksByStatus('suggested');
  const restyle = useRestyle();
  const letGo = useLetGo();
  // Beta opens on the looks she wore last.
  const [sort, setSort] = useState<LookSort>('lastWorn');
  const [sortOpen, setSortOpen] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [bands, setBands] = useState<SeasonBandId[]>([]);
  // The calendar on a card opens the same diary sheet, over the grid — she never leaves it.
  const [diary, setDiary] = useState<Look | null>(null);
  const refineId = useId();
  const tools = useRef<HTMLDivElement>(null);
  // A menu closes on the next tap outside it, like the prompt's + menu.
  useEffect(() => {
    if (!sortOpen) return;
    const away = (e: MouseEvent) => {
      if (!tools.current?.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [sortOpen]);
  const current = tab === 'saved' ? saved : suggested;
  const all = current.data?.items ?? [];
  const raw =
    tab === 'saved' && bands.length
      ? all.filter((l) => bands.includes(l.climateBand as SeasonBandId))
      : all;
  const sortable = tab === 'saved' && all.length >= SORT_FROM;
  const items = sortable ? sortLooks(raw, sort) : raw;
  const draftItems = drafts.data?.items ?? [];
  const count =
    tab === 'saved'
      ? [
          items.length ? copy.count.looks(items.length) : null,
          draftItems.length ? copy.count.inProgress(draftItems.length) : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : items.length
        ? copy.count.suggested(items.length)
        : '';
  return (
    <div className="flex flex-col gap-5">
      {/* The dock names the place; the page title is read to assistive tech (as Diary, Wardrobe). */}
      <h1 className="sr-only">{nav.looks}</h1>
      {/* Pinned under the header while the grid scrolls (TabScreen's toolbar on native). */}
      <div className="sticky top-11 z-30 -mx-5 -mt-3.5 flex items-center justify-between gap-3 bg-bg px-5 pt-3.5 pb-2 md:top-16 md:-mx-4 md:-mt-6 md:px-4 md:pt-6">
        <SegmentedControl
          label={copy.title}
          options={TABS}
          value={tab}
          onChange={(t) => router.replace(t === 'saved' ? '/looks' : '/looks?tab=suggested')}
        />
        {tab === 'saved' ? (
          <IconButton
            framed
            icon="plus"
            label={copy.newLook}
            onClick={() => router.push('/looks/new')}
          />
        ) : null}
      </div>
      {/* The count row holds its height on both tabs, so the grid never jumps on a switch. */}
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-3">
        {count ? (
          <p
            data-testid="looks-count"
            className="font-display text-[19px] font-light text-ink-faint italic"
          >
            {count}
          </p>
        ) : (
          <span />
        )}
        {sortable ? (
          <div ref={tools} className="relative flex flex-wrap items-center gap-1.5">
            {/* One pill naming the sort in play, opening the three — never three pills. */}
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={sortOpen}
              aria-label={`${copy.sort.label}: ${copy.sort[sort]}`}
              onClick={() => setSortOpen((o) => !o)}
              className={toolPill(sortOpen)}
            >
              <Icon name="sort" size={14} />
              {copy.sort[sort]}
            </button>
            <button
              type="button"
              aria-expanded={refineOpen}
              aria-controls={refineId}
              onClick={() => setRefineOpen(!refineOpen)}
              className={toolPill(refineOpen)}
            >
              <Icon name="filter" size={14} />
              {copy.refine.open}
              {bands.length ? (
                <>
                  {/* The dot is decorative; the state reaches a screen reader as words. */}
                  <span
                    aria-hidden
                    className="inline-block size-1.5 rounded-pill bg-accent-inspire align-middle"
                  />
                  <span className="sr-only">{copy.refine.on}</span>
                </>
              ) : null}
            </button>
            {sortOpen ? (
              <div
                role="menu"
                aria-label={copy.sort.label}
                className="absolute top-full right-0 z-10 mt-2 flex w-44 flex-col rounded-soft border border-hairline bg-surface-raised p-1 shadow-sm"
              >
                {SORTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setSort(s);
                      setSortOpen(false);
                    }}
                    className="flex items-center justify-between gap-2 rounded-crisp px-3 py-2 text-left font-sans text-ink text-sm hover:bg-surface-sunk focus-visible:outline-2 focus-visible:outline-focus-ring"
                  >
                    {copy.sort[s]}
                    {sort === s ? <Icon name="check" size={16} className="text-ink-muted" /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {refineOpen && sortable ? (
        <section
          id={refineId}
          aria-label={copy.refine.title}
          className="flex flex-col gap-3 rounded-soft border border-hairline bg-surface-raised p-4"
        >
          {/* Beta's drawer: FILTER with a quiet Clear at its right, the groups, then the count to
              close it on — a hairline pill, since filtering is not a commitment. */}
          <div className="flex items-center justify-between">
            <Eyebrow>{copy.refine.title}</Eyebrow>
            <Button variant="quiet" disabled={!bands.length} onClick={() => setBands([])}>
              {copy.refine.clear}
            </Button>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-sans text-[10px] text-accent-warm uppercase tracking-[0.18em]">
              {copy.refine.season}
            </legend>
            <div className="flex flex-wrap gap-2">
              {SEASON_BANDS.map((b) => (
                <Pill
                  key={b}
                  selected={bands.includes(b)}
                  onClick={() =>
                    setBands(bands.includes(b) ? bands.filter((x) => x !== b) : [...bands, b])
                  }
                >
                  {copy.refine.seasons[b]}
                </Pill>
              ))}
            </div>
          </fieldset>
          <div className="flex justify-end border-t border-hairline pt-3">
            <button type="button" onClick={() => setRefineOpen(false)} className={toolPill(false)}>
              {copy.refine.show(items.length)}
            </button>
          </div>
        </section>
      ) : null}
      {tab === 'saved' && draftItems.length ? (
        <section aria-labelledby="in-progress" className="flex flex-col gap-2.5">
          <Eyebrow id="in-progress">{copy.inProgress}</Eyebrow>
          {/* The row bleeds past the right gutter so the next draft peeks. */}
          <div className="-mr-5 flex gap-2.5 overflow-x-auto pr-5 pb-1 md:-mr-4 md:pr-4">
            {draftItems.map((l) => (
              <DraftTile key={l.id} look={l} />
            ))}
          </div>
          <div className="mt-3 h-px bg-hairline" />
        </section>
      ) : null}
      {current.isError ? (
        <ErrorText>{errorCopy(current.error)}</ErrorText>
      ) : !current.data ? (
        <ul aria-busy className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {SKELETONS.map((k) => (
            <li key={k}>
              <CardSkeleton />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        tab === 'saved' ? (
          draftItems.length ? null : (
            <EmptyState
              title={copy.savedEmpty.title}
              body={copy.savedEmpty.body}
              action={
                <Link href="/looks/new" className={buttonClasses({ variant: 'primary' })}>
                  {copy.newLook}
                </Link>
              }
            />
          )
        ) : (
          <div className="flex flex-col gap-4">
            <EmptyState title={copy.suggestedEmpty.title} body={copy.suggestedEmpty.body} />
            <NewLookBox />
          </div>
        )
      ) : (
        <ul aria-label={copy.tabs[tab]} className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {items.map((look, i) => (
            <li key={look.id}>
              {tab === 'saved' ? (
                <SavedTile
                  look={look}
                  priority={i < 3}
                  onDiary={() => setDiary(look)}
                  onDelete={() => letGo(look.id)}
                />
              ) : (
                <SuggestedTile
                  look={look}
                  onRemove={() => letGo(look.id)}
                  onSwap={() => restyle.restyle(look.id)}
                  swapping={restyle.busyId === look.id}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      <DiarySheet look={diary} onClose={() => setDiary(null)} />
    </div>
  );
}
