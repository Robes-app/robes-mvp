import { Icon, type IconName } from '@robes/icons/web';
import type { ButtonHTMLAttributes } from 'react';
import { cn, focusRing } from './cn';

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  icon: IconName;
  // The accessible name; an icon alone never names a control.
  label: string;
  outlined?: boolean;
  // The labelled round control beside a tab's switcher (the + on every tab root): a 44pt white
  // circle on the fine rule-mid edge with an 18pt ink glyph (the native twin: ui-native IconButton).
  framed?: boolean;
}

export function IconButton({
  icon,
  label,
  outlined = false,
  framed = false,
  type = 'button',
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-muted hover:text-ink disabled:text-ink-faint',
        outlined && 'border border-border-control',
        framed && 'border border-rule-mid bg-surface-raised text-ink',
        focusRing,
        className,
      )}
    >
      <Icon name={icon} size={framed ? 18 : 20} />
    </button>
  );
}

// Felix's close: a 36px `cream-200` disc with a 14px ink-soft ×, its hit area grown to 44 — on every
// drawer and sheet (redline 7 Nov). Twin of ui-native CloseDisc.
export function CloseDisc({
  label,
  type = 'button',
  className,
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> & { label: string }) {
  return (
    <button
      {...rest}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "relative flex size-9 shrink-0 items-center justify-center rounded-pill bg-surface-sunk text-ink-muted after:absolute after:-inset-1 after:content-[''] hover:text-ink",
        focusRing,
        className,
      )}
    >
      <Icon name="close" size={14} />
    </button>
  );
}
