'use client';

import { Icon, type IconName } from '@robes/icons/web';
import { type KeyboardEvent, type ReactNode, useRef } from 'react';
import { cn, focusRing } from './cn';

export interface TabsProps<T extends string> {
  items: readonly T[];
  value: T;
  onChange: (item: T) => void;
  // Names the rail for a reader ("Look").
  label?: string;
  // A 12px glyph before a tab's label (the Lookbook's bookmark and sparkle, the Wardrobe's
  // hanger, heart and bag). Front Door PRD rev 3 §2.4.
  icons?: Partial<Record<T, IconName>>;
  // A count after a tab's label, lighter ("INBOX 13").
  counts?: Partial<Record<T, number>>;
  // Tabs that are shown but not yet open (the Wardrobe's SHOP until the Shop PRD lands): 45%,
  // no pointer, announced as disabled.
  disabled?: readonly T[];
  // What sits at the rail's right end: the ink + that adds to the tab.
  trailing?: ReactNode;
  className?: string;
}

// Felix's Tabs: an underline rail (Pieces · Details), 44 tall on a 0.5px `hairline` baseline,
// left-aligned; each tab 0 16 in the `label` caps, `ink-soft`, the selected one `ink` on a 1.5px
// ink underline. Two to four tabs; a leading glyph, a count and a trailing control where a screen
// header asks for them. Arrow keys move between tabs. Twin of ui-native Tabs.tsx.
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  icons,
  counts,
  disabled,
  trailing,
  className,
}: TabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const isOff = (item: T) => disabled?.includes(item) === true;
  const move = (event: KeyboardEvent, index: number) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    let next = index;
    for (let i = 0; i < items.length; i += 1) {
      next = (next + step + items.length) % items.length;
      const candidate = items[next];
      if (candidate !== undefined && !isOff(candidate)) break;
    }
    const item = items[next];
    if (item === undefined || isOff(item)) return;
    onChange(item);
    refs.current[next]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('flex items-center border-hairline border-b-[0.5px]', className)}
    >
      {items.map((item, index) => {
        const selected = item === value;
        const off = isOff(item);
        const icon = icons?.[item];
        const count = counts?.[item];
        return (
          <button
            key={item}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={count === undefined ? undefined : `${item} ${count}`}
            aria-disabled={off || undefined}
            disabled={off}
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              if (!selected) onChange(item);
            }}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              'type-label inline-flex min-h-11 items-center gap-1.5 px-4',
              selected
                ? 'text-ink shadow-[inset_0_-1.5px_0_var(--ink)]'
                : 'text-ink-muted hover:text-ink',
              off && 'opacity-45 hover:text-ink-muted disabled:cursor-default',
              focusRing,
            )}
          >
            {icon ? <Icon name={icon} size={12} /> : null}
            {item}
            {count !== undefined ? (
              <span className="font-normal tracking-normal text-ink-faint">{count}</span>
            ) : null}
          </button>
        );
      })}
      {trailing ? <div className="ml-auto flex items-center pr-1">{trailing}</div> : null}
    </div>
  );
}
