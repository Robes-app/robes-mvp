import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { seriousViolations } from '../test/axe';
import { ActionDisc, ActionDiscs } from './action-disc';

describe('ActionDisc', () => {
  it('names its action and runs it', async () => {
    const onClick = vi.fn();
    render(
      <ActionDisc icon="book" label="Pick" ariaLabel="Pick a look for today" onClick={onClick} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Pick a look for today' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('opens a photo picker from the disc itself', async () => {
    const onFile = vi.fn();
    render(
      <ActionDisc
        icon="capture"
        label="Capture"
        ariaLabel="Photograph a look"
        onFile={onFile}
        accept="image/*"
        capture="environment"
      />,
    );
    const input = screen.getByLabelText('Photograph a look');
    expect(input).toHaveAttribute('capture', 'environment');
    const file = new File(['x'], 'look.jpg', { type: 'image/jpeg' });
    await userEvent.upload(input, file);
    expect(onFile).toHaveBeenCalledWith(file);
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
});
