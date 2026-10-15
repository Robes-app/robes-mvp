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
import { countByCategory, formatPrice, rankCategories } from '@robes/core/wardrobe';
import { Button, CardSkeleton, EmptyState, Field, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useRef, useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { withoutId } from '@/lib/wardrobe';
import { BoughtButton, CardRow, type CardStatus, CardTile } from './piece-card';
import { PieceImage } from './piece-image';
import { useWardrobeLayout } from './use-layout';
import { AddCircle, CategoryTabs, CountRow, WardrobeHeader } from './wardrobe-header';

const copy = wardrobe.wishlist;

function wishStatus(wish: Wish): CardStatus {
  return { text: wardrobe.card.notYours(formatPrice(wish.price, wish.currency)), warm: true };
}

// Wardrobe › Wishlist: the same header, tabs and card as the pieces (legacy 809b13e R5).
export function Wishlist() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const list = useApi('wishlist.list', { input: { limit: 100 } });
  const [layout, setLayout] = useWardrobeLayout();
  const [category, setCategory] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const field = useRef<HTMLDivElement>(null);
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.route('wishlist.list') }),
      queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') }),
      queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.summary') }),
    ]);

  const create = useApiMutation('wishlist.create', {
    onSuccess: () => {
      setLabel('');
      void refresh();
    },
  });
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

  function submit(event: FormEvent) {
    event.preventDefault();
    // The form stays open while she keeps adding.
    setAdding(true);
    if (label.trim()) create.mutate({ input: { label: label.trim() } });
  }

  const items = list.data?.items ?? [];
  const showForm = adding || (list.data !== undefined && items.length === 0);
  const visible = category ? items.filter((w) => w.category === category) : items;
  const list_ = layout === 'list';

  return (
    <div className="flex flex-col gap-5">
      <WardrobeHeader
        current="/wardrobe/wishlist"
        add={
          <AddCircle
            label={wardrobe.header.savePiece}
            expanded={showForm}
            onClick={() => {
              setAdding(true);
              // The field mounts with the form; focus it on the next frame.
              requestAnimationFrame(() => field.current?.querySelector('input')?.focus());
            }}
          />
        }
      />
      {showForm ? (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <div ref={field} className="min-w-64 flex-1">
            <Field
              label={copy.addLabel}
              name="wish"
              placeholder={copy.addPlaceholder}
              maxLength={120}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              error={create.isError ? errorCopy(create.error) : null}
            />
          </div>
          <Button type="submit" disabled={!label.trim()} loading={create.isPending}>
            {copy.add}
          </Button>
        </form>
      ) : null}
      {items.length > 0 ? (
        <>
          <CategoryTabs
            categories={rankCategories(countByCategory(items))}
            value={category}
            onChange={setCategory}
          />
          <CountRow
            count={wardrobe.header.wishCount(visible.length)}
            layout={layout}
            onLayout={setLayout}
          />
        </>
      ) : null}
      {list.isError ? (
        <Text role="alert" tone="danger">
          {errorCopy(list.error)}
        </Text>
      ) : !list.data || !layout ? (
        <div aria-busy className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title={wardrobe.wishlistEmpty.title} body={wardrobe.wishlistEmpty.body} />
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-6">
          <Text tone="muted">{wardrobe.filter.wishNothing}</Text>
          <Button variant="quiet" onClick={() => setCategory(null)}>
            {wardrobe.filter.showEverything}
          </Button>
        </div>
      ) : (
        <ul
          aria-label={wardrobe.segments.wishlist}
          className={
            list_
              ? 'grid grid-cols-1 gap-2 md:grid-cols-[repeat(auto-fill,minmax(360px,1fr))] md:gap-x-3.5'
              : 'grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
          }
        >
          {visible.map((wish) => {
            const bought = (
              <BoughtButton
                label={wish.label}
                busy={promote.isPending && promote.variables?.params.id === wish.id}
                onBought={() => promote.mutate({ params: { id: wish.id } })}
                tile={!list_}
              />
            );
            return (
              <li key={wish.id}>
                {list_ ? (
                  <CardRow
                    piece={wish}
                    status={wishStatus(wish)}
                    thumb={<PieceImage piece={wish} sizes="52px" />}
                    action={bought}
                    removeLabel={copy.remove(wish.label)}
                    onRemove={() => remove.mutate({ params: { id: wish.id } })}
                  />
                ) : (
                  <CardTile
                    piece={wish}
                    status={wishStatus(wish)}
                    photo={
                      <PieceImage
                        piece={wish}
                        sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                      />
                    }
                    action={bought}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
