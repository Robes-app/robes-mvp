import type { PieceImage } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { nameNoBrand, type RackRow, type RowNote, theName } from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import { shadowNative } from '@robes/tokens';
import { IconButton, Text, useColor, useReducedMotion } from '@robes/ui-native';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { CardRow, Photo, type RowMeta } from '@/features/wardrobe/PieceCard';

export type RowMark = RowNote | { kind: 'added' };

// Robes MVP 2b, edit mode: the cards rock (pzJigL ±0.35°, a tile pzJig ±1.1°) while the pencil is
// down, as an iPhone's home screen does; still under Reduce Motion.
export function useJig(
  on: boolean,
  degrees: number,
): Animated.AnimatedInterpolation<string> | string {
  const reduced = useReducedMotion();
  const t = useRef(new Animated.Value(0)).current;
  const live = on && !reduced;
  useEffect(() => {
    if (!live) {
      t.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: 130,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: 130,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [live, t]);
  return live
    ? t.interpolate({ inputRange: [0, 1], outputRange: [`-${degrees}deg`, `${degrees}deg`] })
    : '0deg';
}

// A row's action off the pencil (swap, remove on a suggestion's page): a 32pt `cream-200` disc
// with an `ink-soft` glyph, in a 44pt hit area.
function Disc({
  icon,
  label,
  onPress,
}: {
  icon: 'wardrobe' | 'close';
  label: string;
  onPress: () => void;
}) {
  const muted = useColor('ink-muted');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="items-center justify-center"
      style={{ width: 44, height: 44 }}
    >
      <View
        className="items-center justify-center rounded-pill bg-surface-sunk"
        style={{ width: 32, height: 32 }}
      >
        <Icon name={icon} size={15} color={muted} />
      </View>
    </Pressable>
  );
}

// Edit mode's small discs (Robes MVP 2b): 22pt, the bg veil with a lift, an ink glyph; the hit area
// reaches 44.
export function EditDisc({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: 'wardrobe' | 'close';
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  const ink = useColor('ink');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={11}
      className="items-center justify-center"
      style={{ width: 22, height: 22 }}
      {...(testID ? { testID } : {})}
    >
      <View
        className="items-center justify-center rounded-pill border-rule-mid bg-veil"
        style={{ width: 22, height: 22, borderWidth: 0.5, ...shadowNative.disc }}
      >
        <Icon name={icon} size={11} color={ink} />
      </View>
    </Pressable>
  );
}

// A Shop piece (one Robes proposes new, not a wish or a found piece) reads "{brand} · Shop" in
// every context (docked prompt PRD W6); anything else its brand, or a find's retailer.
// Web twin: rack-row.tsx shopMaker.
function shopMaker(row: RackRow, brand: string): string {
  const p = row.proposal;
  const maker = brand || p?.retailerHint?.trim() || '';
  return p && !p.wishlisted && !p.capture && maker ? copy.rack.shop(maker) : maker;
}

const PILL_THUMB = 16;

// The Swapped pill under a piece a change swapped in (docked prompt PRD T3): a faded round
// thumbnail of the piece it replaced, an arrow, then "Swapped"; the full line is its label.
// Web twin: rack-row.tsx SwappedPill.
function SwappedPill({ name, image }: { name: string; image: PieceImage | null | undefined }) {
  const ink = useColor('ink');
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={copy.rack.swappedFor(theName(name))}
      testID="swapped-pill"
      className="flex-row items-center self-start rounded-pill bg-surface-sunk"
      style={{ gap: 4, paddingVertical: 2, paddingLeft: 2, paddingRight: 8 }}
    >
      <View
        className="overflow-hidden rounded-full"
        style={{ width: PILL_THUMB, height: PILL_THUMB, opacity: 0.5 }}
      >
        <Photo piece={{ id: `was-${name}`, image: image ?? null }} width={PILL_THUMB} />
      </View>
      <Icon name="forward" size={9} color={ink} />
      {/* Full ink: 11px on the sunk fill needs it for 4.5:1. */}
      <Text style={{ fontSize: 11 }}>{copy.rack.swapped}</Text>
    </View>
  );
}

