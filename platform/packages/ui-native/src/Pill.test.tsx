import { fireEvent, render, screen } from '@testing-library/react-native';
import { Chip, Pill } from './Pill';

test('selected pill is announced as selected and toggles through onPress', async () => {
  const onPress = jest.fn();
  await render(
    <>
      <Pill selected onPress={onPress}>
        Knitwear
      </Pill>
      <Chip onPress={onPress}>Denim</Chip>
    </>,
  );
  expect(screen.getByRole('button', { name: 'Knitwear' })).toBeSelected();
  expect(screen.getByRole('button', { name: 'Denim' })).not.toBeSelected();
  await fireEvent.press(screen.getByRole('button', { name: 'Denim' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('selected state is an ink outline, never a black fill', async () => {
  await render(
    <Pill selected onPress={() => {}}>
      Knitwear
    </Pill>,
  );
  const button = screen.getByRole('button', { name: 'Knitwear' });
  const face = button.children[0] as unknown as { props: { className: string } };
  expect(face.props.className).toContain('border-ink');
  expect(face.props.className).not.toContain('bg-ink');
  expect(button).toHaveStyle({ minHeight: 44 });
});

test('a pill without onPress is plain text, not a button', async () => {
  await render(<Pill>Tag</Pill>);
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.getByText('Tag')).toBeTruthy();
});
