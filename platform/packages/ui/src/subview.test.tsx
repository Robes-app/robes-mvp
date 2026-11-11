import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SubviewHeader } from './subview';

describe('SubviewHeader', () => {
  it('reads its title as the tracked label by default', () => {
    render(<SubviewHeader title="Tags" back={null} />);
    expect(screen.getByRole('heading', { name: 'Tags' })).toHaveClass(
      'type-label',
      'text-ink-muted',
    );
  });

  it('reads a page of its own (Settings) in the tabs’ serif title', () => {
    render(<SubviewHeader title="Settings" back={null} serif />);
    const title = screen.getByRole('heading', { name: 'Settings' });
    expect(title).toHaveClass('font-display', 'font-light', 'text-2xl', 'text-ink');
    expect(title).not.toHaveClass('type-label');
  });
});
