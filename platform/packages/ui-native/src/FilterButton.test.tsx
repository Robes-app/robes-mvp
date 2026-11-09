import { fireEvent, render, screen } from '@testing-library/react-native';
import { FilterButton } from './FilterButton';

test('rests clear on the warm line and opens the sheet', async () => {
  const onPress = jest.fn();
  await render(<FilterButton onPress={onPress} />);
  const button = screen.getByRole('button', { name: 'Filter' });
  expect(button.props.accessibilityState).toEqual({ selected: false });
  expect(button).toHaveStyle({ minHeight: 44 });
  const face = button.children[0] as unknown as { props: { className: string } };
  expect(face.props.className).toContain('border-warm-line');
  await fireEvent.press(button);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('fills ink and carries the count once sheet filters are on', async () => {
  await render(<FilterButton count={2} onPress={jest.fn()} />);
  const button = screen.getByRole('button', { name: 'Filter 2' });
  expect(button.props.accessibilityState).toEqual({ selected: true });
  const face = button.children[0] as unknown as { props: { className: string } };
  expect(face.props.className).toContain('bg-ink');
  expect(screen.getByText('2')).toBeTruthy();
});
