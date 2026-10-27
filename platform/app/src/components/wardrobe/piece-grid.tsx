'use client';

import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { ListPiecesInput, Piece } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import { COLOUR_FAMILIES } from '@robes/core/colour';
import { WEAR_SEEDS } from '@robes/core/taxonomy';
import { rankCategories, type WardrobeLayout } from '@robes/core/wardrobe';
import {
  Button,
  buttonClasses,
  CardSkeleton,
  EmptyState,
  ErrorText,
  Pill,
  Sheet,
  Text,
  useToast,
} from '@robes/ui';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { anyReading } from '@/lib/wardrobe';
import { FamilyTile } from './colour-field';
import { AddCard, CardRow, type CardStatus, CardTile, StarButton } from './piece-card';
import { PieceImage } from './piece-image';
import { useWardrobeLayout } from './use-layout';
import { useRemovePiece } from './use-remove-piece';
import { useStarPiece } from './use-star-piece';
import { AddCircle, CategoryTabs, CountRow, WardrobeHeader } from './wardrobe-header';

const PAGE_SIZE = 30;
const READING_REFRESH_MS = 2000;
const SKELETON_SLOTS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const SEASONS = ['spring_summer', 'autumn_winter', 'year_round'] as const;
type Season = (typeof SEASONS)[number];
type Category = NonNullable<ListPiecesInput['category']>;
// Filter (legacy Refine): one season, what she wears it for, one colour family, one brand.
type Refine = {
  season: Season | null;
  wear: string | null;
  family: string | null;
  brand: string | null;
};
const NO_REFINE: Refine = { season: null, wear: null, family: null, brand: null };
const refineInput = (r: Refine) => ({
  ...(r.season ? { seasonBand: r.season } : {}),
  ...(r.wear ? { wearFor: r.wear } : {}),
  ...(r.family ? { colourFamily: r.family } : {}),
  ...(r.brand ? { brand: r.brand } : {}),
});
const isRefined = (r: Refine) => Object.values(r).some((v) => v !== null);
// What she can pick to wear it for: the seeded words first, then any of her own.
const wearChoices = (own: readonly string[]) => [
  ...new Set([...WEAR_SEEDS.map((w) => w.label), ...own]),
];

function pieceStatus(piece: Piece): CardStatus {
  if (piece.status === 'reading') return { text: wardrobe.reading, warm: false };
  if (piece.status === 'failed') return { text: wardrobe.noPieceFound, warm: false, error: true };
  return piece.wearCount > 0
    ? { text: wardrobe.card.worn(piece.wearCount), warm: false }
    : { text: wardrobe.card.neverWorn, warm: true };
}

// Wardrobe › Pieces (legacy b4b051a + a268ef0/809b13e): the one header, then rows or tiles.
export function PieceGrid() {
  const client = useApiClient();
  const _queryClient = useQueryClient();
  const _toast = useToast();
  const remove = useRemovePiece();
  const [layout, setLayout] = useWardrobeLayout();
  const [category, setCategory] = useState<Category | null>(null);
  const [refine, setRefine] = useState<Refine>(NO_REFINE);
  const [filterOpen, setFilterOpen] = useState(false);
  const filters = { ...(category ? { category } : {}), ...refineInput(refine) };
  const refined = isRefined(refine);
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
        <ErrorText>{errorCopy(query.error)}</ErrorText>
      </>
    );
  }

  const pieces = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? null;
  const owned = summary.data?.total ?? null;
  const filtered = category !== null || refined;

  if (owned === 0 && !filtered) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <EmptyState
          title={wardrobe.empty.title}
          body={wardrobe.empty.body}
          action={
            <Link href="/wardrobe/add" className={buttonClasses({ variant: 'primary' })}>
              {wardrobe.empty.action}
            </Link>
          }
        />
      </div>
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
        filter={{ on: refined, onOpen: () => setFilterOpen(true) }}
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
              setRefine(NO_REFINE);
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
              : 'grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
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
        refine={refine}
        onApply={setRefine}
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
          mat
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

// Filter (legacy Refine): Season · Wear it for · Colour · Brand, counted before she applies them.
// The native twin is FilterSheet in mobile/src/features/wardrobe/WardrobeView.tsx.
function FilterSheet({
  open,
  onOpenChange,
  category,
  refine,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  refine: Refine;
  onApply: (refine: Refine) => void;
}) {
  const [pick, setPick] = useState<Refine>(refine);
  useEffect(() => {
    if (open) setPick(refine);
  }, [open, refine]);
  const summary = useApi('wardrobe.summary', undefined, { enabled: open });
  const count = useApi(
    'wardrobe.list',
    { input: { limit: 1, ...(category ? { category } : {}), ...refineInput(pick) } },
    { enabled: open },
  );
  const toggle = <K extends keyof Refine>(key: K, value: NonNullable<Refine[K]>) =>
    setPick({ ...pick, [key]: pick[key] === value ? null : value });
  const brands = summary.data?.brands ?? [];
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
          <Button variant="quiet" onClick={() => setPick(NO_REFINE)} disabled={!isRefined(pick)}>
            {wardrobe.filter.clear}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <FilterGroup legend={wardrobe.filter.season} first>
          <div className="flex flex-wrap gap-2">
            {SEASONS.map((s) => (
              <Pill key={s} selected={pick.season === s} onClick={() => toggle('season', s)}>
                {wardrobe.filter.seasons[s]}
              </Pill>
            ))}
          </div>
        </FilterGroup>
        <FilterGroup legend={wardrobe.filter.wearFor}>
          <div className="flex flex-wrap gap-2">
            {wearChoices(summary.data?.wearFor ?? []).map((w) => (
              <Pill key={w} selected={pick.wear === w} onClick={() => toggle('wear', w)}>
                {w}
              </Pill>
            ))}
          </div>
        </FilterGroup>
        <FilterGroup legend={wardrobe.filter.colour}>
          {/* The family as one quartered tile with its name beneath (legacy .rb-ref-fam). */}
          <div className="grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-6">
            {COLOUR_FAMILIES.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={pick.family === f.id}
                onClick={() => toggle('family', f.id)}
                className={`flex min-h-11 flex-col items-center gap-1.5 rounded-crisp border px-1 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
                  pick.family === f.id ? 'border-selected-line bg-selected' : 'border-transparent'
                }`}
              >
                <FamilyTile family={f} size={40} />
                <Text
                  as="span"
                  size="caption"
                  tone={pick.family === f.id ? 'default' : 'muted'}
                  className={pick.family === f.id ? 'font-medium' : undefined}
                >
                  {f.name}
                </Text>
              </button>
            ))}
          </div>
        </FilterGroup>
        {brands.length ? (
          <FilterGroup legend={wardrobe.filter.brand}>
            <select
              aria-label={wardrobe.filter.brand}
              value={pick.brand ?? ''}
              onChange={(e) => setPick({ ...pick, brand: e.target.value || null })}
              className="min-h-11 max-w-xs rounded-crisp border border-hairline bg-surface-raised px-3 text-ink text-sm focus-visible:outline-2 focus-visible:outline-focus-ring"
            >
              <option value="">{wardrobe.filter.allBrands}</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </FilterGroup>
        ) : null}
      </div>
    </Sheet>
  );
}

// One group of the Filter: its eyebrow, then its choices; a hairline above every group but the first.
function FilterGroup({
  legend,
  first = false,
  children,
}: {
  legend: string;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={first ? undefined : 'border-hairline border-t pt-5'}>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-sans text-ink-muted text-xs font-medium tracking-[0.18em] uppercase">
          {legend}
        </legend>
        {children}
      </fieldset>
    </div>
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
