'use client';

import {
  queryKeys,
  useApi,
  useApiClient,
  useApiMutation,
  useUndoableMutation,
} from '@robes/api-client/react';
import type { Wish } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import { shade } from '@robes/core/colour';
import { countByCategory, formatPrice, rankCategories } from '@robes/core/wardrobe';
import { Icon } from '@robes/icons/web';
import {
  Button,
  buttonClasses,
  CardSkeleton,
  EmptyState,
  ErrorText,
  Text,
  useToast,
} from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FilterRow } from '@/components/filters/filter-row';
import { useWardrobeFilters } from '@/components/filters/use-wardrobe-filters';
import { errorCopy } from '@/lib/error-copy';
import { withoutId } from '@/lib/wardrobe';
import { BoughtButton, CardRow, type CardStatus, CardTile, HeartButton } from './piece-card';
import { WardrobeFilterSheet, wearChoicesOf } from './piece-grid';
import { PieceImage } from './piece-image';
import { useWardrobeLayout } from './use-layout';
import { AddCircle, CountRow, WardrobeHeader } from './wardrobe-header';

const copy = wardrobe.wishlist;

function wishStatus(wish: Wish): CardStatus {
  return {
    text: formatPrice(wish.price, wish.currency) ?? wardrobe.card.notYours(null),
    warm: true,
  };
}

// A wish under the wardrobe's filters, here in the browser: the list is small and whole. A wish
// carries no seasons or wear-for yet, so those sections leave it be (plan PR 3 note).
function wishMatches(
  wish: Wish,
  f: { category: string | null; families: readonly string[]; brand: string | null },
): boolean {
  if (f.category && wish.category !== f.category) return false;
  if (f.families.length) {
    const family = shade(wish.colourShade)?.family;
    if (!family || !f.families.includes(family)) return false;
  }
  if (f.brand && (wish.brand ?? wish.sourceLabel ?? '').toLowerCase() !== f.brand.toLowerCase())
    return false;
  return true;
}

