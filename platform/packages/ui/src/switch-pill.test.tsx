import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { seriousViolations } from '../test/axe';
import { SwitchPill } from './switch-pill';

function Harness({ initial = false, disabled = false }: { initial?: boolean; disabled?: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <SwitchPill
      icon="receipt"
      label="Shop"
      checked={on}
      onChange={setOn}
      hintOn="Shop is on: looks can include your wishlist and new pieces"
      hintOff="Shop is off: looks use your wardrobe pieces only"
      disabled={disabled}
    />
  );
}

describe('SwitchPill', () => {
  it('is a switch that toggles and explains each state', async () => {
    render(<Harness />);
    const sw = screen.getByRole('switch', { name: 'Shop' });
    expect(sw).not.toBeChecked();
    expect(sw).toHaveAttribute('title', 'Shop is off: looks use your wardrobe pieces only');
    expect(sw).toHaveClass('border-warm-line', 'text-ink-faint');
    expect(screen.getByTestId('switch-pill-track')).toHaveClass('bg-switch-off');
    await userEvent.click(sw);
    expect(sw).toBeChecked();
    expect(sw).toHaveAttribute(
      'title',
      'Shop is on: looks can include your wishlist and new pieces',
    );
    expect(sw).toHaveClass('bg-shop-on', 'border-accent-inspire', 'text-ink');
    expect(screen.getByTestId('switch-pill-track')).toHaveClass('bg-accent-inspire');
  });

  it('slides the knob from 2 to 14', async () => {
    render(<Harness />);
    const knob = screen.getByTestId('switch-pill-track').firstElementChild;
    expect(knob).toHaveClass('translate-x-[2px]');
    await userEvent.click(screen.getByRole('switch'));
    expect(knob).toHaveClass('translate-x-[14px]');
  });

  it('does nothing when disabled', async () => {
    render(<Harness disabled />);
    await userEvent.click(screen.getByRole('switch'));
    expect(screen.getByRole('switch')).not.toBeChecked();
  });

  it('has no serious accessibility violations', async () => {
    render(
      <main>
        <Harness initial />
      </main>,
    );
    expect(await seriousViolations()).toEqual([]);
  });
});
