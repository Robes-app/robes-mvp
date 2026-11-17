import { act, renderHook } from '@testing-library/react-native';
import { useTimedOut } from '../src/lib/use-timed-out';

// Audit F5: a job never spins forever; past its time the screen says so, and Try again restarts
// the wait.
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('waiting past the limit times out; Try again starts the wait anew; an end resets it', async () => {
  const { result, rerender } = await renderHook(
    ({ waiting }: { waiting: boolean }) => useTimedOut(waiting, 1000),
    { initialProps: { waiting: true } },
  );
  expect(result.current[0]).toBe(false);
  await act(() => jest.advanceTimersByTime(1000));
  expect(result.current[0]).toBe(true);
  await act(() => result.current[1]());
  expect(result.current[0]).toBe(false);
  await act(() => jest.advanceTimersByTime(999));
  expect(result.current[0]).toBe(false);
  await rerender({ waiting: false });
  await act(() => jest.advanceTimersByTime(5000));
  expect(result.current[0]).toBe(false);
});
