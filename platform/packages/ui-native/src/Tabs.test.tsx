import { fireEvent, render, screen } from '@testing-library/react-native';
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
