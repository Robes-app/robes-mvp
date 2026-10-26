'use client';

import { wardrobe } from '@robes/copy';
import {
  COLOUR_FAMILIES,
  PATTERNS,
  type PieceColour,
  pattern,
  pickShade,
  type Shade,
  shade,
} from '@robes/core/colour';
import { Icon } from '@robes/icons/web';
import { Text } from '@robes/ui';
import { type ButtonHTMLAttributes, type ReactNode, useEffect, useRef, useState } from 'react';

const copy = wardrobe.colour;

// Swatch colours are the colour model's data, not design tokens, so they are the one place a
// colour comes from an inline style (as You › Style's swatches).
export function ShadeSwatch({ shade: s, size = 24 }: { shade: Shade | null; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full border border-hairline"
      style={{ width: size, height: size, background: s?.css }}
    />
  );
}

// A family reads as ONE rounded square quartered into four of its shades (legacy .pf-tile) —
// never a row of circles, which reads as four separate answers rather than one family.
export function FamilyTile({
  family,
  size = 48,
}: {
  family: { name: string; tile: readonly Shade[] };
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-soft"
      style={{ width: size, height: size }}
    >
      {family.tile.map((s) => (
        <span key={s.id} className="block" style={{ background: s.css }} />
      ))}
    </span>
  );
}

// A print is a rounded square of its own pattern (legacy .pf-pt), to the family tile's shape.
export function PatternSwatch({
  pattern: p,
  size = 48,
}: {
  pattern: { name: string; css: string };
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className="block shrink-0 rounded-soft border border-hairline"
      style={{ width: size, height: size, background: p.css }}
    />
  );
}

// One answer in a drawer's list (beta's sheets): a 44pt row, the warm edge and a check when it is
// hers, white otherwise. The print, material and category lists all use it, so a pick reads the
// same in each. Native twin: OptionRow in features/wardrobe/ColourField.tsx.
export function OptionRow({
  selected = false,
  label,
  hint,
  icon,
  italic = false,
  trailing,
  className,
  ...button
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  selected?: boolean;
  label: string;
  hint?: string | null;
  // A picture of the answer before its name (a print's own square).
  icon?: ReactNode;
  // The serif italic line (the category drill's "Just jumpers & sweaters").
  italic?: boolean;
  // What sits at the right when the row isn't picked (a drill's chevron).
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      {...button}
      className={`flex min-h-11 w-full items-center gap-3 rounded-crisp border px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
        selected ? 'border-selected-line bg-selected' : 'border-transparent hover:bg-surface'
      } ${className ?? ''}`}
    >
      {icon}
      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={
            italic
              ? 'font-display font-light text-ink text-lg italic leading-snug'
              : 'font-light font-sans text-[0.9375rem] text-ink leading-snug'
          }
        >
          {label}
        </span>
        {hint ? <span className="font-sans text-[0.6875rem] text-ink-faint">{hint}</span> : null}
      </span>
      {selected ? <Icon name="check" size={18} className="shrink-0 text-ink" /> : trailing}
    </button>
  );
}

// A row of chips she scrolls sideways opens with the chosen one in view, 24px in from the edge
// (redline 09/10), rather than wherever the list happens to start.
export function useScrollToChosen<T extends HTMLElement>() {
  const row = useRef<T>(null);
  useEffect(() => {
    const list = row.current;
    const chosen = list?.querySelector<HTMLElement>('[data-chosen="true"]');
    if (list && chosen) list.scrollLeft = Math.max(0, chosen.offsetLeft - list.offsetLeft - 24);
  }, []);
  return row;
}

// "Navy · Optic white · Stripes", or nothing when no colour is set.
export function colourSummary(v: PieceColour): string {
  const names = [v.colourShade, ...v.colourExtra].map((id) => shade(id)?.name).filter(Boolean);
  const print = pattern(v.print)?.name;
  return [...names, ...(print ? [print] : [])].join(' · ');
}

// The family row, then its shades as named circles — the picker Settings' Your colours uses,
// so a colour reads the same wherever she sets one. It fills a drawer; it is never a page. It opens
// on the family of what is filed, scrolled into view and warm; a picked shade carries the warm
// ring and the check (redline 09).
export function ColourPicker({
  value,
  onChange,
  slot,
}: {
  value: PieceColour;
  onChange: (next: PieceColour) => void;
  slot: 'main' | 'extra';
}) {
  const chosen = new Set(slot === 'main' ? [value.colourShade].filter(Boolean) : value.colourExtra);
  const [family, setFamily] = useState(
    () =>
      shade(slot === 'main' ? value.colourShade : (value.colourExtra[0] ?? null))?.family ??
      'blacks',
  );
  const families = useScrollToChosen<HTMLUListElement>();
  const fam = COLOUR_FAMILIES.find((f) => f.id === family);
  return (
    <div className="flex flex-col gap-4">
      {/* The families scroll as one row, so the list never pushes the shades off the drawer. */}
      <ul
        ref={families}
        aria-label={copy.families}
        className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none]"
      >
        {COLOUR_FAMILIES.map((f) => (
          <li key={f.id} data-chosen={f.id === family}>
            <button
              type="button"
              aria-pressed={f.id === family}
              onClick={() => setFamily(f.id)}
              className={`flex w-[4.5rem] flex-col items-center gap-1.5 rounded-crisp border px-1 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
                f.id === family ? 'border-selected-line bg-selected' : 'border-transparent'
              }`}
            >
              <FamilyTile family={f} size={44} />
              <Text
                as="span"
                size="caption"
                tone={f.id === family ? 'default' : 'muted'}
                className={f.id === family ? 'font-medium' : undefined}
              >
                {f.name}
              </Text>
            </button>
          </li>
        ))}
      </ul>
      <ul
        aria-label={fam?.name}
        className="grid grid-cols-3 gap-x-3 gap-y-4 border-hairline border-t pt-4"
      >
        {fam?.shades.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              aria-pressed={chosen.has(s.id)}
              onClick={() => onChange(pickShade(value, s.id, slot))}
              className="flex w-full flex-col items-center gap-1.5 rounded-crisp focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              <span
                className={`relative flex size-14 items-center justify-center rounded-pill border border-hairline ${
                  chosen.has(s.id) ? 'ring-2 ring-selected-line ring-offset-3 ring-offset-bg' : ''
                }`}
                style={{ background: s.css }}
              >
                {chosen.has(s.id) ? (
                  <Icon name="check" size={20} className={s.light ? 'text-ink' : 'text-bg'} />
                ) : null}
              </span>
              <Text as="span" size="caption" tone="muted" className="text-center">
                {s.name}
              </Text>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Plain first, then the thirteen, as a list (beta): a 24px square of the print beside its name,
// the warm row and a check on hers. A pick is the answer.
export function PrintPicker({
  value,
  onChange,
}: {
  value: PieceColour;
  onChange: (next: PieceColour) => void;
}) {
  const options: { id: string | null; name: string; css: string }[] = [
    { id: null, name: copy.plain, css: 'var(--color-surface-raised)' },
    ...PATTERNS.map((p) => ({ id: p.id, name: p.name, css: p.css })),
  ];
  return (
    <div role="radiogroup" aria-label={copy.print} className="flex flex-col">
      {options.map((o) => (
        <OptionRow
          key={o.id ?? 'plain'}
          role="radio"
          aria-checked={value.print === o.id}
          selected={value.print === o.id}
          label={o.name}
          icon={<PatternSwatch pattern={o} size={24} />}
          onClick={() => onChange({ ...value, print: o.id })}
        />
      ))}
    </div>
  );
}
