import { act, renderHook } from '@testing-library/react-native';
import { useTurningPlaceholder } from '@/features/looks/StylingCard';

// Every prompt box turns on one clock (look prompt improvements B8, 16 Nov): a box that opens
// later shows the line the resting box shows, never the first one again.
const LINES = ['first', 'second', 'third'] as const;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-16T09:00:00.000Z'));
});
afterEach(() => jest.useRealTimers());

test('a box opened later shows the same line as the one already turning', async () => {
  const resting = await renderHook(() => useTurningPlaceholder(LINES, true));
  const start = resting.result.current;
  await act(async () => jest.advanceTimersByTime(3200));
  const now = resting.result.current;
  expect(now).not.toBe(start);
  const opened = await renderHook(() => useTurningPlaceholder(LINES, true));
  expect(opened.result.current).toBe(now);
  await act(async () => jest.advanceTimersByTime(3200));
  expect(opened.result.current).toBe(resting.result.current);
});
