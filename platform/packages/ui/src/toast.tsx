'use client';

import * as RadixToast from '@radix-ui/react-toast';
import { ui } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import {
  createContext,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cn, focusRing } from './cn';

// An Undo stays up for at least 6 s (UX-15).
export const ACTION_MIN_DURATION = 6000;
export const DEFAULT_DURATION = 4000;

export interface ToastAction {
  label: string;
  onAction: () => void;
  // How a screen-reader user can do the same thing later; defaults to the label.
  altText?: string;
}

export interface ToastOptions {
  message: string;
  action?: ToastAction;
  duration?: number;
}

export function toastDuration({
  action,
  duration,
}: Pick<ToastOptions, 'action' | 'duration'>): number {
  if (action) return Math.max(ACTION_MIN_DURATION, duration ?? ACTION_MIN_DURATION);
  return duration ?? DEFAULT_DURATION;
}

type ShowToast = (options: ToastOptions) => void;
const ToastContext = createContext<ShowToast | null>(null);
// A bar fixed at the screen's foot (a look's Schedule/Update bar, a drawer's footer) lifts the
// toasts above it while it stands, so an Undo never covers the button under it.
type LiftToasts = (px: number) => () => void;
const ToastLiftContext = createContext<LiftToasts | null>(null);

interface Entry extends ToastOptions {
  id: number;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const nextId = useRef(0);

  const show = useCallback<ShowToast>((options) => {
    nextId.current += 1;
    const id = nextId.current;
    setEntries((list) => [...list, { ...options, id }]);
  }, []);

  const remove = useCallback((id: number) => {
    setEntries((list) => list.filter((entry) => entry.id !== id));
  }, []);

  const [lifts, setLifts] = useState<ReadonlyMap<number, number>>(new Map());
  const nextLift = useRef(0);
  const liftToasts = useCallback<LiftToasts>((px) => {
    nextLift.current += 1;
    const id = nextLift.current;
    setLifts((all) => new Map(all).set(id, px));
    return () =>
      setLifts((all) => {
        const next = new Map(all);
        next.delete(id);
        return next;
      });
  }, []);
  const lift = Math.max(0, ...lifts.values());

  return (
    <RadixToast.Provider label={ui.notifications} swipeDirection="down">
      <ToastContext.Provider value={show}>
        <ToastLiftContext.Provider value={liftToasts}>{children}</ToastLiftContext.Provider>
      </ToastContext.Provider>
      {entries.map((entry) => (
        <RadixToast.Root
          key={entry.id}
          duration={toastDuration(entry)}
          onOpenChange={(open) => {
            if (!open) remove(entry.id);
          }}
          className="flex min-h-12 items-center gap-3 rounded-pill bg-ink py-1.5 pr-1.5 pl-5 text-bg shadow-lg motion-safe:data-[state=open]:animate-rise"
        >
          <RadixToast.Description className="flex-1 font-sans text-sm">
            {entry.message}
          </RadixToast.Description>
          {entry.action ? (
            <RadixToast.Action
              altText={entry.action.altText ?? entry.action.label}
              onClick={entry.action.onAction}
              className={cn(
                'min-h-11 rounded-pill px-3 font-sans text-sm font-medium text-bg underline underline-offset-4',
                'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-bg',
              )}
            >
              {entry.action.label}
            </RadixToast.Action>
          ) : null}
          <RadixToast.Close
            aria-label={ui.dismiss}
            className={cn(
              'inline-flex size-11 items-center justify-center rounded-pill text-bg',
              'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-bg',
            )}
          >
            <Icon name="close" size={18} />
          </RadixToast.Close>
        </RadixToast.Root>
      ))}
      <RadixToast.Viewport
        label={ui.notificationsRegion}
        {...(lift > 0 ? { style: { bottom: lift } } : {})}
        className={cn(
          'fixed inset-x-0 bottom-0 z-[60] mx-auto flex w-full max-w-md flex-col gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]',
          focusRing,
        )}
      />
    </RadixToast.Provider>
  );
}

export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be used inside <ToastProvider>');
  return show;
}

// Holds the toasts `px` above the screen's foot while the caller is mounted (0 lets go).
export function useToastLift(px: number): void {
  const liftToasts = useContext(ToastLiftContext);
  useEffect(() => {
    if (!liftToasts || px <= 0) return;
    return liftToasts(px);
  }, [liftToasts, px]);
}

// Lifts the toasts above a bar fixed at the foot, by the bar's own measured height.
export function useToastLiftOver(bar: RefObject<HTMLElement | null>): void {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const el = bar.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setHeight(el.getBoundingClientRect().height));
    observer.observe(el);
    setHeight(el.getBoundingClientRect().height);
    return () => observer.disconnect();
  }, [bar]);
  useToastLift(height);
}
