import { Icon } from '@robes/icons/web';
import {
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
} from 'react';
import { cn } from './cn';

// Controls carry a ≥3:1 boundary (border-control) and inputs render at 16px so iOS doesn't zoom.
// Focus is quiet: the boundary goes ink and doubles, never a ring that outshouts the screen.
const control =
  'w-full rounded-input border bg-surface-raised px-4 py-3 font-sans text-base text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:border-ink focus-visible:ring-1 focus-visible:ring-ink focus-visible:ring-inset disabled:cursor-not-allowed disabled:border-hairline disabled:text-ink-faint';

// The notebook line (onboarding's question): the question is the label, her answer in Cormorant.
// The line is the field's boundary: border-control (3:1) at rest; focus deepens it to ink-muted,
// one pixel, never ink (redline audit 30 Oct).
const underline =
  'w-full border-0 border-b bg-transparent px-0 py-2 font-display text-3xl font-light text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:border-ink-muted';

interface FieldShellProps {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  // Hide the label when the screen's question already names the field.
  labelHidden?: boolean;
}

function useFieldIds(id: string | undefined, hint: unknown, error: unknown) {
  const auto = useId();
  const controlId = id ?? auto;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return { controlId, hintId, errorId, describedBy };
}

function Shell({
  label,
  labelHidden = false,
  hint,
  error,
  controlId,
  hintId,
  errorId,
  children,
}: FieldShellProps & {
  controlId: string;
  hintId: string | undefined;
  errorId: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={controlId}
        className={cn(
          'font-sans text-xs font-medium uppercase tracking-[0.18em] text-ink-muted',
          labelHidden && 'sr-only',
        )}
      >
        {label}
      </label>
      {children}
      {hint ? (
        <p id={hintId} className="font-sans text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 font-sans text-sm text-danger"
        >
          <Icon name="alert" size={16} className="shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement>, FieldShellProps {
  variant?: 'box' | 'underline';
}

export function Field({
  label,
  labelHidden,
  hint,
  error,
  id,
  className,
  variant = 'box',
  ...input
}: FieldProps) {
  const ids = useFieldIds(id, hint, error);
  return (
    <Shell label={label} labelHidden={labelHidden} hint={hint} error={error} {...ids}>
      <input
        {...input}
        id={ids.controlId}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={cn(
          variant === 'underline' ? underline : control,
          error ? 'border-danger' : 'border-border-control',
          className,
        )}
      />
    </Shell>
  );
}

export interface TextAreaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    FieldShellProps {}

export function TextArea({
  label,
  labelHidden,
  hint,
  error,
  id,
  className,
  rows = 4,
  ...input
}: TextAreaProps) {
  const ids = useFieldIds(id, hint, error);
  return (
    <Shell label={label} labelHidden={labelHidden} hint={hint} error={error} {...ids}>
      <textarea
        {...input}
        id={ids.controlId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={cn(
          control,
          'resize-y leading-relaxed',
          error ? 'border-danger' : 'border-border-control',
          className,
        )}
      />
    </Shell>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'>,
    FieldShellProps {
  options: SelectOption[];
  // Shown as a disabled first option when nothing is chosen yet.
  placeholder?: string;
}

// Native select: the platform picker is the most accessible option on every device.
export function Select({
  label,
  labelHidden,
  hint,
  error,
  id,
  options,
  placeholder,
  className,
  ...select
}: SelectProps) {
  const ids = useFieldIds(id, hint, error);
  return (
    <Shell label={label} labelHidden={labelHidden} hint={hint} error={error} {...ids}>
      <div className="relative">
        <select
          {...select}
          {...(placeholder && select.value === undefined && select.defaultValue === undefined
            ? { defaultValue: '' }
            : {})}
          id={ids.controlId}
          aria-invalid={error ? true : undefined}
          aria-describedby={ids.describedBy}
          className={cn(
            control,
            'appearance-none pr-11',
            error ? 'border-danger' : 'border-border-control',
            className,
          )}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon
          name="down"
          size={20}
          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-muted"
        />
      </div>
    </Shell>
  );
}
