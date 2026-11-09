import type { PieceImage } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { nameNoBrand, type RackRow, type RowNote, theName } from '@robes/core/looks';
import { pieceEyebrow } from '@robes/core/wardrobe';
import { Icon } from '@robes/icons/native';
import { shadowNative } from '@robes/tokens';
import { fonts, IconButton, Image, maxFontSizeMultiplier, Text, useColor } from '@robes/ui-native';
import { Pressable, View } from 'react-native';
import { renditionUri } from '@/lib/images';

// The canvas row: 65 tall at rest, the photo 52 wide (4:5).
const ROW_HEIGHT = 65;
const THUMB = 52;

export type RowMark = RowNote | { kind: 'added' };

// A row's action (swap, remove): a 32pt `cream-200` disc with an `ink-soft` glyph, in a 44pt hit area.
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

// One piece on a look's rack, drawn as the Front Door canvas's row (PRD §6.1): its own lifted white
// card, the photo flush left at 52 wide, then the category (and the piece's role) in small caps,
// the serif name on one line and the brand under it; at the right the wears behind a calendar, or
// a piece to find's price behind a bag, then ›. The whole card opens the piece; in pencil mode the
// hanger swaps it and × takes it off, and ♡ saves a piece to find to her wishlist. A row the prompt
// changed reads warm with an ink dot at its edge. Web twin: rack-row.tsx.
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
}: {
  row: RackRow;
  image?: PieceImage | null;
  mark?: RowMark | null;
  styled?: string | null;
  // The piece's own wear count, on a saved look at rest (beta's ledger, L19).
  wears?: number;
  onOpen?: () => void;
  onSwap?: () => void;
  onWish?: () => void;
  onRemove?: () => void;
}) {
  const brand = row.brand?.trim() || '';
  const name = nameNoBrand(row.name, brand);
  const uri = renditionUri(image, 52);
  const proposal = row.proposal;
  const faint = useColor('ink-faint');
  const eye = pieceEyebrow({
    category: row.category,
    categoryL2: row.categoryL2 ?? null,
    brand: null,
  });
  const eyebrow = [eye.category, row.role ? copy.rack.roles[row.role] : '']
    .filter(Boolean)
    .join(' · ');
  // A piece to find names where it's from when it has no brand.
  const maker = brand || proposal?.retailerHint?.trim() || '';
  const price = proposal?.pricePoint?.trim() || '';
  const changed = mark?.kind === 'was' || mark?.kind === 'back' || mark?.kind === 'added';
  const markText =
    mark?.kind === 'was'
      ? copy.rack.swappedIn(theName(mark.name))
      : mark?.kind === 'back'
        ? copy.rack.backIn
        : mark?.kind === 'added'
          ? copy.rack.added
          : null;
  const resting = onOpen && !onSwap && !onRemove;
  return (
    <View
      className={`rounded-[3px] ${changed ? 'bg-selected' : 'bg-surface-raised'}`}
      style={shadowNative.row}
    >
      {changed ? (
        <View
          accessibilityElementsHidden
          className="absolute z-10 size-2 rounded-pill bg-ink"
          style={{ left: -4, top: '50%', marginTop: -4 }}
        />
      ) : null}
      <Pressable
        accessibilityRole={onOpen ? 'button' : undefined}
        accessibilityLabel={onOpen ? copy.rack.open(name) : name}
        onPress={onOpen}
        disabled={!onOpen}
        testID={`rack-row-${row.key}`}
        className="flex-row items-center gap-3 overflow-hidden rounded-[3px] pr-3"
        style={{ minHeight: ROW_HEIGHT }}
      >
        <View
          className={`justify-center self-stretch overflow-hidden bg-surface-sunk ${proposal ? 'border border-dashed border-selected-line' : ''}`}
          style={{ width: THUMB }}
        >
          {uri ? (
            <Image source={uri} alt="" aspect="4:5" blurhash={image?.blurhash} />
          ) : (
            <View className="items-center justify-center" style={{ aspectRatio: 4 / 5 }}>
              <Text size="small" tone="muted">
                {name.charAt(0)}
              </Text>
            </View>
          )}
        </View>
        <View className="flex-1 py-2.5">
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={maxFontSizeMultiplier.label}
            className="text-ink-faint uppercase"
            style={{ fontFamily: fonts.sansMedium, fontSize: 9, letterSpacing: 1.6 }}
          >
            {eyebrow}
          </Text>
          <Text
            numberOfLines={1}
            className="mt-0.5 text-ink"
            style={{ fontFamily: fonts.displayRegular, fontSize: 16, lineHeight: 20 }}
          >
            {name}
          </Text>
          {maker ? (
            <Text numberOfLines={1} className="text-ink-faint" style={{ fontSize: 11 }}>
              {maker}
            </Text>
          ) : null}
          {markText ? (
            <Text numberOfLines={1} className="text-ink-muted" style={{ fontSize: 11 }}>
              {markText}
            </Text>
          ) : null}
          {styled ? (
            <Text numberOfLines={1} tone="muted" italic style={{ fontSize: 11 }}>
              {styled}
            </Text>
          ) : null}
        </View>
        {proposal ? (
          <View
            accessible
            accessibilityLabel={[
              proposal.wishlisted ? copy.rack.wishlist : copy.rack.notYours,
              price,
            ]
              .filter(Boolean)
              .join(' · ')}
            className="flex-row items-center gap-1"
          >
            <Icon name="bag" size={12} color={faint} />
            {price ? (
              <Text className="text-ink-faint" style={{ fontSize: 11 }}>
                {price}
              </Text>
            ) : null}
          </View>
        ) : wears !== undefined ? (
          <View
            accessible
            accessibilityLabel={copy.meta.wears(wears)}
            className="flex-row items-center gap-1"
          >
            <Icon name="calendar" size={12} color={faint} />
            <Text className="text-ink-faint" style={{ fontSize: 11 }}>
              {wears}
            </Text>
          </View>
        ) : null}
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
        {resting ? <Icon name="forward" size={14} color={faint} /> : null}
      </Pressable>
    </View>
  );
}
