import { lookbook } from '@robes/copy';
import { ASK_MAX_CHARS } from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import { shadowNative } from '@robes/tokens';
import { FINE_EDGE, fonts, Text, useColor, useReducedMotion } from '@robes/ui-native';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';

// Felix's floating sheet shell (the AdjustSheet): a cream card 8pt from the drawer's
// sides and bottom on a 0.5pt `rule-mid` edge, sheet corners and shadow, rising over 0.3s, with a
// 40pt header — the 9pt tracked title and a 36pt `cream-200` close disc. A tap on the body
// behind it closes it. Web twin: app/src/components/looks/draft-sheets.tsx.
function FloatingSheet({
  title,
  onClose,
  children,
  testID,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  testID: string;
}) {
  const reduced = useReducedMotion();
  const rise = useRef(new Animated.Value(reduced ? 0 : 1)).current;
  const muted = useColor('ink-muted');
  useEffect(() => {
    if (reduced) return;
    Animated.timing(rise, { toValue: 0, duration: 300, useNativeDriver: true }).start();
  }, [reduced, rise]);
  return (
    <View className="absolute inset-0" pointerEvents="box-none">
      <Pressable
        accessibilityLabel={lookbook.draftLook.close}
        importantForAccessibility="no"
        onPress={onClose}
        className="absolute inset-0"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="absolute inset-x-2 bottom-2"
        pointerEvents="box-none"
      >
        <Animated.View
          testID={testID}
          className="rounded-sheet border-rule-mid bg-bg px-5 pt-2.5"
          style={[
            shadowNative.sheet,
            {
              borderWidth: FINE_EDGE,
              paddingBottom: 26,
              transform: [
                {
                  translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [0, 160] }),
                },
              ],
            },
          ]}
        >
          <View className="h-10 flex-row items-center justify-between">
            <Text accessibilityRole="header" size="caption" className="uppercase text-ink-muted">
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={lookbook.draftLook.close}
              onPress={onClose}
              hitSlop={6}
              className="items-center justify-center rounded-pill bg-surface-sunk"
              style={{ width: 36, height: 36 }}
            >
              <Icon name="close" size={14} color={muted} />
            </Pressable>
          </View>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

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
  minHeight?: number;
  testID: string;
}) {
  const ink = useColor('ink');
  const faint = useColor('ink-faint');
  return (
    <TextInput
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

// Felix's AdjustSheet ("Adjust model image"): one sentence about the render — "sleeves rolled
// up" — sent into the look's thread; the picture is drawn once it lands. The send cell dims until
// there is text and shows the refresh glyph while it renders.
export function AdjustSheet({
  open,
  sending,
  onSend,
  onClose,
}: {
  open: boolean;
  sending: boolean;
  onSend: (text: string) => void;
  onClose: () => void;
}) {
  const copy = lookbook.draftLook.adjustSheet;
  const [text, setText] = useState('');
  const ink = useColor('ink');
  if (!open) return null;
  const send = () => {
    const words = text.trim();
    if (!words || sending) return;
    onSend(words);
    setText('');
  };
  const can = !sending && text.trim().length > 0;
  return (
    <FloatingSheet title={copy.title} onClose={onClose} testID="adjust-sheet">
      <View className="mt-4 flex-row items-stretch overflow-hidden rounded-sheet bg-surface-raised pl-4">
        <SheetField
          label={copy.title}
          placeholder={copy.placeholder}
          value={text}
          onChange={setText}
          onSend={send}
          disabled={sending}
          testID="adjust-sheet-field"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.send}
          accessibilityState={{ disabled: !can }}
          disabled={!can}
          onPress={send}
          className="items-center justify-center bg-surface-sunk"
          style={{ width: 56, opacity: can ? 1 : 0.4 }}
        >
          <Icon name={sending ? 'refresh' : 'forward'} size={15} color={ink} />
        </Pressable>
      </View>
    </FloatingSheet>
  );
}
