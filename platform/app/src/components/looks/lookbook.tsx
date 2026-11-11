'use client';

import type { Look } from '@robes/contracts';
import { lookbook as copy, filters as filterCopy, nav } from '@robes/copy';
import { lookFacets } from '@robes/core/filters';
import { Icon } from '@robes/icons/web';
import { Button, CardSkeleton, EmptyState, ErrorText, Eyebrow, IconButton, Tabs } from '@robes/ui';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FilterRow } from '@/components/filters/filter-row';
import { FilterSheet } from '@/components/filters/filter-sheet';
import { useLookFilters } from '@/components/filters/use-look-filters';
import { NewLookBox } from '@/components/home/home-box';
import { errorCopy } from '@/lib/error-copy';
import { useLetGo, useLooksByStatus, useRestyle, useSaveLook } from '@/lib/look-states';
import { DiarySheet } from './diary-sheet';
import { DraftTile, SavedTile, SuggestedTile } from './look-tiles';
import { NewLookSheet } from './new-look-sheet';

export type LookbookTab = 'saved' | 'suggested';
const TABS = [copy.tabs.saved, copy.tabs.suggested] as const;
type TabLabel = (typeof TABS)[number];
const labelOf = (tab: LookbookTab): TabLabel =>
  tab === 'saved' ? copy.tabs.saved : copy.tabs.suggested;
const SKELETONS = ['a', 'b', 'c'] as const;

// The Lookbook (Front Door PRD rev 3 §5): SAVED · SUGGESTED as underline tabs with their glyphs
// and the + that opens New Look; one filter row (and sheet) shared by both tabs, its counts
// following the tab in view; the search; drafts as the In progress row; then the grid. With a
// pointer the search stands open (R15: the pull that reveals it is a touch gesture). The native
// twin is LooksView.tsx.
export function Lookbook({ tab }: { tab: LookbookTab }) {
  const router = useRouter();
  const saved = useLooksByStatus('saved');
  const drafts = useLooksByStatus('draft');
  const suggested = useLooksByStatus('suggested');
  const restyle = useRestyle();
  const letGo = useLetGo();
  const save = useSaveLook(undefined, 'suggested');
  const [newLook, setNewLook] = useState(false);
  const [sheet, setSheet] = useState(false);
  // The calendar on a card opens the same diary sheet, over the grid — she never leaves it.
  const [diary, setDiary] = useState<Look | null>(null);

  const current = tab === 'saved' ? saved : suggested;
  const all = useMemo(() => (current.data?.items ?? []).map(lookFacets), [current.data]);
  // One filter state for both tabs: switching Saved ↔ Suggested keeps it; the counts follow.
  const filters = useLookFilters(all);
  const items = filters.filtered;
  const draftItems = drafts.data?.items ?? [];
  return (
    <div className="flex flex-col gap-5">
      {/* The dock names the place; the page title is read to assistive tech (as Diary, Wardrobe). */}
      <h1 className="sr-only">{nav.looks}</h1>
      {/* Pinned under the header while the grid scrolls (TabScreen's toolbar on native). The
          header area carries the faint warm tint (PRD §5.1). */}
      <div className="sticky top-11 z-30 -mx-5 -mt-3.5 flex flex-col gap-3 bg-surface px-5 pt-3.5 pb-3 md:top-16 md:-mx-4 md:-mt-6 md:px-4 md:pt-6">
        <Tabs
          items={TABS}
          value={labelOf(tab)}
          onChange={(label) =>
            router.replace(label === copy.tabs.saved ? '/looks' : '/looks?tab=suggested')
          }
          label={copy.title}
          icons={{ [copy.tabs.saved]: 'bookmark', [copy.tabs.suggested]: 'looks' }}
          trailing={
            <IconButton
              framed
              icon="plus"
              label={copy.newLook}
              onClick={() => setNewLook(true)}
              data-testid="lookbook-new"
            />
          }
        />
        <FilterRow
          label={copy.search}
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
      </div>
      <label className="flex h-10 items-center gap-2 rounded-pill border-[0.5px] border-rule-mid bg-surface-raised px-3.5">
        <Icon name="search" size={13} className="shrink-0 text-ink-muted" />
        <input
          type="search"
          value={filters.state.query}
          onChange={(e) => filters.setQuery(e.currentTarget.value)}
          placeholder={copy.search}
          aria-label={copy.search}
          className="min-w-0 flex-1 bg-transparent font-sans text-ink text-xs placeholder:text-ink-faint focus:outline-none"
        />
      </label>
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
        filters.active ? (
          // A filter that matches nothing names it (PRD §5.1): the italic serif line.
          <p
            className="py-8 text-center font-display font-light text-ink text-xl italic"
            data-testid="lookbook-no-match"
          >
            {copy.noMatch}
          </p>
        ) : tab === 'saved' ? (
          draftItems.length ? null : (
            <EmptyState
              icon={
                <span className="flex size-16 items-center justify-center rounded-pill bg-surface-raised text-ink">
                  <Icon name="bookmark" size={22} />
                </span>
              }
              title={copy.savedEmpty.title}
              body={copy.savedEmpty.body}
              action={
                <Button variant="primary" onClick={() => setNewLook(true)}>
                  + {copy.newLook}
                </Button>
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
                  aspect="3:4"
                  priority={i < 3}
                  onDiary={() => setDiary(look)}
                  onDelete={() => letGo(look.id)}
                />
              ) : (
                <SuggestedTile
                  look={look}
                  aspect="3:4"
                  onRemove={() => letGo(look.id)}
                  onSwap={() => restyle.restyle(look.id)}
                  swapping={restyle.busyId === look.id}
                  onSave={() => save.mutate({ params: { id: look.id }, input: {} })}
                  saving={save.isPending && save.variables?.params.id === look.id}
                />
              )}
            </li>
          ))}
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
        cta={filterCopy.showLooks(items.length)}
        ctaDisabled={items.length === 0}
      />
      <NewLookSheet open={newLook} onClose={() => setNewLook(false)} />
      <DiarySheet look={diary} onClose={() => setDiary(null)} />
    </div>
  );
}
