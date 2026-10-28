import { ui } from '@robes/copy';
import type { HTMLAttributes } from 'react';
import { cn } from './cn';

const sizes = {
  // Beta's header mark (.nav-logo): Cormorant 400 at 17, tracked .34em.
  header: 'font-normal text-[17px] tracking-[0.34em]',
  // The splash and the sign-in ground.
  hero: 'font-light text-5xl tracking-[0.32em]',
} as const;

// ROBES in Cormorant caps, tracked wide (brand-and-design.md §2): the mark, never typed text.
// Twin of ui-native Text.tsx Wordmark.
export function Wordmark({
  size = 'header',
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { size?: keyof typeof sizes }) {
  return (
    <span {...rest} className={cn('font-display uppercase', sizes[size], className)}>
      {ui.wordmark}
    </span>
  );
}
