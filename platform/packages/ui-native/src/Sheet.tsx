import { ui } from '@robes/copy';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, View } from 'react-native';
import { cx } from './cx';
import { useReducedMotion } from './motion';
import { Heading } from './Text';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  testID?: string;
}

const OFFSCREEN = 800;
const DISMISS_DRAG = 120;
const BACKDROP_OPACITY = 0.4;

// Bottom sheet from RN Modal + Animated: Expo Go compatible, no native bottom-sheet module (ADR-018).
export function Sheet({ open, onClose, title, children, className, testID }: SheetProps) {
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
          style={{ transform: [{ translateY }] }}
        >
          <View {...drag.panHandlers} className="items-center py-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ui.close}
              onPress={onClose}
              className="min-h-11 w-24 items-center justify-center"
            >
              <View className="h-1 w-10 rounded-pill bg-border-control" />
            </Pressable>
          </View>
          {title ? (
            <Heading size="md" className="mb-4">
              {title}
            </Heading>
          ) : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
