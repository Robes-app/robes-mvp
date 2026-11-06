import { diary } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import { palette } from '@robes/tokens';
import { MIN_TOUCH, useColor } from '@robes/ui-native';
import { Image as ExpoImage } from 'expo-image';
import { Pressable, View } from 'react-native';

const BADGE = { width: 40, height: 38 };
const CARD = { width: 24, height: 31 };
const FACE_W = CARD.width * 4.5;
const FACE_H = FACE_W * 1.25;
export const FACE = {
  width: FACE_W,
  height: FACE_H,
  marginLeft: -(FACE_W - CARD.width) / 2,
  marginTop: -(FACE_H - CARD.height) * 0.09,
} as const;

// Felix's ModelStack (D10): at the photo's top left, 16 in — a tilted cream card with the camera
// behind a small portrait of the model her looks stand on, on a soft drop shadow. It opens the
// ModelPicker. Not shown once her digital twin stands. The web twin is
// app/src/components/home/model-stack.tsx.
export function ModelStack({
  portrait,
  onPress,
}: {
  portrait: string | null;
  onPress: () => void;
}) {
  const soft = useColor('ink-muted');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={diary.model.choose}
      onPress={onPress}
      hitSlop={(MIN_TOUCH - BADGE.height) / 2}
      testID="model-stack"
      className="absolute top-4 left-4"
      style={[
        BADGE,
        {
          shadowColor: palette.ink,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 6,
          shadowOpacity: 0.3,
        },
      ]}
    >
      <View
        className="absolute top-0 right-0 items-center justify-center rounded-xs bg-surface-sunk"
        style={[CARD, { transform: [{ rotate: '9deg' }] }]}
      >
        <Icon name="camera" size={15} color={soft} />
      </View>
      <View
        className="absolute bottom-0 left-0 overflow-hidden rounded-xs border-surface-raised bg-surface-sunk"
        style={[CARD, { borderWidth: 1.5 }]}
      >
        {portrait ? (
          // Cropped to the face, as Felix's `450% auto` at `50% 9%` on a full-length 4:5 photo.
          <ExpoImage
            source={{ uri: portrait }}
            contentFit="cover"
            accessible={false}
            style={FACE}
          />
        ) : null}
      </View>
    </Pressable>
  );
}
