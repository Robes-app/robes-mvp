import type { Today } from '@robes/contracts';
import { home as copy, lookbook, today as todayCopy, twin } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { HomeView } from '../src/features/home/HomeView';
import { dayLabel } from '../src/features/plan/plan';
import { nativeAnalytics } from '../src/lib/analytics';
import { mockFetch, renderWithApi } from './support/api';
import { JOB_ID, LOOK_ID, look, NOTICE_ID, PIECE_ID, piece } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => jest.clearAllMocks());
// Call sites report through the consent-gated client (observability.test.ts proves the gate).
const track = jest.spyOn(nativeAnalytics, 'track');

const DATE = '2026-10-01';
const DECK = { pathname: '/looks/job/[jobId]', params: { jobId: JOB_ID, from: 'home' } };
const week = Array.from({ length: 7 }, (_, i) => ({
  date: `2026-10-0${i + 1}`,
  looks: i === 0 ? 1 : 0,
  first: i === 0 ? { id: LOOK_ID, name: 'Board meeting', image: null, worn: false } : null,
}));
const homeOf = (over: Partial<Today['home']> = {}): Today['home'] => ({
  state: { styleConfirmed: false, twinOnFile: false, pics: 0, ownLookSaved: false, snoozed: {} },
  rows: { brands: [], icons: [], styles: [] },
  recent: [],
  candidates: [],
  receipts: null,
  noticed: null,
  saved: [],
  suggested: [],
  ...over,
});
const todayWith = (home: Partial<Today['home']> = {}, over: Partial<Today> = {}): Today => ({
  date: DATE,
  hour: 8,
  firstName: 'Niall',
  nextStep: null,
  today: [],
  week,
  tray: [],
  ideas: [],
  inboxCount: 0,
  overnight: null,
  home: homeOf(home),
  ...over,
});
const activated = {
  state: { styleConfirmed: true, twinOnFile: true, pics: 6, ownLookSaved: true, snoozed: {} },
};

test('stage 1: the greeting, the question, the one-door Style DNA card and the map', async () => {
  const calls = mockFetch({
    'GET /today': todayWith(),
    'GET /today/weather': { city: 'Dublin', tempRange: '9–14°C', condition: 'light rain' },
    'POST /me/home/later': { snoozed: { O1: '2026-10-01T09:00:00.000Z' } },
  });
  await renderWithApi(<HomeView />);
  expect(await screen.findByText('Good morning, Niall.')).toBeTruthy();
  expect(screen.getByText(copy.echo)).toBeTruthy();
  // The meta line under the greeting: the weekday, the city and, from a server without the live
  // reading, the day's range (beta's H0) — and no conditions icon.
  expect(await screen.findByText('Thursday · Dublin · 9–14°C')).toBeTruthy();
  expect(screen.getByLabelText('Thursday · Dublin · 9–14°C')).toBeTruthy();
  expect(screen.queryByText('Dublin · 9–14°C · light rain')).toBeNull();
  expect(screen.getByText(copy.o1.eyebrow)).toBeTruthy();
  expect(screen.getByLabelText(lookbook.prompt.doorNew)).toBeTruthy();
  expect(screen.getByLabelText(`${copy.map.steps.O3}, ${copy.map.line.O3(0)}`)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: copy.o1.one }));
  expect(mockRouter.push).toHaveBeenCalledWith('/you/style');
  await fireEvent.press(screen.getByRole('button', { name: copy.later }));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/me/home/later'))?.body).toEqual({ step: 'O1' }),
  );
});

test('the meta line is live: the conditions now lead it, then the temperature now', async () => {
  mockFetch({
    'GET /today': todayWith(activated),
    'GET /today/weather': {
      city: 'Dublin',
      tempRange: '11–15°C',
      condition: 'clear',
      nowC: 13,
      code: 3,
    },
  });
  await renderWithApi(<HomeView />);
  expect(await screen.findByText('Thursday · Dublin · 13°C')).toBeTruthy();
  expect(screen.queryByText('Thursday · Dublin · 11–15°C')).toBeNull();
  expect(screen.getByLabelText('overcast · Thursday · Dublin · 13°C')).toBeTruthy();
  // Today's week card reads the same live reading.
  expect(screen.getByText('Dublin · 13°C · overcast')).toBeTruthy();
});

