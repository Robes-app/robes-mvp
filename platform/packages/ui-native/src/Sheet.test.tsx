import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text } from 'react-native';
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

test('a header close sits beside the title: the ×, or a word where every tap saved', async () => {
  const onClose = jest.fn();
  const { rerender } = await render(
    <Sheet open onClose={onClose} title="Brand" closeButton>
      <Text>Body</Text>
    </Sheet>,
  );
  // One Close, not two: the grab bar becomes only the handle.
  expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
  expect(onClose).toHaveBeenCalledTimes(1);
  await rerender(
    <Sheet
      open
      onClose={onClose}
      title="Jumpers & sweaters"
      eyebrow="Knitwear"
      leading={
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Knitwear">
          <Text>‹</Text>
        </Pressable>
      }
      closeLabel="Done"
    >
      <Text>Body</Text>
    </Sheet>,
  );
  expect(screen.getByRole('button', { name: 'Back to Knitwear' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(onClose).toHaveBeenCalledTimes(2);
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

test('a tall drawer stops short of the status bar', async () => {
  await render(
    <Sheet open onClose={() => {}} title="The facts">
      <Text>Height</Text>
    </Sheet>,
  );
  let panel = screen.getByText('Height').parent;
  while (panel && panel.props.accessibilityViewIsModal !== true) panel = panel.parent;
  expect(StyleSheet.flatten(panel?.props.style)).toEqual(
    expect.objectContaining({ maxHeight: '92%' }),
  );
});
