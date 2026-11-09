import type { PieceImage } from '@robes/contracts';
import { wardrobe as copy } from '@robes/copy';
import { nameWithoutBrand, pieceEyebrow } from '@robes/core/wardrobe';
import { Icon } from '@robes/icons/native';
import { fonts, Image, Skeleton, useColor } from '@robes/ui-native';
import { type ReactNode, useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';
import { renditionUri } from '@/lib/images';

export interface CardPiece {
  id: string;
  label: string;
  category: string;
  categoryL2: string | null;
  brand: string | null;
  image: PieceImage | null;
}

export interface CardStatus {
  text: string;
  // "Never worn" and a wish's "Not yours yet" read in the warm rose.
  warm: boolean;
  // A failed read is an error, not a label: sentence case, in danger, with its icon.
  error?: boolean;
}

// The card's lines, composed by every piece row (the wardrobe, the look's rack; web twin
// cardLines in app/src/components/wardrobe/piece-card.tsx).
type LinePiece = Pick<CardPiece, 'label' | 'category' | 'categoryL2' | 'brand'>;

// "BOTTOMS · M&S", the brand in rose (Front Door design 3b, plan 2026-11-03 §1.5).
export function Eyebrow({ piece }: { piece: LinePiece }) {
  const eye = pieceEyebrow(piece);
  return (
    <Text
      numberOfLines={1}
      className="text-[10px] text-ink-faint uppercase"
      style={{ fontFamily: fonts.sansRegular, letterSpacing: 2.2 }}
    >
      {eye.category}
      {eye.brand ? <Text className="text-accent-warm"> · {eye.brand}</Text> : null}
    </Text>
  );
}

export function Name({ piece }: { piece: LinePiece }) {
  return (
    <Text
      numberOfLines={2}
      className="text-ink"
      style={{ fontFamily: fonts.display, fontSize: 19, lineHeight: 22 }}
    >
      {nameWithoutBrand(piece.label, piece.brand)}
    </Text>
  );
}

export function Status({ status }: { status: CardStatus }) {
  const danger = useColor('danger');
  if (status.error) {
    return (
      <View className="flex-row items-center gap-1.5">
        <Icon name="alert" size={14} color={danger} />
        <Text className="text-xs text-danger" style={{ fontFamily: fonts.sans }}>
          {status.text}
        </Text>
      </View>
    );
  }
  return (
    <Text
      className={`text-[10px] uppercase ${status.warm ? 'text-accent-warm' : 'text-ink-muted'}`}
      style={{ fontFamily: fonts.sansRegular, letterSpacing: 2.2 }}
    >
      {status.text}
    </Text>
  );
}

function Photo({
  piece,
  width,
  aspect = '4:5',
  fit = 'cover',
}: {
  piece: CardPiece;
  width: number;
  aspect?: '4:5' | '3:4';
  fit?: 'cover' | 'contain';
}) {
  const uri = renditionUri(piece.image, width);
  if (!uri) return <Skeleton width="100%" aspectRatio={aspect === '3:4' ? 3 / 4 : 4 / 5} />;
  return (
    <Image
      source={uri}
      alt=""
      aspect={aspect}
      contentFit={fit}
      blurhash={piece.image?.blurhash}
      recyclingKey={piece.id}
    />
  );
}

// The hairline star circle (32pt on a tile, 40pt on a row; 44pt to the finger): on is raised on
// the warm edge, never black.
export function StarButton({
  label,
  on,
  onToggle,
  tile = false,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
  tile?: boolean;
}) {
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const size = tile ? 32 : 40;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={on ? copy.card.unstar(label) : copy.card.star(label)}
      accessibilityState={{ selected: on }}
      onPress={onToggle}
      hitSlop={(44 - size) / 2}
      style={{ width: size, height: size }}
      className={`items-center justify-center rounded-pill border ${
        on ? 'border-selected-line bg-selected' : 'border-hairline bg-surface-raised'
      }`}
    >
      <Icon name="star" size={tile ? 14 : 15} color={on ? ink : muted} filled={on} />
    </Pressable>
  );
}

export function BoughtButton({
  label,
  onBought,
  busy,
}: {
  label: string;
  onBought: () => void;
  busy: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copy.card.boughtLabel(label)}
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={onBought}
      hitSlop={(44 - 32) / 2}
      className="h-8 items-center justify-center rounded-pill border border-rule-mid bg-surface-raised px-3.5"
    >
      <Text className="text-xs text-ink-muted" style={{ fontFamily: fonts.sans }}>
        {copy.card.bought}
      </Text>
    </Pressable>
  );
}

const OPEN_AT = 88;
const REMOVE_AT = 160;