test('an open map row expands its step; a done one opens its page', async () => {
  mockFetch({
    'GET /today': todayWith({
      state: { styleConfirmed: true, twinOnFile: false, pics: 2, ownLookSaved: false, snoozed: {} },
      candidates: [{ id: PIECE_ID, label: 'Camel wool coat', brand: null, image: piece().image }],
    }),
    'GET /today/weather': null,
  });
  await renderWithApi(<HomeView />);
  expect(await screen.findByText(copy.o2.eyebrow)).toBeTruthy();
  await fireEvent.press(screen.getByTestId('home-map-O4'));
  expect(await screen.findByText(copy.o4.eyebrow)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: copy.o4.cta }));
  expect(mockRouter.push).toHaveBeenCalledWith({
    pathname: '/looks/new',
    params: { pieceId: PIECE_ID },
  });
  await fireEvent.press(screen.getByTestId('home-map-O1'));
  expect(mockRouter.push).toHaveBeenCalledWith('/you/style');
  expect(track.mock.calls).toEqual([
    ['home_module_view', { id: 'O2' }],
    ['home_row_tapped', { step: 'O4', done: false }],
    ['home_module_view', { id: 'O4' }],
    ['first_look_started', { piece_id: PIECE_ID }],
    ['home_row_tapped', { step: 'O1', done: true }],
  ]);
});

test('activated: the strip selects a day; Dress {weekday} puts the box on the date → the deck', async () => {
  const calls = mockFetch({
    'GET /today': todayWith(activated),
    'GET /today/weather': null,
    'GET /me/features': { trips: false },
    'POST /looks/prompt': { jobId: JOB_ID, status: 'queued' },
  });
  await renderWithApi(<HomeView />);
  expect(await screen.findByLabelText(lookbook.prompt.doorNew)).toBeTruthy();
  expect(screen.getByRole('link', { name: copy.week.open('Board meeting') })).toBeTruthy();
  await fireEvent.press(screen.getByTestId('week-day-2026-10-03'));
  const dress = await screen.findByRole('button', { name: copy.week.dress('Saturday') });
  await fireEvent.press(dress);
  const box = await screen.findByLabelText(copy.doorDay(dayLabel('2026-10-03')));
  await fireEvent.changeText(box, 'Dinner with friends');
  await fireEvent(box, 'submitEditing');
  // She has filed pieces: the box asks once where the look's pieces come from.
  expect(await screen.findByText(lookbook.prompt.balance.question)).toBeTruthy();
  expect(calls.some((c) => c.path.endsWith('/looks/prompt'))).toBe(false);
  await fireEvent.press(screen.getByRole('button', { name: lookbook.prompt.balance.mix }));
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith(DECK));
  expect(calls.find((c) => c.path.endsWith('/looks/prompt'))?.body).toEqual({
    prompt: 'Dinner with friends',
    date: '2026-10-03',
    balance: 'mix',
  });
});

test('a day gone by with nothing on it says so; it is never dressed', async () => {
  mockFetch({
    'GET /today': todayWith(activated, { date: '2026-10-03' }),
    'GET /today/weather': null,
  });
  await renderWithApi(<HomeView />);
  await fireEvent.press(await screen.findByTestId('week-day-2026-10-02'));
  expect(await screen.findByText(copy.week.nothing)).toBeTruthy();
  expect(screen.queryByRole('button', { name: copy.week.dress('Friday') })).toBeNull();
  // A day ahead still dresses.
  await fireEvent.press(screen.getByTestId('week-day-2026-10-04'));
  expect(await screen.findByRole('button', { name: copy.week.dress('Sunday') })).toBeTruthy();
});

test('the studio tray lists running and finished jobs, each opening where it lands', async () => {
  type Job = Today['tray'][number];
  const snap = (over: Partial<Job> & Pick<Job, 'id'>): Job => ({
    kind: 'key_piece',
    status: 'running',
    stage: 'text',
    output: {},
    error: null,
    cancelRequested: false,
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-01T09:00:00.000Z',
    finishedAt: null,
    ...over,
  });
  const DAILY = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  mockFetch({
    'GET /today': todayWith(activated, {
      tray: [
        snap({ id: JOB_ID }),
        snap({
          id: '99999999-9999-4999-8999-999999999999',
          kind: 'daily',
          status: 'succeeded',
          stage: 'done',
          output: { dailyLookId: DAILY },
        }),
      ],
    }),
    'GET /today/weather': null,
  });
  await renderWithApi(<HomeView />);
  expect(await screen.findByText(todayCopy.tray.title)).toBeTruthy();
  await fireEvent.press(
    screen.getByRole('link', {
      name: `${todayCopy.tray.stylePiece} · ${todayCopy.tray.running}`,
    }),
  );
  expect(mockRouter.push).toHaveBeenCalledWith(`/looks/job/${JOB_ID}`);
  await fireEvent.press(
    screen.getByRole('link', { name: `${todayCopy.daily.trayTitle} · ${todayCopy.tray.ready}` }),
  );
  expect(mockRouter.push).toHaveBeenCalledWith(`/today/look/${DAILY}`);
});

