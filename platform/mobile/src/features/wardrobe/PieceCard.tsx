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

function Eyebrow({ piece }: { piece: CardPiece }) {
  const eye = pieceEyebrow(piece);
  return (
    <Text
      numberOfLines={1}
      className="text-[9px] text-ink-faint uppercase"
      style={{ fontFamily: fonts.sans, letterSpacing: 1.6 }}
    >
      {eye.category}
      {eye.brand ? <Text className="text-accent-warm">{` · ${eye.brand}`}</Text> : null}
    </Text>
  );
}

function Name({ piece }: { piece: CardPiece }) {
  return (
    <Text
      numberOfLines={2}
      className="mt-1 text-lg text-ink"
      style={{ fontFamily: fonts.displayRegular, lineHeight: 22 }}
    >
      {nameWithoutBrand(piece.label, piece.brand)}
    </Text>
  );
}

function Status({ status }: { status: CardStatus }) {
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
      className={`text-[9px] uppercase ${status.warm ? 'text-accent-warm' : 'text-ink-muted'}`}
      style={{ fontFamily: fonts.sans, letterSpacing: 1.3 }}
    >
      {status.text}
    </Text>
  );
}

function Photo({ piece, width }: { piece: CardPiece; width: number }) {
  const uri = renditionUri(piece.image, width);
  if (!uri) return <Skeleton width="100%" aspectRatio={4 / 5} />;
  return <Image source={uri} alt="" blurhash={piece.image?.blurhash} recyclingKey={piece.id} />;
}

// The 40pt hairline star circle: on is warm, never black (legacy b4b051a).
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
  const size = tile ? 36 : 40;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={on ? copy.card.unstar(label) : copy.card.star(label)}
      accessibilityState={{ selected: on }}
      onPress={onToggle}
      hitSlop={(44 - size) / 2}
      style={{ width: size, height: size }}
      className={`items-center justify-center rounded-pill border ${
        on ? 'border-border-control bg-surface-sunk' : 'border-hairline bg-bg'
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
      hitSlop={2}
      className="h-10 items-center justify-center rounded-pill border border-hairline bg-bg px-4"
    >
      <Text className="text-[13px] text-ink" style={{ fontFamily: fonts.sans }}>
        {copy.card.bought}
      </Text>
    </Pressable>
  );
}

const OPEN_AT = 88;
const REMOVE_AT = 160;

// Swipe to let go (legacy _wrSwipeInit): past 44 it rests open at 88 over the Remove, past 160 it
// removes. Screen readers get Remove as an action on the row.
function SwipeRow({
  children,
  removeLabel,
  onRemove,
}: {
  children: ReactNode;
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
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_, g) =>
          x.setValue(Math.max(-REMOVE_AT - 20, Math.min(0, rest.current + g.dx))),
        onPanResponderRelease: (_, g) => {
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
    <View className="overflow-hidden rounded-crisp bg-accent-warm">
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
          {copy.card.swipeRemove}
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
  removeLabel,
  onRemove,
}: {
  piece: CardPiece;
  status: CardStatus;
  action: ReactNode;
  onOpen?: () => void;
  removeLabel: string;
  onRemove: () => void;
}) {
  const muted = useColor('ink-muted');
  return (
    <SwipeRow removeLabel={removeLabel} onRemove={onRemove}>
      <View className="flex-row gap-3 rounded-crisp border border-hairline bg-bg py-3.5 pr-2.5 pl-3">
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
              <Name piece={piece} />
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

// A grid tile: the same three lines under the photograph; the action sits on the photograph.
export function CardTile({
  piece,
  status,
  action,
  onOpen,
}: {
  piece: CardPiece;
  status: CardStatus;
  action: ReactNode;
  onOpen?: () => void;
}) {
  return (
    <View className="flex-1">
      <Pressable
        accessibilityRole={onOpen ? 'button' : undefined}
        accessibilityLabel={piece.label}
        onPress={onOpen}
        disabled={!onOpen}
      >
        <View className="overflow-hidden rounded-crisp border border-hairline">
          <Photo piece={piece} width={180} />
        </View>
        <View className="gap-0.5 px-0.5 pt-2.5">
          <Eyebrow piece={piece} />
          <Name piece={piece} />
          <View className="mt-1.5">
            <Status status={status} />
          </View>
        </View>
      </Pressable>
      <View className="absolute top-2 right-2">{action}</View>
    </View>
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
      className="min-h-[52px] flex-row items-center justify-center gap-2 rounded-crisp border border-dashed border-border-control"
    >
      <Icon name="plus" size={16} color={muted} />
      <Text className="text-xs text-ink-muted" style={{ fontFamily: fonts.sans }}>
        {label}
      </Text>
    </Pressable>
  );
}
