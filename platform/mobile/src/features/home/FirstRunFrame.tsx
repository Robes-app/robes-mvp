import { FIRST_RUN_STEPS } from '@robes/contracts';
import { firstRun as copy } from '@robes/copy';
import { Em, fonts, Heading, maxFontSizeMultiplier, useColor } from '@robes/ui-native';
import type { ReactNode } from 'react';
import { Pressable, Text as RNText, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STEPS = FIRST_RUN_STEPS.length;

// The step chrome (onboarding handoff 30 Oct, eight steps since the onboarding PRD of 17 Nov; twin:
// app/src/app/onboarding/onboarding-form.tsx Frame): back · the eyebrow · one hairline segment per
// step, never a number on screen (R-S1) · the title · the body · the step's one action docked
// above a hairline, Skip under it on a capture step (R-S2).
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
  const rose = useColor('accent-warm');
  const ink = useColor('ink');
  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 4 }}>
      <View className="min-h-11 flex-row items-center px-3.5">
        <View className="w-16 items-start">
          {onBack ? (
            // The design's back: a 32pt white circle on a hairline, in a 44pt target.
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.backLabel}
              onPress={onBack}
              className="size-11 items-center justify-center"
            >
              <View className="size-8 items-center justify-center rounded-full border border-rule-mid bg-surface-raised">
                <RNText
                  allowFontScaling={false}
                  style={{
                    fontFamily: fonts.displayRegular,
                    fontSize: 20,
                    lineHeight: 22,
                    marginTop: -2,
                    marginRight: 1,
                    color: ink,
                  }}
                >
                  {copy.backGlyph}
                </RNText>
              </View>
            </Pressable>
          ) : null}
        </View>
        {/* Rose eyebrow, 500 9pt at .26em: the deep rose, the one that reads at 4.5:1 this small.
            Inline so Eyebrow's own grey never wins (redline audit 30 Oct). */}
        <RNText
          numberOfLines={1}
          maxFontSizeMultiplier={maxFontSizeMultiplier.label}
          style={{
            flex: 1,
            textAlign: 'center',
            textTransform: 'uppercase',
            fontFamily: fonts.sansMedium,
            fontSize: 9,
            letterSpacing: 9 * 0.26,
            color: rose,
          }}
        >
          {copy.eyebrow}
        </RNText>
        <View className="w-16" />
      </View>
      <View
        className="mt-3.5 flex-row gap-1.5 px-6"
        accessibilityRole="progressbar"
        accessibilityLabel={copy.progress(step, STEPS)}
        accessibilityValue={{ min: 1, max: STEPS, now: step }}
      >
        {FIRST_RUN_STEPS.map((_, i) => i + 1).map((n) => (
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
