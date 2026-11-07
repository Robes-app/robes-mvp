import type { Piece } from '@robes/contracts';
import { lookbook } from '@robes/copy';
import { theName } from '@robes/core/looks';
import { Button, PrimaryScope, Subview, Text } from '@robes/ui-native';
import { useEffect, useState } from 'react';
import { usePieces } from '@/features/wardrobe/pieces';
import { WardrobeGrid } from '@/features/wardrobe/WardrobeGrid';
import { nativeAnalytics } from '@/lib/analytics';

const copy = lookbook.draftLook.picker;

// What the picker is open for: pieces to add (any number), or the one to swap a row for.
export type PickerMode = { add: true } | { swap: { key: string; name: string; category: string } };

// Felix's WardrobePicker (the draft's add slot and a row's hanger): the WardrobeGrid as a
// full-height subview with an ink "Add N pieces" at the foot. A swap picks one and confirms with
// "Swap it in". Closing changes nothing. Web twin: app/src/components/looks/piece-picker.tsx.
export function PiecePicker({
  mode,
  onRack,
  onClose,
  onPick,
  onSnap,
}: {
  mode: PickerMode | null;
  onRack: readonly string[];
  onClose: () => void;
  onPick: (pieces: Piece[]) => void;
  // "Photograph one": the camera, and the photograph files straight in and onto the look.
  onSnap?: () => void;
}) {
  const open = mode !== null;
  const swapping = mode && 'swap' in mode ? mode.swap : null;
  const { pieces, isPending } = usePieces();
  const ready = pieces.filter((p) => p.status === 'ready' && !onRack.includes(p.id));
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Piece[]>([]);
  // The row's category leads a swap; everything is reset as the picker opens.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per opening, not per prop.
  useEffect(() => {
    if (!open) return;
    nativeAnalytics.track('swap_drawer_opened', { mode: swapping ? 'swap' : 'add' });
    setPicked([]);
    setQuery('');
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
  const confirm = () => {
    if (!picked.length) return;
    onPick(picked);
    onClose();
  };
  return (
    <Subview
      open={open}
      title={swapping ? copy.swapTitle(theName(swapping.name).replace(/^the /, '')) : copy.title}
      onBack={onClose}
      testID="piece-picker"
      footer={
        <PrimaryScope>
          <Button disabled={picked.length === 0} onPress={confirm} testID="picker-confirm">
            {swapping ? copy.swapCta : copy.cta(picked.length)}
          </Button>
        </PrimaryScope>
      }
    >
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
    </Subview>
  );
}
