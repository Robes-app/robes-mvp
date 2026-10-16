import type { Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { Image, Skeleton, Text, useToast } from '@robes/ui-native';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { dayLabel, usePinLook } from '@/features/plan/plan';
import { renditionUri } from '@/lib/images';
import { useRequestFrame } from './look-states';

// "Saved to your lookbook", and the day her words named one tap away (never filed by itself).
export function useSavedToast() {
  const toast = useToast();
  const pin = usePinLook();
  return (look: Look) =>
    toast.show({
      message: copy.saved,
      ...(look.dateHint
        ? {
            action: {
              label: copy.savedFor(dayLabel(look.dateHint)),
              onPress: () =>
                void pin
                  .mutateAsync({
                    params: { id: look.id },
                    input: { dates: [look.dateHint ?? ''], slot: 'day' },
                  })
                  .then(() =>
                    toast.show({ message: copy.addedToDay(dayLabel(look.dateHint ?? '')) }),
                  )
                  .catch(() => undefined),
            },
          }
        : {}),
    });
}

export function LookPicture({ look }: { look: Look }) {
  const requestFrame = useRequestFrame();
  const asked = useRef(false);
  // A suggestion's frame is drawn when she first reaches it (UX-09).
  useEffect(() => {
    if (!look.image && look.setId && !look.framePending && !asked.current) {
      asked.current = true;
      requestFrame(look.id);
    }
  }, [look, requestFrame]);
  const uri = renditionUri(look.image, 360);
  return (
    <View className="gap-1">
      {uri ? (
        <Image source={uri} alt={copy.prompt.label(look.name)} blurhash={look.image?.blurhash} />
      ) : (
        <Skeleton width="100%" aspectRatio={4 / 5} />
      )}
      {look.framePending ? (
        <Text size="caption" tone="muted">
          {copy.suggestedTile.restyling}
        </Text>
      ) : look.composedByRobes ? (
        <Text size="caption" tone="faint" className="self-end">
          {copy.composedByRobes}
        </Text>
      ) : null}
    </View>
  );
}
