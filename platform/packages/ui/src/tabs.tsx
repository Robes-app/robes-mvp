'use client';

import { type KeyboardEvent, useRef } from 'react';
import { cn, focusRing } from './cn';

export interface TabsProps<T extends string> {
  items: readonly T[];
  value: T;
  onChange: (item: T) => void;
  // Names the rail for a reader ("Look").
  label?: string;
  className?: string;
}

// Felix's Tabs: an underline rail (Pieces · Details), 44 tall on a 0.5px `hairline` baseline,
// left-aligned; each tab 0 16 in the `label` caps, `ink-soft`, the selected one `ink` on a 1.5px
// ink underline. Two to four tabs, never icons. Arrow keys move between tabs. Twin of ui-native
// Tabs.tsx.
export function Tabs<T extends string>({ items, value, onChange, label, className }: TabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const move = (event: KeyboardEvent, index: number) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + items.length) % items.length;
    const item = items[next];
    if (item === undefined) return;
    onChange(item);
    refs.current[next]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('flex border-hairline border-b-[0.5px]', className)}
    >
      {items.map((item, index) => {
        const selected = item === value;
        return (
          <button
            key={item}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              if (!selected) onChange(item);
            }}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              'type-label min-h-11 px-4',
              selected
                ? 'text-ink shadow-[inset_0_-1.5px_0_var(--ink)]'
                : 'text-ink-muted hover:text-ink',
              focusRing,
            )}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}
