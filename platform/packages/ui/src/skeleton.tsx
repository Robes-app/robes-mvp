import type { HTMLAttributes } from 'react';
import { cn } from './cn';

const shapes = {
  rect: 'rounded-crisp',
  text: 'h-4 rounded-crisp',
  circle: 'rounded-pill',
} as const;

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  shape?: keyof typeof shapes;
}

// Size it with className to match the final layout; the busy region owns aria-busy.
export function Skeleton({ shape = 'rect', className, ...rest }: SkeletonProps) {
  return (
    <div
      {...rest}
      aria-hidden
      data-skeleton=""
      className={cn('bg-surface-sunk motion-safe:animate-pulse', shapes[shape], className)}
    />
  );
}
