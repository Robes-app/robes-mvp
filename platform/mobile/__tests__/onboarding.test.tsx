import { queryKeys } from '@robes/api-client/react';
import type { Consents, Me } from '@robes/contracts';
import { firstRun as copy, onboarding } from '@robes/copy';
import { dayMonth, weekdayShort } from '@robes/core/calendar';
import { SEED_WEARERS, STYLE_TYPES } from '@robes/core/style-dna';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import Onboarding from '../src/app/onboarding/index';
import { localDate } from '../src/features/looks/saved-looks';
import { archetypeImages } from '../src/features/onboarding/archetype-images';
import { nativeAnalytics } from '../src/lib/analytics';
import { errorReply, ME, mockFetch, type Routes, renderWithApi } from './support/api';
import { modelData, styleDna } from './support/fixtures';
import { mockParams, mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  for (const k of Object.keys(mockParams)) delete mockParams[k];
});
// Call sites report through the consent-gated client (observability.test.ts proves the gate).
const track = jest.spyOn(nativeAnalytics, 'track');
const title = (t: string, em: string) => screen.getByText(`${t} ${em}`, { exact: false });
const next = () => screen.getByRole('button', { name: copy.continue });
const skip = () => screen.getByTestId('onboarding-skip');
const NEW: Me = {
  ...ME,
  firstName: null,
  onboarded: false,
  firstRun: { version: null, step: null, skipped: [] },
};
const CONSENTS: Consents = {
  analytics: null,
  replay: null,
  marketing_email: null,
  photo_analysis: null,
  look_sharing: null,
  recordings: null,
};
// What the capture steps read; each test adds its /me.
const STEPS: Routes = {
  'PATCH /me': ME,
  'PATCH /me/onboarding': { ok: true },
  'GET /me/model': modelData(),
  'GET /me/consents': CONSENTS,
};
const saves = (calls: { method: string; path: string; body: unknown }[]) =>
  calls.filter((c) => c.method === 'PATCH' && c.path.endsWith('/me/onboarding')).map((c) => c.body);

