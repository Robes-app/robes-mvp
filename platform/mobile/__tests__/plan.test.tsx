import { diary, plan, ui } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { localDate } from '../src/features/looks/saved-looks';
import { DayView } from '../src/features/plan/DayView';
import { PlanView } from '../src/features/plan/PlanView';
import { dayLabel } from '../src/features/plan/plan';
import { mockFetch, renderWithApi } from './support/api';
import { LOOK_ID, look } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: false,
    assets: [{ uri: 'file:///tmp/me.jpg', width: 900, height: 1200, mimeType: 'image/jpeg' }],
  })),
}));
jest.mock('../src/features/wardrobe/add-pieces', () => ({
  ...jest.requireActual('../src/features/wardrobe/add-pieces'),
  uploadPhoto: jest.fn(async () => '44444444-4444-4444-8444-444444444444'),
}));

// Her List | Month pick (D4): a store per test.
const mockPrefs = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockPrefs.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockPrefs.set(k, v);
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPrefs.clear();
});

const ENTRY_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const planWith = (entries: boolean) => ({
  from: '2026-10-01',
  to: '2026-10-03',
  days: [
    {
      date: '2026-10-01',
      name: null,
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
    { date: '2026-10-02', name: null, entries: [] },
    { date: '2026-10-03', name: null, entries: [] },
  ],
});

test('days read as today or a short date', () => {
  expect(dayLabel('2026-10-01', '2026-10-01')).toBe(plan.today);
  expect(dayLabel('2026-10-02', '2026-10-01')).toBe('Fri 2 Oct');
});

test('an empty plan explains how to fill it; every day is a row that opens its page', async () => {
  mockFetch({ 'GET /plan': planWith(false) });
  await renderWithApi(<PlanView />);
  expect(
    await screen.findByText(`${plan.empty.title} ${plan.empty.titleEm}`, { exact: false }),
  ).toBeTruthy();
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
    'PUT /plan/days/2026-10-01/name': { date: '2026-10-01', name: 'Dinner' },
    [`DELETE /plan/entries/${ENTRY_ID}`]: { ok: true },
    [`POST /plan/entries/${ENTRY_ID}/restore`]: { ok: true },
  });
  await renderWithApi(<DayView date="2026-10-01" />);
  expect(await screen.findByText('Board meeting')).toBeTruthy();
  expect(screen.getByText('Thursday 1 October')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Weekend navy' }));
  expect(mockRouter.push).toHaveBeenCalledWith(`/look/${LOOK_ID}`);

  // The title itself becomes the field, on the day's name: no label, no Save, no Cancel.
  await fireEvent.press(screen.getByRole('button', { name: plan.day.rename }));
  const field = screen.getByLabelText(plan.day.name);
  expect(field.props.value).toBe('Board meeting');
  expect(screen.queryByRole('button', { name: plan.day.rename })).toBeNull();
  await fireEvent.changeText(field, 'Dinner');
  await fireEvent(field, 'submitEditing');
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ name: 'Dinner' }),
  );

  await fireEvent.press(screen.getByRole('button', { name: plan.day.remove('Weekend navy') }));
  expect(await screen.findByText(plan.unpinned)).toBeTruthy();
  await waitFor(() => expect(calls.some((c) => c.method === 'DELETE')).toBe(true));
  await act(async () => {
    await fireEvent.press(screen.getAllByRole('button', { name: ui.undo }).at(-1) as never);
  });
  await waitFor(() => expect(calls.some((c) => c.path.endsWith('/restore'))).toBe(true));
});

const dayOnly = (date: string) => ({
  from: date,
  to: date,
  days: [{ date, name: null, entries: [] }],
});

test('the day page reads the day’s weather: the conditions, then its range (design 3k)', async () => {
  const today = localDate();
  const calls = mockFetch({
    'GET /plan': dayOnly(today),
    'GET /today/weather': {
      city: 'Dublin',
      tempRange: '11–15°C',
      condition: 'light rain',
      nowC: 13,
      code: 3,
    },
  });
  await renderWithApi(<DayView date={today} />);
  expect(await screen.findByText('Dublin · overcast · 11–15°C')).toBeTruthy();
  expect(calls.find((c) => c.path.endsWith('/today/weather'))?.url).toContain(`date=${today}`);
});

