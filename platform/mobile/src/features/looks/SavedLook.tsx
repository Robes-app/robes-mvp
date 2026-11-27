import type { Look, PieceImage } from '@robes/contracts';
import { lookbook, looks as looksCopy } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import { photoSource, Text, useColor } from '@robes/ui-native';
import { Image as ExpoImage } from 'expo-image';
import { Pressable, View } from 'react-native';
import { renditionUri } from '@/lib/images';

const copy = lookbook.savedLook;

// The image-stack badge: three fanned cards (a dashed paper back card, the next photograph at 4°,
// the one in front) with an ink badge that counts her photographs, or reads + before the first.
export function ImageStack({ look, onOpen }: { look: Look; onOpen: () => void }) {
  const front = look.record === 'photo' ? (look.photo ?? look.model) : (look.model ?? look.photo);
  const next = look.images.find((i) => i.image.assetId !== front?.assetId)?.image ?? null;
  const count = look.images.length;
  const bg = useColor('bg');
  const uri = (img: PieceImage | null) => renditionUri(img, 48);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        count ? `${copy.images} · ${looksCopy.page.wears.count(count)}` : copy.images
      }
      onPress={onOpen}
      hitSlop={10}
      testID="saved-look-stack"
      className="absolute"
      style={{ right: 20, bottom: 18, width: 40, height: 38 }}
    >
      <View
        className="absolute overflow-hidden rounded-xs border-ink-faint bg-veil-paper"
        style={{
          left: 16,
          top: 0,
          width: 22,
          height: 29,
          borderWidth: 1,
          borderStyle: 'dashed',
          transform: [{ rotate: '9deg' }],
        }}
      />
      <View
        className="absolute overflow-hidden rounded-xs border-surface-raised bg-surface-sunk"
        style={{
          left: 9,
          top: 3,
          width: 22,
          height: 29,
          borderWidth: 1,
          transform: [{ rotate: '4deg' }],
        }}
      >
        {next ? <ExpoImage source={photoSource(uri(next) ?? '')} style={{ flex: 1 }} /> : null}
      </View>
      <View
        className="absolute overflow-hidden rounded-xs border-surface-raised bg-surface-sunk"
        style={{ left: 0, top: 7, width: 24, height: 31, borderWidth: 1.5 }}
      >
        {front ? (
          <ExpoImage
            source={photoSource(uri(front) ?? '')}
            contentPosition={{ top: '20%', left: '50%' }}
            style={{ flex: 1 }}
          />
        ) : null}
      </View>
      <View
        className="absolute items-center justify-center rounded-pill bg-ink px-1"
        style={{ top: -9, right: -9, minWidth: 20, height: 20, borderWidth: 1.5, borderColor: bg }}
      >
        {count ? (
          <Text className="text-bg" style={{ fontSize: 11, lineHeight: 13 }}>
            {count}
          </Text>
        ) : (
          <Icon name="plus" size={11} color={bg} />
        )}
      </View>
    </Pressable>
  );
}
