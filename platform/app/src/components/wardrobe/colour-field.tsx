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
import { useState } from 'react';

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

// "Navy · Optic white · Stripes", or nothing when no colour is set.
export function colourSummary(v: PieceColour): string {
  const names = [v.colourShade, ...v.colourExtra].map((id) => shade(id)?.name).filter(Boolean);
  const print = pattern(v.print)?.name;
  return [...names, ...(print ? [print] : [])].join(' · ');
}

// The family row, then its shades as named circles — the picker Settings' Your colours uses,
// so a colour reads the same wherever she sets one. It fills a drawer; it is never a page.
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
  const fam = COLOUR_FAMILIES.find((f) => f.id === family);
  return (
    <div className="flex flex-col gap-4">
      {/* The families scroll as one row, so the list never pushes the shades off the drawer. */}
      <ul
        aria-label={copy.families}
        className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-1 [scrollbar-width:none]"
      >
        {COLOUR_FAMILIES.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              aria-pressed={f.id === family}
              onClick={() => setFamily(f.id)}
              className="flex w-16 flex-col items-center gap-1.5 rounded-crisp focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              <span
                className={`rounded-soft p-0.5 ${
                  f.id === family ? 'ring-2 ring-ink' : 'ring-1 ring-hairline'
                }`}
              >
                <FamilyTile family={f} size={44} />
              </span>
              <Text size="caption" tone={f.id === family ? 'default' : 'muted'}>
                {f.name}
              </Text>
            </button>
          </li>
        ))}
      </ul>
      <ul aria-label={fam?.name} className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4">
        {fam?.shades.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              aria-pressed={chosen.has(s.id)}
              onClick={() => onChange(pickShade(value, s.id, slot))}
              className="flex w-full flex-col items-center gap-1.5 rounded-crisp focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              <span
                className="relative flex size-12 items-center justify-center rounded-pill border border-hairline"
                style={{ background: s.css }}
              >
                {chosen.has(s.id) ? (
                  <Icon name="check" size={18} className={s.light ? 'text-ink' : 'text-bg'} />
                ) : null}
              </span>
              <Text size="caption" tone="muted" className="text-center">
                {s.name}
              </Text>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Plain first, then the thirteen — a print is its own square, to the family tile's shape.
export function PrintPicker({
  value,
  onChange,
}: {
  value: PieceColour;
  onChange: (next: PieceColour) => void;
}) {
  const options: { id: string | null; name: string; css: string }[] = [
    { id: null, name: copy.plain, css: 'var(--color-surface)' },
    ...PATTERNS.map((p) => ({ id: p.id, name: p.name, css: p.css })),
  ];
  return (
    <ul aria-label={copy.print} className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4">
      {options.map((o) => (
        <li key={o.id ?? 'plain'}>
          <button
            type="button"
            aria-pressed={value.print === o.id}
            onClick={() => onChange({ ...value, print: o.id })}
            className="flex w-full flex-col items-center gap-1.5 rounded-crisp focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            <span
              className={`relative flex size-12 items-center justify-center rounded-soft border ${
                value.print === o.id ? 'border-ink' : 'border-hairline'
              }`}
              style={{ background: o.css }}
            >
              {value.print === o.id ? <Icon name="check" size={18} className="text-ink" /> : null}
            </span>
            <Text size="caption" tone="muted" className="text-center">
              {o.name}
            </Text>
          </button>
        </li>
      ))}
    </ul>
  );
}
