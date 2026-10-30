import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('lets the last class of a conflicting pair win', () => {
    expect(cn('text-base text-ink', 'text-2xl')).toBe('text-ink text-2xl');
    expect(cn('text-xs uppercase text-ink-faint', 'text-accent-warm')).toBe(
      'text-xs uppercase text-accent-warm',
    );
    expect(cn('font-sans font-light', 'font-display')).toBe('font-light font-display');
    expect(cn('px-4', 'p-2')).toBe('p-2');
  });

  it('keeps classes that do not conflict and drops falsy parts', () => {
    expect(cn('text-sm text-ink-muted', false, null, undefined, 'text-center')).toBe(
      'text-sm text-ink-muted text-center',
    );
    expect(cn('text-ink', 'hover:text-ink-muted')).toBe('text-ink hover:text-ink-muted');
  });

  it("keeps a component's line height when the caller sets a size", () => {
    expect(cn('text-lg leading-snug', 'text-2xl')).toBe('leading-snug text-2xl');
  });
});
