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

test('is a switch that names each state and wears the selected tokens when on', async () => {
  await render(<Harness />);
  const sw = screen.getByRole('switch', { name: OFF });
  expect(sw.props.accessibilityState).toEqual({ checked: false, disabled: false });
  expect(sw).toHaveStyle({ minHeight: 44, minWidth: 44 });
  expect(screen.getByTestId('shop-disc').props.className).toContain('border-warm-line');
  await fireEvent.press(sw);
  expect(screen.getByRole('switch', { name: ON }).props.accessibilityState.checked).toBe(true);
  expect(screen.getByTestId('shop-disc').props.className).toContain('bg-selected');
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
