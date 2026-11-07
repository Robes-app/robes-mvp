'use client';

import { useApi } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { lookbook } from '@robes/copy';
import { theName } from '@robes/core/looks';
import { Button, Subview, Text } from '@robes/ui';
import { useEffect, useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';
import { WardrobeGrid } from '@/components/wardrobe/wardrobe-grid';

const copy = lookbook.draftLook.picker;

// What the picker is open for: pieces to add (any number), or the one to swap a row for.
export type PickerMode = { add: true } | { swap: { key: string; name: string; category: string } };

// Felix's WardrobePicker (the draft's add slot and a row's hanger): the WardrobeGrid as a
// full-height subview with an ink "Add N pieces" at the foot. A swap picks one and confirms with
// "Swap it in". Closing changes nothing. Native twin: mobile/src/features/looks/PiecePicker.tsx.
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
  // "Photograph one": the photograph files straight into her wardrobe and onto the look.
  onSnap?: (file: File) => void;
}) {
  const open = mode !== null;
  const swapping = mode && 'swap' in mode ? mode.swap : null;
  const pieces = useApi('wardrobe.list', { input: { limit: 100 } }, { enabled: open });
  const ready = (pieces.data?.items ?? []).filter(
    (p) => p.status === 'ready' && !onRack.includes(p.id),
  );
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Piece[]>([]);
  const { track } = useAnalytics().analytics;
  // The row's category leads a swap; everything is reset as the picker opens.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per opening, not per prop.
  useEffect(() => {
    if (!open) return;
    track('swap_drawer_opened', { mode: swapping ? 'swap' : 'add' });
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
      testId="piece-picker"
      footer={
        <Button
          variant="primary"
          block
          disabled={picked.length === 0}
          onClick={confirm}
          data-testid="picker-confirm"
        >
          {swapping ? copy.swapCta : copy.cta(picked.length)}
        </Button>
      }
    >
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
    </Subview>
  );
}