test('a day gone by reads its range and conditions too', async () => {
  const calls = mockFetch({
    'GET /plan': dayOnly('2026-09-20'),
    'GET /today/weather': {
      city: 'Dublin',
      tempRange: '4–9°C',
      condition: 'snow',
      nowC: null,
      code: 73,
    },
  });
  await renderWithApi(<DayView date="2026-09-20" />);
  expect(await screen.findByText('Dublin · snow · 4–9°C')).toBeTruthy();
  expect(calls.find((c) => c.path.endsWith('/today/weather'))?.url).toContain('date=2026-09-20');
});

test('a look she wore leads as the OOTD; × takes the wear back, never a pin', async () => {
  const p = planWith(true);
  const entry = p.days[0]?.entries[0] as Record<string, unknown>;
  entry.activity = null;
  entry.worn = true;
  const calls = mockFetch({
    'GET /plan': p,
    [`DELETE /looks/${LOOK_ID}/wears/2026-10-01`]: { ok: true },
  });
  await renderWithApi(<DayView date="2026-10-01" />);
  expect(await screen.findByTestId('day-ootd')).toBeTruthy();
  expect(screen.getByText(diary.day.ootd)).toBeTruthy();
  expect(screen.getByLabelText(diary.day.isOotd)).toBeTruthy();
  expect(screen.getByText(diary.day.count(1))).toBeTruthy();
  // One look on an unnamed day: the title still invites her to name it.
  expect(screen.getByRole('header').props.children).toBe(diary.day.name);
  await fireEvent.press(screen.getByRole('button', { name: diary.day.takeOff('Weekend navy') }));
  await waitFor(() =>
    expect(calls.some((c) => c.method === 'DELETE' && c.path.endsWith('/wears/2026-10-01'))).toBe(
      true,
    ),
  );
  expect(calls.some((c) => c.path.includes('/plan/entries/'))).toBe(false);
});

test('☆ on a second look makes it the OOTD', async () => {
  const p = planWith(true);
  const second = {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    date: '2026-10-01',
    slot: 'day',
    activity: null,
    position: 1,
    look: look({ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', name: 'Gallery night' }),
  };
  p.days[0]?.entries.push(second as never);
  const calls = mockFetch({
    'GET /plan': p,
    'PUT /plan/days/2026-10-01/ootd': { entries: [] },
  });
  await renderWithApi(<DayView date="2026-10-01" />);
  expect(await screen.findByText(diary.day.look(2))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: diary.day.makeOotd('Gallery night') }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ entryId: second.id }),
  );
});

