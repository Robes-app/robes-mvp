'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { ui } from '@robes/copy';
import type { ReactElement, ReactNode, RefObject } from 'react';
import { PrimaryScope } from './button';
import { buttonClasses } from './button-styles';
import { cn } from './cn';
import { IconButton } from './icon-button';
import { Eyebrow, Heading, Text } from './text';

// Reversible actions never get a confirm dialog; they run with an Undo toast (design-system §5).
export interface DialogProps {
  title: ReactNode;
  // A small-caps line above the title (e.g. "Add a look · Wed 21 Oct").
  eyebrow?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  // An element that opens the dialog (e.g. a Button); omit when `open` is controlled.
  trigger?: ReactElement;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  footer?: ReactNode;
  // A Sheet only: a picture of what the sheet is about, beside its eyebrow and title.
  media?: ReactNode;
  // A Sheet only: a control before the title — a drill's back chevron.
  leading?: ReactNode;
  // A Sheet only: the close control as a word ("Done") where every tap already saved, in place
  // of the ×.
  closeLabel?: string;
  // A Sheet only: where focus lands on open, in place of the first field — a picker whose first
  // control is a search must not raise the phone's keyboard before she has looked.
  initialFocus?: RefObject<HTMLElement | null>;
}

// The screen behind dims; it never blurs to mush (beta).
const overlay = 'fixed inset-0 z-50 bg-ink/35 motion-safe:data-[state=open]:animate-fade-in';

function Frame({
  title,
  eyebrow,
  description,
  children,
  footer,
  media,
  leading,
  closeLabel,
  grabBar = false,
  className,
  titleSize,
  initialFocus,
}: Pick<
  DialogProps,
  | 'title'
  | 'eyebrow'
  | 'description'
  | 'children'
  | 'footer'
  | 'media'
  | 'leading'
  | 'closeLabel'
  | 'initialFocus'
> & {
  grabBar?: boolean;
  className: string;
  titleSize: 'lg' | 'md';
}) {
  const titles = (
    <div
      className={cn('flex min-w-0 flex-col gap-2', !leading && (closeLabel ? 'pr-16' : 'pr-10'))}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <RadixDialog.Title asChild>
        <Heading level={2} size={titleSize}>
          {title}
        </Heading>
      </RadixDialog.Title>
      {description ? (
        <RadixDialog.Description asChild>
          <Text tone="muted">{description}</Text>
        </RadixDialog.Description>
      ) : null}
    </div>
  );
  const head = leading ? (
    <div className={cn('-ml-3 flex items-center gap-1', closeLabel ? 'pr-16' : 'pr-10')}>
      <span className="shrink-0">{leading}</span>
      {titles}
    </div>
  ) : (
    titles
  );
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={overlay} />
      <RadixDialog.Content
        className={cn('fixed z-50 flex flex-col gap-6 bg-bg text-ink shadow-xl', className)}
        {...(description ? {} : { 'aria-describedby': undefined })}
        {...(initialFocus
          ? {
              onOpenAutoFocus: (e: Event) => {
                if (!initialFocus.current) return;
                e.preventDefault();
                initialFocus.current.focus();
              },
            }
          : {})}
      >
        <PrimaryScope>
          {/* The drawer's own handle: it says this pulls up from the edge, and nothing else. */}
          {grabBar ? (
            <span aria-hidden className="mx-auto h-1 w-10 shrink-0 rounded-pill bg-hairline" />
          ) : null}
          {media ? (
            <div className="flex items-start gap-4">
              <span className="shrink-0">{media}</span>
              {head}
            </div>
          ) : (
            head
          )}
          {children}
          {footer ? <div className="flex flex-col gap-3">{footer}</div> : null}
          {/* Last in DOM order so opening focuses the content, not the close button. */}
          <RadixDialog.Close asChild>
            {closeLabel ? (
              <button
                type="button"
                className={cn(buttonClasses({ variant: 'quiet' }), 'absolute top-3 right-3')}
              >
                {closeLabel}
              </button>
            ) : (
              <IconButton icon="close" label={ui.close} className="absolute top-3 right-3" />
            )}
          </RadixDialog.Close>
        </PrimaryScope>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

function Root({
  trigger,
  open,
  defaultOpen,
  onOpenChange,
  children,
}: Pick<DialogProps, 'trigger' | 'open' | 'defaultOpen' | 'onOpenChange'> & {
  children: ReactNode;
}) {
  return (
    <RadixDialog.Root
      {...(open === undefined ? {} : { open })}
      {...(defaultOpen === undefined ? {} : { defaultOpen })}
      {...(onOpenChange ? { onOpenChange } : {})}
    >
      {trigger ? <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger> : null}
      {children}
    </RadixDialog.Root>
  );
}

export function Dialog({
  title,
  eyebrow,
  description,
  children,
  footer,
  media: _media,
  leading: _leading,
  closeLabel: _closeLabel,
  initialFocus: _initialFocus,
  ...root
}: DialogProps) {
  return (
    <Root {...root}>
      <Frame
        title={title}
        eyebrow={eyebrow}
        description={description}
        footer={footer}
        titleSize="lg"
        className="top-1/2 left-1/2 max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-crisp border border-hairline p-6 motion-safe:data-[state=open]:animate-rise sm:p-8"
      >
        {children}
      </Frame>
    </Root>
  );
}

// The drawer: it pulls up from the bottom edge with a grab bar, soft top corners, and a capped
// width on large screens. Anything that asks for one thing on top of the page uses it.
export function Sheet({
  title,
  eyebrow,
  description,
  children,
  footer,
  media,
  leading,
  closeLabel,
  initialFocus,
  ...root
}: DialogProps) {
  return (
    <Root {...root}>
      <Frame
        {...(initialFocus ? { initialFocus } : {})}
        title={title}
        eyebrow={eyebrow}
        description={description}
        footer={footer}
        {...(media ? { media } : {})}
        {...(leading ? { leading } : {})}
        {...(closeLabel ? { closeLabel } : {})}
        grabBar
        titleSize="md"
        className="inset-x-0 bottom-0 mx-auto max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-t-soft border border-b-0 border-hairline px-6 pt-3 pb-[max(2rem,env(safe-area-inset-bottom))] motion-safe:data-[state=open]:animate-sheet-up"
      >
        {children}
      </Frame>
    </Root>
  );
}

export const DialogClose = RadixDialog.Close;
