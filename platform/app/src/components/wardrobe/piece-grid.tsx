'use client';

import { queryKeys, useApi, useApiClient, useApiMutation } from '@robes/api-client/react';
import type { ListPiecesInput, Piece } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import { rankCategories, type WardrobeLayout } from '@robes/core/wardrobe';
import {
  Button,
  buttonClasses,
  CardSkeleton,
  EmptyState,
  Pill,
  Sheet,
  Text,
  useToast,
} from '@robes/ui';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { anyReading, withPatch } from '@/lib/wardrobe';
import { AddCard, CardRow, type CardStatus, CardTile, StarButton } from './piece-card';
import { PieceImage } from './piece-image';
import { useWardrobeLayout } from './use-layout';
import { useRemovePiece } from './use-remove-piece';
import { AddCircle, CategoryTabs, CountRow, WardrobeHeader } from './wardrobe-header';

const PAGE_SIZE = 30;
const READING_REFRESH_MS = 2000;
const SKELETON_SLOTS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const SEASONS = ['spring_summer', 'autumn_winter', 'year_round'] as const;
type Season = (typeof SEASONS)[number];
type Category = NonNullable<ListPiecesInput['category']>;

function pieceStatus(piece: Piece): CardStatus {
  if (piece.status === 'reading') return { text: wardrobe.reading, warm: false };
  if (piece.status === 'failed') return { text: wardrobe.noPieceFound, warm: true };
  return piece.wearCount > 0
    ? { text: wardrobe.card.worn(piece.wearCount), warm: false }
    : { text: wardrobe.card.neverWorn, warm: true };
}

