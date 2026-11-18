import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { IconToggle } from './IconToggle';

const ON = 'Shop is on: looks can add wishlist and new pieces';
const OFF = 'Shop is off: no wishlist or new pieces added';

function Harness() {
  const [on, setOn] = useState(false);
  return (
    <IconToggle
      icon="bag"
      checked={on}
      onChange={setOn}
      labelOn={ON}
      labelOff={OFF}
      testID="shop"
    />
  );
}

test('is a switch that names each state and wears the sunk fill on the umber ring when on', async () => {
  await render(<Harness />);
  const sw = screen.getByRole('switch', { name: OFF });
  expect(sw.props.accessibilityState).toEqual({ checked: false, disabled: false });
  expect(sw).toHaveStyle({ minHeight: 44, minWidth: 44 });
  expect(screen.getByTestId('shop-disc').props.className).toContain('border-warm-line');
  await fireEvent.press(sw);
  expect(screen.getByRole('switch', { name: ON }).props.accessibilityState.checked).toBe(true);
  expect(screen.getByTestId('shop-disc').props.className).toContain('bg-surface-sunk');
});

test('stays pressable while faded, so a tap can say why it is off', async () => {
  const onChange = jest.fn();
  await render(
    <IconToggle
      icon="wardrobe"
      checked={false}
      onChange={onChange}
      labelOn="on"
      labelOff="Nothing in your wardrobe yet"
      faded
    />,
  );
  await fireEvent.press(screen.getByRole('switch', { name: 'Nothing in your wardrobe yet' }));
  expect(onChange).toHaveBeenCalledWith(true);
});

test('with a label is a pill showing the name, still announced by its state', async () => {
  await render(
    <IconToggle
      icon="shop"
      checked
      onChange={() => undefined}
      labelOn="Shop is on"
      labelOff="Shop is off"
      label="Shop"
      testID="t"
    />,
  );
  expect(screen.getByRole('switch', { name: 'Shop is on' })).toBeTruthy();
  // Drawn for the eye; the switch's label is what a reader hears.
  expect(screen.getByText('Shop', { includeHiddenElements: true })).toBeTruthy();
});
