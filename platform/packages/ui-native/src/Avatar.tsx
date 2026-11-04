import { Image as ExpoImage } from 'expo-image';
import { Text, View } from 'react-native';
import { cx } from './cx';
import { fonts, maxFontSizeMultiplier } from './scale';

const sizes = { sm: 32, md: 44, lg: 72 } as const;

export interface AvatarProps {
  name?: string | null;
  source?: string | null;
  size?: keyof typeof sizes;
  // `ring`: the header's quieter chrome (iOS navigation redline) — no fill, one italic initial.
  tone?: 'filled' | 'ring';
  // Defaults to the name; pass '' when a neighbouring label already names her.
  label?: string;
  className?: string;
  testID?: string;
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toLocaleUpperCase() ?? '')
    .join('');
}

export function Avatar({
  name,
  source,
  size = 'md',
  tone = 'filled',
  label,
  className,
  testID,
}: AvatarProps) {
  const px = sizes[size];
  const a11y = label ?? name ?? '';
  return (
    <View
      testID={testID}
      accessible={a11y !== ''}
      accessibilityRole={a11y ? 'image' : undefined}
      accessibilityLabel={a11y || undefined}
      className={cx(
        'items-center justify-center overflow-hidden rounded-pill border',
        tone === 'ring' ? 'border-border-control' : 'border-hairline bg-surface-sunk',
        className,
      )}
      style={{ width: px, height: px }}
    >
      {source ? (
        <ExpoImage
          source={{ uri: source }}
          contentFit="cover"
          accessible={false}
          style={{ width: px, height: px }}
        />
      ) : tone === 'ring' ? (
        <Text
          maxFontSizeMultiplier={maxFontSizeMultiplier.label}
          className="text-ink"
          // Nudged 1pt down to sit optically centred in the ring.
          style={{ fontFamily: fonts.displayRegularItalic, fontSize: 18, marginTop: 1 }}
        >
          {initials(name).slice(0, 1)}
        </Text>
      ) : (
        <Text
          maxFontSizeMultiplier={maxFontSizeMultiplier.label}
          className="text-ink-muted"
          style={{ fontFamily: fonts.sansMedium, fontSize: Math.round(px * 0.38) }}
        >
          {initials(name)}
        </Text>
      )}
    </View>
  );
}
