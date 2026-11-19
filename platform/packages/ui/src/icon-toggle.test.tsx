import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { seriousViolations } from '../test/axe';
import { IconToggle } from './icon-toggle';

const ON = 'Shop is on: looks can add wishlist and new pieces';
const OFF = 'Shop is off: no wishlist or new pieces added';

function Harness({ initial = false }: { initial?: boolean }) {
  const [on, setOn] = useState(initial);
  return (
    <IconToggle icon="shop" tip="Shop" checked={on} onChange={setOn} labelOn={ON} labelOff={OFF} />
  );
}

describe('IconToggle', () => {
  it('is a switch that names each state and wears the sunk fill on the umber ring when on', async () => {
    render(<Harness />);
    const sw = screen.getByRole('switch', { name: OFF });
    expect(sw).not.toBeChecked();
    expect(sw).toHaveAttribute('title', 'Shop');
    expect(sw).toHaveClass('border-warm-line');
    await userEvent.click(sw);
    const on = screen.getByRole('switch', { name: ON });
    expect(on).toBeChecked();
    expect(on).toHaveClass('bg-surface-sunk', 'border-token-line', 'text-ink');
  });

  it('stays pressable while faded, so a tap can say why it is off', async () => {
    const onChange = vi.fn();
    render(
      <IconToggle
        icon="wardrobe"
        tip="Wardrobe"
        checked={false}
        onChange={onChange}
        labelOn="on"
        labelOff="Nothing in your wardrobe yet"
        faded
      />,
    );
    const sw = screen.getByRole('switch', { name: 'Nothing in your wardrobe yet' });
    expect(sw).toHaveClass('opacity-45');
    await userEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('has no serious accessibility violations', async () => {
    const { container } = render(<Harness initial />);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('with a label is a pill showing the name, still announced by its state', () => {
    render(
      <IconToggle
        icon="shop"
        tip="Shop"
        checked
        onChange={() => undefined}
        labelOn={ON}
        labelOff={OFF}
        label="Shop"
      />,
    );
    const sw = screen.getByRole('switch', { name: ON });
    expect(sw).toHaveTextContent('Shop');
    expect(sw).not.toHaveClass('w-7');
  });
});
