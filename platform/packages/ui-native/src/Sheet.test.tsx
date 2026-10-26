import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { AccessibilityInfo, Pressable, Text } from 'react-native';
import { Button, DOUBLE_PRIMARY_WARNING, PrimaryScope } from './Button';
import { Sheet } from './Sheet';

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

test('a drawer’s one filled button stands beside the screen’s', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  await render(
    <PrimaryScope>
      <Button onPress={() => {}}>Add to wardrobe</Button>
      <Sheet open onClose={() => {}} title="Brand">
        <Button onPress={() => {}}>Save</Button>
      </Sheet>
    </PrimaryScope>,
  );
  expect(await screen.findByText('Save')).toBeTruthy();
  expect(warn).not.toHaveBeenCalledWith(DOUBLE_PRIMARY_WARNING);
  warn.mockRestore();
});
