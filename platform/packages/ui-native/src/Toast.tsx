import { ui } from '@robes/copy';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, Animated, Pressable, Text, View } from 'react-native';
import { cx } from './cx';
import { useReducedMotion } from './motion';
import {
  fonts,
  MIN_TOUCH,
  maxFontSizeMultiplier,
  TOAST_DEFAULT_DURATION,
  TOAST_MIN_DURATION,
} from './scale';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastOptions {
  message: string;
  action?: ToastAction;
  duration?: number;
}

interface ToastState extends ToastOptions {
  id: number;
}

export interface ToastApi {
  show: (options: ToastOptions) => void;
  dismiss: () => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}

export interface ToastProps {
  message: string;
  action?: ToastAction;
  onDismiss?: () => void;
  className?: string;
}

export function Toast({ message, action, onDismiss, className }: ToastProps) {
  return (
    <View
      accessibilityLiveRegion="polite"
      className={cx('flex-row items-center gap-3 rounded-pill bg-ink py-2 pl-5 pr-2', className)}
    >
      <Text
        maxFontSizeMultiplier={maxFontSizeMultiplier.body}
        className="flex-1 text-sm text-bg"
        style={{ fontFamily: fonts.sans }}
      >
        {message}
      </Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={() => {
            action.onPress();
            onDismiss?.();
          }}
          style={{ minHeight: MIN_TOUCH, minWidth: MIN_TOUCH }}
          className="items-center justify-center px-3"
        >
          <Text
            maxFontSizeMultiplier={maxFontSizeMultiplier.control}
            className="text-sm text-bg underline"
            style={{ fontFamily: fonts.sansMedium }}
          >
            {action.label}
          </Text>
        </Pressable>
      ) : onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ui.dismiss}
          onPress={onDismiss}
          style={{ minHeight: MIN_TOUCH, minWidth: MIN_TOUCH }}
          className="items-center justify-center px-3"
        >
          <Text className="text-sm text-bg" style={{ fontFamily: fonts.sans }}>
            {ui.dismiss}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Undo toasts stay up for at least 6 s (UX-15); only one shows at a time.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(0);
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(0)).current;

  const dismiss = useCallback(() => setToast(null), []);
  const show = useCallback((options: ToastOptions) => {
    nextId.current += 1;
    setToast({ ...options, id: nextId.current });
    AccessibilityInfo.announceForAccessibility(
      options.action ? `${options.message} ${options.action.label}` : options.message,
    );
  }, []);

  useEffect(() => {
    if (!toast) return;
    if (reduced) opacity.setValue(1);
    else Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(
      () => setToast((current) => (current?.id === toast.id ? null : current)),
      toast.action
        ? Math.max(toast.duration ?? TOAST_MIN_DURATION, TOAST_MIN_DURATION)
        : (toast.duration ?? TOAST_DEFAULT_DURATION),
    );
    return () => clearTimeout(timer);
  }, [toast, reduced, opacity]);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          className="absolute inset-x-4 bottom-10"
          style={{ opacity }}
        >
          <Toast key={toast.id} message={toast.message} action={toast.action} onDismiss={dismiss} />
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}
