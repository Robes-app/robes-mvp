import { fonts, haptic } from '@robes/ui-native';
import { type ReactNode, useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';

const OPEN_AT = 88;
// A drag this far (or any flick left) rests the row open over its action.
const OPEN_PAST = 28;
// A flick: points per millisecond, the speed iOS reads as a swipe rather than a drag.
const FLICK = 0.3;
// A drag past this share of the row's width acts at once (iOS's full swipe), never nearer than
// 120 nor further than 180.
const actAt = (width: number) => Math.min(180, Math.max(120, width * 0.4));

// iOS's swipe-to-act on a row (legacy _wrSwipeInit): a short drag or a flick left rests it open
// at 88 over the action, a long drag acts (with a tick as it passes the point), and a tap on an
// open row closes it. Once the row has the drag the list never takes it back, so a swipe that
// drifts up or down still lands (simulator, 17 Nov: the old row asked for a long, level drag).
// One row for every list that lets something go: the Wardrobe's pieces and wishes, the bell's
// notifications, the Diary's days. `text` is the small caps word under the row, `label` what a
// reader hears; screen readers get it as an action on the row. `className` rounds the clip to
// the row's own corners. The web has no swipe: its rows keep their own button.
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
  const width = useRef(0);
  const armed = useRef(false);
  const act = useRef(onAct);
  act.current = onAct;
  const pan = useMemo(() => {
    const settle = (to: number) => {
      rest.current = to;
      Animated.spring(x, { toValue: to, useNativeDriver: true, bounciness: 0 }).start();
    };
    // A horizontal drag, or any drag on a row already open.
    const takes = (dx: number, dy: number) =>
      Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 1.2 && (dx < 0 || rest.current !== 0);
    return {
      settle,
      responder: PanResponder.create({
        // An open row takes the tap that would open it, and closes.
        onStartShouldSetPanResponderCapture: () => rest.current !== 0,
        // Taken in the capture phase, so the row's own button lets go of the touch at once.
        onMoveShouldSetPanResponderCapture: (_, g) => takes(g.dx, g.dy),
        onMoveShouldSetPanResponder: (_, g) => takes(g.dx, g.dy),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          armed.current = false;
        },
        onPanResponderMove: (_, g) => {
          const at = Math.max(-(width.current || 400), Math.min(0, rest.current + g.dx));
          x.setValue(at);
          const past = at <= -actAt(width.current);
          if (past !== armed.current) {
            armed.current = past;
            haptic.selection();
          }
        },
        onPanResponderRelease: (_, g) => {
          if (rest.current !== 0 && Math.abs(g.dx) < 6) {
            settle(0);
            return;
          }
          const at = rest.current + g.dx;
          if (at <= -actAt(width.current)) {
            settle(0);
            act.current();
          } else if (g.vx > FLICK) settle(0);
          else settle(g.vx < -FLICK || at <= -OPEN_PAST ? -OPEN_AT : 0);
        },
        onPanResponderTerminate: () => settle(0),
      }),
    };
  }, [x]);
  return (
    <View
      className={`overflow-hidden bg-accent-warm ${className}`}
      onLayout={(e) => {
        width.current = e.nativeEvent.layout.width;
      }}
    >
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
