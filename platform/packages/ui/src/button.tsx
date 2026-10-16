'use client';

import { ui } from '@robes/copy';
import {
  type ButtonHTMLAttributes,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { type ButtonVariant, buttonClasses } from './button-styles';
import { cn } from './cn';

// One filled (ink) button per screen (UX-26). A dialog or sheet is its own screen, so it opens a
// new scope; everything else shares the page scope.
type Scope = Set<symbol>;
const pageScope: Scope = new Set();
const PrimaryScopeContext = createContext<Scope>(pageScope);

export function PrimaryScope({ children }: { children: ReactNode }) {
  const [scope] = useState<Scope>(() => new Set());
  return <PrimaryScopeContext.Provider value={scope}>{children}</PrimaryScopeContext.Provider>;
}

export const ONE_PRIMARY_WARNING =
  '@robes/ui: more than one primary Button is mounted on this screen. Keep one filled button for the single real commitment and make the rest secondary or quiet (UX-26).';

function usePrimaryGuard(active: boolean): void {
  const scope = useContext(PrimaryScopeContext);
  useEffect(() => {
    if (!active || process.env.NODE_ENV === 'production') return;
    const id = Symbol('primary');
    scope.add(id);
    if (scope.size > 1) console.error(ONE_PRIMARY_WARNING);
    return () => {
      scope.delete(id);
    };
  }, [active, scope]);
}

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
  usePrimaryGuard(variant === 'primary');
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
