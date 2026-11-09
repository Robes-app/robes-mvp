'use client';

import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { filters as filterCopy, wardrobe } from '@robes/copy';
import { SEASON_OPTIONS, type SeasonOption, WEAR_FOR_ALL } from '@robes/core/filters';
import { rankCategories, type WardrobeLayout } from '@robes/core/wardrobe';
import { Icon } from '@robes/icons/web';
import { Button, CardSkeleton, EmptyState, ErrorText, Text } from '@robes/ui';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BrandSelect } from '@/components/filters/brand-select';
import { FilterRow } from '@/components/filters/filter-row';
import { FilterSheet } from '@/components/filters/filter-sheet';
import { SwatchGrid } from '@/components/filters/swatch-grid';
import {
  useWardrobeFilters,
  type WardrobeFilters,
} from '@/components/filters/use-wardrobe-filters';
import { errorCopy } from '@/lib/error-copy';
import { anyReading } from '@/lib/wardrobe';
import { AddPiecesSheet } from './add/add-pieces-sheet';
import { DeletePieceDialog } from './delete-piece-dialog';
import { AddCard, CardRow, type CardStatus, CardTile, StarButton } from './piece-card';
import { PieceImage } from './piece-image';
import { useWardrobeLayout } from './use-layout';
import { useRemovePiece } from './use-remove-piece';
import { useStarPiece } from './use-star-piece';
import { AddCircle, CountRow, WardrobeHeader } from './wardrobe-header';

const PAGE_SIZE = 30;
const READING_REFRESH_MS = 2000;
const SKELETON_SLOTS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

function pieceStatus(piece: Piece): CardStatus {
  if (piece.status === 'reading') return { text: wardrobe.reading, warm: false };
  if (piece.status === 'failed') return { text: wardrobe.noPieceFound, warm: false, error: true };
  return piece.wearCount > 0
    ? { text: wardrobe.card.worn(piece.wearCount), warm: false }
    : { text: wardrobe.card.neverWorn, warm: true };
}

// One list for the wear-it-for section: the shared list, then her own tags.
export function wearChoicesOf(own: readonly string[]): string[] {
  const seen = new Set(WEAR_FOR_ALL.map((w) => w.toLowerCase()));
  const extra = own.filter((w) => !seen.has(w.toLowerCase()));
  return [...WEAR_FOR_ALL, ...extra];
}

// The wardrobe's filter sheet (Front Door PRD rev 3 §7.1a): SEASON and WEAR IT FOR as pills with
// no counts, COLOUR as the swatch grid, BRAND as the select. Filters apply live; the one button
// reads what they leave. Native twin: WardrobeFilterSheet in features/wardrobe/WardrobeView.tsx.
export function WardrobeFilterSheet({
  open,
  onClose,
  filters,
  brands,
  wearChoices,
  count,
}: {
  open: boolean;
  onClose: () => void;
  filters: WardrobeFilters;
  brands: readonly string[];
  wearChoices: readonly string[];
  count: number | null;
}) {
  return (
    <FilterSheet
      open={open}
      onClose={onClose}
      sections={[
        {
          key: 'season',
          title: filterCopy.season,
          counts: false,
          options: SEASON_OPTIONS.map((value) => ({
            value,
            label: filterCopy.seasons[value],
            count: 0,
          })),
          selected: filters.state.seasons,
          onToggle: (v) => filters.toggleSeason(v as SeasonOption),
        },
        {
          key: 'wear',
          title: filterCopy.wearFor,
          counts: false,
          options: wearChoices.map((value) => ({ value, label: value, count: 0 })),
          selected: filters.state.wearFor,
          onToggle: filters.toggleWear,
        },
        {
          key: 'colour',
          title: wardrobe.filter.colour,
          custom: <SwatchGrid selected={filters.state.families} onToggle={filters.toggleFamily} />,
        },
        ...(brands.length
          ? [
              {
                key: 'brand',
                title: wardrobe.filter.brand,
                custom: (
                  <BrandSelect
                    brands={brands}
                    value={filters.state.brand}
                    onChange={filters.setBrand}
                  />
                ),
              },
            ]
          : []),
      ]}
      onClear={filters.clearSheet}
      clearable={filters.sheetCount > 0}
      cta={filterCopy.showPieces(count ?? 0)}
      ctaDisabled={count === 0}
    />
  );
}

