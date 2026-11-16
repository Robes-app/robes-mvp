import { diary, plan, ui } from '@robes/copy';
import { monthLabel } from '@robes/core/calendar';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { localDate } from '../src/features/looks/saved-looks';
import { DayView } from '../src/features/plan/DayView';
import { PlanView } from '../src/features/plan/PlanView';
import { dayLabel } from '../src/features/plan/plan';
import { mockFetch, renderWithApi } from './support/api';
import { LOOK_ID, look, modelData } from './support/fixtures';
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

test('an empty plan is its days, with no box above them; every day is a row that opens its page', async () => {
  mockFetch({ 'GET /plan': planWith(false) });
  await renderWithApi(<PlanView />);
  // One row invites a name (the first empty day); the others show their date alone.
  expect(await screen.findAllByText(plan.list.nameTheDay)).toHaveLength(1);
  expect(screen.queryByText(/Nothing planned/)).toBeNull();
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

const DAY = '2026-10-01';
const dayEntry = (over: Record<string, unknown> = {}) => ({
  id: ENTRY_ID,
  date: DAY,
  slot: 'day',
  activity: 'Board meeting',
  worn: false,
  position: 0,
  look: look(),
  ...over,
});
// The day card's read (plan.day): Home's day for any date, her today and her home city.
const dayCard = (
  date: string,
  day: Record<string, unknown> = {},
  over: Record<string, unknown> = {},
) => ({
  today: DAY,
  home: 'Dublin',
  day: { date, name: null, place: null, weather: null, entries: [], draft: null, ...day },
  ...over,
});
const MODEL = modelData({
  stand: { imageUrl: 'https://media.test/catalog/avatar/w-r1@v1.png', generic: true, on: 'robes' },
});

test('the day page is the day as Home draws it: its name a field, its look with Swap · Edit', async () => {
  const calls = mockFetch({
    [`GET /plan/days/${DAY}`]: dayCard(DAY, { entries: [dayEntry()] }),
    'GET /me/model': MODEL,
    [`PUT /plan/days/${DAY}/name`]: { date: DAY, name: 'Dinner' },
    [`DELETE /plan/entries/${ENTRY_ID}`]: { ok: true },
    [`POST /plan/entries/${ENTRY_ID}/restore`]: { ok: true },
  });
  await renderWithApi(<DayView date={DAY} />);
  expect(await screen.findByTestId('ootd-card')).toBeTruthy();
  expect(screen.getByText('Thursday 1 October')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('ootd-card'));
  expect(mockRouter.push).toHaveBeenCalledWith(`/look/${LOOK_ID}?day=${DAY}`);
  expect(screen.getByRole('button', { name: diary.discs.swapLabel('Weekend navy') })).toBeTruthy();
  await fireEvent.press(screen.getByTestId('ootd-edit'));
  expect(mockRouter.push).toHaveBeenCalledWith(`/looks/draft/${LOOK_ID}?day=${DAY}`);

  // Her name for the day is the field itself: no pencil, no Save, no Cancel.
  const field = screen.getByLabelText(diary.day.name);
  expect(field.props.value).toBe('Board meeting');
  await fireEvent.changeText(field, 'Dinner');
  await fireEvent(field, 'submitEditing');
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ name: 'Dinner' }),
  );

  await fireEvent.press(
    screen.getByRole('button', { name: diary.slot.remove('Weekend navy', 'today') }),
  );
  expect(await screen.findByText(diary.slot.removed)).toBeTruthy();
  expect(calls.some((c) => c.method === 'DELETE')).toBe(true);
  await act(async () => {
    await fireEvent.press(screen.getAllByRole('button', { name: ui.undo }).at(-1) as never);
  });
  await waitFor(() => expect(calls.some((c) => c.path.endsWith('/restore'))).toBe(true));
});

test('the place chip reads the city and the day’s range; a place she picks is set on the day', async () => {
  const lisbon = { city: 'Lisbon', country: 'Portugal', lat: 38.72, lon: -9.14 };
  const calls = mockFetch({
    [`GET /plan/days/${DAY}`]: dayCard(DAY, {
      weather: { city: 'Dublin', tempRange: '11–15°C', condition: 'light rain', code: 3 },
    }),
    'GET /me/model': MODEL,
    'GET /places': {
      items: [{ ...lisbon, weather: { tempRange: '16–22°C', code: 0 } }],
    },
    [`PUT /plan/days/${DAY}/place`]: { date: DAY, place: lisbon },
  });
  await renderWithApi(<DayView date={DAY} />);
  const chip = await screen.findByTestId('day-place');
  expect(chip).toHaveTextContent(/Dublin/);
  expect(screen.getByTestId('day-weather')).toHaveTextContent('11–15°C');
  await fireEvent.press(chip);
  await fireEvent.changeText(await screen.findByTestId('place-search'), 'Lisbon');
  await fireEvent.press(await screen.findByTestId('place-row-Lisbon'));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ place: lisbon }),
  );
});

test('past the forecast the chip names the place alone', async () => {
  mockFetch({
    'GET /plan/days/2026-12-12': dayCard('2026-12-12'),
    'GET /me/model': MODEL,
  });
  await renderWithApi(<DayView date="2026-12-12" />);
  expect(await screen.findByTestId('day-place')).toHaveTextContent(/Dublin/);
  expect(screen.queryByTestId('day-weather')).toBeNull();
});

