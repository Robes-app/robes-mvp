import type { InputHTMLAttributes } from 'react';

// Interim form primitives until @robes/ui lands in M2.
export function Field({
  label,
  error,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | null }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
        {label}
      </span>
      <input
        {...input}
        aria-invalid={error ? true : undefined}
        className="rounded-crisp border border-border-control bg-surface px-4 py-3 text-base text-ink outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
      />
      {error ? (
        <span role="alert" className="text-sm text-danger">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function PrimaryButton({
  children,
  ...button
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...button}
      className="rounded-pill bg-ink px-6 py-3 text-sm font-medium text-bg transition-opacity disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  ...button
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...button}
      className="rounded-pill border border-border-control px-6 py-3 text-sm font-medium text-ink"
    >
      {children}
    </button>
  );
}
