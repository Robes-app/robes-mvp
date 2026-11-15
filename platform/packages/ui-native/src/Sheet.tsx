import { ui } from '@robes/copy';
import { Icon, type IconName } from '@robes/icons/native';
import { GlassView } from 'expo-glass-effect';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  type KeyboardEvent,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { CloseDisc, PrimaryScope } from './Button';
import { useColor } from './color';
import { cx } from './cx';
import { DrawerHeader, type DrawerHeaderDone } from './DrawerHeader';
import { useNativeGlass } from './Glass';
import { ModalInsets } from './ModalInsets';
import { useReducedMotion } from './motion';
import { FINE_EDGE, fonts, MIN_TOUCH } from './scale';
import { Eyebrow, Heading, Text } from './Text';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  // Once the sheet has fully gone. Anything that presents a screen of its own after the sheet (the
  // camera, the photo library) waits for this: iOS refuses to present while a modal is still
  // dismissing, and the half-dismissed sheet is left over everything, taking every tap.
  onClosed?: () => void;
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
  children?: ReactNode;
  className?: string;
  testID?: string;
  // Felix's floating sheet: hugging its content on a 0.5pt `rule-mid` edge; the handle, a swipe
  // down or a tap on the backdrop closes it (no ×). Like every sheet it stands on the bottom edge,
  // its top corners on the sheet radius (Felix, 12 Nov: the 8pt inset read as detached).
  floating?: boolean;
  // The eyebrow's colour: Felix's rose (the darkened rose for small text) by default.
  eyebrowTone?: 'faint' | 'warm';
  // Felix's choice rows under the question: a 40pt disc with the glyph, a sentence-case label
  // and a ›, 56pt tall between `hairline` rules. Two or three; the sheet asks one question.
  rows?: readonly SheetRow[];
  // The drawer header (× · the tracked title · the ink done disc) in place of the handle, the
  // question and the × (Felix NotificationsSheet); a swipe down on it still closes. `null` keeps
  // the × with a spacer.
  done?: DrawerHeaderDone | null;
  // The Front Door's glass sheet (PRD rev 3 §2.4, §2.5): on the bottom edge, its top corners on
  // the dock radius, cream glass over the dimmed screen, with its own header — the × disc at the left, a
  // sans title centred, a text action at the right (Clear). The question, eyebrow and × above
  // are not drawn. Twin of web ui dialog.tsx `glass`.
  glass?: GlassHeader;
}

export interface GlassAction {
  label: string;
  onPress: () => void;
  // Faint and inert while there is nothing to act on (Clear with no filter picked).
  disabled?: boolean;
  testID?: string;
}

export interface GlassHeader {
  title: string;
  action?: GlassAction;
}

export interface SheetRow {
  icon: IconName;
  label: string;
  onPress: () => void;
  testID?: string;
}

const OFFSCREEN = 800;
const DISMISS_DRAG = 120;
// Felix's `backdrop` behind every drawer (the token's alpha; it is ink, so opacity carries it).
const BACKDROP_OPACITY = 0.28;
// The PRD's motion (rev 3 §2.6): 0.26s on cubic-bezier(.4, 0, .7, 1), in and out alike.
const DURATION = 260;
const EASE = Easing.bezier(0.4, 0, 0.7, 1);
// The top 8% stays clear: past every iPhone's status bar and island (59pt of 874 on a 17).
const SHEET_MAX = '92%';
// Space under the last row; the home indicator's inset is added below it.
const SHEET_PAD = 24;
// Longest wait for iOS to confirm a dismissal before `onClosed` fires anyway.
const DISMISS_FALLBACK_MS = 500;

// iOS's keyboard curve, near enough, for the sheet riding up with it.
const KEYBOARD_EASE = Easing.bezier(0.38, 0.7, 0.125, 1);

