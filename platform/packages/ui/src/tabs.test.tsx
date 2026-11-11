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

  it('takes a glyph, a count, a disabled tab and a trailing control (Front Door headers)', async () => {
    const onChange = vi.fn();
    render(
      <Tabs
        items={['Owned', 'Wishlist', 'Shop']}
        value="Owned"
        onChange={onChange}
        label="Wardrobe"
        icons={{ Owned: 'wardrobe', Wishlist: 'heart', Shop: 'receipt' }}
        counts={{ Wishlist: 4 }}
        disabled={['Shop']}
        trailing={<button type="button">Add</button>}
      />,
    );
    const shop = screen.getByRole('tab', { name: 'Shop' });
    expect(shop).toBeDisabled();
    expect(shop).toHaveClass('opacity-45');
    await userEvent.click(shop);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('tab', { name: 'Wishlist 4' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Owned' }).querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    // The arrow keys step over a disabled tab.
    screen.getByRole('tab', { name: 'Owned' }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenCalledWith('Wishlist');
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
