import { today, you } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { DailyJobView, DailyLookView } from '../src/features/today/DailyLookView';
import { DailyStart } from '../src/features/today/DailyStart';
import { anchorPending, weatherLine } from '../src/features/today/daily';
import { Account } from '../src/features/you/Account';
import { ME, mockFetch, renderWithApi } from './support/api';
import { JOB_ID, LOOK_ID, look, piece } from './support/fixtures';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => jest.clearAllMocks());

const DAILY_ID = '77777777-7777-4777-8777-777777777777';
const item = (over: object = {}) => ({
  name: 'Wide-leg trousers',
  category: 'Bottoms',
  brand: 'COS',
  how: 'Half-tucked',
  piece: null,
  retailerHint: 'cos.com',
  pricePoint: '€89',
  alternates: [{ name: 'Pleated trousers', brand: 'Arket', retailerHint: '', pricePoint: '€79' }],
  image: null,
  ...over,
});
const dailyLook = (over: object = {}) => ({
  id: DAILY_ID,
  jobId: JOB_ID,
  fallback: false,
  occasionLabel: 'Studio day',
  headline: 'Soft tailoring for the studio',
  stylistSummary: 'Easy layers that go on to dinner.',
  transitionTip: 'Swap the knit for silk.',
  palette: [],
  lookTags: { climate: 'year_round', wearFor: [], vibe: [] },
  weather: { city: 'Dublin', tempRange: '9–14°C', condition: 'Light rain' },
  steps: [
    { title: 'The Anchor', items: [item({ piece: piece(), name: 'Camel coat' })] },
    { title: 'The Canvas', items: [item()] },
    { title: 'The Texture', items: [item({ name: 'Cream knit' })] },
    { title: 'The Accents', items: [item({ name: 'Loafers' })] },
  ],
  savedAt: null,
  expiresAt: '2026-10-24T10:00:00.000Z',
  createdAt: new Date().toISOString(),
  ...over,
});

test('weather line and the anchor wait', () => {
  expect(weatherLine({ city: 'Dublin', tempRange: null, condition: 'Sunny' })).toBe(
    'Dublin · Sunny',
  );
  expect(weatherLine(null)).toBeNull();
  expect(anchorPending(dailyLook() as never)).toBe(true);
  const old = dailyLook({ createdAt: new Date(Date.now() - 600_000).toISOString() });
  expect(anchorPending(old as never)).toBe(false);
});

test('the brief starts the job and opens its progress', async () => {
  const calls = mockFetch({ 'POST /today/generate': { jobId: JOB_ID, status: 'queued' } });
  await renderWithApi(<DailyStart />);
  await fireEvent.changeText(screen.getByLabelText(today.daily.promptLabel), 'Studio day');
  await fireEvent.press(screen.getByRole('button', { name: today.daily.start }));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(`/today/job/${JOB_ID}`));
  expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ prompt: 'Studio day' });
});

test('the job view opens the draft look once it exists, with four steps and her piece', async () => {
  mockFetch({
    [`GET /jobs/${JOB_ID}`]: {
      id: JOB_ID,
      kind: 'daily',
      status: 'running',
      stage: 'text',
      output: { dailyLookId: DAILY_ID },
      error: null,
      cancelRequested: false,
      createdAt: '2026-10-01T08:00:00.000Z',
      updatedAt: '2026-10-01T08:00:01.000Z',
      finishedAt: null,
    },
    [`GET /today/looks/${DAILY_ID}`]: dailyLook(),
  });
  await renderWithApi(<DailyJobView jobId={JOB_ID} />);
  expect(await screen.findByText('Soft tailoring for the studio')).toBeTruthy();
  expect(screen.getByText('Dublin · 9–14°C · Light rain')).toBeTruthy();
  for (const step of Object.values(today.daily.steps)) expect(screen.getByText(step)).toBeTruthy();
  expect(screen.getByText(`Camel wool coat · ${today.daily.yours}`)).toBeTruthy();
  expect(screen.getAllByText('COS · €89')).toHaveLength(3);
});

test('naming it saves a Look and opens it', async () => {
  const calls = mockFetch({
    [`GET /today/looks/${DAILY_ID}`]: dailyLook(),
    [`POST /today/looks/${DAILY_ID}/save`]: look({ name: 'Studio to dinner' }),
  });
  await renderWithApi(<DailyLookView id={DAILY_ID} />);
  const name = await screen.findByLabelText(today.daily.nameLabel);
  await fireEvent.changeText(name, 'Studio to dinner');
  await fireEvent.press(screen.getByRole('button', { name: today.daily.save }));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(`/look/${LOOK_ID}`));
  expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ name: 'Studio to dinner' });
});

test('home city saves with the account', async () => {
  const calls = mockFetch({
    'GET /me': { ...ME, firstName: 'Niall' },
    'PATCH /me': { ...ME, firstName: 'Niall', homeCity: 'Dublin' },
  });
  await renderWithApi(<Account />);
  await fireEvent.changeText(await screen.findByLabelText(you.account.homeCity), 'Dublin');
  await fireEvent.press(screen.getByRole('button', { name: you.account.save }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'PATCH')?.body).toMatchObject({ homeCity: 'Dublin' }),
  );
});