// Getting to know you, eight steps (onboarding PRD, 17 Nov).
test('seven steps: answers saved on Brands without onboarding her, each capture skippable, onboarded on the way Home', async () => {
  let finished = false;
  const calls = mockFetch({
    ...STEPS,
    'GET /me': () =>
      finished
        ? { ...NEW, onboarded: true, firstRun: { version: 2, step: null, skipped: [] } }
        : NEW,
    'POST /me/onboarding/complete': () => {
      finished = true;
      return { onboardedAt: new Date().toISOString() };
    },
  });
  const { queryClient } = await renderWithApi(<Onboarding />);
  await fireEvent.press(screen.getByTestId('splash'));
  expect(screen.getByText(copy.eyebrow)).toBeTruthy();
  // Eight hairline segments, no number on screen (R-S1).
  expect(screen.getByLabelText(copy.progress(1, 7))).toBeTruthy();
  expect(screen.queryByRole('button', { name: copy.backLabel })).toBeNull();
  await fireEvent.changeText(screen.getByLabelText(copy.name.label), 'Niall Maher');
  await fireEvent.press(next());
  await waitFor(() => expect(title(copy.identity.title, copy.identity.titleEm)).toBeTruthy());
  expect(calls.find((c) => c.method === 'PATCH' && c.path.endsWith('/me'))?.body).toEqual({
    firstName: 'Niall',
  });

  // Identity is required.
  expect(next().props.accessibilityState?.disabled).toBe(true);
  await fireEvent.press(screen.getByRole('radio', { name: 'Man' }));
  await fireEvent.press(next());
  expect(screen.getAllByRole('button', { name: /^Love / })).toHaveLength(8);
  await fireEvent.press(screen.getByRole('button', { name: 'Love Utility' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Love Heritage' }));
  // Back keeps her answers.
  await fireEvent.press(screen.getByRole('button', { name: copy.backLabel }));
  expect(screen.getByRole('radio', { name: 'Man' }).props.accessibilityState).toMatchObject({
    checked: true,
  });
  await fireEvent.press(next());
  await fireEvent.press(next());

  // Brands as live: a man's Utility houses lead. Continue saves 01–04 and does not finish.
  expect(title(copy.brands.title, copy.brands.titleEm)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Stone Island' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Barbour' }));
  await act(async () => {
    await fireEvent.press(next());
  });
  await waitFor(() => expect(title(copy.looks.title, copy.looks.titleEm)).toBeTruthy());
  expect(saves(calls)).toContainEqual({
    identity: 'man',
    styles: ['Utility', 'Heritage'],
    brands: ['Barbour'],
    step: 'looks',
  });
  expect(calls.some((c) => c.path.endsWith('/me/onboarding/complete'))).toBe(false);
  expect(screen.getByLabelText(copy.progress(5, 7))).toBeTruthy();

  // Each capture step skips on to the next.
  await fireEvent.press(skip());
  await waitFor(() => expect(title(copy.pieces.title, copy.pieces.titleEm)).toBeTruthy());
  // Pieces goes straight on to Today's outfit: no digital twin (Annie, 18 Nov).
  await fireEvent.press(skip());
  await waitFor(() => expect(title(copy.outfit.title, copy.outfit.titleEm)).toBeTruthy());
  const today = localDate();
  expect(screen.getByLabelText(copy.progress(7, 7))).toBeTruthy();
  expect(
    screen.getByText(copy.outfit.today(`${weekdayShort(today)} ${dayMonth(today)}`)),
  ).toBeTruthy();
  await act(async () => {
    await fireEvent.press(skip());
  });

  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
  expect(calls.find((c) => c.path.endsWith('/me/onboarding/complete'))?.body).toEqual({
    firstRun: 2,
  });
  expect(saves(calls).at(-1)).toEqual({
    step: 'outfit',
    skipped: ['looks', 'pieces'],
  });
  const me = queryClient.getQueryData<Me>(queryKeys.call('me.get'));
  expect(me?.onboarded).toBe(true);
  expect(me?.firstRun.version).toBe(2);
  expect(track).toHaveBeenCalledWith('onboarding_step', { step: 'pieces', outcome: 'skipped' });
  expect(track).toHaveBeenCalledWith('onboarding_step', { step: 'outfit', outcome: 'skipped' });
  expect(track).toHaveBeenCalledWith('onboarding_answered', { styles: 2, brands: 1, colours: 0 });
}, 30_000);

test('a failed save on Brands stays and says so', async () => {
  let tries = 0;
  mockFetch({
    ...STEPS,
    'GET /me': { ...NEW, firstName: 'Niall' },
    'PATCH /me/onboarding': (init: RequestInit) =>
      'brands' in JSON.parse(String(init.body)) && ++tries === 1
        ? errorReply(500, 'internal')
        : { ok: true },
  });
  await renderWithApi(<Onboarding />);
  await fireEvent.press(screen.getByTestId('splash'));
  // Her saved name is offered.
  await waitFor(() => expect(screen.getByDisplayValue('Niall')).toBeTruthy());
  await fireEvent.press(next());
  await waitFor(() =>
    expect(screen.getByRole('radio', { name: 'Prefer not to say' })).toBeTruthy(),
  );
  await fireEvent.press(screen.getByRole('radio', { name: 'Prefer not to say' }));
  await fireEvent.press(next());
  await act(async () => {
    await fireEvent.press(next());
  });
  await act(async () => {
    await fireEvent.press(next());
  });
  expect(await screen.findByText(onboarding.failed)).toBeTruthy();
  expect(title(copy.brands.title, copy.brands.titleEm)).toBeTruthy();
  await act(async () => {
    await fireEvent.press(next());
  });
  await waitFor(() => expect(title(copy.looks.title, copy.looks.titleEm)).toBeTruthy());
}, 20_000);

test('leaving and returning resumes at the step on her profile (R-S3)', async () => {
  mockFetch({
    ...STEPS,
    'GET /me': { ...NEW, firstRun: { version: null, step: 'pieces', skipped: ['looks'] } },
    'GET /me/dna': styleDna({ gender: 'woman', types: ['Minimal'], brands: ['COS'] }),
  });
  await renderWithApi(<Onboarding />);
  await waitFor(() => expect(screen.getByText(copy.pieces.titleEm, { exact: false })).toBeTruthy());
  expect(screen.getByLabelText(copy.progress(6, 7))).toBeTruthy();
});

test('a profile left on the digital twin, since dropped, resumes on Today’s outfit', async () => {
  mockFetch({
    ...STEPS,
    'GET /me': { ...NEW, firstRun: { version: null, step: 'twin', skipped: ['looks'] } },
    'GET /me/dna': styleDna({ gender: 'woman', types: ['Minimal'], brands: ['COS'] }),
  });
  await renderWithApi(<Onboarding />);
  await waitFor(() => expect(screen.getByText(copy.outfit.titleEm, { exact: false })).toBeTruthy());
  expect(screen.getByLabelText(copy.progress(7, 7))).toBeTruthy();
});

test('an account onboarded before walks the new flow once, its answers prefilled', async () => {
  mockFetch({
    ...STEPS,
    'GET /me': { ...ME, onboarded: true, firstRun: { version: null, step: null, skipped: [] } },
    'GET /me/dna': styleDna({ gender: 'man', types: ['Utility'], brands: ['Barbour'] }),
  });
  await renderWithApi(<Onboarding />);
  await fireEvent.press(screen.getByTestId('splash'));
  await waitFor(() => expect(screen.getByDisplayValue('Niall')).toBeTruthy());
  await fireEvent.press(next());
  await waitFor(() =>
    expect(screen.getByRole('radio', { name: 'Man' }).props.accessibilityState).toMatchObject({
      checked: true,
    }),
  );
  await fireEvent.press(next());
  expect(
    screen.getByRole('button', { name: 'Love Utility' }).props.accessibilityState,
  ).toMatchObject({ selected: true });
  await fireEvent.press(next());
  expect(screen.getByRole('button', { name: 'Barbour' }).props.accessibilityState).toMatchObject({
    selected: true,
  });
}, 20_000);

test('every archetype carries its four bundled photographs for each wearer', () => {
  for (const type of STYLE_TYPES)
    for (const wearer of [...SEED_WEARERS, 'unspecified'])
      for (const { key, src } of archetypeImages(type, wearer))
        expect({ key, filed: src !== null }).toEqual({ key, filed: true });
});
