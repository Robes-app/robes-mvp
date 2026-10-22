import { consent, twin, you } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { DeleteAccount } from '../src/features/you/DeleteAccount';
import { Notifications } from '../src/features/you/Notifications';
import { Privacy } from '../src/features/you/Privacy';
import { YouMenu } from '../src/features/you/YouMenu';
import { ME, mockFetch, renderWithApi } from './support/api';
import { styleDna } from './support/fixtures';
import { mockRouter } from './support/router';

const mockSignOut = jest.fn(async () => ({}));
jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => ({})) }));
jest.mock('../src/lib/auth-client', () => ({
  authClient: { getCookie: () => null, signOut: () => mockSignOut() },
}));

beforeEach(() => jest.clearAllMocks());

test('You opens on Style Profile; Account lists every area and signs out', async () => {
  mockFetch({ 'GET /me': ME, 'GET /me/dna': styleDna() });
  const { queryClient } = await renderWithApi(<YouMenu />);
  expect(await screen.findByText(ME.email)).toBeTruthy();
  for (const label of [twin.cards.twin, twin.cards.dna, twin.cards.observations]) {
    expect(screen.getByRole('button', { name: label })).toBeTruthy();
  }
  await fireEvent.press(screen.getByRole('button', { name: twin.cards.observations }));
  expect(mockRouter.push).toHaveBeenCalledWith('/you/observations');
  await fireEvent.press(screen.getByRole('radio', { name: twin.tabs.account }));
  for (const label of [
    you.account.title,
    you.notifications.title,
    you.privacy,
    you.legal.terms,
    you.deletion.title,
  ]) {
    expect(screen.getByRole('button', { name: label })).toBeTruthy();
  }
  await fireEvent.press(screen.getByRole('button', { name: you.notifications.title }));
  expect(mockRouter.push).toHaveBeenCalledWith('/you/notifications');
  await fireEvent.press(screen.getByRole('button', { name: you.signOut }));
  await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/sign-in'));
  expect(mockSignOut).toHaveBeenCalled();
  expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
});

test('a notification toggle flips at once and saves just that key', async () => {
  const calls = mockFetch({
    'GET /me': ME,
    'PATCH /me': { ...ME, notifications: { ...ME.notifications, nudges: true } },
  });
  await renderWithApi(<Notifications />);
  const nudges = await screen.findByLabelText(you.notifications.nudges);
  expect(nudges.props.value).toBe(false);
  await fireEvent(nudges, 'valueChange', true);
  await waitFor(() =>
    expect(screen.getByLabelText(you.notifications.nudges).props.value).toBe(true),
  );
  await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
  expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({
    notifications: { nudges: true },
  });
});

test('turning usage counts off also withdraws recordings', async () => {
  const calls = mockFetch({
    'GET /me/consents': {
      analytics: true,
      replay: true,
      marketing_email: null,
      photo_analysis: null,
    },
    'POST /me/consents': {
      analytics: false,
      replay: false,
      marketing_email: null,
      photo_analysis: null,
    },
  });
  await renderWithApi(<Privacy />);
  await fireEvent(await screen.findByLabelText(consent.analyticsLabel), 'valueChange', false);
  await waitFor(() => expect(calls.length).toBeGreaterThan(1));
  expect(calls[1]?.body).toEqual({ source: 'ios', consents: { analytics: false, replay: false } });
});

test('deleting the account needs DELETE typed, then signs out', async () => {
  const calls = mockFetch({
    'GET /me/deletion': { request: null },
    'POST /me/deletion': { status: 'requested', requestedAt: '2026-09-24T10:00:00.000Z' },
  });
  await renderWithApi(<DeleteAccount />);
  const confirm = await screen.findByRole('button', { name: you.deletion.confirm });
  expect(confirm.props.accessibilityState.disabled).toBe(true);
  await fireEvent.changeText(screen.getByLabelText(you.deletion.confirmLabel), 'DELETE');
  await fireEvent.press(screen.getByRole('button', { name: you.deletion.confirm }));
  await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
  expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ confirm: 'DELETE' });
});

test('the Robes noticed card keeps the first waiting line', async () => {
  const id = '88888888-8888-4888-8888-888888888888';
  const line = {
    id,
    list: 'rules',
    text: 'No double denim',
    because: 'You said it on “Saturday”',
    origin: 'prompt',
  };
  const calls = mockFetch({
    'GET /me': ME,
    'GET /me/dna': styleDna({ observations: [line as never] }),
    [`POST /me/dna/observations/${id}/keep`]: styleDna(),
  });
  await renderWithApi(<YouMenu />);
  expect(await screen.findByText('No double denim.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: twin.noticed.keep }));
  await waitFor(() =>
    expect(calls.some((c) => c.method === 'POST' && c.path.endsWith('/keep'))).toBe(true),
  );
  expect(await screen.findByText(twin.noticed.kept)).toBeTruthy();
});
