import { ui } from '@robes/copy';
import type { HTMLAttributes } from 'react';
import { cn } from './cn';

// ROBES in Cormorant caps, tracked wide (brand-and-design.md §2): the mark, never typed text.
export function Wordmark({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...rest}
      className={cn('font-display font-light text-xl uppercase tracking-[0.32em]', className)}
    >
      {ui.wordmark}
    </span>
  );
}
