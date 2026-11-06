'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { ui } from '@robes/copy';
import { Icon, type IconName } from '@robes/icons/web';
import type { ReactElement, ReactNode, RefObject } from 'react';
import { PrimaryScope } from './button';
import { buttonClasses } from './button-styles';
import { cn, focusRing } from './cn';
import { IconButton } from './icon-button';
import { Eyebrow, Heading, Text, type TextTone } from './text';

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
  // A Sheet only: Felix's floating sheet — 8px from the left, right and bottom, every corner on
  // the sheet radius, on a 0.5px `rule-mid` edge, hugging its content, with no ×: the handle,
  // Escape or a tap on the backdrop closes it.
  floating?: boolean;
  // The eyebrow's colour: a Sheet's is Felix's rose (the darkened rose for small text).
  eyebrowTone?: TextTone;
  // A Sheet only: Felix's choice rows under the question — a 40px disc with the glyph, a
  // sentence-case label and a ›, 56px tall between `hairline` rules. Twin of ui-native Sheet rows.
  rows?: readonly SheetRow[];
}

export interface SheetRow {
  icon: IconName;
  label: string;
  onClick: () => void;
}

// The screen behind dims; it never blurs to mush (beta). A drawer dims it with Felix's
// `backdrop`, a dialog with `backdrop-strong`.
const overlaySheet = 'fixed inset-0 z-50 bg-backdrop motion-safe:data-[state=open]:animate-fade-in';
const overlayDialog =
  'fixed inset-0 z-50 bg-backdrop-strong motion-safe:data-[state=open]:animate-fade-in';

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
  floating = false,
  eyebrowTone,
  rows,
  overlay = overlaySheet,
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
  | 'floating'
  | 'eyebrowTone'
  | 'rows'
> & {
  overlay?: string;
  grabBar?: boolean;
  className: string;
  titleSize: 'lg' | 'md';
}) {
  const titles = (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-2',
        !leading && !floating && (closeLabel ? 'pr-16' : 'pr-10'),
      )}
    >
      {eyebrow ? (
        <Eyebrow {...(eyebrowTone ? { tone: eyebrowTone } : {})}>{eyebrow}</Eyebrow>
      ) : null}
      <RadixDialog.Title asChild>
        <Heading
          level={2}
          size={titleSize}
          className={titleSize === 'md' ? 'leading-[1.15]' : undefined}
        >
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
        className={cn('fixed z-50 flex flex-col gap-6 bg-bg text-ink', className)}
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
          {/* The drawer's own handle: it says this pulls up from the edge, and nothing else. On a
              floating sheet it is also the close, in place of the ×. */}
          {grabBar && floating ? (
            <RadixDialog.Close asChild>
              <button
                type="button"
                aria-label={ui.close}
                className="-my-3 mx-auto flex h-9 w-24 shrink-0 items-center justify-center focus-visible:outline-[1.5px] focus-visible:outline-focus-ring"
              >
                <span aria-hidden className="h-1 w-9 rounded-[4px] bg-cream400 dark:bg-rule-mid" />
              </button>
            </RadixDialog.Close>
          ) : grabBar ? (
            <span
              aria-hidden
              className="mx-auto h-1 w-9 shrink-0 rounded-[4px] bg-cream400 dark:bg-rule-mid"
            />
          ) : null}
          {media ? (
            <div className="flex items-start gap-4">
              <span className="shrink-0">{media}</span>
              {head}
            </div>
          ) : (
            head
          )}
          {rows?.length ? (
            <div className="border-hairline border-b">
              {rows.map((row) => (
                <button
                  key={row.label}
                  type="button"
                  onClick={row.onClick}
                  className={cn(
                    'flex min-h-14 w-full items-center gap-3.5 border-hairline border-t px-1 text-left',
                    focusRing,
                  )}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-pill border-[0.5px] border-rule-mid bg-surface">
                    <Icon name={row.icon} size={17} stroke={1.4} />
                  </span>
                  <span className="type-body flex-1 leading-none">{row.label}</span>
                  <Icon name="forward" size={15} className="text-ink-faint" />
                </button>
              ))}
            </div>
          ) : null}
          {children}
          {footer ? <div className="flex flex-col gap-3">{footer}</div> : null}
          {/* Last in DOM order so opening focuses the content, not the close button. */}
          {floating ? null : (
            // The corner is held by a wrapper: a quiet button is `relative` (its hit ring).
            <div className="absolute top-3 right-3">
              <RadixDialog.Close asChild>
                {closeLabel ? (
                  <button type="button" className={buttonClasses({ variant: 'quiet' })}>
                    {closeLabel}
                  </button>
                ) : (
                  <IconButton icon="close" label={ui.close} />
                )}
              </RadixDialog.Close>
            </div>
          )}
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
  rows: _rows,
  ...root
}: DialogProps) {
  return (
    <Root {...root}>
      <Frame
        title={title}
        eyebrow={eyebrow}
        description={description}
        footer={footer}
        overlay={overlayDialog}
        titleSize="lg"
        className="top-1/2 left-1/2 max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-card p-6 shadow-dialog motion-safe:data-[state=open]:animate-rise sm:p-8"
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
  floating = false,
  eyebrowTone,
  rows,
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
        {...(closeLabel && !floating ? { closeLabel } : {})}
        eyebrowTone={eyebrowTone ?? 'warm'}
        {...(rows ? { rows } : {})}
        floating={floating}
        grabBar
        titleSize="md"
        className={
          floating
            ? 'inset-x-2 bottom-[calc(8px+env(safe-area-inset-bottom))] mx-auto max-h-[85dvh] max-w-xl overflow-y-auto rounded-sheet border-[0.5px] border-rule-mid px-5 pt-2.5 pb-[26px] shadow-sheet motion-safe:data-[state=open]:animate-sheet-up'
            : 'inset-x-0 bottom-0 mx-auto max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-t-sheet px-5 pt-2.5 pb-[max(34px,env(safe-area-inset-bottom))] motion-safe:data-[state=open]:animate-sheet-up'
        }
      >
        {children}
      </Frame>
    </Root>
  );
}

export const DialogClose = RadixDialog.Close;
