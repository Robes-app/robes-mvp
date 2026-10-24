import type { Look } from '@robes/contracts';
import { Card, Image, Skeleton, Text } from '@robes/ui-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { renditionUri } from '@/lib/images';

// The look's picture: Robes' frame or her render, else her first piece.
export function lookHero(look: Look) {
  return look.image ?? look.pieces.find((p) => p.piece.image)?.piece.image ?? null;
}

// Just the photograph, at whatever width the surface gives it (a tile, a 34pt avatar in a row).
export function LookPhoto({ look, width }: { look: Look; width?: number }) {
  const image = lookHero(look);
  const uri = renditionUri(image, width ?? 180);
  return uri ? (
    <Image source={uri} alt="" blurhash={image?.blurhash} recyclingKey={look.id} />
  ) : (
    <Skeleton width="100%" aspectRatio={4 / 5} />
  );
}

export interface LookTileProps {
  look: Look;
  onPress?: () => void;
  label?: string;
  eyebrow?: string;
  meta?: string;
  name?: string;
  italic?: boolean;
  width?: number;
  selected?: boolean;
  disabled?: boolean;
  dashed?: boolean;
  dimmed?: boolean;
  // On the photograph (a diary door, a mark, the scan line) and in the corner (✕, ↻).
  onImage?: ReactNode;
  corner?: ReactNode;
  className?: string;
  testID?: string;
}

// ONE look card, every surface — the native twin of the web's LookTile: the photograph and what
// the look is held in one frame. Give it an eyebrow and a meta line; never redraw the anatomy.
export function LookTile({
  look,
  onPress,
  label,
  eyebrow,
  meta,
  name,
  italic = false,
  width,
  selected = false,
  disabled = false,
  dashed = false,
  dimmed = false,
  onImage,
  corner,
  className,
  testID,
}: LookTileProps) {
  const title = name ?? look.name;
  const frame = [
    'border',
    dashed ? 'border-[1.5px] border-dashed border-border-control' : '',
    selected ? 'border-ink' : dashed ? '' : 'border-hairline',
    dimmed ? 'opacity-60' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <View style={width ? { width } : undefined} className="relative">
      <Card
        className={frame}
        testID={testID}
        {...(onPress ? { onPress } : {})}
        disabled={disabled}
        accessibilityLabel={label ?? title}
        {...(selected || disabled ? { accessibilityState: { selected, disabled } } : {})}
      >
        <View>
          <LookPhoto look={look} width={width} />
          {onImage}
        </View>
        <View className="gap-1 p-3">
          {eyebrow ? (
            <Text size="caption" tone="muted" className="uppercase">
              {eyebrow}
            </Text>
          ) : null}
          <Text size="small" numberOfLines={1} italic={italic}>
            {title}
          </Text>
          {meta ? (
            <Text size="caption" tone="faint" numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
      </Card>
      {corner ? <View className="absolute top-2 right-2">{corner}</View> : null}
    </View>
  );
}
