import { fireEvent, render, screen } from '@testing-library/react-native';
import { ActionDisc, ActionDiscs } from './ActionDisc';
import { Button, DOUBLE_PRIMARY_WARNING, PrimaryScope } from './Button';

test('a disc names its action and stands half over the photo', async () => {
  const onPress = jest.fn();
  await render(
    <ActionDiscs testID="discs">
      <ActionDisc
        icon="capture"
        label="Capture"
        accessibilityLabel="Capture a look for today"
        onPress={onPress}
      />
      <ActionDisc icon="book" label="Pick" onPress={jest.fn()} />
    </ActionDiscs>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Capture a look for today' }));
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Pick')).toBeTruthy();
});

test('the primary is the ink Create disc, raised in an 80pt slot, SemiBold label', async () => {
  const onPress = jest.fn();
  await render(
    <ActionDiscs>
      <ActionDisc icon="capture" label="Capture" onPress={jest.fn()} />
      <ActionDisc
        primary
        label="Create"
        accessibilityLabel="Create a look for today"
        onPress={onPress}
      />
      <ActionDisc icon="book" label="Pick" onPress={jest.fn()} />
    </ActionDiscs>,
  );
  const create = screen.getByRole('button', { name: 'Create a look for today' });
  expect(create).toHaveStyle({ width: 80, marginTop: -10 });
  expect(screen.getByText('Create')).toHaveStyle({ fontFamily: 'Inter_600SemiBold' });
  expect(screen.getByText('Capture')).not.toHaveStyle({ fontFamily: 'Inter_600SemiBold' });
  await fireEvent.press(create);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('the primary disc counts as the screen’s one ink action', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  await render(
    <PrimaryScope>
      <ActionDisc primary label="Create" onPress={jest.fn()} />
      <Button onPress={jest.fn()}>Save</Button>
    </PrimaryScope>,
  );
  expect(warn).toHaveBeenCalledWith(DOUBLE_PRIMARY_WARNING);
  warn.mockRestore();
});
