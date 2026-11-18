import { shadowNative } from '@robes/tokens';
import { useEffect, useRef } from 'react';
import { Animated, Modal, Platform, Pressable, View } from 'react-native';
import { Button, PrimaryScope } from './Button';
import { useReducedMotion } from './motion';
import { Text } from './Text';

export interface AlertDialogAction {
  label: string;
  // Felix: `primary` the consequence, verb first ("Discard"); `outline` the safe way back ("Keep
  // editing"); `quiet` an optional "Cancel"; `danger` the consequence when it destroys ("Delete").
  variant: 'primary' | 'outline' | 'quiet' | 'danger';
  onPress: () => void;
}

export interface AlertDialogProps {
  open: boolean;
  // A question or a plain statement: "Discard this draft?", "Save your changes".
  title: string;
  // One sentence saying what happens: "The look won't be saved or scheduled."
  message?: string;
  // At most three, in Felix's order.
  actions: readonly AlertDialogAction[];
  // A tap outside the card, or the back gesture.
  onDismiss: () => void;
  // Once the dialog has gone: iOS shows one modal at a time, so a sheet it stepped in for comes
  // back here (as Sheet's onClosed).
  onClosed?: () => void;
  testID?: string;
}

// Longest wait for iOS to confirm a dismissal before `onClosed` fires anyway (as Sheet).
const DISMISS_FALLBACK_MS = 500;

// Felix's AlertDialog: the centred confirm before anything that can't be undone or needs a choice.
// A cream card (card radius, the dialog shadow, 22 20 16, centred) over `backdrop-strong` with
// 32pt side gutters, fading in over 0.2s; the actions stack 8pt apart, the pills 44pt tall. It is
// a layer of its own, so its primary stands beside the screen's. Twin of web ui alert-dialog.tsx.
export function AlertDialog({
  open,
  title,
  message,
  actions,
  onDismiss,
  onClosed,
  testID,
}: AlertDialogProps) {
  const reduced = useReducedMotion();
  const closed = useRef(onClosed);
  closed.current = onClosed;
  // `onClosed` once per close: iOS reports the native dismissal (Modal onDismiss), with a short
  // fallback because onDismiss is not always delivered; elsewhere the modal is gone once hidden.
  const closing = useRef(false);
  const fireClosed = useRef(() => {
    if (!closing.current) return;
    closing.current = false;
    closed.current?.();
  }).current;
  const shown = useRef(open);
  useEffect(() => {
    const hid = shown.current && !open;
    shown.current = open;
    if (!hid) return;
    closing.current = true;
    if (Platform.OS !== 'ios') {
      fireClosed();
      return;
    }
    const fallback = setTimeout(fireClosed, DISMISS_FALLBACK_MS);
    return () => clearTimeout(fallback);
  }, [open, fireClosed]);
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!open) {
      fade.setValue(0);
      return;
    }
    if (reduced) fade.setValue(1);
    else Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [open, reduced, fade]);

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
      {...(Platform.OS === 'ios' ? { onDismiss: fireClosed } : {})}
      testID={testID}
    >
      <Animated.View
        className="flex-1 items-center justify-center bg-backdrop-strong px-8"
        style={{ opacity: fade }}
      >
        <Pressable
          className="absolute inset-0"
          onPress={onDismiss}
          accessible={false}
          importantForAccessibility="no"
        />
        <View
          accessibilityViewIsModal
          accessibilityRole="alert"
          className="w-full rounded-card bg-bg px-5 pt-[22px] pb-4"
          style={shadowNative.dialog}
        >
          <Text variant="heading" className="text-center" style={{ lineHeight: 26.4 }}>
            {title}
          </Text>
          {message ? (
            <Text
              tone="muted"
              className="mt-2 text-center"
              style={{ fontSize: 12, lineHeight: 18 }}
            >
              {message}
            </Text>
          ) : null}
          <PrimaryScope>
            <View className="mt-[18px] gap-2">
              {actions.map((action) => (
                <Button
                  key={action.label}
                  variant={action.variant}
                  onPress={action.onPress}
                  className={action.variant === 'outline' ? 'min-h-11' : undefined}
                >
                  {action.label}
                </Button>
              ))}
            </View>
          </PrimaryScope>
        </View>
      </Animated.View>
    </Modal>
  );
}
