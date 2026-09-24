import type { ReactNode } from 'react';
import { Pressable, Text, TextInput, type TextInputProps, View } from 'react-native';

// Interim primitives until @robes/ui-native lands in M2.
export function Field({
  label,
  error,
  ...input
}: TextInputProps & { label: string; error?: string | null }) {
  return (
    <View className="gap-2">
      <Text className="text-xs uppercase tracking-widest text-ink-muted">{label}</Text>
      <TextInput
        {...input}
        accessibilityLabel={label}
        placeholderTextColor="#74664A"
        className="rounded-crisp border border-border-control bg-surface px-4 py-3 text-base text-ink"
      />
      {error ? (
        <Text accessibilityRole="alert" className="text-sm text-danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function PrimaryButton({
  children,
  onPress,
  disabled,
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      className={`min-h-11 items-center justify-center rounded-pill bg-ink px-6 py-3 ${disabled ? 'opacity-50' : ''}`}
    >
      <Text className="text-sm font-medium text-bg">{children}</Text>
    </Pressable>
  );
}

export function TextButton({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className="min-h-11 justify-center">
      <Text className="text-sm text-ink-muted underline">{children}</Text>
    </Pressable>
  );
}
