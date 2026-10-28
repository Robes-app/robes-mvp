import type { Look } from '@robes/contracts';
import {
  ASPECTS,
  type Aspect,
  Card,
  Eyebrow,
  fonts,
  Image,
  maxFontSizeMultiplier,
  Skeleton,
} from '@robes/ui-native';
import type { ReactNode } from 'react';
import { Text as RNText, View } from 'react-native';
import { renditionUri } from '@/lib/images';

// The look's picture: Robes' frame or her render, else her first piece.
export function lookHero(look: Look) {
  return look.image ?? look.pieces.find((p) => p.piece.image)?.piece.image ?? null;
}

// Just the photograph, at whatever width the surface gives it (a tile, a 34pt avatar in a row),
// in the surface's shape: 3:4 in the Lookbook grid and on a day (beta), 4:5 elsewhere.
export function LookPhoto({
  look,
  width,
  aspect = '4:5',
}: {
  look: Look;
  width?: number;
  aspect?: Aspect;
}) {
  const image = lookHero(look);
  const uri = renditionUri(image, width ?? 180);
  return uri ? (
    <Image source={uri} alt="" aspect={aspect} blurhash={image?.blurhash} recyclingKey={look.id} />
  ) : (
    <Skeleton width="100%" aspectRatio={ASPECTS[aspect]} />
  );
}

export interface LookTileProps {
  look: Look;
  // The photograph's shape on this surface (twin: look-tile.tsx).
  aspect?: Aspect;
  onPress?: () => void;
  label?: string;
  eyebrow?: string;
  // Rose marks Robes' hand or something unfinished (Draft); the default is faint.
  eyebrowTone?: 'faint' | 'warm';
  // A small warm chip at the eyebrow's right: Worn ✓ on a day she wore it.
  badge?: string | null;
  meta?: string;
  // The look's first tag, a small chip between the title and the meta (Look redline 27 Oct).
  tag?: string | null;
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
  aspect = '4:5',
  onPress,
  label,
  eyebrow,
  eyebrowTone = 'faint',
  badge,
  meta,
  tag,
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
  // Beta's card: white on a hairline (Card), the dashed draft on the fine rule-mid edge.
  const frame = [
    dashed ? 'border-dashed border-rule-mid bg-transparent p-[6px]' : '',
    selected ? 'border-ink' : '',
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
        <View className={dashed ? 'overflow-hidden rounded-[8px]' : undefined}>
          <LookPhoto look={look} width={width} aspect={aspect} />
          {onImage}
        </View>
        <View className={dashed ? 'gap-px px-1 pt-2 pb-1' : 'gap-[2px] px-3 pt-[10px] pb-3'}>
          {eyebrow || badge ? (
            <View className="flex-row items-center justify-between gap-2">
              <Eyebrow
                numberOfLines={1}
                className={`flex-1 ${eyebrowTone === 'warm' ? 'text-accent-warm' : ''}`}
                style={{ fontSize: dashed ? 10 : 11 }}
              >
                {eyebrow ?? ''}
              </Eyebrow>
              {badge ? (
                <View className="rounded-pill border border-selected-line bg-selected px-2 py-px">
                  <RNText
                    maxFontSizeMultiplier={maxFontSizeMultiplier.label}
                    className="text-ink"
                    style={{ fontFamily: fonts.sans, fontSize: 10 }}
                  >
                    {badge}
                  </RNText>
                </View>
              ) : null}
            </View>
          ) : null}
          <RNText
            numberOfLines={1}
            maxFontSizeMultiplier={maxFontSizeMultiplier.heading}
            className="text-ink"
            style={{
              fontFamily: italic ? fonts.displayItalic : fonts.display,
              fontSize: dashed ? 18 : 20,
              lineHeight: dashed ? 22 : 23,
            }}
          >
            {title}
          </RNText>
          {tag ? (
            <View className="mt-1 mb-0.5 self-start rounded-pill border border-hairline bg-surface px-2 py-0.5">
              <RNText
                numberOfLines={1}
                maxFontSizeMultiplier={maxFontSizeMultiplier.label}
                className="text-ink-muted"
                style={{ fontFamily: fonts.sans, fontSize: 10 }}
              >
                {tag}
              </RNText>
            </View>
          ) : null}
          {meta ? (
            <RNText
              numberOfLines={1}
              maxFontSizeMultiplier={maxFontSizeMultiplier.label}
              className="text-ink-muted"
              style={{ fontFamily: fonts.sans, fontSize: 11 }}
            >
              {meta}
            </RNText>
          ) : null}
        </View>
      </Card>
      {corner ? <View className="absolute top-[6px] right-[6px]">{corner}</View> : null}
    </View>
  );
}
