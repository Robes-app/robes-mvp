import { ui } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import type { ButtonHTMLAttributes } from 'react';
import { cn, focusRing } from './cn';

export interface FilterButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  // How many sheet-only filters are on. 0 leaves the button at rest.
  count?: number;
  label?: string;
}

// The Front Door's Filter button (PRD rev 3 §2.5): a 28px pill with the sliders glyph, clear on a
// 1px `warm-line` edge at rest; once the sheet has filters on, an ink fill with the cream label
// and the count at 70% ("Filter 2"). It opens the FilterSheet. Twin of ui-native FilterButton.
export function FilterButton({
  count = 0,
  label = ui.filter,
  type = 'button',
  className,
  ...rest
}: FilterButtonProps) {
  const active = count > 0;
  return (
    <button
      {...rest}
      type={type}
      aria-label={active ? `${label} ${count}` : label}
      aria-pressed={active}
      className={cn(
        "relative inline-flex min-h-7 items-center gap-1.5 rounded-pill border px-[11px] font-sans text-[11px] after:absolute after:inset-x-0 after:-inset-y-2 after:content-[''] motion-safe:transition-colors motion-safe:duration-150",
        active ? 'border-ink bg-ink text-bg' : 'border-warm-line text-ink hover:border-ink',
        focusRing,
        className,
      )}
    >
      <Icon name="sliders" size={12} />
      {label}
      {active ? <span className="text-[10px] text-bg/70">{count}</span> : null}
    </button>
  );
}
