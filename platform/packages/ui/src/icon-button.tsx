import { Icon, type IconName } from '@robes/icons/web';
import type { ButtonHTMLAttributes } from 'react';
import { cn, focusRing } from './cn';

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> {
  icon: IconName;
  // The accessible name; an icon alone never names a control.
  label: string;
  outlined?: boolean;
}

export function IconButton({
  icon,
  label,
  outlined = false,
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
        focusRing,
        className,
      )}
    >
      <Icon name={icon} size={20} />
    </button>
  );
}
