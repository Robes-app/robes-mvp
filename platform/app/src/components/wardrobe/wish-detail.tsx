'use client';

import {
  queryKeys,
  useApi,
  useApiClient,
  useApiMutation,
  useUndoableMutation,
} from '@robes/api-client/react';
import type { UpdateWishInput, Wish } from '@robes/contracts';
import { wardrobe as copy } from '@robes/copy';
import { Button, ErrorText, Skeleton, Tabs, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { withoutId } from '@/lib/wardrobe';
import { DeletePieceDialog } from './delete-piece-dialog';
import { type FieldInput, type PieceField, PieceFieldSheet } from './piece-field-sheet';
import { PieceHeader } from './piece-header';
import { PieceImage } from './piece-image';
import { PieceRow, RecordRows, type RecordTab, type RecordValues } from './piece-rows';

const TABS = [copy.piece.tabs.piece, copy.piece.tabs.colour, copy.piece.tabs.wearing] as const;
type TabLabel = (typeof TABS)[number];
const TAB_OF: Record<TabLabel, RecordTab> = {
  [copy.piece.tabs.piece]: 'piece',
  [copy.piece.tabs.colour]: 'colour',
  [copy.piece.tabs.wearing]: 'wearing',
};
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// A wish's record as the drawers read it: a wish has a note, no wears and no seasons yet.
export function wishValues(wish: Wish): RecordValues & { category: string } {
  return {
    label: wish.label,
    brand: wish.brand,
    notes: wish.note,
    category: wish.category,
    categoryL2: wish.categoryL2,
    categoryL3: wish.categoryL3,
    colourShade: wish.colourShade,
    colourExtra: wish.colourExtra,
    print: wish.print,
    material: wish.material,
    wearFor: [],
    size: wish.size,
    price: wish.price,
    currency: wish.currency,
    seasonBand: null,
    sourceLabel: wish.sourceLabel,
  };
}

// What a drawer wrote, in the wish's own fields.
export function wishInput(input: FieldInput): UpdateWishInput {
  const {
    notes,
    seasons: _seasons,
    seasonBand: _band,
    wearFor: _wear,
    hero: _hero,
    heroPosition: _pos,
    ...rest
  } = input;
  return { ...rest, ...(notes !== undefined ? { note: notes } : {}) };
}

// A wish's page (Front Door canvas 3b, PRD rev 3 §7.3): the piece's anatomy — the bar with her name
// for it, the photograph edge to edge, PIECE · COLOUR · WEARING over the record's rows with Brand
// and Shop (the retailer) — then Bought, and Delete piece asked first. A wish carries no wears yet
// ("New"), and its In looks, Seasons and Wear it for are drawn but wait for their data (Annie,
// 9 Nov). Native twin: mobile/src/features/wardrobe/WishDetail.tsx.
export function WishDetail({ id }: { id: string }) {
  const router = useRouter();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [field, setField] = useState<PieceField | null>(null);
  const [tab, setTab] = useState<TabLabel>(TABS[0]);
  const [confirm, setConfirm] = useState(false);
  const query = useApi('wishlist.get', { params: { id } });
  const update = useApiMutation('wishlist.update', {
    onSuccess: async (saved) => {
      queryClient.setQueryData(queryKeys.call('wishlist.get', { params: { id } }), saved);
      await queryClient.invalidateQueries({ queryKey: queryKeys.route('wishlist.list') });
    },
  });
  const promote = useApiMutation('wishlist.promote', {
    onSuccess: async (piece) => {
      toast({ message: copy.wishlist.boughtToast(piece.label) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.route('wishlist.list') }),
        queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') }),
        queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.summary') }),
      ]);
      router.replace(`/piece/${piece.id}`);
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
          message: copy.wishlist.removed,
          action: { label: copy.undo, onAction: () => void handle.undo() },
        }),
      compensate: (args) => client.call('wishlist.restore', { params: { id: args.params.id } }),
    },
  });
  if (query.isError) return <ErrorText>{errorCopy(query.error)}</ErrorText>;
  const wish = query.data;
  if (!wish) {
    return (
      <div aria-busy className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <Skeleton className="aspect-[4/5]" />
        <Skeleton shape="text" className="h-10 w-2/3" />
        <Skeleton className="h-28" />
      </div>
    );
  }
  const values = wishValues(wish);
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col lg:max-w-none">
      <PieceHeader title={wish.label} back="/wardrobe/wishlist" />
      <article
        className="grid w-full grid-cols-1 gap-8 lg:grid-cols-[clamp(360px,38%,560px)_minmax(0,1fr)] lg:items-start lg:gap-14"
        data-testid="wish-detail"
      >
        <div className="flex min-w-0 flex-col gap-6">
          <div className="relative -mx-5 overflow-hidden bg-surface-raised md:mx-0 md:rounded-soft md:border md:border-hairline">
            <PieceImage
              piece={wish}
              contain
              sizes="(min-width: 1024px) 560px, (min-width: 768px) 576px, 100vw"
              priority
            />
          </div>
          <Tabs items={TABS} value={tab} onChange={setTab} label={copy.piece.sections.piece} />
          <RecordRows
            values={values}
            onField={setField}
            only={TAB_OF[tab]}
            wish
            wearing={
              <>
                <PieceRow label={copy.piece.rows.worn} value={copy.card.new} />
                <PieceRow label={copy.piece.rows.inLooks} value={copy.piece.none} />
              </>
            }
          />
          {update.isError ? <ErrorText>{errorCopy(update.error)}</ErrorText> : null}
          {wish.sourceUrl ? (
            <a
              href={wish.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className={`self-start font-sans text-ink-muted text-sm underline underline-offset-4 hover:text-ink ${focus}`}
            >
              {wish.sourceLabel ?? copy.piece.openShop}
            </a>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <Button
            variant="primary"
            block
            loading={promote.isPending}
            onClick={() => promote.mutate({ params: { id: wish.id } })}
            data-testid="wish-bought"
          >
            {copy.wishlist.bought}
          </Button>
          {/* Delete piece (canvas 3b): outline, asked first; the Undo toast still follows. */}
          <Button
            variant="outline"
            block
            onClick={() => setConfirm(true)}
            data-testid="delete-piece"
          >
            {copy.piece.delete}
          </Button>
        </div>
        <DeletePieceDialog
          open={confirm}
          message={copy.piece.deleteWishBody}
          onDelete={() => {
            setConfirm(false);
            remove.mutate({ params: { id: wish.id } });
            router.push('/wardrobe/wishlist');
          }}
          onCancel={() => setConfirm(false)}
        />
        <PieceFieldSheet
          piece={values}
          field={field}
          onClose={() => setField(null)}
          onSave={(input) => update.mutate({ params: { id: wish.id }, input: wishInput(input) })}
          saving={update.isPending}
        />
      </article>
    </div>
  );
}
