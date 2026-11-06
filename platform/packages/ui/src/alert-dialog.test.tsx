import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { seriousViolations } from '../test/axe';
import { AlertDialog } from './alert-dialog';

describe('AlertDialog', () => {
  it('names the consequence, offers the way back and dismisses on Escape', async () => {
    const discard = vi.fn();
    const dismiss = vi.fn();
    render(
      <AlertDialog
        open
        title="Discard this draft?"
        message="The look won't be saved or scheduled."
        actions={[
          { label: 'Discard', variant: 'primary', onClick: discard },
          { label: 'Keep editing', variant: 'outline', onClick: vi.fn() },
        ]}
        onDismiss={dismiss}
      />,
    );
    const dialog = screen.getByRole('alertdialog', { name: 'Discard this draft?' });
    expect(dialog).toHaveAccessibleDescription("The look won't be saved or scheduled.");
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(discard).toHaveBeenCalledOnce();
    await userEvent.keyboard('{Escape}');
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it('has no serious accessibility violations', async () => {
    render(
      <AlertDialog
        open
        title="Save your changes"
        actions={[{ label: 'Update', variant: 'primary', onClick: vi.fn() }]}
        onDismiss={vi.fn()}
      />,
    );
    expect(await seriousViolations()).toEqual([]);
  });
});
