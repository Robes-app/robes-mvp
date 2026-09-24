import { plan, ui } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
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

test('an empty plan explains how to fill it and shows quiet free days', async () => {
  mockFetch({ 'GET /plan': planWith(false) });
  await renderWithApi(<PlanView />);
  expect(await screen.findByText(plan.empty.title)).toBeTruthy();
  expect(screen.getAllByText(plan.free)).toHaveLength(3);
});

test('a pinned look opens, can be renamed, and unpinned with Undo', async () => {
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
  await renderWithApi(<PlanView />);
  await fireEvent.press(await screen.findByRole('button', { name: 'Weekend navy' }));
  expect(mockRouter.push).toHaveBeenCalledWith(`/look/${LOOK_ID}`);

  await fireEvent.changeText(screen.getByLabelText(plan.activityField), 'Dinner');
  await fireEvent.press(screen.getByRole('button', { name: plan.saveActivity }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ activity: 'Dinner' }),
  );

  await fireEvent.press(screen.getByRole('button', { name: plan.unpin('Weekend navy') }));
  expect(await screen.findByText(plan.unpinned)).toBeTruthy();
  await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
  await act(async () => {
    await fireEvent.press(screen.getAllByRole('button', { name: ui.undo }).at(-1) as never);
  });
  await waitFor(() => expect(calls.some((c) => c.path.endsWith('/restore'))).toBe(true));
});