// One piece on a look's rack: the shared piece row (CardRow, PRD §6.1) with the look's own say —
// its role in the small caps, a find's retailer under the name, and at the right the wears behind a
// calendar (a piece she owns), a wish's price behind a heart, or a piece to find's price behind a
// bag. At rest the row opens the piece; in pencil mode the hanger swaps it and × takes it off, and
// ♡ saves a piece to find. A row the prompt changed reads warm with an ink dot at its edge.
// Web twin: rack-row.tsx.
export function RackRowCard({
  row,
  image,
  mark,
  styled,
  wears,
  onOpen,
  onSwap,
  onWish,
  onRemove,
  editing = false,
  wasImage,
}: {
  row: RackRow;
  image?: PieceImage | null;
  // The photograph of the piece a change swapped out, for the Swapped pill (docked prompt T3).
  wasImage?: PieceImage | null;
  mark?: RowMark | null;
  styled?: string | null;
  // The piece's own wear count, on a saved look at rest (beta's ledger, L19).
  wears?: number;
  onOpen?: () => void;
  onSwap?: () => void;
  onWish?: () => void;
  onRemove?: () => void;
  // The Rack's pencil is down (Robes MVP 2b): the card rocks, × on its corner, swap and chevron.
  editing?: boolean;
}) {
  const brand = row.brand?.trim() || '';
  const name = nameNoBrand(row.name, brand);
  const proposal = row.proposal;
  const meta = rackMeta(row, wears);
  // A swapped piece shows the Swapped pill instead (docked prompt PRD T3).
  const markText =
    mark?.kind === 'back' ? copy.rack.backIn : mark?.kind === 'added' ? copy.rack.added : null;
  const changed = mark?.kind === 'was' || mark?.kind === 'back' || mark?.kind === 'added';
  // Edit mode (Robes MVP 2b; Annie, 15 Nov): the card rocks, × sits on its top-left corner, and at
  // the right only the swap disc and the chevron; no wears or price. A piece to find keeps its ♡
  // while it isn't hers yet, the one way to keep it.
  const jig = useJig(editing, 0.35);
  const faint = useColor('ink-faint');
  const actions = editing ? (
    <View className="flex-row items-center gap-2">
      {proposal && onWish && !proposal.wishlisted ? (
        <IconButton icon="heart" label={copy.rack.save(name)} onPress={onWish} tone="ink-muted" />
      ) : null}
      {onSwap ? <EditDisc icon="wardrobe" label={copy.rack.swap(name)} onPress={onSwap} /> : null}
      <Icon name="forward" size={14} color={faint} />
    </View>
  ) : (proposal && onWish) || onSwap || onRemove ? (
    <View className="flex-row items-center">
      {proposal && onWish ? (
        <IconButton
          icon="heart"
          label={copy.rack.save(name)}
          onPress={onWish}
          tone={proposal.wishlisted ? 'ink' : 'ink-muted'}
        />
      ) : null}
      {onSwap ? <Disc icon="wardrobe" label={copy.rack.swap(name)} onPress={onSwap} /> : null}
      {onRemove ? <Disc icon="close" label={copy.rack.remove(name)} onPress={onRemove} /> : null}
    </View>
  ) : null;
  const card = (
    <CardRow
      piece={{
        id: row.key,
        label: name,
        category: row.category,
        categoryL2: row.categoryL2 ?? null,
        brand: brand || null,
        image: image ?? null,
      }}
      {...(row.role ? { role: copy.rack.roles[row.role] } : {})}
      maker={shopMaker(row, brand)}
      dashed={!!proposal}
      meta={editing ? null : meta}
      action={actions}
      lines={
        markText || styled || mark?.kind === 'was' ? (
          <>
            {mark?.kind === 'was' ? <SwappedPill name={mark.name} image={wasImage} /> : null}
            {markText ? (
              <Text numberOfLines={1} tone="muted" style={{ fontSize: 11 }}>
                {markText}
              </Text>
            ) : null}
            {styled ? (
              <Text numberOfLines={1} tone="muted" italic style={{ fontSize: 11 }}>
                {styled}
              </Text>
            ) : null}
          </>
        ) : null
      }
      {...(onOpen && !onSwap && !onRemove ? { onOpen } : {})}
      openLabel={copy.rack.open(name)}
      highlight={changed}
      testID={`rack-row-${row.key}`}
    />
  );
  if (!editing) return card;
  return (
    <Animated.View style={{ transform: [{ rotate: jig }] }}>
      {card}
      {onRemove ? (
        <View className="absolute" style={{ left: -6, top: -6 }}>
          <EditDisc
            icon="close"
            label={copy.rack.remove(name)}
            onPress={onRemove}
            testID={`rack-remove-${row.key}`}
          />
        </View>
      ) : null}
    </Animated.View>
  );
}

// The rack row's meta (PRD §6.1, Annie 9 Nov): a wish carries a heart and its price, a piece to
// find a bag and its price, a piece she owns its wears.
function rackMeta(row: RackRow, wears: number | undefined): RowMeta | null {
  const proposal = row.proposal;
  if (proposal) {
    const price = proposal.pricePoint?.trim() || '';
    const said = proposal.wishlisted ? copy.rack.wishlist : copy.rack.notYours;
    return {
      icon: proposal.wishlisted ? 'heart' : 'bag',
      ...(price ? { text: price } : {}),
      label: [said, price].filter(Boolean).join(' · '),
    };
  }
  return wears === undefined
    ? null
    : { icon: 'calendar', text: String(wears), label: copy.meta.wears(wears) };
}
