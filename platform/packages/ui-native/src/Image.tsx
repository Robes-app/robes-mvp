import { Image as ExpoImage, type ImageContentFit } from 'expo-image';
import { View } from 'react-native';
import { cx } from './cx';

export const ASPECTS = { '4:5': 4 / 5, '1:1': 1, '3:4': 3 / 4 } as const;
export type Aspect = keyof typeof ASPECTS;

export interface ImageProps {
  source: string;
  // Empty string marks the image decorative.
  alt: string;
  aspect?: Aspect;
  blurhash?: string | null;
  contentFit?: ImageContentFit;
  recyclingKey?: string;
  className?: string;
  testID?: string;
}

// Fixed frame so the layout never shifts while the image or its placeholder loads.
export function Image({
  source,
  alt,
  aspect = '4:5',
  blurhash,
  contentFit = 'cover',
  recyclingKey,
  className,
  testID,
}: ImageProps) {
  const decorative = alt === '';
  return (
    <View
      testID={testID}
      // A contained photo sits on white (a cut-out's own ground); a cropped one never shows its frame.
      className={cx(
        'w-full overflow-hidden',
        contentFit === 'contain' ? 'bg-surface-raised' : 'bg-surface-sunk',
        className,
      )}
      style={{ aspectRatio: ASPECTS[aspect] }}
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={decorative ? undefined : alt}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
    >
      <ExpoImage
        source={{ uri: source }}
        placeholder={blurhash ? { blurhash } : undefined}
        placeholderContentFit={contentFit}
        contentFit={contentFit}
        recyclingKey={recyclingKey}
        transition={200}
        accessible={false}
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
}
