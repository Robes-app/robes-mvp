import type { PieceImage } from '@robes/contracts';
import { diary } from '@robes/copy';
import { pieceMatches, sheetCategoryOf, sheetChips } from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import {
  fonts,
  Image,
  maxFontSizeMultiplier,
  Pill,
  Skeleton,
  Text,
  useColor,
} from '@robes/ui-native';
import type { ReactNode } from 'react';
import { Pressable, Text as RNText, ScrollView, TextInput, View } from 'react-native';
import { renditionUri } from '@/lib/images';

const copy = diary.flyout;

// What the grid draws: a piece of hers, or a wish (the Add Pieces picker's WISHLIST tab) with
// its price as the line under the name.
export interface GridItem {
  id: string;
  label: string;
  category: string;
  categoryL2?: string | null;
  categoryL3?: string | null;
  brand?: string | null;
  color?: string | null;
  image: PieceImage | null;
  meta?: string | null;
}

const inCategory = (p: GridItem, c: string) => sheetCategoryOf(p) === c || p.category === c;

// The one wardrobe grid behind home's flyout (design 3k) and the draft's piece picker (Felix
// WardrobePicker): the search pill, one row of category chips with counts (All leads, the active
// one rose — Front Door PRD rev 3 §4.6), a 3-up grid with Photograph one first and a tick disc on
// every piece. What is picked, searched and filtered is the parent's; the grid only draws it. Web
// twin: app/src/components/wardrobe/wardrobe-grid.tsx.
export function WardrobeGrid<T extends GridItem>({
  pieces,
  picked,
  onToggle,
  pickLabel = copy.pick,
  query,
  onQuery,
  category,
  onCategory,
  onSnap,
  empty,
  grow = false,
}: {
  // Undefined while the wardrobe loads.
  pieces: readonly T[] | undefined;
  picked: readonly T[];
  onToggle: (piece: T) => void;
  // What a reader hears on a tile ("Include Silk scarf").
  pickLabel?: (label: string) => string;
  query: string;
  onQuery: (q: string) => void;
  category: string | null;
  onCategory: (c: string | null) => void;
  // "Photograph one": the camera, and the photograph files straight into her wardrobe.
  onSnap?: () => void;
  empty?: ReactNode;
  // In a full-height subview the grid takes the room; in a sheet it shrinks to fit.
  grow?: boolean;
}) {
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const all = pieces ?? [];
  const chips = sheetChips(all.map(sheetCategoryOf));
  const searching = query.trim().length > 0;
  const shown = searching
    ? all.filter((p) => pieceMatches(p, query))
    : category
      ? all.filter((p) => inCategory(p, category))
      : all;
  const count = (c: string | null) => (c ? all.filter((p) => inCategory(p, c)).length : all.length);
  const on = (p: GridItem) => picked.some((x) => x.id === p.id);
  const choose = (c: string | null) => {
    onQuery('');
    onCategory(c);
  };
  return (
    <View className="gap-3" style={grow ? { flex: 1 } : { flexShrink: 1 }}>
      <View className="min-h-11 flex-row items-center gap-2.5 rounded-pill border border-rule-mid bg-surface-raised px-4">
        <Icon name="search" size={13} color={muted} />
        <TextInput
          accessibilityLabel={copy.search}
          placeholder={copy.search}
          placeholderTextColor={muted}
          value={query}
          onChangeText={onQuery}
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
        style={{ flexGrow: 0 }}
      >
        <Pill
          size="sm"
          tone="rose"
          selected={!searching && category === null}
          count={count(null)}
          onPress={() => choose(null)}
        >
          {copy.all}
        </Pill>
        {chips.map((c) => (
          <Pill
            key={c}
            size="sm"
            tone="rose"
            selected={!searching && category === c}
            count={count(c)}
            onPress={() => choose(c)}
          >
            {c}
          </Pill>
        ))}
      </ScrollView>
      {!pieces ? (
        <View className="flex-row gap-2.5" accessibilityState={{ busy: true }}>
          <Skeleton width="31%" aspectRatio={3 / 4} />
          <Skeleton width="31%" aspectRatio={3 / 4} />
          <Skeleton width="31%" aspectRatio={3 / 4} />
        </View>
      ) : (
        <ScrollView
          style={grow ? { flex: 1 } : { flexShrink: 1 }}
          className="-mx-1.5"
          contentContainerClassName="flex-row flex-wrap gap-y-3 pb-4"
          keyboardShouldPersistTaps="handled"
          accessibilityLabel={copy.eyebrow}
        >
          {shown.length === 0 && !onSnap ? empty : null}
          {onSnap ? (
            <View style={{ width: '33.333%' }} className="gap-1.5 px-1.5">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.photograph}
                onPress={onSnap}
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
          ) : null}
          {shown.map((piece) => {
            const ticked = on(piece);
            const uri = renditionUri(piece.image, 160);
            return (
              <View key={piece.id} style={{ width: '33.333%' }} className="gap-1.5 px-1.5">
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel={pickLabel(piece.label)}
                  accessibilityState={{ checked: ticked }}
                  onPress={() => onToggle(piece)}
                  className={`overflow-hidden rounded-input border ${
                    ticked ? 'border-selected-line' : 'border-hairline'
                  }`}
                  testID={`flyout-piece-${piece.id}`}
                >
                  {/* The whole piece on a 3:4 white mat. */}
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
                  numberOfLines={piece.meta ? 1 : 2}
                  className="font-display"
                  style={{ lineHeight: 16 }}
                >
                  {piece.label}
                </Text>
                {piece.meta ? (
                  <Text size="caption" tone="muted" numberOfLines={1}>
                    {piece.meta}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