// The drawer reads the real clock (a day gone by files wears, a day ahead pins): today's page.
test('an empty day’s dashed door opens the drawer, which schedules several looks at once', async () => {
  const today = localDate();
  const second = look({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Gallery night' });
  const third = look({ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', name: 'Errands' });
  const calls = mockFetch({
    'GET /plan': dayOnly(today),
    'GET /looks': { items: [look(), second, third], nextCursor: null },
    [`POST /plan/looks/${LOOK_ID}/days`]: { entries: [] },
    [`POST /plan/looks/${second.id}/days`]: { entries: [] },
  });
  await renderWithApi(<DayView date={today} />);
  await fireEvent.press(await screen.findByRole('button', { name: diary.day.add }));
  expect(await screen.findByTestId('drawer-idle')).toHaveTextContent(diary.drawer.schedule(0));
  await fireEvent.press(await screen.findByRole('button', { name: 'Weekend navy' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Gallery night' }));
  expect(screen.getAllByText(diary.drawer.adding)).toHaveLength(2);
  await fireEvent.press(screen.getByRole('button', { name: diary.drawer.schedule(2) }));
  expect(await screen.findByText(diary.drawer.added(2, 'today'))).toBeTruthy();
  const pins = calls.filter((c) => c.method === 'POST' && c.path.endsWith('/days'));
  expect(pins.map((c) => c.body)).toEqual([{ dates: [today] }, { dates: [today] }]);
});

test('a look already on the day starts ticked as Scheduled; unticking it takes it off', async () => {
  const today = localDate();
  const p = dayOnly(today);
  (p.days[0] as { entries: unknown[] }).entries = [
    { id: ENTRY_ID, date: today, slot: 'day', activity: null, look: look() },
  ];
  const calls = mockFetch({
    'GET /plan': p,
    'GET /looks': { items: [look()], nextCursor: null },
    [`DELETE /plan/entries/${ENTRY_ID}`]: { ok: true },
  });
  await renderWithApi(<DayView date={today} />);
  await fireEvent.press(await screen.findByRole('button', { name: diary.day.add }));
  expect(await screen.findByText(diary.drawer.scheduled)).toBeTruthy();
  const tile = screen.getByTestId(`drawer-look-${LOOK_ID}`);
  expect(tile.props.accessibilityState.selected).toBe(true);
  // From Pick Look, unticking the only look leaves nothing to schedule: the foot stays idle.
  await fireEvent.press(tile);
  expect(screen.getByTestId('drawer-idle')).toHaveTextContent(diary.drawer.schedule(0));
  expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
});

test('an empty day can be named, so she can plan a week before adding outfits', async () => {
  const calls = mockFetch({
    'GET /plan': planWith(false),
    'PUT /plan/days/2026-10-01/name': { date: '2026-10-01', name: 'Gallery opening' },
  });
  await renderWithApi(<DayView date="2026-10-01" />);
  await fireEvent.press(await screen.findByRole('button', { name: plan.day.name }));
  await fireEvent.changeText(screen.getByLabelText(plan.day.name), 'Gallery opening');
  await fireEvent(screen.getByLabelText(plan.day.name), 'submitEditing');
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ name: 'Gallery opening' }),
  );
});

test('the switcher and + sit pinned under the header; the eyebrow names the window or month', async () => {
  mockFetch({ 'GET /plan': planWith(false) });
  await renderWithApi(<PlanView />);
  expect(await screen.findByText(plan.header.window(30))).toBeTruthy();
  expect(screen.getByRole('button', { name: plan.header.add })).toBeTruthy();
  // Today's row reads TODAY, never its weekday.
  expect(await screen.findByTestId('plan-day-2026-10-01')).toHaveTextContent(
    new RegExp(plan.today),
  );
  await fireEvent.press(screen.getByRole('radio', { name: plan.view.month }));
  expect(await screen.findByText('October 2026')).toBeTruthy();
  expect(screen.getByRole('button', { name: plan.prevMonth })).toBeTruthy();
});

test('a day she wore a look reads "· Worn" after the count (D2)', async () => {
  const p = planWith(true);
  (p.days[0]?.entries[0] as Record<string, unknown>).worn = true;
  mockFetch({ 'GET /plan': p });
  await renderWithApi(<PlanView />);
  expect(await screen.findByTestId('plan-day-2026-10-01')).toHaveTextContent(
    new RegExp(`1 look · 1 piece · ${plan.list.worn}`),
  );
  expect(screen.getByTestId('plan-day-2026-10-02')).not.toHaveTextContent(
    new RegExp(plan.list.worn),
  );
});

test('List | Month is kept: the Diary opens on the view she left it on (D4)', async () => {
  mockFetch({ 'GET /plan': planWith(false) });
  const first = await renderWithApi(<PlanView />);
  await fireEvent.press(await screen.findByRole('radio', { name: plan.view.month }));
  expect(await screen.findByTestId('plan-month')).toBeTruthy();
  first.unmount();

  await renderWithApi(<PlanView />);
  expect(await screen.findByTestId('plan-month')).toBeTruthy();
  expect(screen.queryByTestId('plan-list')).toBeNull();
  // The month's heads come from the one table, as beta's (D9).
  expect(screen.getByText('Wed', { includeHiddenElements: true })).toBeTruthy();
});
