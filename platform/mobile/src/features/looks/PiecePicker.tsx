import type { Piece, Wish } from '@robes/contracts';
import { lookbook, wardrobe } from '@robes/copy';
import { theName } from '@robes/core/looks';
import { formatPrice } from '@robes/core/wardrobe';
import { Button, IconButton, PrimaryScope, Subview, Tabs, Text } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { usePieces } from '@/features/wardrobe/pieces';
import { WardrobeGrid } from '@/features/wardrobe/WardrobeGrid';
import { useWishes } from '@/features/wardrobe/wishlist';
import { nativeAnalytics } from '@/lib/analytics';

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
// confirms with "Swap it in". Closing changes nothing. Web twin:
// app/src/components/looks/piece-picker.tsx.
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
  // "Photograph one": the camera, and the photograph files straight in and onto the look.
  onSnap?: () => void;
}) {
  const router = useRouter();
  const open = mode !== null;
  const swapping = mode && 'swap' in mode ? mode.swap : null;
  const { pieces, isPending } = usePieces();
  const wishlist = useWishes();
  const ready = pieces.filter((p) => p.status === 'ready' && !onRack.includes(p.id));
  const wishes: WishItem[] = wishlist.wishes
    .filter((w) => !onRack.includes(w.id))
    .map((w) => ({ ...w, meta: formatPrice(w.price, w.currency) }));
  const [tab, setTab] = useState<Tab>(TABS[0]);
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Piece[]>([]);
  const [pickedWishes, setPickedWishes] = useState<WishItem[]>([]);
  // The row's category leads a swap; everything is reset as the picker opens.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per opening, not per prop.
  useEffect(() => {
    if (!open) return;
    nativeAnalytics.track('swap_drawer_opened', { mode: swapping ? 'swap' : 'add' });
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
  const choose = (next: string | null) => {
    setQuery('');
    setCategory(next);
  };
  // A swap takes one of her pieces: the wishlist waits for an add.
  const off: Tab[] = swapping ? [TABS[1], TABS[2]] : [TABS[2]];
  return (
    <Subview
      open={open}
      title={swapping ? copy.swapTitle(theName(swapping.name).replace(/^the /, '')) : copy.title}
      onBack={onClose}
      testID="piece-picker"
      footer={
        <PrimaryScope>
          <Button disabled={count === 0} onPress={confirm} testID="picker-confirm">
            {swapping ? copy.swapCta : copy.cta(count)}
          </Button>
        </PrimaryScope>
      }
    >
      <View className="flex-1 gap-3">
        <Tabs
          items={TABS}
          value={tab}
          onChange={(next) => {
            setTab(next);
            choose(null);
          }}
          icons={{
            [wardrobe.segments.owned]: 'wardrobe',
            [wardrobe.segments.wishlist]: 'heart',
            [wardrobe.segments.shop]: 'bag',
          }}
          disabled={off}
          trailing={
            <IconButton
              icon="plus"
              label={copy.addNew}
              framed
              onPress={() => {
                onClose();
                router.push('/wardrobe/add');
              }}
              testID="picker-add-new"
            />
          }
          testID="picker-tabs"
        />
        {tab === TABS[1] ? (
          <WardrobeGrid
            pieces={wishlist.isPending ? undefined : wishes}
            picked={pickedWishes}
            onToggle={toggleWish}
            pickLabel={copy.pickWish}
            query={query}
            onQuery={setQuery}
            category={category}
            onCategory={setCategory}
            empty={<Text tone="muted">{copy.wishEmpty}</Text>}
            grow
          />
        ) : (
          <WardrobeGrid
            pieces={isPending ? undefined : ready}
            picked={picked}
            onToggle={toggle}
            query={query}
            onQuery={setQuery}
            category={category}
            onCategory={setCategory}
            {...(onSnap
              ? {
                  onSnap: () => {
                    onClose();
                    onSnap();
                  },
                }
              : {})}
            empty={<Text tone="muted">{copy.empty}</Text>}
            grow
          />
        )}
      </View>
    </Subview>
  );
}