// Wardrobe › Pieces (legacy b4b051a + a268ef0/809b13e): the one header, then rows or tiles.
export function PieceGrid() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const remove = useRemovePiece();
  const [layout, setLayout] = useWardrobeLayout();
  const [category, setCategory] = useState<Category | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const filters = { ...(category ? { category } : {}), ...(season ? { seasonBand: season } : {}) };
  const summary = useApi('wardrobe.summary');
  const query = useInfiniteQuery({
    // Under the wardrobe.list route key so optimistic edits and invalidations reach it.
    queryKey: [...queryKeys.route('wardrobe.list'), 'infinite', filters],
    queryFn: ({ pageParam, signal }) =>
      client.call('wardrobe.list', {
        input: { limit: PAGE_SIZE, ...filters, ...(pageParam ? { cursor: pageParam } : {}) },
        signal,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    // Pieces fill in as their photos are read.
    refetchInterval: (q) => (anyReading(q.state.data?.pages) ? READING_REFRESH_MS : false),
  });
  const star = useApiMutation('wardrobe.update', {
    onSuccess: (piece) => {
      toast({ message: piece.heroPosition ? wardrobe.card.starred : wardrobe.card.unstarred });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') });
    },
    onError: (err) => {
      toast({ message: err.code === 'conflict' ? wardrobe.card.heroFull : errorCopy(err) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') });
    },
  });
  // The star fills at once; the server picks the Hero Rack place.
  const toggleStar = (piece: Piece) => {
    const on = piece.heroPosition === null;
    queryClient.setQueriesData(
      { queryKey: queryKeys.route('wardrobe.list') },
      withPatch(piece.id, { heroPosition: on ? 10 : null }),
    );
    star.mutate({ params: { id: piece.id }, input: { hero: on } });
  };
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

  const header = (
    <WardrobeHeader
      current="/wardrobe"
      add={<AddCircle href="/wardrobe/add" label={wardrobe.header.addPiece} />}
    />
  );

  if (query.isError) {
    return (
      <>
        {header}
        <Text role="alert" tone="danger">
          {errorCopy(query.error)}
        </Text>
      </>
    );
  }

  const pieces = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? null;
  const owned = summary.data?.total ?? null;
  const filtered = category !== null || season !== null;

  if (owned === 0 && !filtered) {
    return (
      <>
        {header}
        <EmptyState
          title={wardrobe.empty.title}
          body={wardrobe.empty.body}
          action={
            <Link href="/wardrobe/add" className={buttonClasses({ variant: 'primary' })}>
              {wardrobe.addPieces}
            </Link>
          }
        />
      </>
    );
  }

  const list = layout === 'list';
  return (
    <div className="flex flex-col gap-5">
      {header}
      <CategoryTabs
        categories={rankCategories(summary.data?.categories ?? [])}
        value={category}
        onChange={(c) => setCategory(c as Category | null)}
      />
      <CountRow
        count={total === null ? null : wardrobe.header.count(total)}
        filter={{ on: season !== null, onOpen: () => setFilterOpen(true) }}
        layout={layout}
        onLayout={setLayout}
      />
      {!query.data || !layout ? (
        <GridSkeleton />
      ) : pieces.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-6">
          <Text tone="muted">{wardrobe.filter.nothing}</Text>
          <Button
            variant="quiet"
            onClick={() => {
              setCategory(null);
              setSeason(null);
            }}
          >
            {wardrobe.filter.showEverything}
          </Button>
        </div>
      ) : (
        <ul
          aria-label={wardrobe.segments.pieces}
          className={
            list
              ? 'grid grid-cols-1 gap-2 md:grid-cols-[repeat(auto-fill,minmax(360px,1fr))] md:gap-x-3.5'
              : 'grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
          }
        >
          {pieces.map((piece, i) => (
            <li key={piece.id}>
              <PieceCard
                piece={piece}
                layout={list ? 'list' : 'grid'}
                priority={i < 4}
                onStar={() => toggleStar(piece)}
                onRemove={() => remove.mutate({ params: { id: piece.id } })}
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
      {isFetchingNextPage ? <GridSkeleton count={2} /> : null}
      <FilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        category={category}
        season={season}
        onApply={setSeason}
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
        removeLabel={wardrobe.removePiece(piece.label)}
        onRemove={onRemove}
      />
    );
  }
  return (
    <CardTile
      piece={piece}
      href={href}
      status={status}
      photo={
        <PieceImage
          piece={piece}
          priority={priority}
          sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
        />
      }
      action={
        <StarButton label={piece.label} on={piece.heroPosition !== null} onToggle={onStar} tile />
      }
    />
  );
}

// Filter (legacy Refine): the season, counted before she applies it.
function FilterSheet({
  open,
  onOpenChange,
  category,
  season,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  season: Season | null;
  onApply: (season: Season | null) => void;
}) {
  const [pick, setPick] = useState<Season | null>(season);
  useEffect(() => {
    if (open) setPick(season);
  }, [open, season]);
  const count = useApi(
    'wardrobe.list',
    {
      input: { limit: 1, ...(category ? { category } : {}), ...(pick ? { seasonBand: pick } : {}) },
    },
    { enabled: open },
  );
  return (
    <Sheet
      title={wardrobe.filter.title}
      open={open}
      onOpenChange={onOpenChange}
      footer={
        <>
          <Button
            variant="primary"
            onClick={() => {
              onApply(pick);
              onOpenChange(false);
            }}
          >
            {count.data ? wardrobe.filter.show(count.data.total) : wardrobe.filter.title}
          </Button>
          <Button variant="quiet" onClick={() => setPick(null)} disabled={pick === null}>
            {wardrobe.filter.clear}
          </Button>
        </>
      }
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-sans text-xs font-medium tracking-[0.18em] text-ink-muted uppercase">
          {wardrobe.filter.season}
        </legend>
        <div className="flex flex-wrap gap-2">
          {SEASONS.map((s) => (
            <Pill key={s} selected={pick === s} onClick={() => setPick(pick === s ? null : s)}>
              {wardrobe.filter.seasons[s]}
            </Pill>
          ))}
        </div>
      </fieldset>
    </Sheet>
  );
}

function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul aria-busy className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {SKELETON_SLOTS.slice(0, count).map((slot) => (
        <li key={slot}>
          <CardSkeleton />
        </li>
      ))}
    </ul>
  );
}
