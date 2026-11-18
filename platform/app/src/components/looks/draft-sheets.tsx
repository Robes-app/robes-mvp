'use client';

import { ASK_MAX_CHARS } from '@robes/core/looks';
import { type KeyboardEvent, useEffect, useRef } from 'react';

const _focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

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
  faintHint = false,
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
  // The prompt box's resting line is the lighter `placeholder` grey (redline 14 Nov, pin 9).
  faintHint?: boolean;
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
      className={`max-h-24 min-w-0 flex-1 resize-none bg-transparent font-display font-light text-[17px] text-ink italic ${faintHint ? 'placeholder:text-placeholder' : 'placeholder:text-ink-faint'} focus:outline-none ${className ?? ''}`}
    />
  );
}
