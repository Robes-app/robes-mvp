import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { seriousViolations } from '../test/axe';
import { Tabs } from './tabs';

describe('Tabs', () => {
  it('marks the selected tab and switches on click', async () => {
    const onChange = vi.fn();
    render(<Tabs items={['Pieces', 'Details']} value="Pieces" onChange={onChange} label="Look" />);
    expect(screen.getByRole('tab', { name: 'Pieces' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('tab', { name: 'Pieces' }));
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('tab', { name: 'Details' }));
    expect(onChange).toHaveBeenCalledWith('Details');
  });

  it('moves with the arrow keys, wrapping round', async () => {
    const onChange = vi.fn();
    render(<Tabs items={['Pieces', 'Details']} value="Pieces" onChange={onChange} label="Look" />);
    screen.getByRole('tab', { name: 'Pieces' }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenCalledWith('Details');
  });

  it('keeps a 44px target in the label caps', () => {
    render(<Tabs items={['Pieces', 'Details']} value="Pieces" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Details' })).toHaveClass('min-h-11', 'type-label');
  });

  it('has no serious accessibility violations', async () => {
    render(
      <main>
        <Tabs items={['Pieces', 'Details']} value="Pieces" onChange={vi.fn()} label="Look" />
      </main>,
    );
    expect(await seriousViolations()).toEqual([]);
  });
});
