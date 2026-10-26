import { ui } from '@robes/copy';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { seriousViolations } from '../test/axe';
import { Button } from './button';
import { Dialog, Sheet } from './dialog';

describe('Dialog and Sheet', () => {
  afterEach(() => vi.restoreAllMocks());

  it('opens labelled, traps focus, closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(
      <Dialog
        title="Rename this look."
        description="Her words win."
        trigger={<Button>Rename</Button>}
      >
        <input aria-label="Title" />
      </Dialog>,
    );
    const trigger = screen.getByRole('button', { name: 'Rename' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Rename this look.' });
    expect(dialog).toHaveAccessibleDescription('Her words win.');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    for (let i = 0; i < 4; i += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(trigger).toHaveFocus();
  });

  it('closes from its labelled close button', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Sheet title="Create" defaultOpen onOpenChange={onOpenChange}>
        <p>Options</p>
      </Sheet>,
    );
    await user.click(screen.getByRole('button', { name: ui.close }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('closes from a worded close in place of the ×, with a leading control beside the title', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Sheet
        title="Jumpers & sweaters"
        eyebrow="Knitwear"
        leading={<button type="button">Back to Knitwear</button>}
        closeLabel="Done"
        defaultOpen
        onOpenChange={onOpenChange}
      >
        <p>Options</p>
      </Sheet>,
    );
    expect(screen.getByRole('button', { name: 'Back to Knitwear' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: ui.close })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('gives a dialog its own primary scope', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <>
        <Button variant="primary">Save this look</Button>
        <Dialog
          title="Pack it."
          defaultOpen
          footer={<Button variant="primary">Start packing</Button>}
        />
      </>,
    );
    expect(await screen.findByRole('button', { name: 'Start packing' })).toBeInTheDocument();
    expect(error).not.toHaveBeenCalled();
  });

  it('has no serious accessibility violations when open', async () => {
    render(
      <Sheet title="Create" description="Start something new." defaultOpen>
        <Button>Add a piece</Button>
      </Sheet>,
    );
    await screen.findByRole('dialog');
    expect(await seriousViolations()).toEqual([]);
  });
});
