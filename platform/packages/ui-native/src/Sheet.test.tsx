import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { AccessibilityInfo, Keyboard, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

function panelStyle(text: string) {
  let panel = screen.getByText(text).parent;
  while (panel && panel.props.accessibilityViewIsModal !== true) panel = panel.parent;
  return StyleSheet.flatten(panel?.props.style);
}

test('a tall drawer stops short of the status bar', async () => {
  await render(
    <Sheet open onClose={() => {}} title="The facts">
      <Text>Height</Text>
    </Sheet>,
  );
  expect(panelStyle('Height')).toEqual(expect.objectContaining({ maxHeight: '92%' }));
});

test('its last row sits above the home indicator, and rides the keyboard without it', async () => {
  const listeners = new Map<string, () => void>();
  jest.spyOn(Keyboard, 'addListener').mockImplementation((event, listener) => {
    listeners.set(event, listener as () => void);
    return { remove: jest.fn() } as never;
  });
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <Sheet open onClose={() => {}} title="Name the day">
        <Button onPress={() => {}}>Save</Button>
      </Sheet>
    </SafeAreaProvider>,
  );
  expect(await screen.findByText('Save')).toBeTruthy();
  expect(panelStyle('Save')).toEqual(expect.objectContaining({ paddingBottom: 24 + 34 }));
  // The KeyboardAvoidingView lifts the sheet past the indicator, so the inset steps aside.
  await act(() => listeners.get('keyboardWillShow')?.());
  expect(panelStyle('Save')).toEqual(expect.objectContaining({ paddingBottom: 24 }));
  await act(() => listeners.get('keyboardWillHide')?.());
  expect(panelStyle('Save')).toEqual(expect.objectContaining({ paddingBottom: 24 + 34 }));
  jest.restoreAllMocks();
});

test('without a home indicator it keeps its own padding', async () => {
  await render(
    <Sheet open onClose={() => {}}>
      <Text>Body</Text>
    </Sheet>,
  );
  expect(panelStyle('Body')).toEqual(expect.objectContaining({ paddingBottom: 24 }));
});
