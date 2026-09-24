import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { seriousViolations } from '../test/axe';
import { Avatar, initials } from './avatar';

describe('Avatar', () => {
  it('derives initials', () => {
    expect(initials('Ann')).toBe('A');
    expect(initials('  ann marie  byrne ')).toBe('AB');
    expect(initials('')).toBe('');
  });

  it('falls back to initials without a photo or when it fails', () => {
    const { container, rerender } = render(<Avatar name="Ann Byrne" />);
    expect(screen.getByRole('img', { name: 'Ann Byrne' })).toHaveTextContent('AB');
    rerender(<Avatar name="Ann Byrne" src="/me.webp" />);
    const photo = container.querySelector('img');
    expect(photo).not.toBeNull();
    fireEvent.error(photo as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: 'Ann Byrne' })).toHaveTextContent('AB');
  });

  it('has no serious accessibility violations', async () => {
    render(
      <main>
        <Avatar name="Ann Byrne" />
      </main>,
    );
    expect(await seriousViolations()).toEqual([]);
  });
});
