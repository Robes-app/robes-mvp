'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { Icon } from '@robes/icons/web';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { PrimaryScope } from './button';
import { cn, focusRing } from './cn';
import { CloseDisc } from './icon-button';
import { useToastLiftOver } from './toast';

export interface DrawerDone {
  label: string;
  // The disc's tooltip, when the tap does more than the label says ("Save and schedule…").
  hint?: string;
  onClick: () => void;
  // 35% while there is nothing to keep yet; the tap does nothing.
  disabled?: boolean;
  testId?: string;
}

export interface DrawerProps {
  open: boolean;
  // The 9px tracked title: "Draft look", "Edit look".
  title: string;
  // Escape, the backdrop and the × all ask the owner, which decides whether to close.
  onClose: () => void;
  closeLabel: string;
  done: DrawerDone | null;
  children: ReactNode;
  // Anything floating over the body inside the drawer's frame: the AdjustSheet, the DescribeSheet.
  over?: ReactNode;
  // Held under the scrolling body: the Edit look drawer's Update look (Felix 3k).
  footer?: ReactNode;
  testId?: string;
}

// The drawer's header on its own, for the same anatomy drawn on a page (a deep link opens the
// draft without a screen beneath it) or at the head of a bottom sheet (`inSheet`: 40px tall on
// the sheet's own padding, no rule — Felix NotificationsSheet).
export function DrawerHeader({
  title,
  onClose,
  closeLabel,
  done,
  titleAs: Title = 'p',
  inSheet = false,
}: Pick<DrawerProps, 'onClose' | 'closeLabel' | 'done'> & {
  title: ReactNode;
  titleAs?: 'p' | typeof RadixDialog.Title;
  inSheet?: boolean;
}) {
  return (
    <header
      className={cn(
        'flex shrink-0 items-center justify-between',
        inSheet ? 'h-10 gap-3' : 'h-14 border-hairline border-b-[0.5px] px-3',
      )}
    >
      <CloseDisc label={closeLabel} onClick={onClose} />
      <Title className="type-label min-w-0 flex-1 truncate text-center text-ink-muted">
        {title}
      </Title>
      {done ? (
        <button
          type="button"
          onClick={done.onClick}
          aria-label={done.label}
          aria-disabled={done.disabled === true}
          title={done.hint ?? done.label}
          data-testid={done.testId}
          className={cn(
            "relative flex size-9 items-center justify-center rounded-pill bg-ink text-bg after:absolute after:-inset-1 after:content-[''] motion-safe:transition-opacity",
            done.disabled && 'opacity-35',
            focusRing,
          )}
        >
          <Icon name="check" size={15} stroke={2} />
        </button>
      ) : (
        <span aria-hidden className="w-9 shrink-0" />
      )}
    </header>
  );
}

// How much of the page the on-screen keyboard covers. Safari on a phone draws the keyboard over
// the page without resizing it, so a drawer held at the page's foot would keep its action (Style
// it, Update look) under the keyboard; the visual viewport says where the visible page ends.
// Native twin: mobile/src/lib/keyboard.ts.
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const read = () =>
      setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    read();
    vv.addEventListener('resize', read);
    vv.addEventListener('scroll', read);
    return () => {
      vv.removeEventListener('resize', read);
      vv.removeEventListener('scroll', read);
    };
  }, []);
  return inset;
}

// Felix's drawer (DraftLook): a cream panel 24px from the top over `backdrop`, soft top corners,
// sliding up over 0.32s, with a 56px header — the × disc, the tracked title, the ink done disc —
// over a 0.5px rule and a scrolling body. On a wide window it stands centred with room around it.
// It is not modal: a toast's Undo beside it stays reachable, so the backdrop is drawn here and a
// tap on it asks the owner, as Escape and the × do. Native presents the same screen as a form
// sheet (expo-router): the DRAFT_SHEET route options in mobile/src/app/_layout.tsx.
export function Drawer({
  open,
  title,
  onClose,
  closeLabel,
  done,
  children,
  over,
  footer,
  testId,
}: DrawerProps) {
  // The drawer's foot stands on the keyboard while it is up, never under it.
  const keyboard = useKeyboardInset();
  return (
    <RadixDialog.Root
      open={open}
      modal={false}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <RadixDialog.Portal>
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={onClose}
          className="fixed inset-0 z-50 cursor-default bg-backdrop motion-safe:animate-[robes-fade-in_250ms_ease]"
        />
        <RadixDialog.Content
          aria-describedby={undefined}
          data-testid={testId}
          onInteractOutside={(e) => e.preventDefault()}
          style={keyboard ? { bottom: keyboard } : undefined}
          className="fixed inset-x-0 top-6 bottom-0 z-50 mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-t-sheet bg-bg text-ink shadow-sheet motion-safe:animate-[robes-sheet-up_320ms_cubic-bezier(.2,0,.2,1)] md:inset-y-10 md:rounded-sheet"
        >
          <DrawerHeader
            title={title}
            onClose={onClose}
            closeLabel={closeLabel}
            done={done}
            titleAs={RadixDialog.Title}
          />
          <PrimaryScope>
            <div className="relative min-h-0 flex-1">
              <div className="h-full overflow-y-auto overscroll-contain pb-8">{children}</div>
              {over}
            </div>
            {footer ? <DrawerFooter>{footer}</DrawerFooter> : null}
          </PrimaryScope>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

// The drawer's foot; toasts rise above it while it stands, so an Undo never covers its button.
function DrawerFooter({ children }: { children: ReactNode }) {
  const bar = useRef<HTMLDivElement>(null);
  useToastLiftOver(bar);
  return (
    <div
      ref={bar}
      className="shrink-0 border-hairline border-t-[0.5px] bg-bg px-5 pt-3 pb-[max(1.375rem,env(safe-area-inset-bottom))]"
    >
      {children}
    </div>
  );
}
