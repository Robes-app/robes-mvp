import { Icon } from '@robes/icons/native';
import { forwardRef } from 'react';
import { TextInput, type TextInputInstance, type TextInputProps, View } from 'react-native';
import { useColor } from './color';
import { cx } from './cx';
import { fonts, maxFontSizeMultiplier } from './scale';
import { Eyebrow, Text } from './Text';

export interface FieldProps extends Omit<TextInputProps, 'accessibilityLabel'> {
  label: string;
  error?: string | null;
  hint?: string;
  multiline?: boolean;
  // The notebook line: the screen's question names the field, her answer is in Cormorant.
  variant?: 'box' | 'underline';
  // The sheet's title already names the field, so no eyebrow repeats it (web twin: labelHidden).
  labelHidden?: boolean;
}

// Visible 3:1 control border (border-control); errors pair danger text with an icon.
export const Field = forwardRef<TextInputInstance, FieldProps>(function Field(
  {
    label,
    error,
    hint,
    className,
    style,
    multiline,
    variant = 'box',
    labelHidden = false,
    ...input
  },
  ref,
) {
  const danger = useColor('danger');
  return (
    <View className="gap-2">
      {variant === 'box' && !labelHidden ? <Eyebrow>{label}</Eyebrow> : null}
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
          variant === 'underline'
            ? 'min-h-11 border-b py-2 text-3xl text-ink'
            : 'min-h-11 rounded-input border bg-surface-raised px-4 py-3 text-base text-ink',
          error ? 'border-danger' : 'border-border-control',
          multiline && 'min-h-24',
          className,
        )}
        style={[
          {
            fontFamily: variant === 'underline' ? fonts.display : fonts.sans,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          style,
        ]}
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
