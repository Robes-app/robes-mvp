'use client';

import { Icon } from '@robes/icons/web';
import { type KeyboardEvent, useRef } from 'react';
import { cn, focusRing } from './cn';

// Avoid · no view · love. @robes/core/colour owns the `Preference` name; this is the same union.
type Pref = -1 | 0 | 1;

export interface PreferenceControlProps {
  label: string;
  value: Pref | null;
  onChange: (value: Pref) => void;
  labels: { avoid: string; none: string; love: string };
  // The family's answer, shown as an outline while a shade follows it.
  inherited?: Pref;
  // sm: the indented shade rows; md: the family and print rows.
  size?: 'md' | 'sm';
  // Names the family a following shade is taking its answer from.
  follows?: string;
  className?: string;
}

const ORDER: Pref[] = [-1, 0, 1];
const NEXT = new Set(['ArrowRight', 'ArrowDown']);
const PREV = new Set(['ArrowLeft', 'ArrowUp']);

// The palette's three-state control (legacy .pf-ctl): a track, a thumb that slides to the
// answer, and three verbs. Selected is the warm fill, never black; love is rose. A shade with no
// answer of its own shows an OUTLINE thumb on its family's answer — it follows, it hasn't been set.
export function PreferenceControl({
  label,
  value,
  onChange,
  labels,
  inherited = 0,
  size = 'md',
  follows,
  className,
}: PreferenceControlProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const following = value === null;
  const shown = following ? inherited : value;
  const current = ORDER.indexOf(shown);
  const verbs = [labels.avoid, labels.none, labels.love];

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    let next: number | null = null;
    if (NEXT.has(event.key)) next = (current + 1) % ORDER.length;
    else if (PREV.has(event.key)) next = (current - 1 + ORDER.length) % ORDER.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = ORDER.length - 1;
    if (next === null) return;
    event.preventDefault();
    const pick = ORDER[next];
    if (pick === undefined) return;
    onChange(pick);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={following && follows ? `${label}: following ${follows}` : label}
      className={cn(
        'relative inline-grid grid-flow-col auto-cols-fr rounded-pill border border-hairline bg-bg p-0.5',
        size === 'md' ? 'h-11 w-36' : 'h-8 w-27',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-0.5 bottom-0.5 rounded-pill border motion-safe:transition-[left] motion-safe:duration-200',
          following ? 'border-ink-faint bg-transparent' : 'border-selected-line bg-selected',
          size === 'md' ? 'w-[46px]' : 'w-[34px]',
        )}
        style={{ left: `calc(${current} * (100% - 4px) / 3 + 2px)` }}
      />
      {ORDER.map((pref, index) => {
        const checked = index === current;
        const set = checked && !following;
        return (
          // biome-ignore lint/a11y/useSemanticElements: WAI-ARIA radio group of buttons; native radios can't take the thumb styling.
          <button
            key={pref}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={verbs[index]}
            title={verbs[index]}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(pref)}
            onKeyDown={onKeyDown}
            className={cn(
              'relative inline-flex items-center justify-center rounded-pill after:absolute after:-inset-y-2 after:inset-x-0',
              set && pref === 1 ? 'text-accent-inspire' : set ? 'text-ink' : 'text-ink-faint',
              focusRing,
            )}
          >
            {pref === 0 ? (
              <span
                aria-hidden
                className={cn('rounded-pill bg-current', size === 'md' ? 'size-1' : 'size-[3px]')}
              />
            ) : (
              <Icon
                name={pref === -1 ? 'avoid' : 'heart'}
                size={size === 'md' ? 16 : 13}
                filled={set && pref === 1}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
