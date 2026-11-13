import { queryKeys } from '@robes/api-client/react';
import type { Consents } from '@robes/contracts';
import { consent, twin } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import SelfieRoute from '../src/app/you/selfie';
import { AnalyticsSetup, nativeAnalytics } from '../src/lib/analytics';
import { ME, mockFetch, renderWithApi } from './support/api';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
// The camera has its own tests (selfie.test.tsx); here it only has to appear.
jest.mock('../src/features/you/SelfieCamera', () => {
  const { View } = require('react-native');
  return { SelfieCamera: () => <View testID="selfie-camera" /> };
});

const copy = twin.twinPage.consent;
const UNANSWERED: Consents = {
  analytics: null,
  replay: null,
  marketing_email: null,
  photo_analysis: null,
};

beforeEach(() => jest.clearAllMocks());

test('the selfie camera waits for her yes, which names Google Gemini and is saved', async () => {
  const calls = mockFetch({
    'GET /me/consents': UNANSWERED,
    'POST /me/consents': { ...UNANSWERED, photo_analysis: true },
  });
  await renderWithApi(<SelfieRoute />);
  expect(await screen.findByText(copy.title)).toBeTruthy();
  expect(screen.getByText(/Google Gemini/)).toBeTruthy();
  expect(screen.queryByTestId('selfie-camera')).toBeNull();
  // Nothing is agreed for her: the way on is off until she ticks the box herself.
  const go = screen.getByRole('button', { name: copy.go });
  expect(go.props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(go);
  expect(calls.some((c) => c.method === 'POST')).toBe(false);

  await fireEvent.press(screen.getByRole('checkbox', { name: copy.agree }));
  await fireEvent.press(screen.getByRole('button', { name: copy.go }));
  expect(await screen.findByTestId('selfie-camera')).toBeTruthy();
  expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
    source: 'ios',
    consents: { photo_analysis: true },
  });
});

test('Not now leaves without a yes', async () => {
  const calls = mockFetch({ 'GET /me/consents': UNANSWERED });
  await renderWithApi(<SelfieRoute />);
  await fireEvent.press(await screen.findByRole('button', { name: copy.notNow }));
  expect(mockRouter.back).toHaveBeenCalled();
  expect(calls.some((c) => c.method === 'POST')).toBe(false);
});

test('a yes already given goes straight to the camera', async () => {
  mockFetch({ 'GET /me/consents': { ...UNANSWERED, photo_analysis: true } });
  await renderWithApi(<SelfieRoute />);
  expect(await screen.findByTestId('selfie-camera')).toBeTruthy();
  expect(screen.queryByText(copy.title)).toBeNull();
});

test('usage counts are asked once, and nothing is counted before a yes', async () => {
  const start = jest.spyOn(nativeAnalytics, 'start').mockResolvedValue();
  const calls = mockFetch({
    'GET /me': ME,
    'GET /me/consents': UNANSWERED,
    'POST /me/consents': { ...UNANSWERED, analytics: true },
  });
  await renderWithApi(<AnalyticsSetup />);
  expect(await screen.findByText(consent.askTitle)).toBeTruthy();
  expect(start).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByRole('button', { name: consent.askYes }));
  await waitFor(() => expect(start).toHaveBeenCalledWith(ME.id));
  expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
    source: 'ios',
    consents: { analytics: true },
  });
  await waitFor(() => expect(screen.queryByText(consent.askTitle)).toBeNull());
});

test('a no is saved and counts nothing', async () => {
  const start = jest.spyOn(nativeAnalytics, 'start').mockResolvedValue();
  const calls = mockFetch({
    'GET /me': ME,
    'GET /me/consents': UNANSWERED,
    'POST /me/consents': { ...UNANSWERED, analytics: false },
  });
  await renderWithApi(<AnalyticsSetup />);
  await fireEvent.press(await screen.findByRole('button', { name: consent.askNo }));
  await waitFor(() =>
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
      source: 'ios',
      consents: { analytics: false },
    }),
  );
  await waitFor(() => expect(screen.queryByText(consent.askTitle)).toBeNull());
  expect(start).not.toHaveBeenCalled();
});

test('an answer already given is not asked again', async () => {
  const start = jest.spyOn(nativeAnalytics, 'start').mockResolvedValue();
  mockFetch({ 'GET /me': ME, 'GET /me/consents': { ...UNANSWERED, analytics: false } });
  const { queryClient } = await renderWithApi(<AnalyticsSetup />);
  // Her answer has landed, not just been asked for.
  await waitFor(() =>
    expect(queryClient.getQueryData(queryKeys.call('me.consents.get'))).toBeDefined(),
  );
  expect(screen.queryByText(consent.askTitle)).toBeNull();
  expect(start).not.toHaveBeenCalled();
});
