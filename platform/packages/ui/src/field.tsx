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
const control =
  'w-full rounded-crisp border bg-surface px-4 py-3 font-sans text-base text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:border-hairline disabled:text-ink-faint';

interface FieldShellProps {
  label: string;
  hint?: ReactNode;
  error?: string | null;
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
        className="font-sans text-xs font-medium uppercase tracking-[0.18em] text-ink-muted"
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

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement>, FieldShellProps {}

export function Field({ label, hint, error, id, className, ...input }: FieldProps) {
  const ids = useFieldIds(id, hint, error);
  return (
    <Shell label={label} hint={hint} error={error} {...ids}>
      <input
        {...input}
        id={ids.controlId}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={cn(control, error ? 'border-danger' : 'border-border-control', className)}
      />
    </Shell>
  );
}

export interface TextAreaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    FieldShellProps {}

export function TextArea({ label, hint, error, id, className, rows = 4, ...input }: TextAreaProps) {
  const ids = useFieldIds(id, hint, error);
  return (
    <Shell label={label} hint={hint} error={error} {...ids}>
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
    <Shell label={label} hint={hint} error={error} {...ids}>
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
