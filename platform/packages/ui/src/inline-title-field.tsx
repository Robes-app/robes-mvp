'use client';

import { useEffect, useRef } from 'react';
import { cn } from './cn';
import { type HeadingSize, headingSizes } from './text';

export interface InlineTitleFieldProps {
  // The title as it stands. With onChange the field is controlled by it.
  value: string;
  // The accessible name: the control carries the ask, so there is no visible label.
  label: string;
  placeholder?: string;
  maxLength?: number;
  // Match the title it replaces (Heading's size and italic) so nothing moves when editing starts.
  size?: HeadingSize;
  italic?: boolean;
  align?: 'start' | 'center';
  // Opened by a pencil: focused with the title selected. A title that is always the field (the
  // draft composer's) passes false.
  autoFocus?: boolean;
  // A title that can't be empty (a saved look's name): an empty value cancels instead.
  required?: boolean;
  onChange?: (value: string) => void;
  // Enter or blur: the trimmed value. Escape, or an empty required value: onCancel.
  // Optional only for a standing title whose name rides with the page's Save.
  onCommit?: (value: string) => void;
  onCancel?: () => void;
  className?: string;
}

// The title itself becomes the field (beta's .rb-tb-title-in): transparent, the serif at the
// title's size, one underline — no label, no Save or Cancel. Focus is the underline going ink
// and doubling (the ring-free 3:1 indicator Field's underline variant uses), never a box.
// Native twin: packages/ui-native/src/InlineTitleField.tsx.
export function InlineTitleField({
  value,
  label,
  placeholder,
  maxLength = 120,
  size = 'xl',
  italic = false,
  align = 'start',
  autoFocus = true,
  required = false,
  onChange,
  onCommit,
  onCancel,
  className,
}: InlineTitleFieldProps) {
  const ref = useRef<HTMLInputElement>(null);
  // One ending per edit: Enter or Escape blurs the field, and that blur must not end it twice.
  const done = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: focus once, when the pencil opens it
  useEffect(() => {
    if (!autoFocus) return;
    ref.current?.focus();
    ref.current?.select();
  }, []);

  function finish(next: string | null) {
    if (done.current) return;
    done.current = true;
    if (next === null || (required && !next)) onCancel?.();
    else onCommit?.(next);
  }

  return (
    <input
      ref={ref}
      type="text"
      aria-label={label}
      {...(onChange
        ? { value, onChange: (e) => onChange(e.currentTarget.value) }
        : { defaultValue: value })}
      placeholder={placeholder}
      maxLength={maxLength}
      enterKeyHint="done"
      autoComplete="off"
      onFocus={() => {
        done.current = false;
      }}
      onBlur={(e) => finish(e.currentTarget.value.trim())}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== 'Escape') return;
        e.preventDefault();
        finish(e.key === 'Enter' ? e.currentTarget.value.trim() : null);
        e.currentTarget.blur();
      }}
      className={cn(
        'min-h-11 w-full min-w-0 rounded-none border-0 border-b border-border-control bg-transparent p-0 font-display font-light text-ink outline-none placeholder:text-ink-faint focus-visible:border-ink focus-visible:shadow-[0_1px_0_0_var(--color-ink)]',
        headingSizes[size],
        italic && 'italic',
        align === 'center' && 'text-center',
        className,
      )}
    />
  );
}