// The keyboard, read from its own events: whether it is up, and (iOS) how far it reaches into the
// window, animated with it. The sheet stands on that height. It used to stand in a
// KeyboardAvoidingView, which lifts nothing until it has measured itself: a field that takes the
// keyboard as the sheet opens (the look's prompt) raced that measure and was left behind the
// keyboard, coming back only after a dismiss (Annie, TestFlight, 15 Nov). The events need no
// measure, so the sheet is on the keyboard from its first frame. While the keyboard is up it covers
// the home indicator, so the inset steps aside. Android resizes the window itself (adjustResize).
function useKeyboard(): { shown: boolean; lift: Animated.Value; settle: () => void } {
  const [shown, setShown] = useState(false);
  const up = useRef(false);
  const lift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const to = (height: number, duration?: number) =>
      Animated.timing(lift, {
        toValue: height,
        duration: duration || DURATION,
        easing: KEYBOARD_EASE,
        useNativeDriver: false,
      }).start();
    const heightOf = (event?: KeyboardEvent) =>
      event?.endCoordinates
        ? Math.max(0, Dimensions.get('window').height - event.endCoordinates.screenY)
        : 0;
    // Only a show lifts the sheet. A change of frame (emoji, the predictive bar) moves it only
    // while the keyboard is up: iOS also sends one as the keyboard goes or a modal presents, and
    // read as "up" that left every sheet standing a keyboard's height off the bottom with no
    // keyboard there (Annie, 15 Nov). Every hide, will or did, brings it down.
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      up.current = true;
      setShown(true);
      if (ios) to(heightOf(e), e?.duration);
    });
    const frame = ios
      ? Keyboard.addListener('keyboardWillChangeFrame', (e) => {
          if (!up.current || !e?.endCoordinates) return;
          to(heightOf(e), e.duration);
        })
      : null;
    const down = (e?: KeyboardEvent) => {
      up.current = false;
      setShown(false);
      if (ios) to(0, e?.duration);
    };
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', down);
    const gone = ios ? Keyboard.addListener('keyboardDidHide', () => down()) : null;
    return () => {
      show.remove();
      frame?.remove();
      hide.remove();
      gone?.remove();
    };
  }, [lift]);
  // As a sheet opens with no keyboard up, it stands on the bottom edge whatever came before.
  const settle = () => {
    if (!up.current) lift.setValue(0);
  };
  return { shown, lift, settle };
}

// Bottom sheet from RN Modal + Animated: Expo Go compatible, no native bottom-sheet module (ADR-018).
export function Sheet({
  open,
  onClose,
  onClosed,
  title,
  eyebrow,
  media,
  leading,
  closeButton = false,
  closeLabel,
  children,
  className,
  testID,
  floating = false,
  eyebrowTone = 'warm',
  rows,
  done,
  glass,
}: SheetProps) {
  const reduced = useReducedMotion();
  const floats = floating || glass !== undefined;
  // On iOS 26 the glass sheet is Liquid Glass; elsewhere (or with Reduce Transparency) the solid
  // cream, so the screen behind never reads through its controls (UX audit, 15 Nov).
  const liquid = useNativeGlass() && glass !== undefined;
  const { shown: keyboard, lift, settle } = useKeyboard();
  const [visible, setVisible] = useState(open);
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
  const shown = useRef(visible);
  useEffect(() => {
    const hid = shown.current && !visible;
    shown.current = visible;
    if (!hid) return;
    closing.current = true;
    if (Platform.OS !== 'ios') {
      fireClosed();
      return;
    }
    const fallback = setTimeout(fireClosed, DISMISS_FALLBACK_MS);
    return () => clearTimeout(fallback);
  }, [visible, fireClosed]);
  const translateY = useRef(new Animated.Value(OFFSCREEN)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  // biome-ignore lint/correctness/useExhaustiveDependencies: settles once per open
  useEffect(() => {
    if (!open) return;
    settle();
    setVisible(true);
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
      Animated.timing(translateY, {
        toValue: to,
        duration: DURATION,
        easing: EASE,
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: shade,
        duration: DURATION,
        easing: EASE,
        useNativeDriver: true,
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished && !open) setVisible(false);
    });
    return () => animation.stop();
  }, [open, visible, reduced, translateY, backdrop]);

  const eyebrowClass = eyebrowTone === 'warm' ? 'text-accent-warm' : undefined;
  const close = floats ? null : closeLabel ? (
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
    <CloseDisc label={ui.close} onPress={onClose} />
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
      {...(Platform.OS === 'ios' ? { onDismiss: fireClosed } : {})}
      testID={testID}
    >
      <ModalInsets>
        {(insets) => (
          // A field in the sheet (a name, a search) rides above the keyboard, never under it.
          <Animated.View className="flex-1 justify-end" style={{ paddingBottom: lift }}>
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
              className={cx(
                glass
                  ? cx('rounded-t-dock border-rule-mid px-5', liquid ? 'overflow-hidden' : 'bg-bg')
                  : floating
                    ? 'rounded-t-sheet border-rule-mid bg-bg px-5'
                    : 'rounded-t-sheet bg-bg px-5',
                className,
              )}
              // Every sheet stands on the screen's bottom edge, edge to edge (Felix, 12 Nov). A tall
              // drawer stops short of the status bar and Dynamic Island; its content scrolls. Its last
              // row (a footer button) sits above the home indicator, never under it.
              style={[
                {
                  maxHeight: SHEET_MAX,
                  paddingBottom: SHEET_PAD + (keyboard ? 0 : insets.bottom),
                  transform: [{ translateY }],
                },
                // The fine edge runs over the top and down the sides; the bottom is the screen's.
                floats
                  ? {
                      borderTopWidth: FINE_EDGE,
                      borderLeftWidth: FINE_EDGE,
                      borderRightWidth: FINE_EDGE,
                    }
                  : null,
              ]}
            >
              {liquid ? (
                <GlassView
                  glassEffectStyle="regular"
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
              ) : null}
              {glass ? (
                <View {...drag.panHandlers} className="mb-5 pt-3">
                  <SheetHead {...glass} onClose={onClose} />
                </View>
              ) : done !== undefined ? (
                <View {...drag.panHandlers} className="mb-6 pt-3">
                  <DrawerHeader
                    inSheet
                    title={title ?? ''}
                    onClose={onClose}
                    closeLabel={ui.close}
                    done={done}
                  />
                </View>
              ) : (
                <View {...drag.panHandlers} className="items-center pt-1 pb-2">
                  {/* With a close in the header, the grab bar is only the handle, so a reader hears
                  one Close, not two. */}
                  <Pressable
                    accessible={!close}
                    accessibilityRole="button"
                    accessibilityLabel={ui.close}
                    onPress={onClose}
                    className="min-h-11 w-24 items-center justify-center"
                  >
                    <View className="h-1 w-9 rounded bg-cream400 dark:bg-rule-mid" />
                  </Pressable>
                </View>
              )}
              {glass || done !== undefined ? null : media ? (
                <View className="mb-4 flex-row items-start gap-4">
                  <View>{media}</View>
                  <View className="min-w-0 flex-1">
                    {eyebrow ? (
                      <Eyebrow className={cx('mb-2', eyebrowClass)}>{eyebrow}</Eyebrow>
                    ) : null}
                    {title ? <Question>{title}</Question> : null}
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
                      <Eyebrow className={cx(title ? 'mb-2' : null, eyebrowClass)}>
                        {eyebrow}
                      </Eyebrow>
                    ) : null}
                    {title ? <Question>{title}</Question> : null}
                  </View>
                  {close}
                </View>
              ) : null}
              {/* A drawer is a layer of its own: its one filled button stands beside the screen's. */}
              <PrimaryScope>
                {rows?.length ? <Rows rows={rows} /> : null}
                {children}
              </PrimaryScope>
            </Animated.View>
          </Animated.View>
        )}
      </ModalInsets>
    </Modal>
  );
}

