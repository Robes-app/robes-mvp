import { plan, ui } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { DayView } from '../src/features/plan/DayView';
import { PlanView } from '../src/features/plan/PlanView';
import { dayLabel } from '../src/features/plan/plan';
import { mockFetch, renderWithApi } from './support/api';
import { LOOK_ID, look } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => jest.clearAllMocks());

const ENTRY_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const planWith = (entries: boolean) => ({
  from: '2026-10-01',
  to: '2026-10-03',
  days: [
    {
      date: '2026-10-01',
      entries: entries
        ? [
            {
              id: ENTRY_ID,
              date: '2026-10-01',
              slot: 'day',
              activity: 'Board meeting',
              look: look(),
            },
          ]
        : [],
    },
    { date: '2026-10-02', entries: [] },
    { date: '2026-10-03', entries: [] },
  ],
});

test('days read as today or a short date', () => {
  expect(dayLabel('2026-10-01', '2026-10-01')).toBe(plan.today);
  expect(dayLabel('2026-10-02', '2026-10-01')).toBe('Fri 2 Oct');
});

test('an empty plan explains how to fill it; every day is a row that opens its page', async () => {
  mockFetch({ 'GET /plan': planWith(false) });
  await renderWithApi(<PlanView />);
  expect(await screen.findByText(plan.empty.title)).toBeTruthy();
  expect(screen.getAllByText(plan.list.nameTheDay)).toHaveLength(3);
  // 1 Oct 2026 is a Thursday: the window starts mid-week.
  expect(screen.getByText(plan.list.restOfWeek)).toBeTruthy();
  await fireEvent.press(screen.getByTestId('plan-day-2026-10-02'));
  expect(mockRouter.push).toHaveBeenCalledWith('/day/2026-10-02');
});

test('a row reads her name for the day, its looks and pieces', async () => {
  mockFetch({ 'GET /plan': planWith(true) });
  await renderWithApi(<PlanView />);
  expect(await screen.findByText('Board meeting')).toBeTruthy();
  expect(screen.getByText('1 look · 1 piece')).toBeTruthy();
  expect(screen.getByText(plan.today)).toBeTruthy();
});

test('the day page names the day, opens a look and takes it off with Undo', async () => {
  const calls = mockFetch({
    'GET /plan': planWith(true),
    [`PATCH /plan/entries/${ENTRY_ID}`]: {
      id: ENTRY_ID,
      date: '2026-10-01',
      slot: 'day',
      activity: 'Dinner',
      look: look(),
    },
    [`DELETE /plan/entries/${ENTRY_ID}`]: { ok: true },
    [`POST /plan/entries/${ENTRY_ID}/restore`]: { ok: true },
  });
  await renderWithApi(<DayView date="2026-10-01" />);
  expect(await screen.findByText('Board meeting')).toBeTruthy();
  expect(screen.getByText('Thursday 1 October')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Weekend navy' }));
  expect(mockRouter.push).toHaveBeenCalledWith(`/look/${LOOK_ID}`);

  await fireEvent.press(screen.getByRole('button', { name: plan.day.rename }));
  await fireEvent.changeText(screen.getByLabelText(plan.day.nameLabel), 'Dinner');
  await fireEvent(screen.getByLabelText(plan.day.nameLabel), 'submitEditing');
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ activity: 'Dinner' }),
  );

  await fireEvent.press(screen.getByRole('button', { name: plan.day.remove('Weekend navy') }));
  expect(await screen.findByText(plan.unpinned)).toBeTruthy();
  await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
  await act(async () => {
    await fireEvent.press(screen.getAllByRole('button', { name: ui.undo }).at(-1) as never);
  });
  await waitFor(() => expect(calls.some((c) => c.path.endsWith('/restore'))).toBe(true));
});

test('an empty day’s one door opens the picker, which adds several looks at once', async () => {
  const second = look({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Gallery night' });
  const third = look({ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', name: 'Errands' });
  const calls = mockFetch({
    'GET /plan': planWith(false),
    'GET /looks': { items: [look(), second, third], nextCursor: null },
    [`POST /plan/looks/${LOOK_ID}/days`]: { entries: [] },
    [`POST /plan/looks/${second.id}/days`]: { entries: [] },
  });
  await renderWithApi(<DayView date="2026-10-01" />);
  await fireEvent.press(await screen.findByRole('button', { name: plan.day.choose }));
  expect(await screen.findByText(plan.picker.hint)).toBeTruthy();
  await fireEvent.press(await screen.findByRole('button', { name: 'Weekend navy' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Gallery night' }));
  await fireEvent.press(screen.getByRole('button', { name: plan.picker.add(2) }));
  expect(await screen.findByText(plan.picker.added(2, 'Thursday'))).toBeTruthy();
  const pins = calls.filter((c) => c.method === 'POST' && c.path.endsWith('/days'));
  expect(pins.map((c) => c.body)).toEqual([{ dates: ['2026-10-01'] }, { dates: ['2026-10-01'] }]);
});

test('a look already on the day is shown, never offered twice', async () => {
  mockFetch({
    'GET /plan': planWith(true),
    'GET /looks': { items: [look()], nextCursor: null },
  });
  await renderWithApi(<DayView date="2026-10-01" />);
  await fireEvent.press(await screen.findByRole('button', { name: plan.day.addAnother }));
  expect(await screen.findByText(plan.picker.already)).toBeTruthy();
  const tiles = screen.getAllByRole('button', { name: 'Weekend navy' });
  expect(tiles.at(-1)?.props.accessibilityState.disabled).toBe(true);
});
