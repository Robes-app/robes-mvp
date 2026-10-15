import { firstRun as copy } from '@robes/copy';
import { Button, Text } from '@robes/ui-native';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// The cream frame (legacy 1b/1c): back · wordmark · one three-segment rule (1 name, 2 piece,
// 3 filed) · the body · the footer.
export function FirstRunFrame({
  segs,
  onBack,
  children,
  footer,
}: {
  segs: number;
  onBack?: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 bg-bg px-6"
      style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}
    >
      <View className="min-h-11 flex-row items-center">
        <View className="flex-1 items-start">
          {onBack ? (
            <Button variant="quiet" onPress={onBack}>
              {copy.back}
            </Button>
          ) : null}
        </View>
        <Text className="text-xl">{copy.wordmark}</Text>
        <View className="flex-1" />
      </View>
      <View
        className="mt-3 flex-row gap-1.5"
        accessibilityRole="progressbar"
        accessibilityLabel={copy.progress(segs, 3)}
        accessibilityValue={{ min: 1, max: 3, now: segs }}
      >
        {[1, 2, 3].map((n) => (
          <View key={n} className={`h-px flex-1 ${n <= segs ? 'bg-ink' : 'bg-hairline'}`} />
        ))}
      </View>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 py-6"
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      <View className="gap-3">{footer}</View>
    </View>
  );
}