// Felix's question: Cormorant 300 at 24/1.15.
function Question({ children }: { children: string }) {
  return (
    <Heading size="md" style={{ lineHeight: 27.6 }}>
      {children}
    </Heading>
  );
}

function Rows({ rows }: { rows: readonly SheetRow[] }) {
  const ink = useColor('ink');
  const faint = useColor('ink-faint');
  return (
    <View className="border-hairline border-b">
      {rows.map((row) => (
        <Pressable
          key={row.label}
          accessibilityRole="button"
          accessibilityLabel={row.label}
          onPress={row.onPress}
          testID={row.testID}
          style={{ minHeight: 56 }}
          className="flex-row items-center gap-3.5 border-hairline border-t px-1"
        >
          <View
            className="size-10 items-center justify-center rounded-pill border-rule-mid bg-surface"
            style={{ borderWidth: FINE_EDGE }}
          >
            <Icon name={row.icon} size={17} color={ink} stroke={1.4} />
          </View>
          <Text variant="body" className="flex-1">
            {row.label}
          </Text>
          <Icon name="forward" size={15} color={faint} />
        </Pressable>
      ))}
    </View>
  );
}

// The glass sheet's header: the 36pt × disc, the title in Inter 600 at 15 (the one bold
// line on a glass sheet), and the text action at the right, ink while it can act, faint while
// it can't. A spacer keeps the title centred when there is no action.
function SheetHead({ title, action, onClose }: GlassHeader & { onClose: () => void }) {
  return (
    <View className="h-10 flex-row items-center justify-between gap-3">
      <CloseDisc label={ui.close} onPress={onClose} />
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        className="flex-1 text-center text-ink"
        // Inter 600 at 15, as Robes MVP sets every glass sheet's title (Annie, 15 Nov).
        style={{ fontFamily: fonts.sansSemiBold, fontSize: 15 }}
      >
        {title}
      </Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityState={{ disabled: action.disabled === true }}
          disabled={action.disabled}
          onPress={action.onPress}
          testID={action.testID}
          style={{ minHeight: MIN_TOUCH, minWidth: MIN_TOUCH }}
          className="-mr-2 items-end justify-center px-2"
        >
          <Text
            size="small"
            tone={action.disabled ? 'faint' : 'ink'}
            style={{ fontFamily: fonts.sansRegular }}
          >
            {action.label}
          </Text>
        </Pressable>
      ) : (
        <View style={{ width: 36 }} />
      )}
    </View>
  );
}

export type GlassSheetProps = Omit<
  SheetProps,
  | 'glass'
  | 'title'
  | 'eyebrow'
  | 'media'
  | 'leading'
  | 'closeButton'
  | 'closeLabel'
  | 'rows'
  | 'done'
> & {
  title: string;
  action?: GlassAction;
};

// The Front Door's glass sheet by name: New Look, Add Pieces, Add your pieces, the Filter sheet
// and Receipts all stand on it. Twin of web ui GlassSheet.
export function GlassSheet({ title, action, ...rest }: GlassSheetProps) {
  return <Sheet {...rest} glass={action ? { title, action } : { title }} />;
}
