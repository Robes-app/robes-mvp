'use client';

import { useApi } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { theName } from '@robes/core/looks';
import { Button, Pill, Sheet, Text } from '@robes/ui';
import { useState } from 'react';
import { PieceImage } from '@/components/wardrobe/piece-image';

// The swap drawer (legacy 4b): her pieces by category, opening on the piece's own; a tap picks,
// "Swap in …" commits, closing changes nothing. With nothing to swap it adds a piece instead.
export function SwapSheet({
  open,
  swapping,
  onRack,
  onClose,
  onPick,
}: {
  open: boolean;
  swapping: { name: string; category: string } | null;
  onRack: readonly string[];
  onClose: () => void;
  onPick: (piece: Piece) => void;
}) {
  const pieces = useApi('wardrobe.list', { input: { limit: 100 } }, { enabled: open });
  const ready = (pieces.data?.items ?? []).filter(
    (p) => p.status === 'ready' && !onRack.includes(p.id),
  );
  const categories = [...new Set(ready.map((p) => p.category))];
  const [category, setCategory] = useState<string | null>(null);
  const [picked, setPicked] = useState<Piece | null>(null);
  const active =
    category ??
    (swapping && categories.some((c) => c === swapping.category) ? swapping.category : null);
  const shown = active ? ready.filter((p) => p.category === active) : ready;
  const close = () => {
    setPicked(null);
    setCategory(null);
    onClose();
  };
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
      title={
        swapping ? copy.swap.title(theName(swapping.name).replace(/^the /, '')) : copy.swap.add
      }
      footer={
        swapping && picked ? (
          <Button
            variant="primary"
            onClick={() => {
              onPick(picked);
              close();
            }}
          >
            {copy.swap.swapIn(picked.label)}
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Pill selected={active === null} onClick={() => setCategory(null)}>
            {copy.swap.all}
          </Pill>
          {categories.map((c) => (
            <Pill key={c} selected={active === c} onClick={() => setCategory(c)}>
              {c}
            </Pill>
          ))}
        </div>
        {shown.length === 0 && pieces.data ? (
          <Text tone="muted">{copy.swap.empty}</Text>
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {shown.map((piece) => (
              <li key={piece.id}>
                <button
                  type="button"
                  aria-pressed={picked?.id === piece.id}
                  onClick={() => {
                    if (!swapping) {
                      onPick(piece);
                      close();
                    } else setPicked(piece);
                  }}
                  className={`flex w-full flex-col gap-1 rounded-crisp border p-1 text-left ${picked?.id === piece.id ? 'border-ink' : 'border-hairline'}`}
                >
                  <PieceImage piece={piece} sizes="120px" />
                  <Text size="caption" className="line-clamp-2">
                    {piece.label}
                  </Text>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
