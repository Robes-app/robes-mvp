import { act, renderHook } from '@testing-library/react-native';
import { type HostInstance, Keyboard, type KeyboardEvent, Platform } from 'react-native';
import { keyboardOverlap, useKeyboardOverlap } from '../src/lib/keyboard';

const event = (screenY: number): KeyboardEvent =>
  ({
    duration: 250,
    easing: 'keyboard',
    endCoordinates: { screenX: 0, screenY, width: 390, height: 844 - screenY },
  }) as KeyboardEvent;

test('the overlap is the keyboard over the view’s foot, never negative', () => {
  expect(keyboardOverlap(844, 508)).toBe(336);
  expect(keyboardOverlap(400, 508)).toBe(0);
});

// A form sheet starts below the top of the screen: its foot is measured where it stands, so Style
// it rides above the keyboard (Annie, 10 Nov).
test('lifts a sheet’s foot by what the keyboard covers, and drops it when the keyboard goes', async () => {
  const os = Platform.OS;
  Platform.OS = 'ios';
  const listeners = new Map<string, (e: KeyboardEvent) => void>();
  const add = jest.spyOn(Keyboard, 'addListener').mockImplementation(((
    name: string,
    fn: (e: KeyboardEvent) => void,
  ) => {
    listeners.set(name, fn);
    return { remove: () => listeners.delete(name) };
  }) as never);
  jest.spyOn(Keyboard, 'scheduleLayoutAnimation').mockImplementation(() => {});
  // The sheet stands 60pt down the screen and runs to its foot.
  const view = {
    measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) =>
      cb(0, 60, 390, 784),
  } as unknown as HostInstance;
  const ref = { current: view };
  const { result, unmount } = await renderHook(() => useKeyboardOverlap(ref));
  expect(result.current).toBe(0);
  await act(async () => listeners.get('keyboardWillShow')?.(event(508)));
  expect(result.current).toBe(336);
  await act(async () => listeners.get('keyboardWillHide')?.(event(844)));
  expect(result.current).toBe(0);
  await unmount();
  expect(listeners.size).toBe(0);
  add.mockRestore();
  Platform.OS = os;
});
