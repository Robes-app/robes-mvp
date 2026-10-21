import { ui } from '@robes/copy';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { seriousViolations } from '../test/axe';
import { Button } from './button';

describe('Button', () => {
  afterEach(() => vi.restoreAllMocks());

  it('clicks and is at least 44px tall', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save this look</Button>);
    const button = screen.getByRole('button', { name: 'Save this look' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('min-h-11');
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
