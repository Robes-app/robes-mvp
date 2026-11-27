import { ApiClientError } from '@robes/api-client';
import { shell } from '@robes/copy';
import { QueryCache, QueryClient } from '@tanstack/react-query';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { APP_VERSION } from '../src/lib/config';
import { noteApiError } from '../src/lib/session-events';
import { SessionGate } from '../src/lib/session-gate';
import { errorReply, mockFetch, renderWithApi } from './support/api';
import { mockRouter } from './support/router';

let mockSession: { isPending: boolean; data: unknown } = { isPending: false, data: null };
let mockPath = '/look/0a1b';
const mockSignOut = jest.fn(async () => ({}));
jest.mock('expo-router', () => ({
  ...jest.requireActual('./support/router').mockRouterModule,
  usePathname: () => mockPath,
  useSegments: () => mockPath.split('/').filter(Boolean),
}));
jest.mock('../src/lib/auth-client', () => ({
  authClient: {
    getCookie: () => null,
    useSession: () => mockSession,
    signOut: () => mockSignOut(),
  },
}));

const VERSIONS = 'GET /public/app-versions';
const mockPrefs = new Map<string, string>();
jest.mock('../src/lib/prefs', () => ({
  readPref: async (k: string) => mockPrefs.get(k) ?? null,
  writePref: async (k: string, v: string) => void mockPrefs.set(k, v),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPrefs.clear();
  mockFetch({ [VERSIONS]: { minimum: '0.0.1', latest: APP_VERSION } });
  mockSession = { isPending: false, data: null };
  mockPath = '/look/0a1b';
});

// Audit F6: a link opened with no session goes through sign-in and on to its screen.
test('signed out on a look, she is sent to sign-in carrying the look', async () => {
  await renderWithApi(<SessionGate />);
  await waitFor(() =>
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: '/sign-in',
      params: { next: '/look/0a1b' },
    }),
  );
});

test.each([
  ['the session is still loading', { isPending: true, data: null }],
  ['she is signed in', { isPending: false, data: { user: { id: 'u' } } }],
])('while %s, it stays put', async (_, session) => {
  mockSession = session;
  await renderWithApi(<SessionGate />);
  await act(() => new Promise((done) => setTimeout(done, 20)));
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

test('a 401 signs her out cleanly and back through sign-in to where she was', async () => {
  mockSession = { isPending: false, data: { user: { id: 'u' } } };
  await renderWithApi(<SessionGate />);
  await act(() => noteApiError(new ApiClientError({ status: 401, code: 'unauthenticated' })));
  await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
  await waitFor(() =>
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: '/sign-in',
      params: { next: '/look/0a1b' },
    }),
  );
});

// ADR-022: below the minimum app version there is one way forward, and no way past.
test('a 426 holds the update screen: one button, which opens TestFlight and stays', async () => {
  mockSession = { isPending: false, data: { user: { id: 'u' } } };
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await renderWithApi(<SessionGate />);
  await act(() => noteApiError(new ApiClientError({ status: 426, code: 'upgrade_required' })));
  expect(await screen.findByText(shell.update.title)).toBeTruthy();
  expect(screen.getAllByRole('button')).toHaveLength(1);
  fireEvent.press(screen.getByRole('button', { name: shell.update.action }));
  expect(open).toHaveBeenCalledWith('itms-beta://');
  expect(screen.getByText(shell.update.title)).toBeTruthy();
});

test('at launch, an app the server answers 426 sees the update screen before any screen asks', async () => {
  mockFetch({ [VERSIONS]: errorReply(426, 'upgrade_required') });
  // As the root layout: every query's error is heard once for what it says about the session.
  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: noteApiError }),
    defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } },
  });
  await renderWithApi(<SessionGate />, queryClient);
  expect(await screen.findByText(shell.update.title)).toBeTruthy();
});

test('below the latest app version, a toast offers the update once per version', async () => {
  mockFetch({ [VERSIONS]: { minimum: '0.0.1', latest: '999.0.0' } });
  const first = await renderWithApi(<SessionGate />);
  expect(await screen.findByText(shell.update.ready)).toBeTruthy();
  expect(mockPrefs.get('robes.update-nudged')).toBe('999.0.0');
  first.unmount();
  await renderWithApi(<SessionGate />);
  await act(() => new Promise((done) => setTimeout(done, 20)));
  expect(screen.queryByText(shell.update.ready)).toBeNull();
});

test('on the latest app version, or with no answer at all, she just gets in', async () => {
  await renderWithApi(<SessionGate />);
  await act(() => new Promise((done) => setTimeout(done, 20)));
  mockFetch({});
  await renderWithApi(<SessionGate />);
  await act(() => new Promise((done) => setTimeout(done, 20)));
  expect(screen.queryByText(shell.update.ready)).toBeNull();
  expect(screen.queryByText(shell.update.title)).toBeNull();
});