// Swipe to let go (legacy _wrSwipeInit): past 44 it rests open at 88 over the action, past 160 it
// acts; a tap on an open row closes it. The action reads Remove (a wish) or Delete (a piece she
// owns, which asks first). Screen readers get it as an action on the row.
function SwipeRow({
  children,
  removeText = copy.card.swipeRemove,
  removeLabel,
  onRemove,
}: {
  children: ReactNode;
  removeText?: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const rest = useRef(0);
  const remove = useRef(onRemove);
  remove.current = onRemove;
  const pan = useMemo(() => {
    const settle = (to: number) => {
      rest.current = to;
      Animated.spring(x, { toValue: to, useNativeDriver: true, bounciness: 0 }).start();
    };
    return {
      settle,
      responder: PanResponder.create({
        // An open row takes the tap that would open the piece, and closes.
        onStartShouldSetPanResponderCapture: () => rest.current !== 0,
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_, g) =>
          x.setValue(Math.max(-REMOVE_AT - 20, Math.min(0, rest.current + g.dx))),
        onPanResponderRelease: (_, g) => {
          if (rest.current !== 0 && Math.abs(g.dx) < 8) {
            settle(0);
            return;
          }
          const at = rest.current + g.dx;
          if (at <= -REMOVE_AT) {
            settle(0);
            remove.current();
          } else settle(at <= -44 ? -OPEN_AT : 0);
        },
        onPanResponderTerminate: () => settle(0),
      }),
    };
  }, [x]);
  return (
    <View className="overflow-hidden rounded-soft bg-accent-warm">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={removeLabel}
        onPress={() => {
          pan.settle(0);
          onRemove();
        }}
        className="absolute top-0 right-0 bottom-0 items-center justify-center"
        style={{ width: OPEN_AT }}
      >
        <Text
          className="text-[10px] text-bg uppercase"
          style={{ fontFamily: fonts.sansMedium, letterSpacing: 2 }}
        >
          {removeText}
        </Text>
      </Pressable>
      <Animated.View
        {...pan.responder.panHandlers}
        style={{ transform: [{ translateX: x }] }}
        accessibilityActions={[{ name: 'remove', label: removeLabel }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'remove') onRemove();
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

// The rack card as the wardrobe's row: 52 × 64 photo, eyebrow, serif name, status, action, ›.
export function CardRow({
  piece,
  status,
  action,
  onOpen,
  removeText,
  removeLabel,
  onRemove,
}: {
  piece: CardPiece;
  status: CardStatus;
  action: ReactNode;
  onOpen?: () => void;
  removeText?: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  const muted = useColor('ink-muted');
  return (
    <SwipeRow {...(removeText ? { removeText } : {})} removeLabel={removeLabel} onRemove={onRemove}>
      <View className="flex-row gap-3 rounded-soft border border-hairline bg-surface-raised py-3.5 pr-2.5 pl-3">
        <View style={{ width: 52 }} className="overflow-hidden rounded-[6px]">
          <Photo piece={piece} width={52} />
        </View>
        <View className="flex-1 justify-between">
          <View className="flex-row items-end gap-2">
            <Pressable
              accessibilityRole={onOpen ? 'button' : undefined}
              accessibilityLabel={piece.label}
              onPress={onOpen}
              disabled={!onOpen}
              className="flex-1"
            >
              <Eyebrow piece={piece} />
              <View className="mt-1">
                <Name piece={piece} />
              </View>
            </Pressable>
            <View className="flex-row items-center gap-1.5">
              {action}
              {onOpen ? <Icon name="forward" size={16} color={muted} /> : null}
            </View>
          </View>
          <View className="mt-2">
            <Status status={status} />
          </View>
        </View>
      </View>
    </SwipeRow>
  );
}

// A grid tile (beta's card): white on a hairline, the photograph on a 3:4 white mat, then the
// same three lines; the action sits on the photograph's corner.
export function CardTile({
  piece,
  status,
  action,
  onOpen,
  compact = false,
  onImage,
}: {
  piece: CardPiece;
  status: CardStatus;
  action?: ReactNode;
  onOpen?: () => void;
  // The Front Door's 3-up tile (PRD rev 3 §2.4): the photograph, the serif name on one line, the
  // meta; no eyebrow.
  compact?: boolean;
  // On the photograph (a wish's heart), bottom right.
  onImage?: ReactNode;
}) {
  return (
    <View className="flex-1 overflow-hidden rounded-soft border border-hairline bg-surface-raised">
      <Pressable
        accessibilityRole={onOpen ? 'button' : undefined}
        accessibilityLabel={piece.label}
        onPress={onOpen}
        disabled={!onOpen}
      >
        <View className={compact ? 'bg-surface-raised p-1.5' : 'bg-surface-raised p-3.5'}>
          <View className="overflow-hidden rounded-crisp">
            <Photo piece={piece} width={compact ? 120 : 180} aspect="3:4" fit="contain" />
          </View>
          {onImage ? <View className="absolute right-2 bottom-2">{onImage}</View> : null}
        </View>
        {compact ? (
          <View className="gap-[2px] px-2 pt-1.5 pb-2.5">
            <Text
              numberOfLines={1}
              className="text-ink"
              style={{ fontFamily: fonts.displayRegular, fontSize: 15, lineHeight: 19 }}
            >
              {nameWithoutBrand(piece.label, piece.brand)}
            </Text>
            <Status status={status} />
          </View>
        ) : (
          <View className="gap-[3px] px-3 pt-2.5 pb-3">
            <Eyebrow piece={piece} />
            <Name piece={piece} />
            <Status status={status} />
          </View>
        )}
      </Pressable>
      {action ? <View className="absolute top-1.5 right-1.5">{action}</View> : null}
    </View>
  );
}

// The filled heart on a wish's photograph (PRD rev 3 §7.2): a tap lets the wish go.
export function HeartButton({ label, onPress }: { label: string; onPress: () => void }) {
  const ink = useColor('ink');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={{ width: 28, height: 28 }}
      className="items-center justify-center rounded-pill bg-surface-raised/90"
    >
      <Icon name="heart" size={14} color={ink} filled />
    </Pressable>
  );
}

// The list ends on the dashed "+ Add a piece" row.
export function AddRow({ onPress, label }: { onPress: () => void; label: string }) {
  const muted = useColor('ink-muted');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-[52px] flex-row items-center justify-center gap-2 rounded-soft border border-dashed border-rule-mid"
    >
      <Icon name="plus" size={16} color={muted} />
      <Text className="text-xs text-ink-muted" style={{ fontFamily: fonts.sans }}>
        {label}
      </Text>
    </Pressable>
  );
}
