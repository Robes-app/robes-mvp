import { useApi } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { diary } from '@robes/copy';
import {
  Button,
  fonts,
  Heading,
  MIN_TOUCH,
  maxFontSizeMultiplier,
  Sheet,
  Text,
} from '@robes/ui-native';
import { useEffect, useState } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import { flyoutCta } from '@/features/home/diary';
import { pickOne, usePhotoFiling } from '@/features/home/file-photo';
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
  const pieces = useApi('wardrobe.list', { input: { limit: 100 } }, { enabled: open });
  const all = (pieces.data?.items ?? []).filter((p) => p.status === 'ready');
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
    // A tall sheet (design 3k): it stands near the top whatever it holds; the grid scrolls.
    <Sheet open={open} onClose={onClose} className="h-[92%]" testID="wardrobe-picker">
      {/* The eyebrow reads warm, which the Sheet's own header can't, so the head is drawn here. */}
      <View className="mb-4 flex-row items-start gap-1">
        <View className="min-w-0 flex-1 gap-1">
          <RNText
            maxFontSizeMultiplier={maxFontSizeMultiplier.label}
            className="text-accent-warm text-xs uppercase"
            style={{ fontFamily: fonts.sansRegular, letterSpacing: 2.64 }}
          >
            {copy.eyebrow}
          </RNText>
          <Heading size="md">{title}</Heading>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.cancel}
          onPress={onClose}
          style={{ minHeight: MIN_TOUCH, minWidth: MIN_TOUCH }}
          className="-mr-1 items-center justify-center px-1"
        >
          <Text size="small" tone="muted" className="underline">
            {copy.cancel}
          </Text>
        </Pressable>
      </View>
      <View className="gap-3" style={{ flexShrink: 1 }}>
        <WardrobeGrid
          pieces={pieces.data ? all : undefined}
          picked={picked}
          onToggle={toggle}
          query={query}
          onQuery={setQuery}
          category={category}
          onCategory={setCategory}
          onSnap={() => void snap()}
        />
        {cta.ready ? (
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
        )}
      </View>
    </Sheet>
  );
}
