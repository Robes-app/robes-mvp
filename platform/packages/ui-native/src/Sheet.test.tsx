import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { AccessibilityInfo, Dimensions, Keyboard, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Button, DOUBLE_PRIMARY_WARNING, PrimaryScope } from './Button';
import { Sheet, useSheetPresented } from './Sheet';

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

// TestFlight, 15 Nov: the look's prompt opens with its field in focus, so the keyboard rises as the
// sheet does. The sheet stands on the keyboard's own height from that first event, with nothing to
// measure first, so it is never left behind the keyboard.
test('it stands on the keyboard from the keyboard event that opens with it', async () => {
  const listeners = new Map<string, (e?: unknown) => void>();
  jest.spyOn(Keyboard, 'addListener').mockImplementation((event, listener) => {
    listeners.set(event, listener as (e?: unknown) => void);
    return { remove: jest.fn() } as never;
  });
  const window = Dimensions.get('window').height;
  await render(
    <Sheet open onClose={() => {}} title="Styling with Robes">
      <Text>Prompt</Text>
    </Sheet>,
  );
  await act(() =>
    listeners.get('keyboardWillShow')?.({
      endCoordinates: { screenY: window - 336, height: 336, screenX: 0, width: 390 },
      duration: 0,
    }),
  );
  let stage = screen.getByText('Prompt').parent;
  while (stage && stage.props.accessibilityViewIsModal !== true) stage = stage.parent;
  const ground = () => StyleSheet.flatten(stage?.parent?.props.style)?.paddingBottom;
  await waitFor(() => expect(ground()).toBe(336));
  await act(() => listeners.get('keyboardWillHide')?.({ duration: 0 }));
  await waitFor(() => expect(ground()).toBe(0));
  jest.restoreAllMocks();
});

// Annie, 15 Nov: every sheet stood a keyboard's height off the bottom with no keyboard there. iOS
// sends a change of keyboard frame as the keyboard goes or a modal presents; only a show lifts.
test('a change of keyboard frame with no keyboard up never lifts it, nor one after a hide', async () => {
  const listeners = new Map<string, (e?: unknown) => void>();
  jest.spyOn(Keyboard, 'addListener').mockImplementation((event, listener) => {
    listeners.set(event, listener as (e?: unknown) => void);
    return { remove: jest.fn() } as never;
  });
  const window = Dimensions.get('window').height;
  const at = (height: number) => ({
    endCoordinates: { screenY: window - height, height, screenX: 0, width: 390 },
    duration: 0,
  });
  await render(
    <Sheet open onClose={() => {}} title="Add pieces">
      <Text>Tiles</Text>
    </Sheet>,
  );
  let stage = screen.getByText('Tiles').parent;
  while (stage && stage.props.accessibilityViewIsModal !== true) stage = stage.parent;
  const ground = () => StyleSheet.flatten(stage?.parent?.props.style)?.paddingBottom;
  await act(() => listeners.get('keyboardWillChangeFrame')?.(at(300)));
  await act(() => new Promise((done) => setTimeout(done, 100)));
  expect(ground()).toBe(0);
  await act(() => listeners.get('keyboardWillShow')?.(at(336)));
  await waitFor(() => expect(ground()).toBe(336));
  await act(() => listeners.get('keyboardWillHide')?.({ duration: 0 }));
  await waitFor(() => expect(ground()).toBe(0));
  await act(() => listeners.get('keyboardWillChangeFrame')?.(at(300)));
  await act(() => new Promise((done) => setTimeout(done, 400)));
  expect(ground()).toBe(0);
  jest.restoreAllMocks();
});

// Felix, 12 Nov: the floating and glass sheets stood 8pt off the sides and bottom and read as
// detached. Every sheet stands on the bottom edge, edge to edge, its top corners rounded, its last
// row above the home indicator.
test.each([
  ['floating', { floating: true }],
  ['glass', { glass: { title: 'Add pieces' } }],
])('a %s sheet stands on the bottom edge', async (_, variant) => {
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <Sheet open onClose={() => {}} {...variant}>
        <Text>Anchored</Text>
      </Sheet>
    </SafeAreaProvider>,
  );
  expect(await screen.findByText('Anchored')).toBeTruthy();
  const style = panelStyle('Anchored');
  expect(style).toEqual(expect.objectContaining({ paddingBottom: 24 + 34 }));
  expect(style?.borderBottomWidth).toBeUndefined();
  expect(style?.marginHorizontal).toBeUndefined();
  expect(style?.marginBottom).toBeUndefined();
  expect(style?.borderWidth).toBeUndefined();
  expect(style?.shadowOpacity).toBeUndefined();
});

test('without a home indicator it keeps its own padding', async () => {
  await render(
    <Sheet open onClose={() => {}}>
      <Text>Body</Text>
    </Sheet>,
  );
  expect(panelStyle('Body')).toEqual(expect.objectContaining({ paddingBottom: 24 }));
});

test('a sheet asks one question with Felix choice rows', async () => {
  const pick = jest.fn();
  await render(
    <Sheet
      open
      onClose={jest.fn()}
      eyebrow="Monday"
      title="What did you wear?"
      rows={[
        { icon: 'capture', label: 'Take a photo', onPress: pick },
        { icon: 'book', label: 'Pick a look', onPress: jest.fn() },
      ]}
    />,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Take a photo' }));
  expect(pick).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Pick a look' }).props.style).toMatchObject({
    minHeight: 56,
  });
});

// A field that takes the keyboard as its sheet opens waits until the sheet is on the screen: iOS
// drops a focus asked for while the modal is presenting (look prompt, 16 Nov).
test('useSheetPresented is false until the sheet is shown, and true outside a sheet', async () => {
  function Probe({ label }: { label: string }) {
    return <Text>{`${label}:${useSheetPresented() ? 'up' : 'presenting'}`}</Text>;
  }
  await render(
    <SafeAreaProvider>
      <Probe label="outside" />
      <Sheet open onClose={() => undefined} testID="probe-sheet">
        <Probe label="inside" />
      </Sheet>
    </SafeAreaProvider>,
  );
  expect(screen.getByText('outside:up')).toBeTruthy();
  expect(screen.getByText('inside:presenting')).toBeTruthy();
  await act(async () => screen.getByTestId('probe-sheet').props.onShow());
  expect(await screen.findByText('inside:up')).toBeTruthy();
});

test('a head of its own stands in place of the grab bar', async () => {
  await render(
    <SafeAreaProvider>
      <Sheet open onClose={() => undefined} floating head={<Text>Styling with Robes</Text>}>
        <Text>Body</Text>
      </Sheet>
    </SafeAreaProvider>,
  );
  expect(screen.getByText('Styling with Robes')).toBeTruthy();
  // The tall grab bar (a Close button) gives way to the slim handle over the head.
  expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
});
