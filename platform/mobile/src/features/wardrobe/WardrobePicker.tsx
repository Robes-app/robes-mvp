import type { Piece } from '@robes/contracts';
import { diary } from '@robes/copy';
import { Button, Text } from '@robes/ui-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { DetentSheet } from '@/components/DetentSheet';
import { flyoutCta } from '@/features/home/diary';
import { pickOne, usePhotoFiling } from '@/features/home/file-photo';
import { useAllPieces } from './pieces';
import { WardrobeGrid } from './WardrobeGrid';

const copy = diary.flyout;

// The wardrobe flyout (design 3k, plan §1.9): the hanger's sheet over the WardrobeGrid; Include
// puts the ticked pieces into the prompt as tokens. The draft's PiecePicker is the same grid as
// a subview. The web twin is app/src/components/wardrobe/wardrobe-picker.tsx.
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
  // Every piece she owns: a first page of 100 left a wardrobe of 133 short (TestFlight, 16 Nov).
  const { pieces, data } = useAllPieces({ enabled: open });
  const all = pieces.filter((p) => p.status === 'ready');
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Piece[]>([]);
  const { filing, file, reset } = usePhotoFiling();
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

  const snap = async () => {
    const photo = await pickOne('camera');
    if (photo === 'denied' || !photo) return;
    void file(photo);
  };

  const toggle = (p: Piece) =>
    setPicked((ps) =>
      ps.some((x) => x.id === p.id) ? ps.filter((x) => x.id !== p.id) : [...ps, p],
    );
  const cta = flyoutCta(picked.length, carried.length);
  return (
    // iOS's own sheet at two heights (Annie, 16 Nov): the grid scrolls itself, its button at the foot.
    <DetentSheet
      open={open}
      onClose={onClose}
      title={title}
      eyebrow={copy.eyebrow}
      testID="wardrobe-picker"
      footer={
        cta.ready ? (
          <Button
            onPress={() => {
              onApply(picked);
              onClose();
            }}
          >
            {cta.label}
          </Button>
        ) : (
          // The foot waits where the button will stand, saying what a tap does.
          <View
            className="min-h-12 items-center justify-center rounded-pill border border-rule-mid px-4"
            testID="flyout-idle"
          >
            <Text size="caption" tone="muted">
              {cta.label}
            </Text>
          </View>
        )
      }
    >
      <WardrobeGrid
        pieces={data ? all : undefined}
        picked={picked}
        onToggle={toggle}
        query={query}
        onQuery={setQuery}
        category={category}
        onCategory={setCategory}
        onSnap={() => void snap()}
        grow
      />
    </DetentSheet>
  );
}
