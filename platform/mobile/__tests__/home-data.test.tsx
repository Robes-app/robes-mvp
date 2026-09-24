import { ApiClientProvider } from '@robes/api-client/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import Home from '../src/app/index';
import { api } from '../src/lib/api';

jest.mock('../src/lib/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: { user: { id: 'u1' } }, isPending: false }),
    getCookie: () => 'robes.session_token=abc',
  },
}));
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { Text: RNText } = jest.requireActual('react-native');
    return <RNText>{`redirect:${href}`}</RNText>;
  },
}));

const me = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ann@test.dev',
  firstName: 'Ann',
  lastName: null,
  instagramHandle: null,
  locale: 'en-IE',
  timezone: 'Europe/Dublin',
  currency: 'EUR',
  homeCity: null,
  onboarded: true,
  notifications: { looksReady: true, morningCue: true, nudges: false, receipts: true },
};

function respond(body: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

async function renderHome(body: unknown) {
  const fetchMock = jest.fn(async () => respond(body));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  // Infinity gcTime schedules no garbage-collection timers, so Jest can exit cleanly.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } },
  });
  await render(
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider client={api}>
        <Home />
      </ApiClientProvider>
    </QueryClientProvider>,
  );
  return fetchMock;
}

test('loads /me through the api client with the session cookie and app version', async () => {
  const fetchMock = await renderHome(me);
  expect(await screen.findByText(/, Ann\.$/)).toBeTruthy();
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toMatch(/\/api\/v1\/me$/);
  expect(init.credentials).toBe('omit');
  expect(init.headers).toMatchObject({
    cookie: 'robes.session_token=abc',
    'x-robes-app-version': expect.any(String),
  });
});

test('sends a signed-in user who has not onboarded to onboarding', async () => {
  await renderHome({ ...me, onboarded: false });
  expect(await screen.findByText('redirect:/onboarding')).toBeTruthy();
});
