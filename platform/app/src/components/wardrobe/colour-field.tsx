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
import { type ButtonHTMLAttributes, type ReactNode, useId, useState } from 'react';

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
  shape = 'soft',
}: {
  family: { name: string; tile: readonly Shade[] };
  size?: number;
  // tile: onboarding's small square, 5px corners on a hairline (redline audit 30 Oct).
  shape?: 'soft' | 'tile';
}) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 grid-cols-2 gap-px overflow-hidden ${shape === 'tile' ? 'rounded-[5px] border-[0.5px] border-rule-mid' : 'rounded-soft'}`}
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
  round = false,
}: {
  pattern: { name: string; css: string };
  size?: number;
  // A circle, as a shade's swatch beside it in a list (canvas 3b's print rows).
  round?: boolean;
}) {
  return (
    <span
      aria-hidden
      // A row-sized square keeps the small radius, or it reads as a dot.
      className={`block shrink-0 border border-hairline ${round ? 'rounded-full' : size < 24 ? 'rounded-crisp' : 'rounded-soft'}`}
      style={{ width: size, height: size, background: p.css }}
    />
  );
}

// One answer in a drawer's list (beta's sheets): a 44pt row, the warm edge and a check when it is
// hers, white otherwise. The category drill and the seasons use it, so a pick reads the same in
// each. Native twin: OptionRow in features/wardrobe/ColourField.tsx.
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
      className={`flex min-h-11 w-full items-center gap-3 rounded-crisp border px-3 py-2 text-left focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
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

// "Navy · Optic white · Stripes", or nothing when no colour is set.
export function colourSummary(v: PieceColour): string {
  const names = [v.colourShade, ...v.colourExtra].map((id) => shade(id)?.name).filter(Boolean);
  const print = pattern(v.print)?.name;
  return [...names, ...(print ? [print] : [])].join(' · ');
}

// One answer in a family list: the shade's swatch (or nothing, for a material), its name and hint,
// the check when it is hers. A disabled answer is dimmed (the main colour among the additional).
export interface FamilyItem {
  id: string;
  name: string;
  hint?: string | null;
  swatch?: ReactNode;
  selected: boolean;
  disabled?: boolean;
  onPick: () => void;
}

export interface FamilyGroup {
  id: string;
  name: string;
  // The family's quartered tile (colour); a material family has none.
  tile?: ReactNode;
  items: FamilyItem[];
}

