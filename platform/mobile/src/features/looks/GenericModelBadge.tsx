import { useApi } from '@robes/api-client/react';
import { lookbook as copy } from '@robes/copy';
import { MIN_TOUCH, Text } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

// Robes' frame stands on a generic model until she has her own (legacy 0.4): the badge on the
// frame is the door to building it.
export function GenericModelBadge() {
  const router = useRouter();
  const { data: model } = useApi('me.model.get');
  if (!model || model.filed) return null;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={copy.deck.genericModelLabel}
      onPress={() => router.push('/you/model')}
      style={{ minHeight: MIN_TOUCH }}
      className="absolute top-3 right-3 justify-center rounded-pill border border-hairline bg-bg px-4"
    >
      <Text size="small">{copy.deck.genericModel}</Text>
    </Pressable>
  );
}
