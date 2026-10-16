import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { seriousViolations } from '../test/axe';
import { Card, CardSkeleton } from './card';

describe('Card', () => {
  it('renders eyebrow, title and meta with a hairline and no shadow', () => {
    render(<Card eyebrow="Key piece" title="Linen shirt" meta="Worn twice" />);
    const card = screen.getByRole('article');
    expect(card).toHaveClass('border-hairline');
    expect(card.className).not.toMatch(/shadow/);
    expect(screen.getByRole('heading', { name: 'Linen shirt' })).toBeInTheDocument();
    expect(screen.getByText('Worn twice')).toBeInTheDocument();
  });

  it('has a skeleton twin with the same aspect frame, hidden from assistive tech', () => {
    const { container } = render(<CardSkeleton aspect="3:4" />);
    const root = container.firstElementChild;
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root?.querySelector('.aspect-3\\/4')).not.toBeNull();
  });

  it('has no serious accessibility violations', async () => {
    render(
      <main aria-busy="true">
        <Card eyebrow="Look" title="Monday" meta="Dublin · 20°C" />
        <CardSkeleton />
      </main>,
    );
    expect(await seriousViolations()).toEqual([]);
  });
});
