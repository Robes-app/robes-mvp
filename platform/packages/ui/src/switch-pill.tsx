'use client';

import { Icon, type IconName } from '@robes/icons/web';
import { cn, focusRing } from './cn';

export interface SwitchPillProps {
  icon: IconName;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  // What a reader hears for each state, since the label alone doesn't say what the switch does
  // ("Shop is on: looks can include your wishlist and new pieces").
  hintOn: string;
  hintOff: string;
  disabled?: boolean;
  className?: string;
}

// The Front Door's Shop toggle (PRD rev 3 §4.6): a 28px pill with a glyph, a label and an iOS-style
// switch (a 30 × 18 track, a 14px knob that slides 2 ↔ 14 over 0.15s). On: the rose wash on a 1px
// rose edge, an ink label, the rose track, the knob right. Off: clear on the warm line, a faint
// label, the cream track, the knob left. Twin of ui-native SwitchPill.tsx; the settings rows keep
// their own Switch.
export function SwitchPill({
  icon,
  label,
  checked,
  onChange,
  hintOn,
  hintOff,
  disabled = false,
  className,
}: SwitchPillProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={checked ? hintOn : hintOff}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex min-h-7 items-center gap-2 rounded-pill border py-0 pr-[5px] pl-[11px] font-sans text-[11px] after:absolute after:inset-x-0 after:-inset-y-2 after:content-[''] motion-safe:transition-colors motion-safe:duration-150 disabled:cursor-default disabled:opacity-45",
        checked ? 'border-accent-inspire bg-shop-on text-ink' : 'border-warm-line text-ink-faint',
        focusRing,
        className,
      )}
    >
      <Icon name={icon} size={12} />
      {label}
      <span
        aria-hidden
        data-testid="switch-pill-track"
        className={cn(
          'relative inline-block h-[18px] w-[30px] rounded-pill motion-safe:transition-colors motion-safe:duration-150',
          checked ? 'bg-accent-inspire' : 'bg-switch-off',
        )}
      >
        <span
          className={cn(
            'absolute top-[2px] left-0 size-[14px] rounded-pill bg-surface-raised motion-safe:transition-transform motion-safe:duration-150',
            checked ? 'translate-x-[14px]' : 'translate-x-[2px]',
          )}
        />
      </span>
    </button>
  );
}
