'use client';

import { ui } from '@robes/copy';
import type { ButtonHTMLAttributes } from 'react';
import { type ButtonVariant, buttonClasses } from './button-styles';
import { cn } from './cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  // Overrides the shared loading copy with a specific one (e.g. "Sending…").
  loadingLabel?: string;
  block?: boolean;
}

export function Button({
  variant = 'secondary',
  loading = false,
  loadingLabel,
  block = false,
  disabled,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonClasses({ variant, block }), className)}
    >
      {loading ? (loadingLabel ?? ui.loading) : children}
    </button>
  );
}
