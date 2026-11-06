'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { Icon } from '@robes/icons/web';
import type { ReactNode } from 'react';
import { PrimaryScope } from './button';
import { cn, focusRing } from './cn';

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
// draft without a screen beneath it).
export function DrawerHeader({
  title,
  onClose,
  closeLabel,
  done,
  titleAs: Title = 'p',
}: Pick<DrawerProps, 'title' | 'onClose' | 'closeLabel' | 'done'> & {
  titleAs?: 'p' | typeof RadixDialog.Title;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-hairline border-b-[0.5px] px-3">
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        title={closeLabel}
        className={cn(
          "relative flex size-9 items-center justify-center rounded-pill bg-surface-sunk text-ink-muted after:absolute after:-inset-1 after:content-[''] hover:text-ink",
          focusRing,
        )}
      >
        <Icon name="close" size={14} />
      </button>
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
            {footer ? (
              <div className="shrink-0 border-hairline border-t-[0.5px] bg-bg px-5 pt-3 pb-[max(1.375rem,env(safe-area-inset-bottom))]">
                {footer}
              </div>
            ) : null}
          </PrimaryScope>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
