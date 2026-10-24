'use client';

import type { Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { type LookSort, SORT_FROM, SORTS, sortLooks } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import {
  Button,
  buttonClasses,
  CardSkeleton,
  EmptyState,
  ErrorText,
  Pill,
  pillClasses,
  SegmentedControl,
  Text,
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

// The Lookbook (legacy F2–F7): Saved | Suggested, the count line beneath, + on Saved alone;
// drafts lead Saved as an In progress rail.
export function Lookbook({ tab }: { tab: LookbookTab }) {
  const router = useRouter();
  const saved = useLooksByStatus('saved');
  const drafts = useLooksByStatus('draft');
  const suggested = useLooksByStatus('suggested');
  const restyle = useRestyle();
  const letGo = useLetGo();
  const [sort, setSort] = useState<LookSort>('newest');
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label={copy.title}
          options={TABS}
          value={tab}
          onChange={(t) => router.replace(t === 'saved' ? '/looks' : '/looks?tab=suggested')}
        />
        {tab === 'saved' ? (
          // Beta's masthead: a circle, not a worded pill — the control beside it is the name.
          <Link
            href="/looks/new"
            aria-label={copy.newLook}
            title={copy.newLook}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-pill border border-border-control text-ink-muted hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2"
          >
            <Icon name="plus" size={18} />
          </Link>
        ) : null}
      </div>
      {/* The count row holds its height on both tabs, so the grid never jumps on a switch. */}
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
        {count ? (
          <Text size="small" tone="muted" data-testid="looks-count">
            {count}
          </Text>
        ) : (
          <span />
        )}
        {sortable ? (
          <div ref={tools} className="relative flex flex-wrap items-center gap-2">
            {/* One pill naming the sort in play, opening the three — never three pills. */}
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={sortOpen}
              aria-label={`${copy.sort.label}: ${copy.sort[sort]}`}
              onClick={() => setSortOpen((o) => !o)}
              className={pillClasses({ selected: sortOpen })}
            >
              <Icon name="sort" size={16} />
              {copy.sort[sort]}
            </button>
            <button
              type="button"
              aria-expanded={refineOpen}
              aria-controls={refineId}
              onClick={() => setRefineOpen(!refineOpen)}
              className={pillClasses({ selected: refineOpen })}
            >
              <Icon name="filter" size={16} />
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
                className="absolute top-full right-0 z-10 mt-2 flex w-44 flex-col rounded-soft border border-hairline bg-surface p-1 shadow-sm"
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
          className="flex flex-col gap-3 rounded-soft border border-hairline bg-surface p-4"
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="font-sans text-ink-faint text-xs uppercase tracking-[0.18em]">
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="quiet" disabled={!bands.length} onClick={() => setBands([])}>
              {copy.refine.clear}
            </Button>
            <Button variant="secondary" onClick={() => setRefineOpen(false)}>
              {copy.refine.show(items.length)}
            </Button>
          </div>
        </section>
      ) : null}
      {tab === 'saved' && draftItems.length ? (
        <section aria-labelledby="in-progress" className="flex flex-col gap-2">
          <Text id="in-progress" size="caption" tone="muted" className="uppercase tracking-wider">
            {copy.inProgress}
          </Text>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {draftItems.map((l) => (
              <DraftTile key={l.id} look={l} />
            ))}
          </div>
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
