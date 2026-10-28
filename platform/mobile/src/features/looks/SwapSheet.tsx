import type { Piece } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { pieceMatches, sheetCategoryOf, sheetChips, theName } from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import { Button, Chip, fonts, Image, PrimaryScope, Sheet, Text, useColor } from '@robes/ui-native';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { usePieces } from '@/features/wardrobe/pieces';
import { renditionUri } from '@/lib/images';

const inCategory = (p: Piece, c: string) => sheetCategoryOf(p) === c || p.category === c;

function Tile({ piece, caption }: { piece: Piece; caption: string }) {
  const uri = renditionUri(piece.image, 240);
  return (
    <View className="gap-1">
      {uri ? (
        <Image
          source={uri}
          alt=""
          aspect="3:4"
          contentFit="contain"
          blurhash={piece.image?.blurhash}
          className="rounded-crisp"
        />
      ) : (
        <View className="aspect-[3/4] w-full rounded-crisp bg-surface-sunk" />
      )}
      <Text size="small" numberOfLines={2} style={{ fontFamily: fonts.display }}>
        {caption}
      </Text>
    </View>
  );
}

// The one wardrobe sheet behind every + and every swap (legacy 2026-10-15, design 2 / 4a): a
// search over the whole wardrobe, one scrolling row of chips (All leads; it opens on the tapped
// slot's category), a 3-up grid of her pieces with "Photograph one" first when she can snap a new
// piece straight in. A tap adds; a swap picks, then "Swap in …" commits (or the tap itself,
// `instant`); closing changes nothing. The web twin is app/src/components/looks/swap-sheet.tsx.
export function SwapSheet({
  open,
  swapping,
  onRack,
  onClose,
  onPick,
  opensOn = null,
  title,
  onSnap,
  instant = false,
}: {
  open: boolean;
  swapping: { name: string; category: string; pieceId?: string | null } | null;
  // Adding from a figure's slot opens on that category, filed or not.
  opensOn?: string | null;
  onRack: readonly string[];
  onClose: () => void;
  onPick: (piece: Piece) => void;
  // "Add a top" from a hotspot; else "Add a piece".
  title?: string;
  // "Photograph one": the camera, and the photograph files straight in and onto the look.
  onSnap?: () => void;
  // One tap swaps (a suggestion, legacy 0.1; a saved look while she edits, L5); its Undo is the way back.
  instant?: boolean;
}) {
  const { pieces } = usePieces();
  const muted = useColor('ink-muted');
  const ink = useColor('ink');
  const all = pieces.filter((p) => p.status === 'ready');
  const current = swapping?.pieceId ? all.find((p) => p.id === swapping.pieceId) : undefined;
  const ready = all.filter((p) => !onRack.includes(p.id));
  const chips = sheetChips(ready.map(sheetCategoryOf));
  // undefined: open on the preset; null: she chose All.
  const [category, setCategory] = useState<string | null | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Piece | null>(null);
  const preset = swapping?.category ?? opensOn;
  const active =
    category !== undefined
      ? category
      : preset && (chips.includes(preset) || ready.some((p) => inCategory(p, preset)))
        ? preset
        : null;
  const searching = query.trim().length > 0;
  const shown = searching
    ? ready.filter((p) => pieceMatches(p, query))
    : active
      ? ready.filter((p) => inCategory(p, active))
      : ready;
  const close = () => {
    setPicked(null);
    setCategory(undefined);
    setQuery('');
    onClose();
  };
  const choose = (c: string | null) => {
    setQuery('');
    setCategory(c);
  };
  const cells: (
    | { kind: 'snap' }
    | { kind: 'current'; piece: Piece }
    | { kind: 'piece'; piece: Piece }
  )[] = [
    ...(onSnap ? [{ kind: 'snap' as const }] : []),
    ...(current && !searching ? [{ kind: 'current' as const, piece: current }] : []),
    ...shown.map((piece) => ({ kind: 'piece' as const, piece })),
  ];
  return (
    <Sheet
      open={open}
      onClose={close}
      eyebrow={swapping ? copy.sheet.swapEyebrow : copy.sheet.eyebrow}
      title={
        swapping
          ? copy.swap.title(theName(swapping.name).replace(/^the /, ''))
          : (title ?? copy.swap.add)
      }
      closeButton
      testID="swap-sheet"
    >
      <View className="gap-4 pb-2">
        <View className="min-h-11 flex-row items-center gap-2 rounded-pill border border-border-control bg-surface-raised px-4">
          <Icon name="search" size={16} color={muted} />
          <TextInput
            accessibilityLabel={copy.sheet.search}
            placeholder={copy.sheet.search}
            placeholderTextColor={muted}
            value={query}
            onChangeText={setQuery}
            className="min-h-11 flex-1 text-sm"
            style={{ color: ink, fontFamily: fonts.sans }}
          />
        </View>
        {/* One row of chips that scrolls sideways, never a wrapped block (beta). */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2"
        >
          <Chip selected={!searching && active === null} onPress={() => choose(null)}>
            {copy.swap.all}
          </Chip>
          {chips.map((c) => (
            <Chip key={c} selected={!searching && active === c} onPress={() => choose(c)}>
              {c}
            </Chip>
          ))}
        </ScrollView>
        {shown.length === 0 ? (
          <Text tone="muted">
            {searching
              ? copy.sheet.noMatch(query.trim())
              : active
                ? copy.sheet.emptyCategory(active)
                : copy.swap.empty}
            {onSnap && !searching ? ` ${copy.sheet.emptyHint}.` : ''}
          </Text>
        ) : null}
        <ScrollView
          style={{ maxHeight: 420 }}
          contentContainerClassName="flex-row flex-wrap gap-y-4"
        >
          {cells.map((cell) => (
            <View
              key={cell.kind === 'snap' ? 'snap' : `${cell.kind}-${cell.piece.id}`}
              style={{ width: '33.333%' }}
              className="px-1.5"
            >
              {cell.kind === 'snap' ? (
                <View className="gap-1">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={copy.sheet.photograph}
                    onPress={() => {
                      close();
                      onSnap?.();
                    }}
                    className="aspect-[3/4] w-full items-center justify-center gap-2 rounded-crisp border border-dashed border-border-control bg-surface"
                  >
                    <Icon name="camera" size={20} color={muted} />
                    <Text size="caption" tone="muted" className="text-center uppercase">
                      {copy.sheet.photograph}
                    </Text>
                  </Pressable>
                  <Text size="caption" tone="faint" italic>
                    {swapping ? copy.sheet.swapsIn : copy.sheet.filesIn}
                  </Text>
                </View>
              ) : cell.kind === 'current' ? (
                <View className="opacity-60">
                  <Tile piece={cell.piece} caption={copy.sheet.inLook} />
                </View>
              ) : (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityLabel={cell.piece.label}
                  accessibilityState={{ checked: picked?.id === cell.piece.id }}
                  onPress={() => {
                    if (!swapping || instant) {
                      onPick(cell.piece);
                      close();
                    } else setPicked(cell.piece);
                  }}
                  className={picked?.id === cell.piece.id ? 'rounded-crisp bg-selected' : undefined}
                >
                  <Tile piece={cell.piece} caption={cell.piece.label} />
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>
        {swapping && picked && !instant ? (
          <PrimaryScope>
            <Button
              onPress={() => {
                onPick(picked);
                close();
              }}
            >
              {copy.swap.swapIn(picked.label)}
            </Button>
          </PrimaryScope>
        ) : null}
      </View>
    </Sheet>
  );
}
