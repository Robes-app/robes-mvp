import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { SegmentedControl } from './SegmentedControl';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(async () => {}) }));

const options = [
  { value: 'all', label: 'All pieces' },
  { value: 'wishlist', label: 'Wishlist' },
] as const;

function Harness({ onChange }: { onChange: (v: string) => void }) {
  const [value, setValue] = useState<'all' | 'wishlist'>('all');
  return (
    <SegmentedControl
      label="Wardrobe view"
      options={options}
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

test('is a labelled radiogroup with one checked radio', async () => {
  await render(<Harness onChange={() => {}} />);
  // The group itself isn't an accessibility element (that would swallow its radios on iOS).
  expect(screen.getByLabelText('Wardrobe view').props.accessibilityRole).toBe('radiogroup');
  expect(screen.getByRole('radio', { name: 'All pieces' })).toBeChecked();
  expect(screen.getByRole('radio', { name: 'Wishlist' })).not.toBeChecked();
});

test('pressing a segment selects it; pressing the current one does nothing', async () => {
  const onChange = jest.fn();
  await render(<Harness onChange={onChange} />);
  await fireEvent.press(screen.getByRole('radio', { name: 'All pieces' }));
  expect(onChange).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('radio', { name: 'Wishlist' }));
  expect(onChange).toHaveBeenCalledWith('wishlist');
  expect(screen.getByRole('radio', { name: 'Wishlist' })).toBeChecked();
  expect(screen.getByRole('radio', { name: 'All pieces' })).not.toBeChecked();
});
