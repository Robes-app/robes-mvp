import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { seriousViolations } from '../test/axe';
import { type Command, CommandBar, filterCommands, useCommandHotkey } from './command-bar';

function commands(onSelect = vi.fn()): Command[] {
  return [
    { id: 'today', label: 'Today', group: 'Go to', onSelect: () => onSelect('today') },
    { id: 'wardrobe', label: 'Wardrobe', group: 'Go to', onSelect: () => onSelect('wardrobe') },
    {
      id: 'photo',
      label: 'Photograph pieces',
      group: 'Create',
      keywords: 'add camera',
      onSelect: () => onSelect('photo'),
    },
  ];
}

function Harness({ onSelect }: { onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  useCommandHotkey(() => setOpen((o) => !o));
  return (
    <CommandBar
      open={open}
      onOpenChange={setOpen}
      commands={commands(vi.fn(onSelect))}
      label="Search Robes"
      placeholder="Go to…"
      emptyLabel="No matches."
    />
  );
}

describe('filterCommands', () => {
  it('matches labels and keywords, case-insensitively', () => {
    expect(filterCommands(commands(), 'WARD').map((c) => c.id)).toEqual(['wardrobe']);
    expect(filterCommands(commands(), 'camera').map((c) => c.id)).toEqual(['photo']);
    expect(filterCommands(commands(), '  ')).toHaveLength(3);
  });
});

describe('CommandBar', () => {
  it('opens on ⌘K and Ctrl+K, groups results and runs the active one on Enter', async () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    await userEvent.keyboard('{Meta>}k{/Meta}');
    const input = screen.getByRole('combobox', { name: 'Search Robes' });
    expect(input).toHaveFocus();
    expect(screen.getByRole('group', { name: 'Create' })).toBeInTheDocument();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Wardrobe' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('wardrobe');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    await userEvent.keyboard('{Control>}k{/Control}');
    expect(screen.getByRole('combobox')).toHaveValue('');
  });

  it('filters as she types and says when nothing matches', async () => {
    render(<Harness onSelect={vi.fn()} />);
    await userEvent.keyboard('{Meta>}k{/Meta}');
    await userEvent.type(screen.getByRole('combobox'), 'photo');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Photograph pieces']);
    await userEvent.type(screen.getByRole('combobox'), 'zzz');
    expect(screen.getByText('No matches.')).toBeInTheDocument();
  });

  it('runs a command on click', async () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    await userEvent.keyboard('{Meta>}k{/Meta}');
    await userEvent.click(screen.getByRole('option', { name: 'Today' }));
    expect(onSelect).toHaveBeenCalledWith('today');
  });

  it('has no serious accessibility violations', async () => {
    render(<Harness onSelect={vi.fn()} />);
    await userEvent.keyboard('{Meta>}k{/Meta}');
    expect(await seriousViolations()).toEqual([]);
  });
});
