import { plan, trips } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { PlanView } from '../src/features/plan/PlanView';
import { TripStart } from '../src/features/trips/TripStart';
import { TripJobView, TripView } from '../src/features/trips/TripView';
import { mockFetch, renderWithApi } from './support/api';
import { JOB_ID, LOOK_ID, look, piece } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => jest.clearAllMocks());

const TRIP_ID = '88888888-8888-4888-8888-888888888888';
const trip = (over: object = {}) => ({
  id: TRIP_ID,
  destination: 'Lisbon',
  dateFrom: '2026-10-02',
  dateTo: '2026-10-04',
  dateLine: '2 Oct – 4 Oct',
  tripDays: 3,
  tripLabel: 'LISBON · OCTOBER',
  headline: 'Three days in Lisbon, packed once.',
  locationVibe: 'Coastal',
  stylistSummary: 'Warm days, cool evenings.',
  suitcaseNote: 'Roll the knits.',
  palette: [],
  weather: {
    city: 'Lisbon',
    country: 'Portugal',
    tempRange: '15–27°C',
    condition: 'clear',
    seasonal: false,
  },
  capsule: [
    {
      name: 'Linen shirt',
      tier: 'Foundations & Tailoring',
      category: 'Tops',
      brand: '',
      description: '',
      reason: 'Four wears.',
      bridge: '',
      piece: piece(),
      retailerHint: '',
      pricePoint: '',
    },
    {
      name: 'Silk slip dress',
      tier: 'Statement & Texture',
      category: 'Dresses',
      brand: 'COS',
      description: '',
      reason: '',
      bridge: 'Unlocks 3 looks.',
      piece: null,
      retailerHint: 'COS',
      pricePoint: '€89',
    },
  ],
  looks: [
    {
      date: '2026-10-02',
      occasion: 'Beach day',
      title: 'Golden Hour',
      how: 'Linen over silk.',
      items: [{ role: 'The Anchor', note: 'Worn open.', capsuleIndex: 1 }],
    },
  ],
  pinnedLookIds: null,
  createdAt: '2026-09-24T10:00:00.000Z',
  ...over,
});

test('plans a trip with her plans and key pieces, then follows the job', async () => {
  const calls = mockFetch({
    'GET /wardrobe/items': { items: [piece()], nextCursor: null },
    'POST /travel/plan': { jobId: JOB_ID, status: 'queued' },
  });
  await renderWithApi(<TripStart />);
  await fireEvent.changeText(screen.getByLabelText(trips.create.destinationLabel), 'Lisbon');
  await fireEvent.changeText(screen.getByLabelText(trips.create.fromLabel), '2026-10-02');
  await fireEvent.changeText(screen.getByLabelText(trips.create.toLabel), '2026-10-04');
  await fireEvent.changeText(
    screen.getByLabelText(trips.create.occasionsLabel),
    'Beach day\nDinner',
  );
  await fireEvent.press(await screen.findByRole('button', { name: piece().label }));
  await fireEvent.press(screen.getByRole('button', { name: trips.create.submit }));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(`/trip/job/${JOB_ID}`));
  expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
    destination: 'Lisbon',
    dateFrom: '2026-10-02',
    dateTo: '2026-10-04',
    occasions: ['Beach day', 'Dinner'],
    anchorPieceIds: [piece().id],
  });
});

test('refuses a trip longer than ten days before sending it', async () => {
  mockFetch({ 'GET /wardrobe/items': { items: [], nextCursor: null } });
  await renderWithApi(<TripStart />);
  await fireEvent.changeText(screen.getByLabelText(trips.create.destinationLabel), 'Lisbon');
  await fireEvent.changeText(screen.getByLabelText(trips.create.fromLabel), '2026-10-01');
  await fireEvent.changeText(screen.getByLabelText(trips.create.toLabel), '2026-10-20');
  expect(await screen.findByText(trips.create.tooLong)).toBeTruthy();
});

test('shows the trip and pins its looks to the plan once', async () => {
  const calls = mockFetch({
    [`GET /trips/${TRIP_ID}`]: trip(),
    [`POST /trips/${TRIP_ID}/pin`]: { lookIds: [LOOK_ID] },
  });
  await renderWithApi(<TripView id={TRIP_ID} />);
  expect(await screen.findByText('Three days in Lisbon, packed once.')).toBeTruthy();
  expect(screen.getByText('Golden Hour · Beach day')).toBeTruthy();
  expect(screen.getByText('The Anchor: Silk slip dress')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: trips.page.pin }));
  await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
  expect(await screen.findByRole('button', { name: trips.page.pinned })).toBeTruthy();
});

test('the job screen hands over to the trip once it exists', async () => {
  mockFetch({
    [`GET /jobs/${JOB_ID}`]: {
      id: JOB_ID,
      kind: 'travel',
      status: 'succeeded',
      stage: 'done',
      output: { tripId: TRIP_ID },
      error: null,
      cancelRequested: false,
      createdAt: '2026-09-24T10:00:00.000Z',
      updatedAt: '2026-09-24T10:00:00.000Z',
      finishedAt: '2026-09-24T10:00:00.000Z',
    },
    [`GET /trips/${TRIP_ID}`]: trip(),
  });
  await renderWithApi(<TripJobView jobId={JOB_ID} />);
  expect(await screen.findByText('Three days in Lisbon, packed once.')).toBeTruthy();
});

test('the plan switches to a month and a day opens its look', async () => {
  const days = (from: string, n: number, entryOn?: string) =>
    Array.from({ length: n }, (_, i) => {
      const d = new Date(`${from}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + i);
      const date = d.toISOString().slice(0, 10);
      return {
        date,
        entries:
          date === entryOn
            ? [
                {
                  id: 'e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1',
                  date,
                  slot: 'day',
                  activity: null,
                  look: look({ source: 'travel' }),
                },
              ]
            : [],
      };
    });
  mockFetch({
    'GET /plan': (_init: RequestInit, url: string) => {
      const u = new URL(url);
      const from = u.searchParams.get('from') ?? '2026-10-01';
      const n = Number(u.searchParams.get('days') ?? 30);
      // The list is virtualised: its look sits on the first day; the month's on the 15th.
      const onDay = u.searchParams.get('from') ? `${from.slice(0, 7)}-15` : from;
      return { from, to: from, days: days(from, n, onDay) };
    },
  });
  await renderWithApi(<PlanView />);
  expect(await screen.findByText(plan.tripBadge)).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: plan.view.month }));
  const month = await screen.findByTestId('plan-month');
  expect(month).toBeTruthy();
  const day = await screen.findByRole('link', { name: new RegExp(`-15: ${look().name}`) });
  await fireEvent.press(day);
  expect(mockRouter.push).toHaveBeenCalledWith(`/look/${LOOK_ID}`);
});
