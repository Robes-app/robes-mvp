import { ui } from '@robes/copy';
import { Icon, type IconName } from '@robes/icons/native';
import { shadowNative } from '@robes/tokens';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CloseDisc, PrimaryScope } from './Button';
import { useColor } from './color';
import { cx } from './cx';
import { DrawerHeader, type DrawerHeaderDone } from './DrawerHeader';
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
  // Felix's floating sheet: 8pt from the left, right and bottom, every corner on the sheet radius,
  // on a 0.5pt `rule-mid` edge, hugging its content; the handle, a swipe down or a tap on the
  // backdrop closes it (no ×).
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
  // The Front Door's glass sheet (PRD rev 3 §2.4, §2.5): floating 8pt from the edges on the dock
  // radius, cream glass over the dimmed screen, with its own header — the × disc at the left, a
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
const FLOAT_INSET = 8;
// Felix's motion: 0.3s on cubic-bezier(.2, 0, .2, 1).
const DURATION = 300;
const EASE = Easing.bezier(0.2, 0, 0.2, 1);
// The top 8% stays clear: past every iPhone's status bar and island (59pt of 874 on a 17).
const SHEET_MAX = '92%';
// Space under the last row; the home indicator's inset is added below it.
const SHEET_PAD = 24;
// Longest wait for iOS to confirm a dismissal before `onClosed` fires anyway.
const DISMISS_FALLBACK_MS = 500;

// While the keyboard is up the KeyboardAvoidingView already lifts the sheet clear of the home
// indicator, so the inset is only added while it's down.
function useKeyboardShown(): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () =>
      setShown(true),
    );
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setShown(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return shown;
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
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardShown();
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
      {/* A field in the sheet (a name, a search) rides above the keyboard, never under it. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end"
      >
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
              ? 'rounded-dock border-rule-mid bg-veil px-5'
              : floating
                ? 'rounded-sheet border-rule-mid bg-bg px-5'
                : 'rounded-t-sheet bg-bg px-5',
            className,
          )}
          // A tall drawer stops short of the status bar and Dynamic Island; its content scrolls.
          // Its last row (a footer button) sits above the home indicator, never under it.
          style={[
            {
              maxHeight: SHEET_MAX,
              paddingBottom: floats ? SHEET_PAD : SHEET_PAD + (keyboard ? 0 : insets.bottom),
              transform: [{ translateY }],
            },
            floats
              ? {
                  borderWidth: FINE_EDGE,
                  marginHorizontal: FLOAT_INSET,
                  marginBottom: FLOAT_INSET + (keyboard ? 0 : insets.bottom),
                  ...shadowNative.sheet,
                }
              : null,
          ]}
        >
          {glass ? (
            <View {...drag.panHandlers} className="mb-5 pt-3">
              <GlassHead glass={glass} onClose={onClose} />
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
                {eyebrow ? <Eyebrow className={cx('mb-2', eyebrowClass)}>{eyebrow}</Eyebrow> : null}
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
                  <Eyebrow className={cx(title ? 'mb-2' : null, eyebrowClass)}>{eyebrow}</Eyebrow>
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
      </KeyboardAvoidingView>
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

// The glass sheet's header: the 36pt × disc, the title in the medium sans at 15 (the one bold
// line on a glass sheet), and the text action at the right, ink while it can act, faint while
// it can't. A spacer keeps the title centred when there is no action.
function GlassHead({ glass, onClose }: { glass: GlassHeader; onClose: () => void }) {
  const { title, action } = glass;
  return (
    <View className="h-10 flex-row items-center justify-between gap-3">
      <CloseDisc label={ui.close} onPress={onClose} />
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        className="flex-1 text-center text-ink"
        style={{ fontFamily: fonts.sansMedium, fontSize: 15 }}
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
