import { useApi } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { diary } from '@robes/copy';
import { pieceMatches, sheetCategoryOf, sheetChips } from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import {
  Button,
  fonts,
  Heading,
  Image,
  MIN_TOUCH,
  maxFontSizeMultiplier,
  Pill,
  Sheet,
  Skeleton,
  Text,
  useColor,
} from '@robes/ui-native';
import { useEffect, useState } from 'react';
import { Pressable, Text as RNText, ScrollView, TextInput, View } from 'react-native';
import { flyoutCta } from '@/features/home/diary';
import { pickOne, usePhotoFiling } from '@/features/home/file-photo';
import { renditionUri } from '@/lib/images';

const copy = diary.flyout;

const inCategory = (p: Piece, c: string) => sheetCategoryOf(p) === c || p.category === c;

// The wardrobe flyout (design 3k, plan §1.9): the hanger's sheet. A search, one row of category
// chips with counts, a 3-up grid with Photograph one first, a tick on every piece; Include puts
// the ticked pieces into the prompt as tokens. Multi-select, unlike SwapSheet (one piece, one
// swap). The web twin is app/src/components/wardrobe/wardrobe-picker.tsx.
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
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const pieces = useApi('wardrobe.list', { input: { limit: 100 } }, { enabled: open });
  const all = (pieces.data?.items ?? []).filter((p) => p.status === 'ready');
  const chips = sheetChips(all.map(sheetCategoryOf));
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

  const searching = query.trim().length > 0;
  const shown = searching
    ? all.filter((p) => pieceMatches(p, query))
    : category
      ? all.filter((p) => inCategory(p, category))
      : all;
  const count = (c: string | null) => (c ? all.filter((p) => inCategory(p, c)).length : all.length);
  const on = (p: Piece) => picked.some((x) => x.id === p.id);
  const toggle = (p: Piece) =>
    setPicked((ps) =>
      ps.some((x) => x.id === p.id) ? ps.filter((x) => x.id !== p.id) : [...ps, p],
    );
  const choose = (c: string | null) => {
    setQuery('');
    setCategory(c);
  };
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
        <View className="min-h-11 flex-row items-center gap-2.5 rounded-pill border border-rule-mid bg-surface-raised px-4">
          <Icon name="search" size={13} color={muted} />
          <TextInput
            accessibilityLabel={copy.search}
            placeholder={copy.search}
            placeholderTextColor={muted}
            value={query}
            onChangeText={setQuery}
            className="min-h-11 flex-1 text-sm"
            style={{ color: ink, fontFamily: fonts.sans }}
          />
        </View>
        {/* One row of chips that scrolls sideways, each with how many pieces it holds. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-6"
          contentContainerClassName="gap-1.5 px-6 pb-1"
          keyboardShouldPersistTaps="handled"
        >
          <Pill size="sm" selected={!searching && category === null} onPress={() => choose(null)}>
            {`${copy.all} ${count(null)}`}
          </Pill>
          {chips.map((c) => (
            <Pill
              key={c}
              size="sm"
              selected={!searching && category === c}
              onPress={() => choose(c)}
            >
              {`${c} ${count(c)}`}
            </Pill>
          ))}
        </ScrollView>
        {!pieces.data ? (
          <View className="flex-row gap-2.5" accessibilityState={{ busy: true }}>
            <Skeleton width="31%" aspectRatio={3 / 4} />
            <Skeleton width="31%" aspectRatio={3 / 4} />
            <Skeleton width="31%" aspectRatio={3 / 4} />
          </View>
        ) : (
          <ScrollView
            style={{ flexShrink: 1 }}
            className="-mx-1.5"
            contentContainerClassName="flex-row flex-wrap gap-y-3 pb-4"
            keyboardShouldPersistTaps="handled"
            accessibilityLabel={copy.eyebrow}
          >
            <View style={{ width: '33.333%' }} className="gap-1.5 px-1.5">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.photograph}
                onPress={() => void snap()}
                className="aspect-[3/4] w-full items-center justify-center gap-2.5 rounded-input border border-dashed border-selected-line bg-surface px-2"
                testID="flyout-snap"
              >
                <Icon name="camera" size={18} color={muted} />
                <RNText
                  maxFontSizeMultiplier={maxFontSizeMultiplier.label}
                  className="text-center text-ink uppercase"
                  style={{ fontFamily: fonts.sansMedium, fontSize: 9, letterSpacing: 1.8 }}
                >
                  {copy.photograph}
                </RNText>
              </Pressable>
              <Text size="caption" tone="muted" italic>
                {copy.adds}
              </Text>
            </View>
            {shown.map((piece) => {
              const ticked = on(piece);
              const uri = renditionUri(piece.image, 160);
              return (
                <View key={piece.id} style={{ width: '33.333%' }} className="gap-1.5 px-1.5">
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={copy.pick(piece.label)}
                    accessibilityState={{ checked: ticked }}
                    onPress={() => toggle(piece)}
                    className={`overflow-hidden rounded-input border ${
                      ticked ? 'border-selected-line' : 'border-hairline'
                    }`}
                    testID={`flyout-piece-${piece.id}`}
                  >
                    {/* The whole piece on a 3:4 white mat, as SwapSheet draws it. */}
                    {uri ? (
                      <Image
                        source={uri}
                        alt=""
                        aspect="3:4"
                        contentFit="contain"
                        blurhash={piece.image?.blurhash}
                      />
                    ) : (
                      <View className="aspect-[3/4] w-full bg-surface-sunk" />
                    )}
                    <View
                      className={`absolute top-1.5 right-1.5 size-5 items-center justify-center rounded-pill border ${
                        ticked
                          ? 'border-selected-line bg-selected'
                          : 'border-surface-raised bg-surface-raised/70'
                      }`}
                    >
                      {ticked ? <Icon name="check" size={11} color={ink} /> : null}
                    </View>
                  </Pressable>
                  <Text
                    size="small"
                    numberOfLines={2}
                    className="font-display"
                    style={{ lineHeight: 16 }}
                  >
                    {piece.label}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        )}
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
