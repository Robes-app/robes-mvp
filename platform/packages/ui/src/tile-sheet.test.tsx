import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { seriousViolations } from '../test/axe';
import { GlassSheet } from './dialog';
import { TileSheet } from './tile-sheet';

const tiles = (onUrl = vi.fn()) =>
  [
    { icon: 'link', label: 'Paste URL', onClick: onUrl },
    { icon: 'camera', label: 'Photo', onClick: vi.fn() },
    { icon: 'receipt', label: 'From receipt', onClick: vi.fn(), badge: 13 },
  ] as const;

describe('GlassSheet', () => {
  it('has the × at the left, the title centred and a text action at the right', async () => {
    const onClear = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <GlassSheet
        open
        onOpenChange={onOpenChange}
        title="Filter"
        action={{ label: 'Clear', onClick: onClear }}
      >
        <p>Season</p>
      </GlassSheet>,
    );
    // On the bottom edge, edge to edge, its top corners on the dock radius (Felix, 12 Nov).
    const sheet = screen.getByRole('dialog', { name: 'Filter' });
    expect(sheet).toHaveClass(
      'rounded-t-dock',
      'inset-x-0',
      'bottom-0',
      'bg-veil',
      'backdrop-blur-dock',
    );
    expect(sheet).not.toHaveClass('rounded-dock', 'inset-x-2');
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClear).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('fades Clear while there is nothing to clear', () => {
    render(
      <GlassSheet
        open
        onOpenChange={vi.fn()}
        title="Filter"
        action={{ label: 'Clear', onClick: vi.fn(), disabled: true }}
      >
        <p>Season</p>
      </GlassSheet>,
    );
    const clear = screen.getByRole('button', { name: 'Clear' });
    expect(clear).toBeDisabled();
    expect(clear).toHaveClass('text-ink-faint');
  });
});

describe('TileSheet', () => {
  it('shows three tiles, a badge on one, and runs a tile on click', async () => {
    const onUrl = vi.fn();
    render(<TileSheet open onOpenChange={vi.fn()} title="Add Pieces" tiles={tiles(onUrl)} />);
    expect(screen.getByRole('dialog', { name: 'Add Pieces' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Paste URL' }));
    expect(onUrl).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'From receipt, 13' })).toHaveTextContent('13');
  });

  it('outlines the selected tile and fades the others, with the flow beneath', () => {
    render(
      <TileSheet
        open
        onOpenChange={vi.fn()}
        title="Add from Link"
        tiles={tiles()}
        selected="Paste URL"
      >
        <input aria-label="Paste a link" />
      </TileSheet>,
    );
    expect(screen.getByRole('button', { name: 'Paste URL' })).toHaveClass('border-ink');
    expect(screen.getByRole('button', { name: 'Paste URL' })).not.toHaveClass('opacity-45');
    expect(screen.getByRole('button', { name: 'Photo' })).toHaveClass('opacity-45');
    expect(screen.getByRole('textbox', { name: 'Paste a link' })).toBeInTheDocument();
  });

  it('has no serious accessibility violations', async () => {
    render(<TileSheet open onOpenChange={vi.fn()} title="New Look" tiles={tiles()} />);
    expect(await seriousViolations()).toEqual([]);
  });
});
