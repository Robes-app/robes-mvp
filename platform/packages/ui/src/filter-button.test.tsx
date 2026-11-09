import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { seriousViolations } from '../test/axe';
import { FilterButton } from './filter-button';

describe('FilterButton', () => {
  it('rests clear on the warm line, and opens the sheet', async () => {
    const onClick = vi.fn();
    render(<FilterButton onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Filter' });
    expect(button).toHaveClass('border-warm-line');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('fills ink and carries the count once sheet filters are on', () => {
    render(<FilterButton count={2} onClick={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Filter 2' });
    expect(button).toHaveClass('bg-ink', 'text-bg');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveTextContent('Filter2');
  });

  it('has no serious accessibility violations', async () => {
    render(
      <main>
        <FilterButton onClick={vi.fn()} />
        <FilterButton count={1} onClick={vi.fn()} />
      </main>,
    );
    expect(await seriousViolations()).toEqual([]);
  });
});
