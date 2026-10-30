import { queryKeys } from '@robes/api-client/react';
import type { Me } from '@robes/contracts';
import { firstRun as copy, onboarding } from '@robes/copy';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import Onboarding from '../src/app/onboarding/index';
import { nativeAnalytics } from '../src/lib/analytics';
import { errorReply, ME, mockFetch, renderWithApi } from './support/api';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});
// Call sites report through the consent-gated client (observability.test.ts proves the gate).
const track = jest.spyOn(nativeAnalytics, 'track');
const title = (t: string, em: string) => screen.getByText(`${t} ${em}`, { exact: false });
const next = () => screen.getByRole('button', { name: copy.continue });

// Getting to know you (handoff 30 Oct; twin of the web e2e in app/e2e/home.spec.ts).
test('splash → name → identity → styles → brands → colours, saved once on Get started', async () => {
  let onboarded = false;
  const calls = mockFetch({
    'GET /me': () => ({ ...ME, firstName: null, onboarded }),
    'PATCH /me': ME,
    'POST /me/onboarding/complete': () => {
      onboarded = true;
      return { onboardedAt: new Date().toISOString() };
    },
  });
  const { queryClient } = await renderWithApi(<Onboarding />);
  await fireEvent.press(screen.getByTestId('splash'));
  expect(screen.getByText(copy.eyebrow)).toBeTruthy();
  expect(screen.queryByRole('button', { name: copy.backLabel })).toBeNull();
  await fireEvent.changeText(screen.getByLabelText(copy.name.label), 'Niall Maher');
  await fireEvent.press(next());
  await waitFor(() => expect(title(copy.identity.title, copy.identity.titleEm)).toBeTruthy());
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ firstName: 'Niall' });

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
  expect(
    screen.getByRole('button', { name: 'Love Utility' }).props.accessibilityState,
  ).toMatchObject({ selected: true });
  await fireEvent.press(next());

  // The wall leads with a man's Utility houses.
  expect(title(copy.brands.title, copy.brands.titleEm)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Stone Island' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Barbour' }));
  await fireEvent.press(next());

  const family = (name: string) => within(screen.getByLabelText(copy.colours.control(name)));
  await fireEvent.press(family('Blacks').getByRole('radio', { name: 'Love' }));
  await fireEvent.press(family('Pinks').getByRole('radio', { name: 'Avoid' }));
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: copy.finish }));
  });

  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
  expect(calls.find((c) => c.path.endsWith('/me/onboarding/complete'))?.body).toEqual({
    identity: 'man',
    styles: ['Utility', 'Heritage'],
    brands: ['Barbour'],
    colours: { blacks: 1, pinks: -1 },
  });
  expect(queryClient.getQueryData<Me>(queryKeys.call('me.get'))?.onboarded).toBe(true);
  expect(
    track.mock.calls.filter(([, p]) => (p as { outcome?: string }).outcome !== 'shown'),
  ).toEqual([
    ['onboarding_step', { step: 'name', outcome: 'answered' }],
    ['onboarding_step', { step: 'identity', outcome: 'answered' }],
    // Back to identity and on again: answered once more.
    ['onboarding_step', { step: 'identity', outcome: 'answered' }],
    ['onboarding_step', { step: 'styles', outcome: 'answered' }],
    ['onboarding_step', { step: 'brands', outcome: 'answered' }],
    ['onboarding_step', { step: 'colours', outcome: 'answered' }],
    ['onboarding_answered', { styles: 2, brands: 1, colours: 2 }],
  ]);
}, 20_000);

test('styles, brands and colours may be left empty; a failed finish stays and says so', async () => {
  let completes = 0;
  const calls = mockFetch({
    'GET /me': { ...ME, onboarded: false },
    'POST /me/onboarding/complete': () =>
      ++completes === 1 ? errorReply(500, 'internal') : { onboardedAt: new Date().toISOString() },
  });
  await renderWithApi(<Onboarding />);
  await fireEvent.press(screen.getByTestId('splash'));
  // Her saved name is offered; unchanged, it is not saved again.
  await waitFor(() => expect(screen.getByDisplayValue('Niall')).toBeTruthy());
  await fireEvent.press(next());
  await waitFor(() =>
    expect(screen.getByRole('radio', { name: 'Prefer not to say' })).toBeTruthy(),
  );
  await fireEvent.press(screen.getByRole('radio', { name: 'Prefer not to say' }));
  for (let i = 0; i < 3; i++) await fireEvent.press(next());
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: copy.finish }));
  });
  expect(await screen.findByText(onboarding.failed)).toBeTruthy();
  expect(mockRouter.replace).not.toHaveBeenCalled();
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: copy.finish }));
  });
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
  expect(calls.some((c) => c.method === 'PATCH')).toBe(false);
  expect(calls.filter((c) => c.path.endsWith('/me/onboarding/complete')).at(-1)?.body).toEqual({
    identity: 'unspecified',
    styles: [],
    brands: [],
    colours: {},
  });
  expect(track).toHaveBeenCalledWith('onboarding_step', { step: 'styles', outcome: 'skipped' });
  expect(track).toHaveBeenCalledWith('onboarding_answered', { styles: 0, brands: 0, colours: 0 });
}, 20_000);
