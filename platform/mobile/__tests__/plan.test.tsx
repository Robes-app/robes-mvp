import { looks, plan, ui, wardrobe } from '@robes/copy';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { localDate } from '../src/features/looks/saved-looks';
import { DayView } from '../src/features/plan/DayView';
import { PlanView } from '../src/features/plan/PlanView';
import { dayLabel } from '../src/features/plan/plan';
import { mockFetch, renderWithApi } from './support/api';
import { ASSET_ID, LOOK_ID, look, piece } from './support/fixtures';
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

test('today’s page reads the weather now: the temperature now, the conditions now', async () => {
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
  expect(await screen.findByText('Dublin · overcast · 13°C')).toBeTruthy();
  // The advice still reads the whole day.
  expect(screen.getByText(plan.day.advice('light rain', '11–15°C'))).toBeTruthy();
  expect(calls.find((c) => c.path.endsWith('/today/weather'))?.url).toContain(`date=${today}`);
});

test('a day ahead reads that day’s range and conditions', async () => {
  mockFetch({
    'GET /plan': dayOnly('2099-01-01'),
    'GET /today/weather': {
      city: 'Dublin',
      tempRange: '4–9°C',
      condition: 'snow',
      nowC: null,
      code: 73,
    },
  });
  await renderWithApi(<DayView date="2099-01-01" />);
  expect(await screen.findByText('Dublin · snow · 4–9°C')).toBeTruthy();
  expect(screen.getByText(plan.day.advice('snow', '4–9°C'))).toBeTruthy();
});

test('the camera on a day’s look adds her photograph to the look, and the day re-reads', async () => {
  const photo = piece().image;
  if (!photo) throw new Error('fixture piece has an image');
  const calls = mockFetch({
    'GET /plan': planWith(true),
    [`POST /looks/${LOOK_ID}/photo`]: look({ photo, image: photo, record: 'photo' }),
    'GET /looks': { items: [], nextCursor: null },
  });
  await renderWithApi(<DayView date="2026-10-01" />);
  await fireEvent.press(await screen.findByRole('button', { name: looks.page.addPhoto }));
  await fireEvent.press(await screen.findByRole('button', { name: wardrobe.add.doors.cameraRoll }));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/photo'))?.body).toEqual({ assetId: ASSET_ID }),
  );
  await waitFor(() =>
    expect(calls.filter((c) => c.method === 'GET' && c.path.endsWith('/plan'))).toHaveLength(2),
  );
});

test('a look she wore on the day carries Worn ✓; the day never borrows the look’s name', async () => {
  const p = planWith(true);
  const entry = p.days[0]?.entries[0] as Record<string, unknown>;
  entry.activity = null;
  entry.worn = true;
  mockFetch({ 'GET /plan': p });
  await renderWithApi(<DayView date="2026-10-01" />);
  expect(await screen.findByText(plan.day.worn)).toBeTruthy();
  // One look on an unnamed day: the title still invites her to name it.
  expect(screen.getByRole('header').props.children).toBe(plan.day.name);
  expect(screen.getByRole('button', { name: plan.day.addAnother })).toBeTruthy();
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
