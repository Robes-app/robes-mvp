import { act, renderHook } from '@testing-library/react-native';
import { usePullRefresh } from '../src/lib/pull-refresh';

// Home polls while a draft dresses: only her pull spins the control, so a background read never
// shoves the page down and leaves the weather under the bar (Annie, 10 Nov).
test('spins only for her pull, and stops when the read lands or fails', async () => {
  let land: () => void = () => {};
  const refetch = jest.fn(
    () =>
      new Promise<void>((resolve) => {
        land = resolve;
      }),
  );
  const { result } = await renderHook(() => usePullRefresh(refetch));
  expect(result.current.refreshing).toBe(false);
  await act(async () => result.current.onRefresh());
  expect(refetch).toHaveBeenCalledTimes(1);
  expect(result.current.refreshing).toBe(true);
  await act(async () => land());
  expect(result.current.refreshing).toBe(false);
  const failing = await renderHook(() => usePullRefresh(() => Promise.reject(new Error('down'))));
  await act(async () => failing.result.current.onRefresh());
  expect(failing.result.current.refreshing).toBe(false);
});
