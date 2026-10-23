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
import { Button, Pill, SegmentedControl, Text } from '@robes/ui';
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

// The piece's colour in view and add mode (legacy f3e5b5b): the current read, then a family →
// shade picker for the main colour or up to three more, and the print.
export function ColourField({
  value,
  onChange,
  check = false,
}: {
  value: PieceColour;
  onChange: (next: PieceColour) => void;
  check?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<'main' | 'extra'>('main');
  const [family, setFamily] = useState(shade(value.colourShade)?.family ?? 'blacks');
  const summary = colourSummary(value);
  const fam = COLOUR_FAMILIES.find((f) => f.id === family);
  const chosen = new Set(slot === 'main' ? [value.colourShade] : value.colourExtra);
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 font-sans text-sm font-medium text-ink">{copy.title}</legend>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex -space-x-1.5">
          {[value.colourShade, ...value.colourExtra].map((id, i) => (
            <ShadeSwatch key={id ?? i} shade={shade(id)} />
          ))}
        </span>
        <Text tone={summary ? 'default' : 'faint'} italic={!summary}>
          {summary || copy.notSet}
        </Text>
        <Button variant="quiet" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? copy.done : copy.change}
        </Button>
      </div>
      {check ? (
        <Text size="small" tone="muted">
          {copy.check}
        </Text>
      ) : null}
      {open ? (
        <div className="flex flex-col gap-4">
          <SegmentedControl
            size="sm"
            label={copy.title}
            options={[
              { value: 'main', label: copy.main },
              { value: 'extra', label: copy.extra },
            ]}
            value={slot}
            onChange={setSlot}
          />
          {slot === 'extra' ? (
            <Text size="small" tone="muted">
              {copy.extraHint}
            </Text>
          ) : null}
          <ul aria-label={copy.families} className="flex flex-wrap gap-2">
            {COLOUR_FAMILIES.map((f) => (
              <li key={f.id}>
                <Pill selected={f.id === family} onClick={() => setFamily(f.id)}>
                  {f.name}
                </Pill>
              </li>
            ))}
          </ul>
          <ul aria-label={fam?.name} className="flex flex-wrap gap-2">
            {fam?.shades.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-pressed={chosen.has(s.id)}
                  onClick={() => onChange(pickShade(value, s.id, slot))}
                  className={`flex min-h-11 items-center gap-2 rounded-pill border px-3 font-sans text-sm focus-visible:outline-2 focus-visible:outline-focus-ring ${
                    chosen.has(s.id) ? 'border-ink text-ink' : 'border-hairline text-ink-muted'
                  }`}
                >
                  <ShadeSwatch shade={s} size={20} />
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-sans text-sm text-ink-muted">{copy.print}</legend>
            <div className="flex flex-wrap gap-2">
              <Pill
                selected={value.print === null}
                onClick={() => onChange({ ...value, print: null })}
              >
                {copy.plain}
              </Pill>
              {PATTERNS.map((p) => (
                <Pill
                  key={p.id}
                  selected={value.print === p.id}
                  onClick={() => onChange({ ...value, print: p.id })}
                >
                  {p.name}
                </Pill>
              ))}
            </div>
          </fieldset>
        </div>
      ) : null}
    </fieldset>
  );
}
