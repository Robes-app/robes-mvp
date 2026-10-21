import { Icon } from '@robes/icons/web';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

// An error is a sentence in danger with its icon, announced as it lands (brand-and-design.md §4).
export function ErrorText({
  size = 'small',
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLParagraphElement> & {
  size?: 'body' | 'small' | 'caption';
  children?: ReactNode;
}) {
  return (
    <p
      role="alert"
      {...rest}
      className={cn(
        'flex items-start gap-2 font-sans text-danger',
        size === 'body' ? 'text-base' : size === 'small' ? 'text-sm' : 'text-xs',
        className,
      )}
    >
      <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