test('today’s card carries the forecast; the overnight look is that card, never a second row', async () => {
  mockFetch({
    'GET /today': todayWith(activated, {
      week: week.map((d) => ({ ...d, looks: 0, first: null })),
      overnight: { id: LOOK_ID, title: 'Daily look', headline: 'Rain-ready tailoring' },
    }),
    'GET /today/weather': { city: 'Dublin', tempRange: '9–14°C', condition: 'light rain' },
  });
  await renderWithApi(<HomeView />);
  const card = await screen.findByRole('link', { name: copy.week.open('Rain-ready tailoring') });
  expect(await screen.findByText('Dublin · 9–14°C · light rain')).toBeTruthy();
  expect(screen.queryByText(todayCopy.overnight.title)).toBeNull();
  await fireEvent.press(card);
  expect(mockRouter.push).toHaveBeenCalledWith(`/today/look/${LOOK_ID}`);
});

test('before the week shows, the overnight look keeps its own row (it has nowhere else to go)', async () => {
  mockFetch({
    'GET /today': todayWith(
      {},
      { overnight: { id: LOOK_ID, title: 'Daily look', headline: 'Rain-ready tailoring' } },
    ),
    'GET /today/weather': null,
  });
  await renderWithApi(<HomeView />);
  expect(await screen.findByText(todayCopy.overnight.title)).toBeTruthy();
  expect(screen.getByText('Rain-ready tailoring')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: `${todayCopy.overnight.open} ›` }));
  expect(mockRouter.push).toHaveBeenCalledWith(`/today/look/${LOOK_ID}`);
});

test('after 19:00 today’s planned look asks Wore it?', async () => {
  const calls = mockFetch({
    'GET /today': todayWith(activated, { hour: 20 }),
    'GET /today/weather': null,
    [`POST /looks/${LOOK_ID}/wears`]: { id: JOB_ID, lookId: LOOK_ID, wornOn: DATE },
  });
  await renderWithApi(<HomeView />);
  await fireEvent.press(await screen.findByRole('button', { name: copy.week.woreIt }));
  await waitFor(() =>
    expect(calls.find((c) => c.path.endsWith('/wears'))?.body).toEqual({ wornOn: DATE }),
  );
});

test('H1 carries the receipts and Robes noticed; H4 Saved then Suggested open their looks', async () => {
  const calls = mockFetch({
    'GET /today': todayWith({
      receipts: { receipts: 1, pieces: 10, retailer: 'Zara' },
      noticed: { id: NOTICE_ID, text: 'You reach for soft tailoring in muted neutrals most weeks' },
      suggested: [look({ status: 'suggested', name: 'Garden party' })],
    }),
    'GET /today/weather': null,
    [`POST /me/dna/observations/${NOTICE_ID}/keep`]: { ok: true },
  });
  await renderWithApi(<HomeView />);
  expect(await screen.findByText(copy.alerts.receiptFrom('Zara', 1))).toBeTruthy();
  expect(screen.getByText('You reach for soft tailoring in muted…')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: copy.alerts.review }));
  expect(mockRouter.push).toHaveBeenCalledWith('/wardrobe/inbox');
  // An observation answers with the thumbs, as on beta and in Settings.
  await fireEvent.press(
    screen.getByRole('button', {
      name: twin.observations.answer(
        twin.observations.keep,
        'You reach for soft tailoring in muted neutrals most weeks',
      ),
    }),
  );
  await waitFor(() =>
    expect(calls.some((c) => c.path.endsWith(`/observations/${NOTICE_ID}/keep`))).toBe(true),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Garden party' }));
  expect(mockRouter.push).toHaveBeenCalledWith(`/look/${LOOK_ID}`);
  expect(screen.getByText(todayCopy.greeting('Niall', 8))).toBeTruthy();
});

test('a trip-shaped ask while trips are hidden lands on the deck undated', async () => {
  const calls = mockFetch({
    'GET /today': todayWith(),
    'GET /today/weather': null,
    'GET /me/features': { trips: false },
    'POST /looks/prompt': { jobId: JOB_ID, status: 'queued' },
  });
  await renderWithApi(<HomeView />);
  const box = await screen.findByLabelText(lookbook.prompt.doorNew);
  await fireEvent.changeText(box, 'Four days in Lisbon from tomorrow');
  await fireEvent(box, 'submitEditing');
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith(DECK));
  expect(calls.find((c) => c.path.endsWith('/looks/prompt'))?.body).toEqual({
    prompt: 'Four days in Lisbon from tomorrow',
  });
});

test('with trips on, a trip-shaped ask opens a trip', async () => {
  mockFetch({
    'GET /today': todayWith(),
    'GET /today/weather': null,
    'GET /me/features': { trips: true },
  });
  await renderWithApi(<HomeView />);
  await waitFor(() => expect(screen.getByLabelText(lookbook.prompt.doorNew)).toBeTruthy());
  const box = screen.getByLabelText(lookbook.prompt.doorNew);
  await waitFor(async () => {
    await fireEvent.changeText(box, 'A weekend away in Kinsale');
    await fireEvent(box, 'submitEditing');
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/trip/new',
      params: { brief: 'A weekend away in Kinsale' },
    });
  });
});
