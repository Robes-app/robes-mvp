'use client';

import * as RadixToast from '@radix-ui/react-toast';
import { ui } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react';
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

  return (
    <RadixToast.Provider label={ui.notifications} swipeDirection="down">
      <ToastContext.Provider value={show}>{children}</ToastContext.Provider>
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
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bg',
              )}
            >
              {entry.action.label}
            </RadixToast.Action>
          ) : null}
          <RadixToast.Close
            aria-label={ui.dismiss}
            className={cn(
              'inline-flex size-11 items-center justify-center rounded-pill text-bg',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bg',
            )}
          >
            <Icon name="close" size={18} />
          </RadixToast.Close>
        </RadixToast.Root>
      ))}
      <RadixToast.Viewport
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-md flex-col gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] outline-none',
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
