import type { Piece, PieceImage } from '@robes/contracts';
import { lookbook as copy, ui } from '@robes/copy';
import { nameNoBrand, type RackRow, rowKind } from '@robes/core/looks';
import { Icon, type IconName } from '@robes/icons/native';
import { fonts, IconButton, Image, useColor } from '@robes/ui-native';
import { Pressable, Text, View } from 'react-native';
import { CardRow, type RowMeta } from '@/features/wardrobe/PieceCard';
import { pieceSource } from '@/lib/images';

const found = copy.draftLook.capture;

// A row's one control: a 32pt `cream-200` disc with its glyph, in a 44pt hit area. `plus` marks
// the hanger that files a found piece.
function Disc({
  icon,
  label,
  plus = false,
  onPress,
  testID,
}: {
  icon: IconName;
  label: string;
  plus?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const ink = useColor('ink');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      className="items-center justify-center"
      style={{ width: 44, height: 44 }}
    >
      <View
        className="items-center justify-center rounded-pill bg-surface-sunk"
        style={{ width: 32, height: 32 }}
      >
        <Icon name={icon} size={15} color={ink} />
        {plus ? (
          <View className="absolute" style={{ right: 3, top: 3 }}>
            <Icon name="plus" size={8} color={ink} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

// A Shop piece (one Robes proposes new, not a wish or a found piece) reads "{brand} · Shop" in
// every context (docked prompt PRD W6); a piece found in her photograph says so; anything else
// its brand, or a find's retailer. Web twin: rack-row.tsx makerOf.
function makerOf(row: RackRow, brand: string): string {
  const p = row.proposal;
  if (p?.capture) return found.card.eyebrow;
  const maker = brand || p?.retailerHint?.trim() || '';
  return p && !p.wishlisted && maker ? copy.rack.shop(maker) : maker;
}

// Her piece a found row looks like, under the row's hairline (decision 13, Annie 27 Nov): the
// tick makes the match, × says it is not that piece, on this look.
export interface RowSuggestion {
  piece: Piece;
  onMatch: () => void;
  onDismiss: () => void;
}

function LooksLike({ rowKey, suggestion }: { rowKey: string; suggestion: RowSuggestion }) {
  const { piece } = suggestion;
  const { uri, fit } = pieceSource(piece.image, 28);
  return (
    <View className="flex-row items-center gap-2.5">
      <View
        className="overflow-hidden bg-surface-sunk"
        style={{ width: 28, height: 35, borderRadius: 2 }}
      >
        {uri ? <Image source={uri} alt="" aspect="4:5" contentFit="cover" {...fit} /> : null}
      </View>
      <View className="flex-1" style={{ gap: 2 }}>
        <Text className="text-ink-faint" style={{ fontFamily: fonts.sans, fontSize: 10.5 }}>
          {found.row.looksLike}
        </Text>
        <Text
          numberOfLines={1}
          className="text-ink"
          style={{ fontFamily: fonts.sans, fontSize: 12.5 }}
        >
          {piece.label}
        </Text>
      </View>
      <View className="flex-row items-center" style={{ marginRight: -6, marginVertical: -6 }}>
        <Disc
          icon="check"
          label={found.row.quick}
          onPress={suggestion.onMatch}
          testID={`capture-quick-match-${rowKey}`}
        />
        <Disc
          icon="close"
          label={ui.dismiss}
          onPress={suggestion.onDismiss}
          testID={`capture-dismiss-${rowKey}`}
        />
      </View>
    </View>
  );
}

// One piece on a look's rack (Annie, 27 Nov): the shared piece row (CardRow, PRD §6.1). A tap
// opens the piece's own page; a swipe takes it off this look; and at the right is the one control
// its kind takes (`rowKind`): the hanger swaps a piece she owns; a piece found in her photograph
// has the heart that saves it to her wishlist and the hanger + that opens its sheet; a wish reads
// its price behind its heart; a piece Robes proposes its price and a heart. A dashed thumbnail is
// not hers yet. A row the prompt changed reads warm with an ink dot at its edge.
// Web twin: rack-row.tsx.
export function RackRowCard({
  row,
  image,
  highlight = false,
  onOpen,
  onSwap,
  onFile,
  onWish,
  onRemove,
  suggestion,
}: {
  row: RackRow;
  image?: PieceImage | null;
  highlight?: boolean;
  onOpen?: () => void;
  // The hanger on a piece she owns: the picker, to swap it.
  onSwap?: () => void;
  // The hanger + on a found piece: its sheet.
  onFile?: () => void;
  // The heart on a piece that is not hers yet.
  onWish?: () => void;
  // The swipe: off this look, never out of her wardrobe.
  onRemove?: () => void;
  suggestion?: RowSuggestion | null;
}) {
  const brand = row.brand?.trim() || '';
  const name = nameNoBrand(row.name, brand);
  const kind = rowKind(row);
  const heart =
    onWish && (kind === 'found' || kind === 'shop') ? (
      <IconButton
        icon="heart"
        label={copy.rack.save(name)}
        onPress={onWish}
        tone="ink-muted"
        testID={`rack-wish-${row.key}`}
      />
    ) : null;
  const disc =
    kind === 'owned' && onSwap ? (
      <Disc
        icon="wardrobe"
        label={copy.rack.swap(name)}
        onPress={onSwap}
        testID={`rack-swap-${row.key}`}
      />
    ) : kind === 'found' && onFile ? (
      <Disc
        icon="wardrobe"
        plus
        label={found.row.add}
        onPress={onFile}
        testID={`rack-file-${row.key}`}
      />
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
      maker={makerOf(row, brand)}
      dashed={kind !== 'owned'}
      meta={rackMeta(row)}
      action={
        heart || disc ? (
          <View className="flex-row items-center">
            {heart}
            {disc}
          </View>
        ) : null
      }
      below={
        kind === 'found' && suggestion ? (
          <LooksLike rowKey={row.key} suggestion={suggestion} />
        ) : null
      }
      {...(onOpen ? { onOpen } : {})}
      openLabel={copy.rack.open(name)}
      highlight={highlight}
      {...(onRemove ? { swipe: { label: copy.rack.remove(name), onRemove } } : {})}
      testID={`${kind === 'found' ? 'capture' : 'rack'}-row-${row.key}`}
    />
  );
}

// The rack row's meta (PRD §6.1, Annie 9 Nov): a wish carries its heart and its price, a piece
// Robes proposes a bag and its price. A piece she owns or one from her photograph has none.
function rackMeta(row: RackRow): RowMeta | null {
  const proposal = row.proposal;
  if (!proposal || proposal.capture) return null;
  const price = proposal.pricePoint?.trim() || '';
  const said = proposal.wishlisted ? copy.rack.wishlist : copy.rack.notYours;
  return {
    icon: proposal.wishlisted ? 'heart' : 'shop',
    ...(price ? { text: price } : {}),
    label: [said, price].filter(Boolean).join(' · '),
  };
}
