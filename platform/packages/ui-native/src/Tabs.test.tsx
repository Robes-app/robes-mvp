import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Tabs } from './Tabs';

test('a tab rail marks the selected tab and switches on press', async () => {
  const onChange = jest.fn();
  await render(<Tabs items={['Pieces', 'Details']} value="Pieces" onChange={onChange} />);
  expect(screen.getByRole('tab', { name: 'Pieces' }).props.accessibilityState).toEqual({
    selected: true,
  });
  await fireEvent.press(screen.getByRole('tab', { name: 'Pieces' }));
  expect(onChange).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('tab', { name: 'Details' }));
  expect(onChange).toHaveBeenCalledWith('Details');
});

test('each tab keeps a 44pt target', async () => {
  await render(<Tabs items={['Pieces', 'Details']} value="Pieces" onChange={jest.fn()} />);
  expect(screen.getByRole('tab', { name: 'Details' }).props.style).toMatchObject({ minHeight: 44 });
});

test('a header rail takes glyphs, a count, a disabled tab and a trailing control', async () => {
  const onChange = jest.fn();
  await render(
    <Tabs
      items={['Owned', 'Wishlist', 'Shop']}
      value="Owned"
      onChange={onChange}
      icons={{ Owned: 'wardrobe', Wishlist: 'heart', Shop: 'receipt' }}
      counts={{ Wishlist: 4 }}
      disabled={['Shop']}
      trailing={<Text>Add</Text>}
    />,
  );
  const shop = screen.getByRole('tab', { name: 'Shop' });
  expect(shop.props.accessibilityState).toEqual({ selected: false, disabled: true });
  expect(shop).toHaveStyle({ opacity: 0.45 });
  await fireEvent.press(shop);
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole('tab', { name: 'Wishlist 4' })).toBeTruthy();
  expect(screen.getByText('Add')).toBeTruthy();
});
