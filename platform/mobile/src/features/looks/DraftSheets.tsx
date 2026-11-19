import { ASK_MAX_CHARS } from '@robes/core/looks';
import { fonts, useColor, useSheetPresented } from '@robes/ui-native';
import { useEffect, useRef } from 'react';
import { TextInput, type TextInputInstance } from 'react-native';

// The sheet's one-line field: Cormorant italic 300 at 17pt, Send on the keyboard sends.
export function SheetField({
  label,
  placeholder,
  value,
  onChange,
  onSend,
  disabled,
  autoFocus = true,
  hardLimit = true,
  faintHint = false,
  minHeight = 52,
  testID,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  autoFocus?: boolean;
  // The prompt box lets her run past the limit and says so (look prompt PRD P4); the sheets cut.
  hardLimit?: boolean;
  // The prompt box's resting line is the lighter `placeholder` grey (redline 14 Nov, pin 9).
  faintHint?: boolean;
  minHeight?: number;
  testID: string;
}) {
  const ink = useColor('ink');
  const faint = useColor(faintHint ? 'placeholder' : 'ink-faint');
  // `autoFocus` alone is dropped while a sheet is still presenting on iOS: ask again once it is up.
  const input = useRef<TextInputInstance>(null);
  const presented = useSheetPresented();
  useEffect(() => {
    if (autoFocus && presented) input.current?.focus();
  }, [autoFocus, presented]);
  return (
    <TextInput
      ref={input}
      accessibilityLabel={label}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={faint}
      editable={!disabled}
      autoFocus={autoFocus}
      {...(hardLimit ? { maxLength: ASK_MAX_CHARS } : {})}
      returnKeyType="send"
      blurOnSubmit
      onSubmitEditing={onSend}
      testID={testID}
      className="flex-1"
      style={{ minHeight, color: ink, fontFamily: fonts.displayItalic, fontSize: 17 }}
    />
  );
}
