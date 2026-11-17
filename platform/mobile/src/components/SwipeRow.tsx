import { fonts } from '@robes/ui-native';
import { type ReactNode, useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';

const OPEN_AT = 88;
const ACT_AT = 160;

// iOS's swipe-to-act on a row (legacy _wrSwipeInit): past 44 it rests open at 88 over the action,
// past 160 it acts; a tap on an open row closes it. One row for every list that lets something
// go: the Wardrobe's pieces and wishes, the bell's notifications. `text` is the small caps word
// under the row, `label` what a reader hears; screen readers get it as an action on the row.
// `className` rounds the clip to the row's own corners. The web has no swipe: its rows keep
// their own button.
export function SwipeRow({
  children,
  text,
  label,
  onAct,
  className = 'rounded-[3px]',
  testID,
}: {
  children: ReactNode;
  text: string;
  label: string;
  onAct: () => void;
  className?: string;
  testID?: string;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const rest = useRef(0);
  const act = useRef(onAct);
  act.current = onAct;
  const pan = useMemo(() => {
    const settle = (to: number) => {
      rest.current = to;
      Animated.spring(x, { toValue: to, useNativeDriver: true, bounciness: 0 }).start();
    };
    return {
      settle,
      responder: PanResponder.create({
        // An open row takes the tap that would open it, and closes.
        onStartShouldSetPanResponderCapture: () => rest.current !== 0,
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_, g) =>
          x.setValue(Math.max(-ACT_AT - 20, Math.min(0, rest.current + g.dx))),
        onPanResponderRelease: (_, g) => {
          if (rest.current !== 0 && Math.abs(g.dx) < 8) {
            settle(0);
            return;
          }
          const at = rest.current + g.dx;
          if (at <= -ACT_AT) {
            settle(0);
            act.current();
          } else settle(at <= -44 ? -OPEN_AT : 0);
        },
        onPanResponderTerminate: () => settle(0),
      }),
    };
  }, [x]);
  return (
    <View className={`overflow-hidden bg-accent-warm ${className}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          pan.settle(0);
          onAct();
        }}
        className="absolute top-0 right-0 bottom-0 items-center justify-center"
        style={{ width: OPEN_AT }}
      >
        <Text
          className="text-[10px] text-bg uppercase"
          style={{ fontFamily: fonts.sansMedium, letterSpacing: 2 }}
        >
          {text}
        </Text>
      </Pressable>
      <Animated.View
        {...pan.responder.panHandlers}
        style={{ transform: [{ translateX: x }] }}
        testID={testID}
        accessibilityActions={[{ name: 'remove', label }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'remove') onAct();
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
}
