import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { AccessibilityInfo, Pressable, Text } from 'react-native';
import { Sheet } from './Sheet';

// The first render pays the cold transform; under a full parallel `pnpm verify` that alone neared 5 s.
jest.setTimeout(20_000);

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)}>
        <Text>Create</Text>
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title="Create.">
        <Text>Add a piece</Text>
      </Sheet>
    </>
  );
}

describe.each([
  ['with motion', false],
  ['with reduce motion', true],
])('Sheet %s', (_, reduced) => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduced);
  });
  afterEach(() => jest.restoreAllMocks());

  test('opens with its title and content, and closes from the close control', async () => {
    await render(<Harness />);
    expect(screen.queryByText('Add a piece')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Create' }));
    expect(await screen.findByText('Add a piece')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Create.' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Add a piece')).toBeNull());
  });
});

test('the Android back gesture closes it', async () => {
  const onClose = jest.fn();
  await render(
    <Sheet open onClose={onClose}>
      <Text>Body</Text>
    </Sheet>,
  );
  const [modal] = screen.container.queryAll(
    (node) => typeof node.props.onRequestClose === 'function',
  );
  modal?.props.onRequestClose();
  expect(onClose).toHaveBeenCalledTimes(1);
});
