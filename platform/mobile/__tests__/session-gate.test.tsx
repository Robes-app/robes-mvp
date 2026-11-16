import { ApiClientError } from '@robes/api-client';
import { shell } from '@robes/copy';
import { act, screen, waitFor } from '@testing-library/react-native';
import { noteApiError } from '../src/lib/session-events';
import { SessionGate } from '../src/lib/session-gate';
import { renderWithApi } from './support/api';
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

beforeEach(() => {
  jest.clearAllMocks();
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

test('a 426 offers the store instead of a dead end', async () => {
  mockSession = { isPending: false, data: { user: { id: 'u' } } };
  await renderWithApi(<SessionGate />);
  await act(() => noteApiError(new ApiClientError({ status: 426, code: 'upgrade_required' })));
  expect(await screen.findByText(shell.update.title)).toBeTruthy();
  expect(screen.getByRole('button', { name: shell.update.action })).toBeTruthy();
});
