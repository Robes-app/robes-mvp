import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { SwitchPill } from './SwitchPill';

function Harness({ disabled = false }: { disabled?: boolean }) {
  const [on, setOn] = useState(false);
  return (
    <SwitchPill
      icon="receipt"
      label="Shop"
      checked={on}
      onChange={setOn}
      hintOn="Shop is on: looks can include your wishlist and new pieces"
      hintOff="Shop is off: looks use your wardrobe pieces only"
      disabled={disabled}
      testID="shop"
    />
  );
}

test('is a switch that toggles and explains each state', async () => {
  await render(<Harness />);
  const sw = screen.getByRole('switch', { name: 'Shop' });
  expect(sw.props.accessibilityState).toEqual({ checked: false, disabled: false });
  expect(sw.props.accessibilityHint).toBe('Shop is off: looks use your wardrobe pieces only');
  expect(screen.getByTestId('shop-track').props.className).toContain('bg-switch-off');
  await fireEvent.press(sw);
  expect(screen.getByRole('switch', { name: 'Shop' }).props.accessibilityState).toEqual({
    checked: true,
    disabled: false,
  });
  expect(screen.getByRole('switch').props.accessibilityHint).toBe(
    'Shop is on: looks can include your wishlist and new pieces',
  );
  expect(screen.getByTestId('shop-track').props.className).toContain('bg-accent-inspire');
  expect(sw).toHaveStyle({ minHeight: 44 });
});

test('does nothing when disabled', async () => {
  await render(<Harness disabled />);
  await fireEvent.press(screen.getByRole('switch'));
  expect(screen.getByRole('switch').props.accessibilityState.checked).toBe(false);
});
