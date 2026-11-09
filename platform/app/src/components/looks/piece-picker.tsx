'use client';

import { useApi } from '@robes/api-client/react';
import type { Piece, Wish } from '@robes/contracts';
import { lookbook, wardrobe } from '@robes/copy';
import { theName } from '@robes/core/looks';
import { formatPrice } from '@robes/core/wardrobe';
import { Button, Subview, Tabs, Text } from '@robes/ui';
import { useEffect, useState } from 'react';
import { AddCircle } from '@/components/add-circle';
import { useAnalytics } from '@/components/analytics-provider';
import { WardrobeGrid } from '@/components/wardrobe/wardrobe-grid';

const copy = lookbook.draftLook.picker;
const TABS = [wardrobe.segments.owned, wardrobe.segments.wishlist, wardrobe.segments.shop] as const;
type Tab = (typeof TABS)[number];

// What the picker is open for: pieces to add (any number), or the one to swap a row for.
export type PickerMode = { add: true } | { swap: { key: string; name: string; category: string } };

type WishItem = Wish & { meta: string | null };

// The Add Pieces picker (Front Door PRD rev 3 §4.6; Felix's WardrobePicker): a full-height
// subview with OWNED · WISHLIST · SHOP as underline tabs (Shop stands disabled until its PRD,
// plan R10) and the framed + for a new piece at the rail's end; under them the WardrobeGrid —
// category chips with counts, the 3-up grid with a tick on every piece — and the ink ADD PIECES
// at the foot. A wish joins the rack as a piece to find. A swap picks one of her pieces and
// confirms with "Swap it in". Closing changes nothing. Native twin:
// mobile/src/features/looks/PiecePicker.tsx.
export function PiecePicker({
  mode,
  onRack,
  onClose,
  onPick,
  onSnap,
}: {
  mode: PickerMode | null;
  // The pieces and wishes already on the rack, by id.
  onRack: readonly string[];
  onClose: () => void;
  onPick: (pieces: Piece[], wishes: Wish[]) => void;
  // "Photograph one": the photograph files straight into her wardrobe and onto the look.
  onSnap?: (file: File) => void;
}) {
  const open = mode !== null;
  const swapping = mode && 'swap' in mode ? mode.swap : null;
  const pieces = useApi('wardrobe.list', { input: { limit: 100 } }, { enabled: open });
  const wishlist = useApi('wishlist.list', { input: { limit: 100 } }, { enabled: open });
  const ready = (pieces.data?.items ?? []).filter(
    (p) => p.status === 'ready' && !onRack.includes(p.id),
  );
  const wishes: WishItem[] = (wishlist.data?.items ?? [])
    .filter((w) => !onRack.includes(w.id))
    .map((w) => ({ ...w, meta: formatPrice(w.price, w.currency) }));
  const [tab, setTab] = useState<Tab>(TABS[0]);
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Piece[]>([]);
  const [pickedWishes, setPickedWishes] = useState<WishItem[]>([]);
  const { track } = useAnalytics().analytics;
  // The row's category leads a swap; everything is reset as the picker opens.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per opening, not per prop.
  useEffect(() => {
    if (!open) return;
    track('swap_drawer_opened', { mode: swapping ? 'swap' : 'add' });
    setPicked([]);
    setPickedWishes([]);
    setQuery('');
    setTab(TABS[0]);
    setCategory(swapping?.category ?? null);
  }, [open]);
  const toggle = (piece: Piece) =>
    setPicked((p) =>
      p.some((x) => x.id === piece.id)
        ? p.filter((x) => x.id !== piece.id)
        : swapping
          ? [piece]
          : [...p, piece],
    );
  const toggleWish = (wish: WishItem) =>
    setPickedWishes((p) =>
      p.some((x) => x.id === wish.id) ? p.filter((x) => x.id !== wish.id) : [...p, wish],
    );
  const count = picked.length + pickedWishes.length;
  const confirm = () => {
    if (!count) return;
    onPick(
      picked,
      pickedWishes.map(({ meta: _meta, ...wish }) => wish),
    );
    onClose();
  };
  // A swap takes one of her pieces: the wishlist waits for an add.
  const off: Tab[] = swapping ? [TABS[1], TABS[2]] : [TABS[2]];
  return (
    <Subview
      open={open}
      title={swapping ? copy.swapTitle(theName(swapping.name).replace(/^the /, '')) : copy.title}
      onBack={onClose}
      testId="piece-picker"
      footer={
        <Button
          variant="primary"
          block
          disabled={count === 0}
          onClick={confirm}
          data-testid="picker-confirm"
        >
          {swapping ? copy.swapCta : copy.cta(count)}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <Tabs
          items={TABS}
          value={tab}
          onChange={(next) => {
            setTab(next);
            setQuery('');
            setCategory(null);
          }}
          label={copy.title}
          icons={{
            [wardrobe.segments.owned]: 'wardrobe',
            [wardrobe.segments.wishlist]: 'heart',
            [wardrobe.segments.shop]: 'bag',
          }}
          disabled={off}
          trailing={<AddCircle href="/wardrobe/add" label={copy.addNew} />}
        />
        {tab === TABS[1] ? (
          <WardrobeGrid
            pieces={wishlist.data ? wishes : undefined}
            picked={pickedWishes}
            onToggle={toggleWish}
            pickLabel={copy.pickWish}
            query={query}
            onQuery={setQuery}
            category={category}
            onCategory={setCategory}
            empty={<Text tone="muted">{copy.wishEmpty}</Text>}
          />
        ) : (
          <WardrobeGrid
            pieces={pieces.data ? ready : undefined}
            picked={picked}
            onToggle={toggle}
            query={query}
            onQuery={setQuery}
            category={category}
            onCategory={setCategory}
            {...(onSnap
              ? {
                  onSnap: (file: File) => {
                    onSnap(file);
                    onClose();
                  },
                }
              : {})}
            empty={<Text tone="muted">{copy.empty}</Text>}
          />
        )}
      </div>
    </Subview>
  );
}
