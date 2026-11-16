import { ui } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { PrimaryScope } from './Button';
import { useColor } from './color';
import { ModalInsets } from './ModalInsets';
import { FINE_EDGE, MIN_TOUCH, maxFontSizeMultiplier, typeStyle } from './scale';
import { Heading, Text } from './Text';

// The subview's 56pt header on its own, for a screen of the stack drawn the same way (Settings):
// the back chevron, the tracked title centred, a 36pt spacer, over a 0.5pt rule. A screen of its
// own (Settings) reads in the tabs' serif title instead (Annie, 11 Nov).
export function SubviewHeader({
  title,
  onBack,
  serif = false,
}: {
  title: string;
  onBack: () => void;
  serif?: boolean;
}) {
  const ink = useColor('ink');
  return (
    <View
      className="h-14 flex-row items-center gap-3 border-hairline px-3"
      style={{ borderBottomWidth: FINE_EDGE }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ui.back}
        onPress={onBack}
        hitSlop={4}
        className="items-center justify-center rounded-pill"
        style={{ width: 36, height: 36 }}
      >
        <Icon name="back" size={20} color={ink} />
      </Pressable>
      {serif ? (
        <Heading size="md" numberOfLines={1} className="flex-1 text-center">
          {title}
        </Heading>
      ) : (
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          maxFontSizeMultiplier={maxFontSizeMultiplier.label}
          className="flex-1 text-center text-ink-muted"
          style={typeStyle('label')}
        >
          {title}
        </Text>
      )}
      <View style={{ width: 36 }} />
    </View>
  );
}

// Felix's subview shell (TagsView, SeasonsView, WornView, SettingsView): a full-height cream page
// that slides in over the screen, with a 56pt header — the back chevron, the tracked title
// centred, a 36pt spacer — over a 0.5pt rule, a 20pt-padded body and an optional footer over a
// rule. Twin of web ui subview.tsx.
export function Subview({
  open,
  title,
  onBack,
  children,
  footer,
  testID,
  onClosed,
  scroll = true,
}: {
  open: boolean;
  // False when the body is a list that scrolls itself (the piece picker's grid): a list inside
  // this scroll could not skip the rows off screen.
  scroll?: boolean;
  title: string;
  onBack: () => void;
  // Once iOS has dismissed it: a sheet that follows (Add pieces from the picker's +) waits for
  // this, since iOS will not present over a modal that is still going.
  onClosed?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  testID?: string;
}) {
  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onBack}
      {...(onClosed ? { onDismiss: onClosed } : {})}
      testID={testID}
    >
      <ModalInsets>
        {(insets) => (
          // Full screen from the top, so the keyboard lifts the footer (TagsView's field) by its
          // own height (audit, native: a field under the keyboard).
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1 bg-bg"
            style={{ paddingTop: insets.top }}
          >
            <SubviewHeader title={title} onBack={onBack} />
            <PrimaryScope>
              {scroll ? (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="interactive"
                  contentContainerClassName="px-5 pt-5 pb-8"
                  className="flex-1"
                >
                  {children}
                </ScrollView>
              ) : (
                <View className="flex-1 px-5 pt-5">{children}</View>
              )}
              {footer ? (
                <View
                  className="border-hairline bg-bg px-5 pt-3"
                  style={{ borderTopWidth: FINE_EDGE, paddingBottom: Math.max(22, insets.bottom) }}
                >
                  {footer}
                </View>
              ) : null}
            </PrimaryScope>
          </KeyboardAvoidingView>
        )}
      </ModalInsets>
    </Modal>
  );
}

// A row of Felix's option list: the serif label and a check once picked, 48pt on `white`.
export function OptionRow({
  label,
  on,
  icon,
  onToggle,
  accessibilityLabel,
  first = false,
  testID,
}: {
  label: string;
  on: boolean;
  icon?: ReactNode;
  onToggle: () => void;
  accessibilityLabel?: string;
  first?: boolean;
  testID?: string;
}) {
  const ink = useColor('ink');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: on }}
      onPress={onToggle}
      testID={testID}
      className="flex-row items-center gap-3 border-hairline bg-surface-raised pr-3.5 pl-4"
      style={{ height: 48, minHeight: MIN_TOUCH, borderTopWidth: first ? 0 : FINE_EDGE }}
    >
      {icon ? <View>{icon}</View> : null}
      <Text numberOfLines={1} className="flex-1 text-ink" style={typeStyle('piece-name')}>
        {label}
      </Text>
      <View className="items-center justify-center" style={{ width: 20, height: 20 }}>
        {on ? <Icon name="check" size={15} color={ink} /> : null}
      </View>
    </Pressable>
  );
}

export function OptionList({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View
      testID={testID}
      className="overflow-hidden rounded-soft border-rule-mid bg-surface-raised"
      style={{ borderWidth: FINE_EDGE }}
    >
      {children}
    </View>
  );
}
