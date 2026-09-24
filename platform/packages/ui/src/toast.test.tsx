import { ui } from '@robes/copy';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { seriousViolations } from '../test/axe';
import { Button } from './button';
import {
  ACTION_MIN_DURATION,
  type ToastOptions,
  ToastProvider,
  toastDuration,
  useToast,
} from './toast';

function Trigger({ options }: { options: ToastOptions }) {
  const toast = useToast();
  return <Button onClick={() => toast(options)}>Remove</Button>;
}

function setup(options: ToastOptions) {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(
    <ToastProvider>
      <Trigger options={options} />
    </ToastProvider>,
  );
  return user;
}

describe('Toast', () => {
  afterEach(() => vi.useRealTimers());

  it('keeps an action toast up for at least 6 s', () => {
    expect(toastDuration({ action: { label: 'Undo', onAction: () => {} } })).toBe(6000);
    expect(toastDuration({ action: { label: 'Undo', onAction: () => {} }, duration: 2000 })).toBe(
      ACTION_MIN_DURATION,
    );
    expect(toastDuration({})).toBeLessThan(ACTION_MIN_DURATION);
  });

  it('runs Undo from the action and closes', async () => {
    const onAction = vi.fn();
    const user = setup({ message: 'Piece removed.', action: { label: ui.undo, onAction } });
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.getByText('Piece removed.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: ui.undo }));
    expect(onAction).toHaveBeenCalledOnce();
    expect(screen.queryByText('Piece removed.')).toBeNull();
  });

  it('reaches the action from the keyboard', async () => {
    const onAction = vi.fn();
    const user = setup({ message: 'Look removed.', action: { label: ui.undo, onAction } });
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    screen.getByRole('button', { name: ui.undo }).focus();
    await user.keyboard('{Enter}');
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('is still there just before 6 s and gone after', async () => {
    const user = setup({
      message: 'Wear removed.',
      action: { label: ui.undo, onAction: () => {} },
      duration: 1000,
    });
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await act(() => vi.advanceTimersByTimeAsync(5900));
    expect(screen.getByText('Wear removed.')).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(screen.queryByText('Wear removed.')).toBeNull();
  });

  it('dismisses from its labelled close button', async () => {
    const user = setup({ message: 'Saved.' });
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: ui.dismiss }));
    expect(screen.queryByText('Saved.')).toBeNull();
  });

  it('throws outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Trigger options={{ message: 'x' }} />)).toThrow(/ToastProvider/);
    vi.restoreAllMocks();
  });

  it('has no serious accessibility violations', async () => {
    const user = setup({
      message: 'Piece removed.',
      action: { label: ui.undo, onAction: () => {} },
    });
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    vi.useRealTimers();
    expect(await seriousViolations()).toEqual([]);
  });
});
