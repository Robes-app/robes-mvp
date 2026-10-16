import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Pressable, Text } from 'react-native';
import { TOAST_MIN_DURATION } from './scale';
import { type ToastOptions, ToastProvider, useToast } from './Toast';

function Trigger({ options }: { options: ToastOptions }) {
  const toast = useToast();
  return (
    <Pressable accessibilityRole="button" onPress={() => toast.show(options)}>
      <Text>Remove</Text>
    </Pressable>
  );
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('shows a message with an Undo action that runs and dismisses', async () => {
  const undo = jest.fn();
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  await render(
    <ToastProvider>
      <Trigger options={{ message: 'Piece removed.', action: { label: 'Undo', onPress: undo } }} />
    </ToastProvider>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Remove' }));
  expect(screen.getByText('Piece removed.')).toBeTruthy();
  expect(announce).toHaveBeenCalledWith('Piece removed. Undo');
  await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
  expect(undo).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Piece removed.')).toBeNull();
});

test('stays up for at least 6 s even when asked for less', async () => {
  await render(
    <ToastProvider>
      <Trigger options={{ message: 'Piece removed.', duration: 1000 }} />
    </ToastProvider>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Remove' }));
  await act(async () => {
    jest.advanceTimersByTime(TOAST_MIN_DURATION - 1);
  });
  expect(screen.getByText('Piece removed.')).toBeTruthy();
  await act(async () => {
    jest.advanceTimersByTime(1);
  });
  expect(screen.queryByText('Piece removed.')).toBeNull();
});

test('a newer toast replaces the old one and gets its own full duration', async () => {
  function Two() {
    const toast = useToast();
    return (
      <>
        <Pressable accessibilityRole="button" onPress={() => toast.show({ message: 'First.' })}>
          <Text>One</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => toast.show({ message: 'Second.' })}>
          <Text>Two</Text>
        </Pressable>
      </>
    );
  }
  await render(
    <ToastProvider>
      <Two />
    </ToastProvider>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'One' }));
  await act(async () => {
    jest.advanceTimersByTime(4000);
  });
  await fireEvent.press(screen.getByRole('button', { name: 'Two' }));
  expect(screen.queryByText('First.')).toBeNull();
  await act(async () => {
    jest.advanceTimersByTime(4000);
  });
  expect(screen.getByText('Second.')).toBeTruthy();
});

test('useToast outside the provider fails loudly', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  await expect(render(<Trigger options={{ message: 'x' }} />)).rejects.toThrow(/ToastProvider/);
  error.mockRestore();
});
