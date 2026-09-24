import { Icon } from '@robes/icons/native';
import { MIN_TOUCH, Text, useColor } from '@robes/ui-native';
import { Pressable } from 'react-native';

export function Row({
  label,
  onPress,
  tone,
}: {
  label: string;
  onPress: () => void;
  tone?: 'danger';
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
      <Text tone={tone}>{label}</Text>
      <Icon name="forward" color={muted} size={20} />
    </Pressable>
  );
}
