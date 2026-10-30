import { firstRun as copy } from '@robes/copy';
import { Em, Eyebrow, Heading, IconButton } from '@robes/ui-native';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STEPS = 5;

// The step chrome (onboarding handoff 30 Oct; twin: app/src/app/onboarding/onboarding-form.tsx
// Frame): back · the eyebrow · five segments · the title · the body · one ink button docked above
// a hairline.
export function FirstRunFrame({
  step,
  title,
  titleEm,
  onBack,
  children,
  footer,
}: {
  step: number;
  title: string;
  titleEm: string;
  onBack?: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 4 }}>
      <View className="min-h-11 flex-row items-center px-3.5">
        <View className="w-16 items-start">
          {onBack ? <IconButton icon="back" label={copy.backLabel} onPress={onBack} /> : null}
        </View>
        <Eyebrow className="flex-1 text-center text-accent-warm" numberOfLines={1}>
          {copy.eyebrow}
        </Eyebrow>
        <View className="w-16" />
      </View>
      <View
        className="mt-3.5 flex-row gap-1.5 px-6"
        accessibilityRole="progressbar"
        accessibilityLabel={copy.progress(step, STEPS)}
        accessibilityValue={{ min: 1, max: STEPS, now: step }}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <View key={n} className={`h-px flex-1 ${n <= step ? 'bg-ink' : 'bg-hairline'}`} />
        ))}
      </View>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-7 px-6 pt-7 pb-6"
        keyboardShouldPersistTaps="handled"
      >
        <Heading style={{ fontSize: 30, lineHeight: 33 }}>
          {title} <Em>{titleEm}</Em>
        </Heading>
        {children}
      </ScrollView>
      <View
        className="gap-3 border-hairline border-t px-6 pt-3.5"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        {footer}
      </View>
    </View>
  );
}
