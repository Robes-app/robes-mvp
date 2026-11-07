import { queryKeys, useApiClient } from '@robes/api-client/react';
import type { Model } from '@robes/contracts';
import { diary } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import {
  ErrorText,
  FINE_EDGE,
  maxFontSizeMultiplier,
  Sheet,
  typeStyle,
  useColor,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { Image as ExpoImage } from 'expo-image';
import { Pressable, Text as RNText, ScrollView, View } from 'react-native';
import { useSelfie } from '@/features/you/use-selfie';
import { errorMessage } from '@/lib/errors';

const CARD = { width: 96, height: 120 };
const copy = diary.model;

// Felix's ModelPicker ("Your model", design 3a; D10): the body her looks are drawn on, opened
// from the ModelStack. One sideways row of 96×120 face-cropped cards, 10 apart: first "Use my
// likeness" (her selfie, the one door to her twin), then the five Robes models. A pick applies at
// once and is remembered as a pick. The web twin is app/src/components/home/model-picker.tsx.
export function ModelPicker({
  open,
  model,
  onClose,
}: {
  open: boolean;
  model: Model | undefined;
  onClose: () => void;
}) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const soft = useColor('ink-muted');
  const faint = useColor('ink-faint');
  const cream = useColor('bg');
  const selfie = useSelfie();
  const stand = model?.stand;
  // Ticked: the Robes model her looks stand on — the one she chose, or the first until she does.
  const chosen = stand && stand.on !== 'robes' ? null : (model?.preset ?? 1);
  const pick = (n: number) => {
    void api
      .call('me.model.update', { input: { preset: n } })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.model.get') });
        void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });
      })
      .catch((err) => toast.show({ message: errorMessage(err) }));
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow={copy.title}
      eyebrowTone="faint"
      closeButton
      testID="model-picker"
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-5"
        contentContainerClassName="gap-2.5 px-5 pb-2"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.own}
          accessibilityState={{ disabled: selfie.busy }}
          disabled={selfie.busy}
          onPress={() => {
            onClose();
            selfie.start();
          }}
          style={[CARD, { borderWidth: 1, borderStyle: 'dashed' }]}
          className="items-center justify-center gap-2 rounded-thumb border-cream400 bg-surface px-2"
          testID="model-own"
        >
          <View className="size-12 items-center justify-center rounded-pill bg-surface-raised">
            <Icon name="camera" size={22} color={soft} />
          </View>
          <RNText
            maxFontSizeMultiplier={maxFontSizeMultiplier.label}
            className="text-center text-ink-muted"
            style={typeStyle('label')}
          >
            {copy.own}
          </RNText>
        </Pressable>
        {(model?.robesModels ?? []).map((g, i) => {
          const on = g.n === chosen;
          return (
            <Pressable
              key={g.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={diary.dayOne.modelPick(g.n)}
              onPress={() => pick(g.n)}
              style={[CARD, { borderWidth: on ? 2 : FINE_EDGE }]}
              className={`overflow-hidden rounded-thumb bg-surface-sunk ${on ? 'border-ink' : 'border-rule-mid'}`}
              testID={`model-${i}`}
            >
              {g.imageUrl ? (
                <ExpoImage
                  source={{ uri: g.imageUrl }}
                  contentFit="cover"
                  contentPosition={{ top: '9%', left: '50%' }}
                  accessible={false}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Icon name="user" size={22} color={faint} />
                </View>
              )}
              {on ? (
                <View className="absolute top-1.5 right-1.5 size-5 items-center justify-center rounded-pill bg-ink">
                  <Icon name="check" size={11} color={cream} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
      {selfie.error ? <ErrorText>{selfie.error}</ErrorText> : null}
      {selfie.chooser}
    </Sheet>
  );
}
