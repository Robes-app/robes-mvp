import { ui } from '@robes/copy';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { seriousViolations } from '../test/axe';
import { Button } from './button';
import {
  ACTION_MIN_DURATION,
  type ToastOptions,
  ToastProvider,
  toastDuration,
  useToast,
  useToastLift,
  useToastLiftOver,
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

  it('never announces the raw {hotkey} placeholder', async () => {
    const user = setup({ message: 'Piece removed.' });
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    // Radix writes the screen-reader announcement (label + message) on the next frame.
    await waitFor(() =>
      expect(document.body.textContent).toMatch(/Notifications\S*\s+Piece removed\./),
    );
    expect(document.body.textContent).not.toContain('{hotkey}');
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

function Bar({ px }: { px: number }) {
  useToastLift(px);
  return null;
}

describe('a bar at the foot lifts the toasts', () => {
  it('holds the toasts above the tallest bar while it stands, and lets go when it leaves', () => {
    const { rerender } = render(
      <ToastProvider>
        <Bar px={82} />
      </ToastProvider>,
    );
    // Radix draws the viewport as the list inside the notifications region.
    const viewport = () => document.body.querySelector('ol');
    expect(viewport()?.getAttribute('style')).toContain('bottom: 82px');
    rerender(<ToastProvider>{null}</ToastProvider>);
    expect(viewport()?.getAttribute('style') ?? '').not.toContain('bottom');
  });
});

function FloatingBar({ top, height }: { top: number; height: number }) {
  const ref = useRef<HTMLElement>(null);
  useToastLiftOver(ref);
  return (
    <nav
      ref={(el) => {
        ref.current = el;
        if (el)
          el.getBoundingClientRect = () =>
            ({
              top,
              height,
              bottom: top + height,
              left: 0,
              right: 0,
              width: 0,
              x: 0,
              y: top,
            }) as DOMRect;
      }}
    />
  );
}

describe('a bar floating above the foot lifts the toasts clear of it', () => {
  it('lifts by the bar and the gap under it; a hidden bar lifts nothing', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    const viewport = () => document.body.querySelector('ol');
    // The phone dock: 64 tall, 24 above the screen's foot.
    const { unmount } = render(
      <ToastProvider>
        <FloatingBar top={window.innerHeight - 88} height={64} />
      </ToastProvider>,
    );
    expect(viewport()?.getAttribute('style')).toContain('bottom: 88px');
    unmount();
    // Hidden (md and up, or a flow without the dock): nothing to clear.
    render(
      <ToastProvider>
        <FloatingBar top={0} height={0} />
      </ToastProvider>,
    );
    expect(viewport()?.getAttribute('style') ?? '').not.toContain('bottom');
    vi.unstubAllGlobals();
  });
});
