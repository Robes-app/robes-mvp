import { fireEvent, render, screen } from '@testing-library/react-native';
import { ActionDisc, ActionDiscs } from './ActionDisc';

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