// Canvas 3b's family list (Annie, 10 Nov): the families in one white card, one open at a time. A
// family's header turns its chevron and lays its answers beneath; closed, it names what is picked
// inside it. It opens on the family of what is filed. The colour, additional colour and material
// drawers all use it. Native twin: FamilyList in features/wardrobe/ColourField.tsx.
export function FamilyList({
  groups,
  initial,
  itemRole,
}: {
  groups: readonly FamilyGroup[];
  initial: string | null;
  // radio: one answer (material); button: pressed answers (a colour, the additional colours).
  itemRole: 'radio' | 'button';
}) {
  const [open, setOpen] = useState(initial);
  const id = useId();
  const row = (
    it: FamilyItem,
    state: { role: 'radio'; 'aria-checked': boolean } | { 'aria-pressed': boolean },
  ) => (
    <button
      key={it.id}
      type="button"
      {...state}
      disabled={it.disabled}
      onClick={it.onPick}
      className={`flex w-full items-center gap-3.5 pr-4 text-left focus-visible:outline-[1.5px] focus-visible:-outline-offset-2 focus-visible:outline-focus-ring disabled:opacity-35 ${
        it.hint ? 'min-h-13' : 'min-h-11'
      } ${it.swatch ? 'pl-[66px]' : 'pl-8'}`}
    >
      {it.swatch}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-sans text-ink text-sm">{it.name}</span>
        {it.hint ? <span className="font-sans text-ink-faint text-xs">{it.hint}</span> : null}
      </span>
      <Icon
        name="check"
        size={15}
        className={`shrink-0 text-ink ${it.selected ? '' : 'opacity-0'}`}
      />
    </button>
  );
  return (
    <div className="flex flex-col divide-y divide-hairline overflow-hidden rounded-[12px] border border-rule-mid bg-surface-raised">
      {groups.map((g) => {
        const isOpen = g.id === open;
        const picked = g.items
          .filter((it) => it.selected)
          .map((it) => it.name)
          .join(', ');
        const panel = `${id}-${g.id}`;
        return (
          <div key={g.id}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panel}
              aria-label={picked && !isOpen ? `${g.name}, ${picked}` : g.name}
              onClick={() => setOpen(isOpen ? null : g.id)}
              className={`flex w-full items-center gap-3.5 px-4 text-left focus-visible:outline-[1.5px] focus-visible:-outline-offset-2 focus-visible:outline-focus-ring ${
                g.tile ? 'min-h-15' : 'min-h-13'
              }`}
            >
              {g.tile}
              <span className="flex min-w-0 flex-1 items-center gap-1.5 font-medium font-sans text-[0.9375rem] text-ink">
                {g.name}
                <Icon
                  name="down"
                  size={12}
                  className={`shrink-0 text-ink-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </span>
              {picked && !isOpen ? (
                <span className="max-w-[45%] truncate font-sans text-[0.8125rem] text-ink-faint">
                  {picked}
                </span>
              ) : null}
            </button>
            {isOpen ? (
              itemRole === 'radio' ? (
                <div
                  id={panel}
                  role="radiogroup"
                  aria-label={g.name}
                  className="flex flex-col pb-2.5"
                >
                  {g.items.map((it) => row(it, { role: 'radio', 'aria-checked': it.selected }))}
                </div>
              ) : (
                <fieldset id={panel} className="m-0 flex min-w-0 flex-col border-0 p-0 pb-2.5">
                  <legend className="sr-only">{g.name}</legend>
                  {g.items.map((it) => row(it, { 'aria-pressed': it.selected }))}
                </fieldset>
              )
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// The colour families as a FamilyList (canvas 3b): each family's tile, its shades as named circles.
// A pick of the main colour is the answer; the additional colours are pressed as many as there
// are (up to three), and the main colour sits dimmed among them.
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
  const home =
    shade(slot === 'main' ? value.colourShade : (value.colourExtra[0] ?? null))?.family ??
    COLOUR_FAMILIES[0]?.id ??
    null;
  return (
    <FamilyList
      initial={home}
      itemRole="button"
      groups={COLOUR_FAMILIES.map((f) => ({
        id: f.id,
        name: f.name,
        tile: <FamilyTile family={f} size={36} />,
        items: f.shades.map((s) => ({
          id: s.id,
          name: s.name,
          swatch: <ShadeSwatch shade={s} size={22} />,
          selected: chosen.has(s.id),
          disabled: slot === 'extra' && s.id === value.colourShade,
          onPick: () => onChange(pickShade(value, s.id, slot)),
        })),
      }))}
    />
  );
}

// Plain first, then the thirteen, as one white card of rows (canvas 3b): a round swatch of the
// print, its name, the check on hers. A pick is the answer.
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
    <div
      role="radiogroup"
      aria-label={copy.print}
      className="flex flex-col divide-y divide-hairline overflow-hidden rounded-[12px] border border-rule-mid bg-surface-raised"
    >
      {options.map((o) => (
        // biome-ignore lint/a11y/useSemanticElements: a radio group of rows; native radios can't take the row styling.
        <button
          key={o.id ?? 'plain'}
          type="button"
          role="radio"
          aria-checked={value.print === o.id}
          onClick={() => onChange({ ...value, print: o.id })}
          className="flex min-h-13 w-full items-center gap-3.5 px-4 text-left focus-visible:outline-[1.5px] focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
        >
          <PatternSwatch pattern={o} size={26} round />
          <span className="min-w-0 flex-1 truncate font-sans text-ink text-sm">{o.name}</span>
          <Icon
            name="check"
            size={15}
            className={`shrink-0 text-ink ${value.print === o.id ? '' : 'opacity-0'}`}
          />
        </button>
      ))}
    </div>
  );
}
