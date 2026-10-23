import type { Today } from '@robes/contracts';
import { home as copy, lookbook, today as todayCopy } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { HomeView } from '../src/features/home/HomeView';
import { dayLabel } from '../src/features/plan/plan';
import { mockFetch, renderWithApi } from './support/api';
import { JOB_ID, LOOK_ID, look, NOTICE_ID, PIECE_ID, piece } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => jest.clearAllMocks());

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
  expect(await screen.findByText('Dublin · 9–14°C · light rain')).toBeTruthy();
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
  expect(mockRouter.push).toHaveBeenCalledWith({
    pathname: '/wardrobe',
    params: { segment: 'inbox' },
  });
  await fireEvent.press(screen.getByRole('button', { name: copy.alerts.keep }));
  await waitFor(() =>
    expect(calls.some((c) => c.path.endsWith(`/observations/${NOTICE_ID}/keep`))).toBe(true),
  );
  await fireEvent.press(screen.getByRole('link', { name: 'Garden party' }));
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
