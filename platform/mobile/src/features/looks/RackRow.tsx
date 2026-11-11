import type { PieceImage } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { nameNoBrand, type RackRow, type RowNote, theName } from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import { IconButton, Text, useColor } from '@robes/ui-native';
import { Pressable, View } from 'react-native';
import { CardRow, type RowMeta } from '@/features/wardrobe/PieceCard';

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
  const proposal = row.proposal;
  const meta = rackMeta(row, wears);
  const markText =
    mark?.kind === 'was'
      ? copy.rack.swappedIn(theName(mark.name))
      : mark?.kind === 'back'
        ? copy.rack.backIn
        : mark?.kind === 'added'
          ? copy.rack.added
          : null;
  const changed = mark?.kind === 'was' || mark?.kind === 'back' || mark?.kind === 'added';
  const actions =
    (proposal && onWish) || onSwap || onRemove ? (
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
  return (
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
      maker={brand || proposal?.retailerHint?.trim() || ''}
      dashed={!!proposal}
      meta={meta}
      action={actions}
      lines={
        markText || styled ? (
          <>
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
