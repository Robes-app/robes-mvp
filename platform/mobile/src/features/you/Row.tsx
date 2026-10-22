import { Icon } from '@robes/icons/native';
import { MIN_TOUCH, Text, useColor } from '@robes/ui-native';
import { Pressable, View } from 'react-native';

export function Row({
  label,
  onPress,
  tone,
  sub,
}: {
  label: string;
  onPress: () => void;
  tone?: 'danger';
  sub?: string;
}) {
  const muted = useColor('ink-muted');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ minHeight: MIN_TOUCH }}
      className="flex-row items-center justify-between border-b border-hairline py-4"
    >
      <View className="flex-1 gap-0.5">
        <Text tone={tone}>{label}</Text>
        {sub ? (
          <Text size="small" tone="muted">
            {sub}
          </Text>
        ) : null}
      </View>
      <Icon name="forward" color={muted} size={20} />
    </Pressable>
  );
}
