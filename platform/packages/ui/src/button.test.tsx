import { ui } from '@robes/copy';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { seriousViolations } from '../test/axe';
import { Button, ONE_PRIMARY_WARNING, PrimaryScope } from './button';

describe('Button', () => {
  afterEach(() => vi.restoreAllMocks());

  it('clicks and is at least 44px tall', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save this look</Button>);
    const button = screen.getByRole('button', { name: 'Save this look' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('min-h-11', 'uppercase');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('shows the shared loading copy, is busy and disabled while loading', async () => {
    const onClick = vi.fn();
    render(
      <Button variant="primary" loading onClick={onClick}>
        Continue
      </Button>,
    );
    const button = screen.getByRole('button', { name: ui.loading });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('prefers a specific loading label', () => {
    render(
      <Button loading loadingLabel="Sending…">
        Send
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
  });

  it('never fills anything but primary', () => {
    render(
      <>
        <Button variant="secondary">Secondary</Button>
        <Button variant="quiet">Quiet</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Secondary' }).className).not.toMatch(/\bbg-ink\b/);
    expect(screen.getByRole('button', { name: 'Quiet' }).className).not.toMatch(/\bbg-ink\b/);
  });

  it('warns in development when two primaries mount on one screen', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <>
        <Button variant="primary">One</Button>
        <Button variant="primary">Two</Button>
      </>,
    );
    expect(error).toHaveBeenCalledWith(ONE_PRIMARY_WARNING);
  });

  it('does not warn for one primary, or for a primary in its own scope (a dialog)', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(
      <>
        <Button variant="primary">Page</Button>
        <Button variant="secondary">Other</Button>
        <PrimaryScope>
          <Button variant="primary">Dialog</Button>
        </PrimaryScope>
      </>,
    );
    expect(error).not.toHaveBeenCalled();
    unmount();
    render(<Button variant="primary">Next screen</Button>);
    expect(error).not.toHaveBeenCalled();
  });

  it('has no serious accessibility violations', async () => {
    render(
      <main>
        <Button variant="primary">Primary</Button>
        <Button>Secondary</Button>
        <Button variant="quiet">Quiet</Button>
        <Button loading>Loading</Button>
      </main>,
    );
    expect(await seriousViolations()).toEqual([]);
  });
});