test('an empty day ahead offers Capture · Create · Pick', async () => {
  mockFetch({ 'GET /plan/days/2026-10-02': dayCard('2026-10-02'), 'GET /me/model': MODEL });
  await renderWithApi(<DayView date="2026-10-02" />);
  expect(await screen.findByTestId('disc-capture')).toBeTruthy();
  expect(screen.getByTestId('disc-pick')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('disc-create'));
  expect(mockRouter.push).toHaveBeenCalledWith('/looks/draft/new?day=2026-10-02');
});

test('a day gone by offers Capture · Pick, never Create', async () => {
  mockFetch({ 'GET /plan/days/2026-09-20': dayCard('2026-09-20'), 'GET /me/model': MODEL });
  await renderWithApi(<DayView date="2026-09-20" />);
  expect(await screen.findByTestId('disc-pick')).toBeTruthy();
  expect(screen.getByTestId('disc-capture')).toBeTruthy();
  expect(screen.queryByTestId('disc-create')).toBeNull();
});

test('× on a look she wore takes the wear back, never a pin', async () => {
  const calls = mockFetch({
    [`GET /plan/days/${DAY}`]: dayCard(DAY, { entries: [dayEntry({ worn: true })] }),
    'GET /me/model': MODEL,
    [`DELETE /looks/${LOOK_ID}/wears/${DAY}`]: { ok: true },
  });
  await renderWithApi(<DayView date={DAY} />);
  await fireEvent.press(
    await screen.findByRole('button', { name: diary.slot.remove('Weekend navy', 'today') }),
  );
  await waitFor(() =>
    expect(calls.some((c) => c.method === 'DELETE' && c.path.endsWith(`/wears/${DAY}`))).toBe(true),
  );
  expect(calls.some((c) => c.path.includes('/plan/entries/'))).toBe(false);
});

// The drawer reads the real clock (a day gone by files wears, a day ahead pins): today's page.
test('Pick opens the drawer, which schedules several looks at once', async () => {
  const today = localDate();
  const second = look({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Gallery night' });
  const third = look({ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', name: 'Errands' });
  const calls = mockFetch({
    [`GET /plan/days/${today}`]: dayCard(today, {}, { today }),
    'GET /me/model': MODEL,
    'GET /plan': { from: today, to: today, days: [{ date: today, name: null, entries: [] }] },
    'GET /looks': { items: [look(), second, third], nextCursor: null },
    [`POST /plan/looks/${LOOK_ID}/days`]: { entries: [] },
    [`POST /plan/looks/${second.id}/days`]: { entries: [] },
  });
  await renderWithApi(<DayView date={today} />);
  await fireEvent.press(await screen.findByTestId('disc-pick'));
  // Done waits faint until a pick (Front Door PRD rev 3 §4.5).
  expect(
    (await screen.findByRole('button', { name: diary.drawer.done })).props.accessibilityState,
  ).toEqual({ disabled: true });
  await fireEvent.press(await screen.findByRole('button', { name: 'Weekend navy' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Gallery night' }));
  expect(screen.getAllByText(diary.drawer.adding)).toHaveLength(2);
  // Done, Schedule 2 Looks its hint (audit P2: one sheet header).
  const done = screen.getByRole('button', { name: diary.drawer.done });
  expect(done.props.accessibilityHint).toBe(diary.drawer.schedule(2));
  await fireEvent.press(done);
  expect(await screen.findByText(diary.drawer.added(2, 'today'))).toBeTruthy();
  const pins = calls.filter((c) => c.method === 'POST' && c.path.endsWith('/days'));
  expect(pins.map((c) => c.body)).toEqual([{ dates: [today] }, { dates: [today] }]);
});

test('an empty day can be named, so she can plan a week before adding outfits', async () => {
  const calls = mockFetch({
    [`GET /plan/days/${DAY}`]: dayCard(DAY),
    'GET /me/model': MODEL,
    [`PUT /plan/days/${DAY}/name`]: { date: DAY, name: 'Gallery opening' },
  });
  await renderWithApi(<DayView date={DAY} />);
  const field = await screen.findByLabelText(diary.day.name);
  await fireEvent.changeText(field, 'Gallery opening');
  await fireEvent(field, 'submitEditing');
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ name: 'Gallery opening' }),
  );
});

test('the List · Month tabs and + sit pinned under the header; the eyebrow names the window or month', async () => {
  mockFetch({ 'GET /plan': planWith(false) });
  await renderWithApi(<PlanView />);
  expect(await screen.findByText(plan.header.window(30))).toBeTruthy();
  expect(screen.getByRole('button', { name: plan.header.add })).toBeTruthy();
  // Today's row reads TODAY, never its weekday.
  expect(await screen.findByTestId('plan-day-2026-10-01')).toHaveTextContent(
    new RegExp(plan.today),
  );
  await fireEvent.press(screen.getByRole('tab', { name: plan.view.month }));
  expect(await screen.findByText(monthLabel(localDate().slice(0, 7)))).toBeTruthy();
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
  await fireEvent.press(await screen.findByRole('tab', { name: plan.view.month }));
  expect(await screen.findByTestId('plan-month')).toBeTruthy();
  first.unmount();

  await renderWithApi(<PlanView />);
  expect(await screen.findByTestId('plan-month')).toBeTruthy();
  expect(screen.queryByTestId('plan-list')).toBeNull();
  // The month's heads come from the one table, as beta's (D9).
  expect(screen.getByText('Wed', { includeHiddenElements: true })).toBeTruthy();
});
