'use client';

import {
  queryKeys,
  useApi,
  useApiClient,
  useApiMutation,
  useUndoableMutation,
} from '@robes/api-client/react';
import { wardrobe } from '@robes/copy';
import { Button, EmptyState, Field, IconButton, Skeleton, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { withoutId } from '@/lib/wardrobe';

const copy = wardrobe.wishlist;

// Wardrobe › Wishlist (M3 task 8): what she wants; "I bought this" files it as a piece.
export function Wishlist() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const list = useApi('wishlist.list', { input: { limit: 100 } });
  const [label, setLabel] = useState('');
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.route('wishlist.list') }),
      queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') }),
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
    if (label.trim()) create.mutate({ input: { label: label.trim() } });
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
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
      {list.isError ? (
        <Text role="alert" tone="danger">
          {errorCopy(list.error)}
        </Text>
      ) : !list.data ? (
        <div aria-busy className="flex flex-col gap-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : list.data.items.length === 0 ? (
        <EmptyState title={wardrobe.wishlistEmpty.title} body={wardrobe.wishlistEmpty.body} />
      ) : (
        <ul aria-label={wardrobe.segments.wishlist} className="flex flex-col">
          {list.data.items.map((wish) => (
            <li
              key={wish.id}
              className="flex min-h-14 items-center justify-between gap-4 border-b border-hairline"
            >
              <div className="flex flex-col">
                <span className="font-sans text-base text-ink">{wish.label}</span>
                {wish.brand ? (
                  <Text as="span" size="small" tone="muted">
                    {wish.brand}
                  </Text>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="quiet"
                  loading={promote.isPending && promote.variables?.params.id === wish.id}
                  onClick={() => promote.mutate({ params: { id: wish.id } })}
                >
                  {copy.bought}
                </Button>
                <IconButton
                  icon="trash"
                  label={copy.remove(wish.label)}
                  onClick={() => remove.mutate({ params: { id: wish.id } })}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
