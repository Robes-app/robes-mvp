import { Icon } from '@robes/icons/native';
import { forwardRef } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';
import { useColor } from './color';
import { cx } from './cx';
import { fonts, maxFontSizeMultiplier } from './scale';
import { Eyebrow, Text } from './Text';

export interface FieldProps extends Omit<TextInputProps, 'accessibilityLabel'> {
  label: string;
  error?: string | null;
  hint?: string;
  multiline?: boolean;
}

// Visible 3:1 control border (border-control); errors pair danger text with an icon.
export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, error, hint, className, style, multiline, ...input },
  ref,
) {
  const danger = useColor('danger');
  return (
    <View className="gap-2">
      <Eyebrow>{label}</Eyebrow>
      <TextInput
        ref={ref}
        {...input}
        multiline={multiline}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        accessibilityState={{ disabled: input.editable === false }}
        maxFontSizeMultiplier={maxFontSizeMultiplier.control}
        placeholderTextColorClassName="accent-ink-faint"
        className={cx(
          'min-h-11 rounded-crisp border bg-surface px-4 py-3 text-base text-ink',
          error ? 'border-danger' : 'border-border-control',
          multiline && 'min-h-24',
          className,
        )}
        style={[{ fontFamily: fonts.sans, textAlignVertical: multiline ? 'top' : 'center' }, style]}
      />
      {error ? (
        <View className="flex-row items-center gap-2">
          <Icon name="alert" size={16} color={danger} />
          <Text
            size="small"
            tone="danger"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text size="small" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
