import { Image as ExpoImage } from 'expo-image';
import { Text, View } from 'react-native';
import { cx } from './cx';
import { fonts, maxFontSizeMultiplier } from './scale';

const sizes = { sm: 32, md: 44, lg: 72 } as const;
const NAV_SIZE = 30;

export interface AvatarProps {
  name?: string | null;
  source?: string | null;
  size?: keyof typeof sizes;
  // `nav`: Felix's top-bar avatar — a 30pt `sage-mid` disc with one Inter 500 initial at 11, no
  // edge (D6, 2026-11-06; it replaces the iOS navigation redline's ring). It ignores `size`.
  tone?: 'filled' | 'nav';
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
  const px = tone === 'nav' ? NAV_SIZE : sizes[size];
  const a11y = label ?? name ?? '';
  return (
    <View
      testID={testID}
      accessible={a11y !== ''}
      accessibilityRole={a11y ? 'image' : undefined}
      accessibilityLabel={a11y || undefined}
      className={cx(
        'items-center justify-center overflow-hidden rounded-pill',
        tone === 'nav' ? 'bg-sage-mid' : 'border border-hairline bg-surface-sunk',
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
      ) : tone === 'nav' ? (
        <Text
          maxFontSizeMultiplier={maxFontSizeMultiplier.label}
          className="text-ink"
          style={{ fontFamily: fonts.sansMedium, fontSize: 11, lineHeight: 11 }}
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
