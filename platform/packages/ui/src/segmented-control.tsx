'use client';

import { type KeyboardEvent, useRef } from 'react';
import { cn, focusRing } from './cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

const NEXT = new Set(['ArrowRight', 'ArrowDown']);
const PREV = new Set(['ArrowLeft', 'ArrowUp']);

// Radio-group semantics: one tab stop, arrows move and select (WAI-ARIA radio group pattern).
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    let next: number | null = null;
    if (NEXT.has(event.key)) next = (current + 1) % options.length;
    else if (PREV.has(event.key)) next = (current - 1 + options.length) % options.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    if (next === null) return;
    event.preventDefault();
    const option = options[next];
    if (!option) return;
    onChange(option.value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex rounded-pill bg-surface-sunk p-0.5', className)}
    >
      {options.map((option, index) => {
        const checked = index === current;
        return (
          // biome-ignore lint/a11y/useSemanticElements: WAI-ARIA radio group of buttons; native radios can't take the pill segment styling.
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={onKeyDown}
            className={cn(
              'min-h-11 rounded-pill border px-4 font-sans text-sm font-medium motion-safe:transition-colors motion-safe:duration-150',
              checked
                ? 'border-hairline bg-bg text-ink'
                : // ink, not ink-muted: muted text on the sunk track is under 4.5:1.
                  'border-transparent text-ink hover:border-hairline',
              focusRing,
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
