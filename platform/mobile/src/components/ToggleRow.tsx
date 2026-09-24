import { MIN_TOUCH, Text, useColor } from '@robes/ui-native';
import { Switch, View } from 'react-native';

export function ToggleRow({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const ink = useColor('ink');
  const track = useColor('border-control');
  return (
    <View
      className="flex-row items-center justify-between gap-4 border-b border-hairline py-3"
      style={{ minHeight: MIN_TOUCH }}
    >
      <View className="flex-1 gap-1">
        <Text>{label}</Text>
        {hint ? (
          <Text size="small" tone="muted">
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: ink, false: track }}
      />
    </View>
  );
}
