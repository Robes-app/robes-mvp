import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { seriousViolations } from '../test/axe';
import { Avatar, initials } from './avatar';

describe('Avatar', () => {
  it('derives initials', () => {
    expect(initials('Niall')).toBe('N');
    expect(initials('  ann marie  byrne ')).toBe('AB');
    expect(initials('')).toBe('');
  });

  it('falls back to initials without a photo or when it fails', () => {
    const { container, rerender } = render(<Avatar name="Niall Byrne" />);
    expect(screen.getByRole('img', { name: 'Niall Byrne' })).toHaveTextContent('NB');
    rerender(<Avatar name="Niall Byrne" src="/me.webp" />);
    const photo = container.querySelector('img');
    expect(photo).not.toBeNull();
    fireEvent.error(photo as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: 'Niall Byrne' })).toHaveTextContent('NB');
  });

  it('draws the top bar avatar as a sage disc with one initial', () => {
    render(<Avatar name="Annie Slattery" tone="nav" size="lg" />);
    const disc = screen.getByRole('img', { name: 'Annie Slattery' });
    expect(disc).toHaveClass('size-[30px]', 'bg-sage-mid');
    expect(disc).not.toHaveClass('size-16', 'border');
    expect(disc).toHaveTextContent(/^A$/);
  });

  it('has no serious accessibility violations', async () => {
    render(
      <main>
        <Avatar name="Niall Byrne" />
      </main>,
    );
    expect(await seriousViolations()).toEqual([]);
  });
});
