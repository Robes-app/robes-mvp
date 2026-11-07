'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { ui } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import type { ReactNode } from 'react';
import { PrimaryScope } from './button';
import { focusRing } from './cn';

const focus = focusRing;

export const subviewBackClass = `flex size-9 shrink-0 items-center justify-center rounded-pill text-ink ${focus}`;

export function SubviewBackIcon() {
  return <Icon name="back" size={20} className="-ml-0.5" />;
}

// The subview's 56px header on its own: the back control (a Close in a Subview, a link on a page
// such as Settings), the 9px tracked title centred, a 36px spacer, over a 0.5px rule.
export function SubviewHeader({
  title,
  back,
  titleAs: Title = 'h1',
}: {
  title: string;
  back: ReactNode;
  titleAs?: 'h1' | typeof RadixDialog.Title;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-hairline border-b-[0.5px] px-3">
      {back}
      <Title className="type-label min-w-0 flex-1 truncate text-center text-ink-muted">
        {title}
      </Title>
      <span aria-hidden className="w-9 shrink-0" />
    </header>
  );
}

// Felix's subview shell (TagsView, SeasonsView, WornView): a full-height cream page that slides in
// from the right over the look, with a 56px header — the back chevron, the tracked title centred,
// a 36px spacer — over a 0.5px rule, a 20px-padded body and an optional footer over a rule. On a
// wide window it is a side panel. Twin of ui-native Subview.tsx.
export function Subview({
  open,
  title,
  onBack,
  children,
  footer,
  testId,
}: {
  open: boolean;
  title: string;
  onBack: () => void;
  children: ReactNode;
  footer?: ReactNode;
  testId?: string;
}) {
  return (
    <RadixDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onBack();
      }}
    >
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-backdrop motion-safe:animate-fade-in md:bg-backdrop" />
        <RadixDialog.Content
          aria-describedby={undefined}
          data-testid={testId}
          className="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-bg text-ink motion-safe:animate-[robes-slide-in_280ms_cubic-bezier(.2,0,.2,1)] md:w-[420px] md:shadow-sheet"
        >
          <SubviewHeader
            title={title}
            titleAs={RadixDialog.Title}
            back={
              <RadixDialog.Close asChild>
                <button type="button" aria-label={ui.back} className={subviewBackClass}>
                  <SubviewBackIcon />
                </button>
              </RadixDialog.Close>
            }
          />
          <PrimaryScope>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-8">{children}</div>
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

// A row of Felix's option list: the serif label and a check once picked, 48px on `white`.
export function OptionRow({
  label,
  on,
  icon,
  onToggle,
  ariaLabel,
}: {
  label: string;
  on: boolean;
  icon?: ReactNode;
  onToggle: () => void;
  ariaLabel?: string;
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={on}
        aria-label={ariaLabel ?? label}
        onClick={onToggle}
        className={`flex h-12 w-full items-center gap-3 bg-surface-raised pr-3.5 pl-4 text-left ${focus} focus-visible:-outline-offset-2`}
      >
        {icon ? <span className="shrink-0 text-ink">{icon}</span> : null}
        <span className="type-piece-name min-w-0 flex-1 truncate text-ink">{label}</span>
        <span className="flex size-5 shrink-0 items-center justify-center text-ink">
          {on ? <Icon name="check" size={15} /> : null}
        </span>
      </button>
    </li>
  );
}

export function OptionList({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ul
      aria-label={label}
      className="divide-y divide-hairline overflow-hidden rounded-soft border-[0.5px] border-rule-mid bg-surface-raised"
    >
      {children}
    </ul>
  );
}
