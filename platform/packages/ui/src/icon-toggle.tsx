'use client';

import { Icon, type IconName } from '@robes/icons/web';
import { cn, focusRing } from './cn';

export interface IconToggleProps {
  icon: IconName;
  // The short name shown on hover ("Wardrobe"); web-only, nothing depends on it.
  tip: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  // What a reader hears for each state, since a glyph alone says nothing
  // ("Shop is on: looks can add wishlist and new pieces").
  labelOn: string;
  labelOff: string;
  // Off and unavailable (her wardrobe is empty): drawn faded, still pressable so a tap can say why.
  faded?: boolean;
  disabled?: boolean;
  // Shown beside the glyph as a labelled pill (the docked prompt before her first send, K4).
  label?: string;
  className?: string;
  testId?: string;
}

// The prompt's source toggles (look prompt PRD S1, P7, P8): a 28px disc with one glyph, its hit
// area grown to 44. On: the sunk cream on the umber ring. Off: clear on the warm line (redline 14 Nov).
// With a `label` it is a pill: the glyph and the name. Twin of ui-native IconToggle.tsx.
export function IconToggle({
  icon,
  tip,
  checked,
  onChange,
  labelOn,
  labelOff,
  faded = false,
  disabled = false,
  label,
  className,
  testId,
}: IconToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={checked ? labelOn : labelOff}
      title={tip}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      data-testid={testId}
      className={cn(
        "relative inline-flex h-7 shrink-0 items-center justify-center rounded-pill border after:absolute after:-inset-2 after:content-[''] motion-safe:transition-colors motion-safe:duration-150 disabled:cursor-default disabled:opacity-45",
        label ? 'gap-1.5 pr-3 pl-2.5 font-sans text-[13px]' : 'w-7',
        checked
          ? 'border-token-line bg-surface-sunk text-ink'
          : label
            ? 'border-warm-line text-ink-muted'
            : 'border-warm-line text-ink-faint',
        // Faded, a labelled pill keeps its words readable (4.5:1) and dims the glyph alone.
        faded && !label && 'opacity-45',
        focusRing,
        className,
      )}
    >
      <Icon name={icon} size={15} className={faded && label ? 'opacity-45' : undefined} />
      {label ? <span aria-hidden>{label}</span> : null}
    </button>
  );
}
