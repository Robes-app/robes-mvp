import { useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { cx } from './cx';
import { fonts, HEADING_MIN_SIZE, MIN_TOUCH, maxFontSizeMultiplier } from './scale';

const family = {
  light: { roman: fonts.display, italic: fonts.displayItalic },
  regular: { roman: fonts.displayRegular, italic: fonts.displayRegularItalic },
} as const;

export interface InlineTitleFieldProps {
  // The title as it stands. With onChange the field is controlled by it.
  value: string;
  // The accessible name: the control carries the ask, so there is no visible label.
  label: string;
  placeholder?: string;
  maxLength?: number;
  // Match the title it replaces (its size and face) so nothing moves when editing starts.
  size?: number;
  italic?: boolean;
  weight?: 'light' | 'regular';
  align?: 'start' | 'center';
  // Opened by a pencil: focused with the title selected. A title that is always the field (the
  // draft composer's) passes false.
  autoFocus?: boolean;
  // A title that can't be empty (a saved look's name): an empty value cancels instead.
  required?: boolean;
  onChange?: (value: string) => void;
  // Done or blur: the trimmed value. An empty required value: onCancel.
  // Optional only for a standing title whose name rides with the page's Save.
  onCommit?: (value: string) => void;
  onCancel?: () => void;
  testID?: string;
}

// The title itself becomes the field (beta's .rb-tb-title-in): transparent, the serif at the
// title's size, one underline — no label, no Save or Cancel. Focus is the underline going ink
// and doubling, never a box; the padding gives back the extra pixel so nothing shifts.
// Web twin: packages/ui/src/inline-title-field.tsx.
export function InlineTitleField({
  value,
  label,
  placeholder,
  maxLength = 120,
  size = 36,
  italic = false,
  weight = 'light',
  align = 'start',
  autoFocus = true,
  required = false,
  onChange,
  onCommit,
  onCancel,
  testID,
}: InlineTitleFieldProps) {
  const [own, setOwn] = useState(value);
  const text = onChange ? value : own;
  const [focused, setFocused] = useState(false);
  // One ending per edit: submit blurs the field, and that blur must not end it twice.
  const done = useRef(false);

  function finish() {
    if (done.current) return;
    done.current = true;
    const next = text.trim();
    if (required && !next) onCancel?.();
    else onCommit?.(next);
  }

  return (
    <TextInput
      autoFocus={autoFocus}
      selectTextOnFocus={autoFocus}
      testID={testID}
      accessibilityLabel={label}
      value={text}
      onChangeText={onChange ?? setOwn}
      placeholder={placeholder}
      maxLength={maxLength}
      returnKeyType="done"
      submitBehavior="blurAndSubmit"
      onSubmitEditing={finish}
      onFocus={() => {
        done.current = false;
        setFocused(true);
      }}
      onBlur={() => {
        setFocused(false);
        finish();
      }}
      maxFontSizeMultiplier={maxFontSizeMultiplier.heading}
      placeholderTextColorClassName="accent-ink-faint"
      className={cx(
        'min-w-0 bg-transparent px-0 pt-0 text-ink',
        // Beside a pencil it takes the row; centred under an eyebrow it takes the width.
        align === 'center' ? 'w-full text-center' : 'flex-1',
        focused ? 'border-b-2 border-ink pb-[3px]' : 'border-b border-border-control pb-1',
      )}
      style={{
        minHeight: MIN_TOUCH,
        fontSize: Math.max(size, HEADING_MIN_SIZE),
        fontFamily: family[weight][italic ? 'italic' : 'roman'],
      }}
    />
  );
}
