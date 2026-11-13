import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { seriousViolations } from '../test/axe';
import { ActionDisc, ActionDiscs } from './action-disc';
import { Button, ONE_PRIMARY_WARNING, PrimaryScope } from './button';

describe('ActionDisc', () => {
  it('names its action and runs it', async () => {
    const onClick = vi.fn();
    render(
      <ActionDisc icon="book" label="Pick" ariaLabel="Pick a look for today" onClick={onClick} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Pick a look for today' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('has no serious accessibility violations', async () => {
    render(
      <main>
        <ActionDiscs>
          <ActionDisc icon="book" label="Swap" onClick={vi.fn()} />
          <ActionDisc icon="pencil" label="Edit" onClick={vi.fn()} />
        </ActionDiscs>
      </main>,
    );
    expect(await seriousViolations()).toEqual([]);
  });

  it('the primary is the ink Create disc, raised in an 80px slot with the sparkle by default', async () => {
    const onClick = vi.fn();
    render(
      <ActionDiscs>
        <ActionDisc icon="capture" label="Capture" onClick={vi.fn()} />
        <ActionDisc primary label="Create" ariaLabel="Create a look for today" onClick={onClick} />
        <ActionDisc icon="book" label="Pick" onClick={vi.fn()} />
      </ActionDiscs>,
    );
    const create = screen.getByRole('button', { name: 'Create a look for today' });
    expect(create).toHaveClass('w-20', '-mt-2.5');
    const face = create.querySelector('span');
    expect(face).toHaveClass('size-[66px]', 'bg-ink', 'shadow-disc-primary');
    expect(face?.querySelector('svg')).toHaveAttribute('stroke-width', '1.4');
    expect(face?.querySelector('svg')).toHaveAttribute('width', '23');
    expect(screen.getByText('Create')).toHaveClass('font-semibold', 'text-ink');
    expect(screen.getByText('Capture')).toHaveClass('text-ink-muted');
    await userEvent.click(create);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('the primary counts as the screen’s one ink action', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <PrimaryScope>
        <ActionDisc primary label="Create" onClick={vi.fn()} />
        <Button variant="primary">Save</Button>
      </PrimaryScope>,
    );
    expect(error).toHaveBeenCalledWith(ONE_PRIMARY_WARNING);
    error.mockRestore();
  });

  it('cream discs never count against the one ink action', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <PrimaryScope>
        <ActionDisc icon="book" label="Pick" onClick={vi.fn()} />
        <Button variant="primary">Save</Button>
      </PrimaryScope>,
    );
    expect(error).not.toHaveBeenCalledWith(ONE_PRIMARY_WARNING);
    error.mockRestore();
  });
});
