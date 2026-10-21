'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { ui } from '@robes/copy';
import type { ReactElement, ReactNode } from 'react';
import { PrimaryScope } from './button';
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
}

// The screen behind dims; it never blurs to mush (beta).
const overlay = 'fixed inset-0 z-50 bg-ink/35 motion-safe:data-[state=open]:animate-fade-in';

function Frame({
  title,
  eyebrow,
  description,
  children,
  footer,
  className,
  titleSize,
}: Pick<DialogProps, 'title' | 'eyebrow' | 'description' | 'children' | 'footer'> & {
  className: string;
  titleSize: 'lg' | 'md';
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={overlay} />
      <RadixDialog.Content
        className={cn('fixed z-50 flex flex-col gap-6 bg-bg text-ink shadow-xl', className)}
        {...(description ? {} : { 'aria-describedby': undefined })}
      >
        <PrimaryScope>
          <div className="flex flex-col gap-2 pr-10">
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
          {children}
          {footer ? <div className="flex flex-col gap-3">{footer}</div> : null}
          {/* Last in DOM order so opening focuses the content, not the close button. */}
          <RadixDialog.Close asChild>
            <IconButton icon="close" label={ui.close} className="absolute top-3 right-3" />
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

export function Dialog({ title, eyebrow, description, children, footer, ...root }: DialogProps) {
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

// Bottom sheet: anchored to the bottom edge, soft top corners, capped width on large screens.
export function Sheet({ title, eyebrow, description, children, footer, ...root }: DialogProps) {
  return (
    <Root {...root}>
      <Frame
        title={title}
        eyebrow={eyebrow}
        description={description}
        footer={footer}
        titleSize="md"
        className="inset-x-0 bottom-0 mx-auto max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-t-soft border border-b-0 border-hairline px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))] motion-safe:data-[state=open]:animate-sheet-up"
      >
        {children}
      </Frame>
    </Root>
  );
}

export const DialogClose = RadixDialog.Close;
