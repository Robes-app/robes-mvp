// No 'use client': server components style links as buttons with these.
import { cn, focusRing } from './cn';

const variants = {
  primary:
    'bg-ink text-bg hover:opacity-90 disabled:bg-surface-sunk disabled:text-ink-faint disabled:opacity-100',
  secondary:
    'border border-border-control text-ink hover:border-ink disabled:border-hairline disabled:text-ink-faint',
  quiet: 'text-ink-muted underline underline-offset-4 hover:text-ink disabled:text-ink-faint',
} as const;

export type ButtonVariant = keyof typeof variants;

export function buttonClasses({
  variant = 'secondary',
  block = false,
}: {
  variant?: ButtonVariant;
  block?: boolean;
} = {}): string {
  return cn(
    'inline-flex min-h-11 items-center justify-center gap-2 font-sans text-sm font-medium',
    'motion-safe:transition-[opacity,border-color,color] motion-safe:duration-150 disabled:cursor-not-allowed',
    variant === 'quiet' ? 'px-2' : 'rounded-pill px-6',
    block && 'w-full',
    variants[variant],
    focusRing,
  );
}
