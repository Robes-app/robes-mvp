import type { PieceImage } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { nameNoBrand, type RackRow, type RowNote, theName } from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import { IconButton, Image, Text, useColor } from '@robes/ui-native';
import { Pressable, View } from 'react-native';
import { Eyebrow, Name, Status } from '@/features/wardrobe/PieceCard';
import { renditionUri } from '@/lib/images';

export type RowMark = RowNote | { kind: 'added' };

// One piece on a look's rack, composed from the wardrobe row's lines (legacy fix 13): Category ·
// Brand, the name without its brand, then the role and the exception ("Not yours yet", a price).
// The whole card opens the piece; ♡ saves a proposal to her wishlist; ⇅ swaps it while editing.
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
  // The name is already stripped of its brand (nameNoBrand reads "… by Brand" too).
  const piece = { label: name, category: row.category, categoryL2: row.categoryL2 ?? null, brand };
  const ctx = [
    proposal ? (proposal.wishlisted ? copy.rack.wishlist : copy.rack.notYours) : null,
    proposal?.retailerHint || null,
    proposal?.pricePoint || null,
  ].filter(Boolean);
  const changed = mark?.kind === 'was' || mark?.kind === 'back' || mark?.kind === 'added';
  return (
    <Pressable
      accessibilityRole={onOpen ? 'button' : undefined}
      accessibilityLabel={onOpen ? copy.rack.open(name) : name}
      onPress={onOpen}
      disabled={!onOpen}
      testID={`rack-row-${row.key}`}
      className={`flex-row items-center gap-3 rounded-soft border px-3 py-3 ${changed ? 'border-selected-line bg-selected' : 'border-hairline bg-surface-raised'}`}
    >
      <View className="overflow-hidden rounded-crisp" style={{ width: 52 }}>
        {uri ? (
          <Image source={uri} alt="" aspect="4:5" blurhash={image?.blurhash} />
        ) : (
          <View
            className="items-center justify-center bg-surface-sunk"
            style={{ aspectRatio: 4 / 5 }}
          >
            <Text size="small" tone="muted">
              {name.charAt(0)}
            </Text>
          </View>
        )}
      </View>
      <View className="flex-1 gap-0.5">
        {/* The piece card's own lines (one anatomy with the wardrobe row; web twin rack-row.tsx):
            the sheet's eyebrow, the serif name, the role in rose as its status. */}
        <Eyebrow piece={piece} />
        <Name piece={piece} />
        {row.role ? <Status status={{ text: copy.rack.roles[row.role], warm: true }} /> : null}
        {wears !== undefined ? (
          <Text size="caption" tone="faint">
            {copy.meta.wears(wears)}
          </Text>
        ) : null}
        {ctx.length ? (
          <Text size="caption" tone="faint" numberOfLines={1}>
            {ctx.join(' · ')}
          </Text>
        ) : null}
        {mark?.kind === 'was' ? (
          <Text size="caption" tone="muted">
            {copy.rack.swappedIn(theName(mark.name))}
          </Text>
        ) : mark?.kind === 'back' ? (
          <Text size="caption" tone="muted">
            {copy.rack.backIn}
          </Text>
        ) : mark?.kind === 'added' ? (
          <Text size="caption" tone="muted">
            {copy.rack.added}
          </Text>
        ) : null}
        {styled ? (
          <Text size="caption" tone="muted" italic>
            {styled}
          </Text>
        ) : null}
      </View>
      <View className="flex-row items-center">
        {proposal && onWish ? (
          <IconButton
            icon="heart"
            label={copy.rack.save(name)}
            onPress={onWish}
            tone={proposal.wishlisted ? 'ink' : 'ink-muted'}
          />
        ) : null}
        {onSwap ? <IconButton icon="swap" label={copy.rack.swap(name)} onPress={onSwap} /> : null}
        {onRemove ? (
          <IconButton icon="close" label={copy.rack.remove(name)} onPress={onRemove} />
        ) : null}
        {onOpen && !onSwap && !onRemove ? <Icon name="forward" size={16} color={faint} /> : null}
      </View>
    </Pressable>
  );
}