// Wardrobe › Owned (Front Door PRD rev 3 §7): the tabs, the filter row (Filter · All · the category
// chips with counts), the count row, then 3-up tiles or rows. The native twin is WardrobeView.tsx.
export function PieceGrid() {
  const client = useApiClient();
  const remove = useRemovePiece();
  // The row's swipe asks first, as the piece page does (R14).
  const [asking, setAsking] = useState<string | null>(null);
  const [layout, setLayout] = useWardrobeLayout();
  const filters = useWardrobeFilters();
  const [sheet, setSheet] = useState(false);
  // Every way in starts on the Add pieces sheet (Front Door PRD rev 3 §7.4): the three tiles
  // over the Wardrobe.
  const [adding, setAdding] = useState(false);
  // The chips count under the sheet's filters (the category itself set aside); the last answer
  // stands while the next loads, so the sheet's brand list never blinks away between picks.
  const summary = useApi(
    'wardrobe.summary',
    { input: filters.sheetInput },
    { placeholderData: (prev) => prev },
  );
  const query = useInfiniteQuery({
    // Under the wardrobe.list route key so optimistic edits and invalidations reach it.
    queryKey: [...queryKeys.route('wardrobe.list'), 'infinite', filters.input],
    queryFn: ({ pageParam, signal }) =>
      client.call('wardrobe.list', {
        input: { limit: PAGE_SIZE, ...filters.input, ...(pageParam ? { cursor: pageParam } : {}) },
        signal,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    // A filter change is a new query: the last page stands while the next loads, so the grid
    // never blinks (filters apply live, PRD rev 3 §2.5).
    placeholderData: (prev) => prev,
    // Pieces fill in as their photos are read.
    refetchInterval: (q) => (anyReading(q.state.data?.pages) ? READING_REFRESH_MS : false),
  });
  const { toggle: toggleStar } = useStarPiece();
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // "Other" isn't a place to browse to; its pieces stay under All (beta's sheet).
  const categories = useMemo(
    () =>
      rankCategories(summary.data?.categories ?? [])
        .filter((c) => c !== 'Other')
        .map((c) => ({
          value: c,
          label: c,
          count: summary.data?.categories.find((x) => x.category === c)?.count ?? 0,
        })),
    [summary.data],
  );
  const allCount = summary.data?.categories.reduce((n, c) => n + c.count, 0) ?? 0;
  const owned = summary.data?.total ?? null;
  const pieces = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? null;

  const header = (
    <WardrobeHeader
      current="/wardrobe"
      add={
        <AddCircle
          onClick={() => setAdding(true)}
          expanded={adding}
          label={wardrobe.header.addPiece}
        />
      }
    >
      {owned === 0 ? null : (
        <FilterRow
          label={wardrobe.header.categories}
          sheetCount={filters.sheetCount}
          onOpenSheet={() => setSheet(true)}
          seasons={[]}
          onRemoveSeason={() => undefined}
          quick={categories}
          active={filters.state.category ? [filters.state.category] : []}
          onToggle={filters.setCategory}
          allCount={allCount}
          onAll={() => filters.setCategory(null)}
        />
      )}
    </WardrobeHeader>
  );

  if (query.isError) {
    return (
      <>
        {header}
        <ErrorText>{errorCopy(query.error)}</ErrorText>
      </>
    );
  }

  if (owned === 0) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <EmptyState
          icon={
            <span className="flex size-16 items-center justify-center rounded-pill bg-surface-raised text-ink">
              <Icon name="wardrobe" size={22} />
            </span>
          }
          title={wardrobe.empty.title}
          body={wardrobe.empty.body}
          action={
            <Button variant="primary" onClick={() => setAdding(true)}>
              + {wardrobe.empty.action}
            </Button>
          }
        />
        <AddPiecesSheet open={adding} onClose={() => setAdding(false)} />
      </div>
    );
  }

  const list = layout === 'list';
  return (
    <div className="flex flex-col gap-5">
      {header}
      <CountRow
        count={total === null ? null : wardrobe.header.count(total)}
        layout={layout}
        onLayout={setLayout}
      />
      {!query.data || !layout ? (
        <GridSkeleton />
      ) : pieces.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-6">
          <Text tone="muted">{wardrobe.filter.nothing}</Text>
          <Button variant="quiet" onClick={filters.clear}>
            {wardrobe.filter.showEverything}
          </Button>
        </div>
      ) : (
        <ul
          aria-label={wardrobe.segments.pieces}
          className={
            list
              ? 'grid grid-cols-1 gap-2 md:grid-cols-[repeat(auto-fill,minmax(360px,1fr))] md:gap-x-3.5'
              : 'grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-3 lg:grid-cols-6'
          }
        >
          {pieces.map((piece, i) => (
            <li key={piece.id}>
              <PieceCard
                piece={piece}
                layout={list ? 'list' : 'grid'}
                priority={i < 6}
                onStar={() => toggleStar(piece)}
                onRemove={() => setAsking(piece.id)}
              />
            </li>
          ))}
          {hasNextPage ? null : (
            <li>
              <AddCard href="/wardrobe/add" layout={list ? 'list' : 'grid'} />
            </li>
          )}
        </ul>
      )}
      <div ref={sentinel} aria-hidden className="h-px" />
      {isFetchingNextPage ? <GridSkeleton count={3} /> : null}
      <WardrobeFilterSheet
        open={sheet}
        onClose={() => setSheet(false)}
        filters={filters}
        brands={summary.data?.brands ?? []}
        wearChoices={wearChoicesOf(summary.data?.wearFor ?? [])}
        count={total}
      />
      <AddPiecesSheet open={adding} onClose={() => setAdding(false)} />
      <DeletePieceDialog
        open={asking !== null}
        onDelete={() => {
          if (asking) remove.mutate({ params: { id: asking } });
          setAsking(null);
        }}
        onCancel={() => setAsking(null)}
      />
    </div>
  );
}

