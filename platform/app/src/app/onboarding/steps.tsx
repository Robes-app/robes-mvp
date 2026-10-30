'use client';

import { firstRun as copy, you } from '@robes/copy';
import { COLOUR_FAMILIES } from '@robes/core/colour';
import { brandMark, STYLE_TYPES, type StyleType } from '@robes/core/style-dna';
import { Icon } from '@robes/icons/web';
import { PreferenceControl } from '@robes/ui';
import { FamilyTile } from '@/components/wardrobe/colour-field';
import { archetypeImages } from './archetype-images';

export const IDENTITIES = ['woman', 'man', 'non_binary', 'unspecified'] as const;
export type Identity = (typeof IDENTITIES)[number];
export type Colours = Partial<Record<string, 1 | -1>>;

const cn = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(' ');

// Selected is the warm fill with its edge, never black; unselected is white on a hairline.
const choice = (on: boolean) =>
  cn(
    'border motion-safe:transition-colors motion-safe:duration-[250ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
    on ? 'border-selected-line bg-selected' : 'border-hairline bg-surface-raised',
  );

// 02 Identity (twin: mobile app/onboarding/identity.tsx): one answer, required.
export function IdentityStep({
  value,
  onChange,
}: {
  value: Identity | null;
  onChange: (v: Identity) => void;
}) {
  return (
    <div role="radiogroup" aria-label={copy.identity.title} className="flex flex-col gap-2.5">
      {IDENTITIES.map((id) => {
        const on = value === id;
        return (
          // biome-ignore lint/a11y/useSemanticElements: a radio group of rows; native radios can't take the row styling.
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(id)}
            className={cn(
              'flex min-h-14 items-center justify-between rounded-soft px-4 py-4 text-left',
              choice(on),
            )}
          >
            <span className="font-display text-ink text-lg">{you.model.presenceOptions[id]}</span>
            <span
              aria-hidden
              className={cn(
                'flex size-[18px] items-center justify-center rounded-full border text-[9px] text-ink',
                on ? 'border-selected-line bg-selected' : 'border-border-control',
              )}
            >
              {on ? <Icon name="check" size={10} /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// 03 Styles (twin: mobile app/onboarding/styles.tsx): eight archetypes, four photographs each.
export function StylesStep({
  identity,
  value,
  onToggle,
}: {
  identity: Identity | null;
  value: readonly StyleType[];
  onToggle: (t: StyleType) => void;
}) {
  return (
    <ul className="flex flex-col gap-2.5">
      {STYLE_TYPES.map((type) => {
        const on = value.includes(type);
        return (
          <li key={type}>
            <button
              type="button"
              aria-pressed={on}
              aria-label={copy.styles.love(type)}
              onClick={() => onToggle(type)}
              className={cn('flex w-full flex-col rounded-card p-[5px] text-left', choice(on))}
            >
              <span className="grid h-[164px] grid-cols-4 gap-[3px] overflow-hidden rounded-[10px]">
                {archetypeImages(type, identity).map(({ key, src }) => (
                  // biome-ignore lint/performance/noImgElement: small bundled stills, no optimiser needed
                  <img
                    key={key}
                    src={src}
                    alt=""
                    loading="lazy"
                    className="size-full bg-surface-sunk object-cover"
                  />
                ))}
              </span>
              <span className="flex min-h-9 items-center justify-between px-1.5 pt-1.5 pb-0.5">
                <span className="font-display text-ink text-xl">{type}</span>
                <Icon name="heart" size={18} filled={on} className="text-accent-inspire" />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// 04 Brands (twin: mobile app/onboarding/brands.tsx): each house set as its own wordmark.
export function BrandsStep({
  wall,
  value,
  onToggle,
}: {
  wall: readonly string[];
  value: readonly string[];
  onToggle: (b: string) => void;
}) {
  return (
    <ul className="grid grid-cols-3 gap-1.5">
      {wall.map((name) => {
        const on = value.includes(name);
        const m = brandMark(name);
        return (
          <li key={name}>
            <button
              type="button"
              aria-pressed={on}
              aria-label={m.lines ? name : undefined}
              onClick={() => onToggle(name)}
              className={cn(
                'flex h-[66px] w-full items-center justify-center overflow-hidden rounded-input px-1.5 text-center text-ink',
                choice(on),
              )}
            >
              <span
                className={cn(
                  'whitespace-nowrap',
                  m.lines ? 'leading-[1.15]' : 'leading-none',
                  m.face === 'serif' ? 'font-display' : 'font-sans',
                  m.upper && 'uppercase',
                  m.italic && 'italic',
                )}
                style={{
                  fontSize: m.size,
                  fontWeight: m.weight,
                  letterSpacing: `${m.tracking}em`,
                }}
              >
                {m.lines
                  ? m.lines.map((line, i) => (
                      <span key={line} className="block">
                        {i > 0 ? ' ' : ''}
                        {line}
                      </span>
                    ))
                  : name}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// 05 Colours (twin: mobile app/onboarding/colours.tsx): You › Colours' families without shades.
export function ColoursStep({
  value,
  onChange,
}: {
  value: Colours;
  onChange: (family: string, v: -1 | 0 | 1) => void;
}) {
  return (
    <ul className="flex flex-col border-hairline border-t">
      {COLOUR_FAMILIES.map((f) => {
        const v = value[f.id] ?? 0;
        return (
          <li
            key={f.id}
            className={cn(
              'flex items-center gap-4 border-hairline border-b px-2.5 py-2 motion-safe:transition-colors',
              v === 1 && 'bg-surface-sunk',
            )}
          >
            {/* Avoid greys the swatch; the name softens to ink-muted, which still reads at 4.5:1. */}
            <span className={cn('block shrink-0', v === -1 && 'opacity-40 grayscale-[.6]')}>
              <FamilyTile family={f} size={34} shape="tile" />
            </span>
            <span
              className={cn(
                'flex-1 font-light font-sans text-sm',
                v === 1 && 'font-medium',
                v === -1 ? 'text-ink-muted' : 'text-ink',
              )}
            >
              {f.name}
            </span>
            <PreferenceControl
              label={copy.colours.control(f.name)}
              value={v}
              labels={you.style.palette.states}
              onChange={(next) => onChange(f.id, next)}
            />
          </li>
        );
      })}
    </ul>
  );
}
