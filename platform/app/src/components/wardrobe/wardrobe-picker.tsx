'use client';

import { useApi } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { diary } from '@robes/copy';
import { Button, Sheet } from '@robes/ui';
import { useEffect, useRef, useState } from 'react';
import { WardrobeGrid } from '@/components/wardrobe/wardrobe-grid';
import { flyoutCta } from '@/lib/diary';
import { usePhotoFiling } from '@/lib/file-photo';

const copy = diary.flyout;

// The wardrobe flyout (design 3k, plan §1.9): the hanger's sheet over the WardrobeGrid; Include
// puts the ticked pieces into the prompt as tokens. The draft's PiecePicker is the same grid as
// a subview. The native twin is mobile/src/features/wardrobe/WardrobePicker.tsx.
export function WardrobePicker({
  open,
  title,
  carried,
  onClose,
  onApply,
}: {
  open: boolean;
  // "Build today around" / "Build Tuesday around".
  title: string;
  // The pieces the box already holds; they open ticked.
  carried: readonly Piece[];
  onClose: () => void;
  onApply: (pieces: Piece[]) => void;
}) {
  const pieces = useApi('wardrobe.list', { input: { limit: 100 } }, { enabled: open });
  const all = (pieces.data?.items ?? []).filter((p) => p.status === 'ready');
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Piece[]>([]);
  const { filing, file, reset } = usePhotoFiling();
  const search = useRef<HTMLInputElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the carried pieces open ticked, once per opening
  useEffect(() => {
    if (open) {
      setPicked([...carried]);
      setCategory(null);
      setQuery('');
      reset();
    }
  }, [open]);
  // A photograph files straight in and is ticked the moment Robes has read it.
  const filed = filing.phase === 'filed' ? filing.piece : null;
  useEffect(() => {
    if (filed && !picked.some((p) => p.id === filed.id)) setPicked((ps) => [...ps, filed]);
  }, [filed, picked]);

  const toggle = (p: Piece) =>
    setPicked((ps) =>
      ps.some((x) => x.id === p.id) ? ps.filter((x) => x.id !== p.id) : [...ps, p],
    );
  const cta = flyoutCta(picked.length, carried.length);
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => (o ? undefined : onClose())}
      initialFocus={search}
      closeLabel={copy.cancel}
      eyebrow={<span className="text-accent-warm">{copy.eyebrow}</span>}
      title={title}
      footer={
        cta.ready ? (
          <Button
            variant="primary"
            onClick={() => {
              onApply(picked);
              onClose();
            }}
          >
            {cta.label}
          </Button>
        ) : (
          <p
            className="flex min-h-12 w-full items-center justify-center rounded-pill border border-rule-mid px-4 font-sans text-ink-muted text-xs"
            data-testid="flyout-idle"
          >
            {cta.label}
          </p>
        )
      }
    >
      <div data-testid="wardrobe-picker">
        <WardrobeGrid
          pieces={pieces.data ? all : undefined}
          picked={picked}
          onToggle={toggle}
          query={query}
          onQuery={setQuery}
          category={category}
          onCategory={setCategory}
          onSnap={(f) => void file(f)}
          searchRef={search}
        />
      </div>
    </Sheet>
  );
}
