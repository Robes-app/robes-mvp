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

test('selected state is warm, never a black fill', async () => {
  await render(
    <Pill selected onPress={() => {}}>
      Knitwear
    </Pill>,
  );
  const button = screen.getByRole('button', { name: 'Knitwear' });
  const face = button.children[0] as unknown as { props: { className: string } };
  expect(face.props.className).toContain('bg-selected');
  expect(face.props.className).toContain('border-selected-line');
  expect(face.props.className).not.toContain('bg-ink');
  expect(button).toHaveStyle({ minHeight: 44 });
});

test('a selected pill carries the check, as on the web', async () => {
  const icons = () =>
    screen.container.queryAll((node) => node.props.accessibilityElementsHidden === true);
  const { rerender } = await render(
    <Pill selected onPress={() => {}}>
      Knitwear
    </Pill>,
  );
  expect(icons().length).toBeGreaterThan(0);
  await rerender(<Pill onPress={() => {}}>Knitwear</Pill>);
  expect(icons()).toHaveLength(0);
});

test('an active quick chip reads deep rose with a cream label and its count, no check', async () => {
  await render(
    <>
      <Pill selected tone="rose" count={2} onPress={() => {}}>
        Everyday
      </Pill>
      <Pill count={0} disabled onPress={() => {}}>
        Active
      </Pill>
    </>,
  );
  const active = screen.getByRole('button', { name: 'Everyday 2' });
  const face = active.children[0] as unknown as { props: { className: string } };
  expect(face.props.className).toContain('bg-accent-warm');
  expect(face.props.className).not.toContain('bg-selected');
  expect(
    screen.container.queryAll((node) => node.props.accessibilityElementsHidden === true),
  ).toHaveLength(0);
  const off = screen.getByRole('button', { name: 'Active 0' });
  expect(off.props.accessibilityState).toEqual({ selected: false, disabled: true });
  expect((off.children[0] as unknown as { props: { style: unknown } }).props.style).toMatchObject({
    opacity: 0.45,
  });
});