function PieceCard({
  piece,
  layout,
  priority,
  onStar,
  onRemove,
}: {
  piece: Piece;
  layout: WardrobeLayout;
  priority: boolean;
  onStar: () => void;
  onRemove: () => void;
}) {
  const href = `/piece/${piece.id}`;
  const status = pieceStatus(piece);
  if (layout === 'list') {
    return (
      <CardRow
        piece={piece}
        href={href}
        status={status}
        thumb={<PieceImage piece={piece} sizes="52px" priority={priority} />}
        action={
          <StarButton label={piece.label} on={piece.heroPosition !== null} onToggle={onStar} />
        }
        removeText={wardrobe.card.swipeDelete}
        removeLabel={wardrobe.deletePiece(piece.label)}
        onRemove={onRemove}
      />
    );
  }
  // The 3-up tile (PRD §2.4) carries no star: the Hero Rack is set on the piece's page.
  return (
    <CardTile
      piece={piece}
      href={href}
      status={status}
      compact
      photo={
        <PieceImage
          piece={piece}
          mat
          priority={priority}
          sizes="(min-width: 1024px) 16vw, (min-width: 768px) 25vw, 33vw"
        />
      }
    />
  );
}

function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul aria-busy className="grid grid-cols-3 gap-2 md:grid-cols-4">
      {SKELETON_SLOTS.slice(0, count).map((slot) => (
        <li key={slot}>
          <CardSkeleton />
        </li>
      ))}
    </ul>
  );
}
