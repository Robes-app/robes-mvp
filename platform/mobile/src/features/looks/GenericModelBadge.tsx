import { useApi } from '@robes/api-client/react';
import { lookbook as copy } from '@robes/copy';
import { Button, MIN_TOUCH, PrimaryScope, Sheet, Text } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

// Robes' frame stands on a generic model until she has her own (legacy 0.4): the badge on the
// frame is the door to building it — and it opens a sheet, never a navigation, so an undecided
// deck is never thrown away by a tap.
export function GenericModelBadge() {
  const router = useRouter();
  const { data: model } = useApi('me.model.get');
  const [open, setOpen] = useState(false);
  if (!model || model.filed) return null;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.deck.genericModelLabel}
        onPress={() => setOpen(true)}
        style={{ minHeight: MIN_TOUCH }}
        className="absolute top-3 right-3 flex-row items-center justify-center gap-2 rounded-pill border border-hairline bg-bg px-4"
      >
        <View className="h-1.5 w-1.5 rounded-pill bg-ink-faint" />
        <Text size="small">{copy.deck.genericModel}</Text>
        <Text size="small" tone="faint">
          ›
        </Text>
      </Pressable>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        eyebrow={copy.deck.twin.eyebrow}
        title={`${copy.deck.twin.title} ${copy.deck.twin.titleEm}`}
        testID="twin-sheet"
      >
        <View className="gap-4 pb-6">
          <Text tone="muted">{copy.deck.twin.body}</Text>
          <PrimaryScope>
            <Button onPress={() => router.push('/you/model')}>{copy.deck.twin.upload}</Button>
            <Button variant="quiet" onPress={() => setOpen(false)}>
              {copy.deck.twin.keep}
            </Button>
          </PrimaryScope>
        </View>
      </Sheet>
    </>
  );
}