// Wardrobe › Wishlist (Front Door PRD rev 3 §7.2): the same tabs, filter row and 3-up tiles as
// Owned; a wish shows its price, and the filled heart on its photograph lets it go. The list view
// keeps Bought and the remove. Native twin: WishlistView.tsx.
export function Wishlist() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const list = useApi('wishlist.list', { input: { limit: 100 } });
  const [layout, setLayout] = useWardrobeLayout();
  const filters = useWardrobeFilters();
  const [sheet, setSheet] = useState(false);
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.route('wishlist.list') }),
      queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') }),
      queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.summary') }),
    ]);

  const promote = useApiMutation('wishlist.promote', {
    onSuccess: (piece) => {
      toast({ message: copy.boughtToast(piece.label) });
      void refresh();
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  const remove = useUndoableMutation('wishlist.delete', {
    optimistic: (args) => [
      { queryKey: queryKeys.route('wishlist.list'), update: withoutId(args.params.id) },
    ],
    onError: (err) => toast({ message: errorCopy(err) }),
    undo: {
      onAvailable: (handle) =>
        toast({
          message: copy.removed,
          action: { label: wardrobe.undo, onAction: () => void handle.undo() },
        }),
      compensate: (args) => client.call('wishlist.restore', { params: { id: args.params.id } }),
    },
  });

  const items = list.data?.items ?? [];
  const sheetMatched = useMemo(
    () => items.filter((w) => wishMatches(w, { ...filters.state, category: null })),
    [items, filters.state],
  );
  const visible = useMemo(
    () => sheetMatched.filter((w) => wishMatches(w, filters.state)),
    [sheetMatched, filters.state],
  );
  const categories = useMemo(() => {
    const counts = countByCategory(sheetMatched);
    return rankCategories(counts).map((c) => ({
      value: c,
      label: c,
      count: counts.find((x) => x.category === c)?.count ?? 0,
    }));
  }, [sheetMatched]);
  // A wish's retailer counts as its brand (PRD §7.1a).
  const brands = useMemo(
    () =>
      [...new Set(items.map((w) => w.brand ?? w.sourceLabel))]
        .filter((b): b is string => !!b)
        .sort((a, b) => a.localeCompare(b, 'en-GB')),
    [items],
  );
  const list_ = layout === 'list';

  return (
    <div className="flex flex-col gap-5">
      <WardrobeHeader
        current="/wardrobe/wishlist"
        add={<AddCircle href="/wardrobe/add?to=wishlist" label={wardrobe.header.savePiece} />}
      >
        {items.length > 0 ? (
          <FilterRow
            label={wardrobe.header.categories}
            sheetCount={filters.sheetCount}
            onOpenSheet={() => setSheet(true)}
            seasons={[]}
            onRemoveSeason={() => undefined}
            quick={categories}
            active={filters.state.category ? [filters.state.category] : []}
            onToggle={filters.setCategory}
            allCount={sheetMatched.length}
            onAll={() => filters.setCategory(null)}
          />
        ) : null}
      </WardrobeHeader>
      {items.length > 0 ? (
        <CountRow
          count={wardrobe.header.wishCount(visible.length)}
          layout={layout}
          onLayout={setLayout}
        />
      ) : null}
      {list.isError ? (
        <ErrorText>{errorCopy(list.error)}</ErrorText>
      ) : !list.data || !layout ? (
        <div aria-busy className="grid grid-cols-3 gap-2 md:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={
            <span className="flex size-16 items-center justify-center rounded-pill bg-surface-raised text-ink">
              <Icon name="heart" size={22} />
            </span>
          }
          title={wardrobe.wishlistEmpty.title}
          body={wardrobe.wishlistEmpty.body}
          action={
            <Link
              href="/wardrobe/add?to=wishlist"
              className={buttonClasses({ variant: 'primary' })}
            >
              {wardrobe.header.savePiece}
            </Link>
          }
        />
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-6">
          <Text tone="muted">{wardrobe.filter.wishNothing}</Text>
          <Button variant="quiet" onClick={filters.clear}>
            {wardrobe.filter.showEverything}
          </Button>
        </div>
      ) : (
        <ul
          aria-label={wardrobe.segments.wishlist}
          className={
            list_
              ? 'grid grid-cols-1 gap-2 md:grid-cols-[repeat(auto-fill,minmax(360px,1fr))] md:gap-x-3.5'
              : 'grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-3 lg:grid-cols-6'
          }
        >
          {visible.map((wish) => (
            <li key={wish.id}>
              {list_ ? (
                <CardRow
                  piece={wish}
                  href={`/wardrobe/wishlist/${wish.id}`}
                  status={wishStatus(wish)}
                  thumb={<PieceImage piece={wish} sizes="52px" />}
                  action={
                    <BoughtButton
                      label={wish.label}
                      busy={promote.isPending && promote.variables?.params.id === wish.id}
                      onBought={() => promote.mutate({ params: { id: wish.id } })}
                    />
                  }
                  removeLabel={copy.remove(wish.label)}
                  onRemove={() => remove.mutate({ params: { id: wish.id } })}
                />
              ) : (
                <CardTile
                  piece={wish}
                  href={`/wardrobe/wishlist/${wish.id}`}
                  status={wishStatus(wish)}
                  compact
                  photo={
                    <PieceImage
                      piece={wish}
                      mat
                      sizes="(min-width: 1024px) 16vw, (min-width: 768px) 25vw, 33vw"
                    />
                  }
                  onImage={
                    <HeartButton
                      label={copy.unwish(wish.label)}
                      onClick={() => remove.mutate({ params: { id: wish.id } })}
                    />
                  }
                />
              )}
            </li>
          ))}
        </ul>
      )}
      <WardrobeFilterSheet
        open={sheet}
        onClose={() => setSheet(false)}
        filters={filters}
        brands={brands}
        wearChoices={wearChoicesOf([])}
        count={visible.length}
      />
    </div>
  );
}
