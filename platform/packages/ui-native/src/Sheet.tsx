import { ui } from '@robes/copy';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, View } from 'react-native';
import { IconButton, PrimaryScope } from './Button';
import { cx } from './cx';
import { useReducedMotion } from './motion';
import { MIN_TOUCH } from './scale';
import { Eyebrow, Heading, Text } from './Text';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  // A small-caps line above the title (e.g. "Add a look · Wed 21 Oct").
  eyebrow?: string;
  // A picture of what the sheet is about, beside its eyebrow and title.
  media?: ReactNode;
  // A control before the title — a drill's back chevron.
  leading?: ReactNode;
  // The 44pt × at the top right, beside the title (the web Sheet always has one).
  closeButton?: boolean;
  // The close control as a word ("Done") where every tap already saved; implies closeButton.
  closeLabel?: string;
  children: ReactNode;
  className?: string;
  testID?: string;
}

const OFFSCREEN = 800;
const DISMISS_DRAG = 120;
const BACKDROP_OPACITY = 0.4;
// The top 8% stays clear: past every iPhone's status bar and island (59pt of 874 on a 17).
const SHEET_MAX = '92%';

// Bottom sheet from RN Modal + Animated: Expo Go compatible, no native bottom-sheet module (ADR-018).
export function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  media,
  leading,
  closeButton = false,
  closeLabel,
  children,
  className,
  testID,
}: SheetProps) {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(open);
  const translateY = useRef(new Animated.Value(OFFSCREEN)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) setVisible(true);
  }, [open]);

  useEffect(() => {
    if (!visible) return;
    const to = open ? 0 : OFFSCREEN;
    const shade = open ? BACKDROP_OPACITY : 0;
    if (reduced) {
      translateY.setValue(to);
      backdrop.setValue(shade);
      if (!open) setVisible(false);
      return;
    }
    const animation = Animated.parallel([
      Animated.timing(translateY, { toValue: to, duration: 240, useNativeDriver: true }),
      Animated.timing(backdrop, { toValue: shade, duration: 240, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => {
      if (finished && !open) setVisible(false);
    });
    return () => animation.stop();
  }, [open, visible, reduced, translateY, backdrop]);

  const close = closeLabel ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={closeLabel}
      onPress={onClose}
      style={{ minHeight: MIN_TOUCH, minWidth: MIN_TOUCH }}
      className="-mr-1 items-center justify-center px-1"
    >
      <Text size="small" tone="muted" className="underline">
        {closeLabel}
      </Text>
    </Pressable>
  ) : closeButton ? (
    <IconButton
      icon="close"
      label={ui.close}
      tone="ink-muted"
      onPress={onClose}
      className="-mr-3"
    />
  ) : null;

  const drag = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => translateY.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy > DISMISS_DRAG || g.vy > 1) onClose();
          else Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [onClose, translateY],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
      testID={testID}
    >
      <View className="flex-1 justify-end">
        <Animated.View
          className="absolute inset-0 bg-ink"
          style={{ opacity: backdrop }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Pressable className="flex-1" onPress={onClose} accessible={false} />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          className={cx('rounded-t-soft bg-bg px-6 pb-10', className)}
          // A tall drawer stops short of the status bar and Dynamic Island; its content scrolls.
          style={{ maxHeight: SHEET_MAX, transform: [{ translateY }] }}
        >
          <View {...drag.panHandlers} className="items-center py-3">
            {/* With a close in the header, the grab bar is only the handle, so a reader hears
                one Close, not two. */}
            <Pressable
              accessible={!close}
              accessibilityRole="button"
              accessibilityLabel={ui.close}
              onPress={onClose}
              className="min-h-11 w-24 items-center justify-center"
            >
              <View className="h-1 w-10 rounded-pill bg-border-control" />
            </Pressable>
          </View>
          {media ? (
            <View className="mb-4 flex-row items-start gap-4">
              <View>{media}</View>
              <View className="min-w-0 flex-1">
                {eyebrow ? <Eyebrow className="mb-1">{eyebrow}</Eyebrow> : null}
                {title ? <Heading size="md">{title}</Heading> : null}
              </View>
              {close}
            </View>
          ) : title || eyebrow || leading || close ? (
            <View
              className={cx(
                'flex-row items-center gap-1',
                title || leading || close ? 'mb-4' : 'mb-1',
                leading ? '-ml-3' : null,
              )}
            >
              {leading}
              <View className="min-w-0 flex-1">
                {eyebrow ? (
                  <Eyebrow className={title ? 'mb-1' : undefined}>{eyebrow}</Eyebrow>
                ) : null}
                {title ? <Heading size="md">{title}</Heading> : null}
              </View>
              {close}
            </View>
          ) : null}
          {/* A drawer is a layer of its own: its one filled button stands beside the screen's. */}
          <PrimaryScope>{children}</PrimaryScope>
        </Animated.View>
      </View>
    </Modal>
  );
}
