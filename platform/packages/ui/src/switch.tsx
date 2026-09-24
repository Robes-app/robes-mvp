'use client';

import { useId } from 'react';
import { cn } from './cn';

export interface SwitchProps {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  className?: string;
}

// A labelled on/off setting; the whole row is the hit target.
export function Switch({ label, hint, checked, disabled, onChange, className }: SwitchProps) {
  const labelId = useId();
  const hintId = useId();
  return (
    <label className={cn('flex min-h-11 items-start justify-between gap-6', className)}>
      <span className="flex flex-col gap-1">
        <span id={labelId} className="font-sans text-base text-ink">
          {label}
        </span>
        {hint ? (
          <span id={hintId} className="font-sans text-sm text-ink-muted">
            {hint}
          </span>
        ) : null}
      </span>
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={hint ? hintId : undefined}
        className="mt-1 size-5 shrink-0 accent-ink"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
