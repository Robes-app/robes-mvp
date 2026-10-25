'use client';

import { Icon, type IconName } from '@robes/icons/web';
import { type KeyboardEvent, useRef } from 'react';
import { cn, focusRing } from './cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  // Shown instead of the label (which stays the accessible name), e.g. the grid | list toggle.
  icon?: IconName;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  // md: the tab header's track (beta parity canvas: 38pt segments in a 3pt sunk track = 44pt);
  // sm: the count row's small grid | list toggle (32pt).
  size?: 'md' | 'sm';
  className?: string;
}

const NEXT = new Set(['ArrowRight', 'ArrowDown']);
const PREV = new Set(['ArrowLeft', 'ArrowUp']);

// The header's segmented control (legacy header audit): a sunk track, a raised thumb, tracked
// caps. Radio-group semantics: one tab stop, arrows move and select (WAI-ARIA radio group pattern).
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  size = 'md',
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
      className={cn(
        'inline-grid grid-flow-col auto-cols-fr rounded-pill bg-surface-sunk p-[3px]',
        size === 'md' ? 'h-11 min-w-[213px]' : 'h-8 min-w-[72px]',
        className,
      )}
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
            aria-label={option.icon ? option.label : undefined}
            title={option.icon ? option.label : undefined}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={onKeyDown}
            className={cn(
              'relative inline-flex items-center justify-center rounded-pill border px-3 font-sans text-[10px] font-medium tracking-[0.24em] uppercase motion-safe:transition-colors motion-safe:duration-150',
              // The selected segment is raised on the warm edge (the native twin: ui-native); the
              // rest read ink-faint, since ink-muted on the sunk track is 4.44:1, under AA.
              checked
                ? 'border-selected-line bg-surface-raised text-ink'
                : 'border-transparent text-ink-faint hover:text-ink',
              focusRing,
            )}
          >
            {option.icon ? <Icon name={option.icon} size={14} /> : option.label}
          </button>
        );
      })}
    </div>
  );
}
