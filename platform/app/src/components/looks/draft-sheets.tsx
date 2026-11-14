'use client';

import { lookbook } from '@robes/copy';
import { ASK_MAX_CHARS } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';

const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Felix's floating sheet shell (the AdjustSheet): a cream card 8px from the drawer's
// sides and bottom on a 0.5px `rule-mid` edge, sheet corners and shadow, sliding up over 0.3s,
// with a 40px header — the 9px tracked title and a 36px `cream-200` close disc. A tap on the
// body behind it, or Escape, closes it. Native twin: mobile/src/features/looks/DraftSheets.tsx.
function FloatingSheet({
  title,
  onClose,
  children,
  testId,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  testId: string;
}) {
  const id = useId();
  return (
    <>
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 z-10 cursor-default"
      />
      <section
        role="dialog"
        aria-modal="false"
        aria-labelledby={id}
        data-testid={testId}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
        }}
        className="absolute inset-x-2 bottom-2 z-20 rounded-sheet border-[0.5px] border-rule-mid bg-bg px-5 pt-2.5 pb-[26px] shadow-sheet motion-safe:animate-[robes-sheet-up_300ms_cubic-bezier(.2,0,.2,1)]"
      >
        <header className="flex h-10 items-center justify-between">
          <h2 id={id} className="type-label text-ink-muted">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={lookbook.draftLook.close}
            className={`relative flex size-9 items-center justify-center rounded-pill bg-surface-sunk text-ink-muted after:absolute after:-inset-1 after:content-[''] hover:text-ink ${focus}`}
          >
            <Icon name="close" size={14} />
          </button>
        </header>
        {children}
      </section>
    </>
  );
}

// The sheet's one-line field: Cormorant italic 300 at 17px, Enter sends, no focus ring (the card
// and the caret say where she is typing).
export function SheetField({
  label,
  placeholder,
  value,
  onChange,
  onSend,
  disabled,
  autoFocus = true,
  hardLimit = true,
  className,
  testId,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  autoFocus?: boolean;
  // The prompt box lets her run past the limit and says so (look prompt PRD P4); the sheets cut.
  hardLimit?: boolean;
  className?: string;
  testId: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };
  return (
    <textarea
      ref={ref}
      rows={1}
      aria-label={label}
      value={value}
      {...(hardLimit ? { maxLength: ASK_MAX_CHARS } : {})}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      data-testid={testId}
      className={`max-h-24 min-w-0 flex-1 resize-none bg-transparent font-display font-light text-[17px] text-ink italic placeholder:text-ink-faint focus:outline-none ${className ?? ''}`}
    />
  );
}

// Felix's AdjustSheet ("Adjust model image"): one sentence about the render — "sleeves rolled
// up" — sent into the look's thread; the picture is drawn once it lands. The send cell dims until
// there is text and spins the refresh glyph while it renders.
export function AdjustSheet({
  open,
  sending,
  onSend,
  onClose,
}: {
  open: boolean;
  sending: boolean;
  onSend: (text: string) => void;
  onClose: () => void;
}) {
  const copy = lookbook.draftLook.adjustSheet;
  const [text, setText] = useState('');
  if (!open) return null;
  const send = () => {
    const words = text.trim();
    if (!words || sending) return;
    onSend(words);
    setText('');
  };
  return (
    <FloatingSheet title={copy.title} onClose={onClose} testId="adjust-sheet">
      <div className="mt-4 flex h-13 items-stretch overflow-hidden rounded-sheet bg-surface-raised pl-4">
        <SheetField
          label={copy.title}
          placeholder={copy.placeholder}
          value={text}
          onChange={setText}
          onSend={send}
          disabled={sending}
          className="py-3.5"
          testId="adjust-sheet-field"
        />
        <button
          type="button"
          aria-label={copy.send}
          onClick={send}
          disabled={sending || !text.trim()}
          className={`flex w-14 shrink-0 items-center justify-center bg-surface-sunk text-ink disabled:opacity-40 ${focus}`}
        >
          {sending ? (
            <Icon
              name="refresh"
              size={15}
              className="motion-safe:animate-spin [animation-direction:reverse]"
            />
          ) : (
            <Icon name="forward" size={15} />
          )}
        </button>
      </div>
    </FloatingSheet>
  );
}
