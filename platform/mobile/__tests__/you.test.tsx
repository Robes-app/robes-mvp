import { consent, twin, you } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
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

test('You opens on Style Profile; Account prints her answers and signs out', async () => {
  mockFetch({ 'GET /me': ME, 'GET /me/dna': styleDna() });
  const { queryClient } = await renderWithApi(<YouMenu />);
  // Settings carries no avatar block: the three cards are the page.
  for (const label of [twin.cards.twin, twin.cards.dna, twin.cards.observations]) {
    expect(await screen.findByRole('button', { name: label })).toBeTruthy();
  }
  await fireEvent.press(screen.getByRole('button', { name: twin.cards.observations }));
  expect(mockRouter.push).toHaveBeenCalledWith('/you/observations');
  await fireEvent.press(screen.getByRole('radio', { name: twin.tabs.account }));
  // Profile prints her name and email; notifications switch in place.
  await fireEvent.press(
    await screen.findByRole('button', { name: `${you.account.name}, ${ME.firstName}` }),
  );
  expect(mockRouter.push).toHaveBeenCalledWith('/you/account');
  expect(screen.getByText(ME.email)).toBeTruthy();
  expect(await screen.findByLabelText(you.notifications.nudges)).toBeTruthy();
  for (const label of [you.privacy, you.deletion.title]) {
    expect(screen.getByRole('button', { name: label })).toBeTruthy();
  }
  expect(
    screen.getByRole('link', { name: `${you.legal.betaTerms}, ${you.subs.terms}` }),
  ).toBeTruthy();
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
  // The row is the switch (36×22, not the system one): a tap flips it.
  expect(nudges.props.accessibilityState.checked).toBe(false);
  await fireEvent.press(nudges);
  await waitFor(() =>
    expect(screen.getByLabelText(you.notifications.nudges).props.accessibilityState.checked).toBe(
      true,
    ),
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
  await fireEvent.press(await screen.findByLabelText(consent.analyticsLabel));
  // The page also asks for her data export; the consent write is the one POST.
  await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
  expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
    source: 'ios',
    consents: { analytics: false, replay: false },
  });
});

test('Download your data: prepare, then the ready file opens to download (SEC-81)', async () => {
  const exp = (over: object) => ({
    id: '99999999-9999-4999-8999-999999999999',
    status: 'requested',
    requestedAt: '2026-10-28T10:00:00.000Z',
    readyAt: null,
    expiresAt: null,
    downloadUrl: null,
    ...over,
  });
  let ready = false;
  const calls = mockFetch({
    'GET /me/consents': {
      analytics: false,
      replay: false,
      marketing_email: null,
      photo_analysis: null,
    },
    'GET /me/exports': () => ({
      export: ready ? exp({ status: 'ready', downloadUrl: 'https://files.test/robes.zip' }) : null,
    }),
    'POST /me/exports': exp({}),
  });
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const { queryClient } = await renderWithApi(<Privacy />);
  await fireEvent.press(await screen.findByRole('button', { name: you.dataExport.request }));
  expect(await screen.findByText(you.dataExport.preparing)).toBeTruthy();
  expect(calls.some((c) => c.method === 'POST' && c.path.endsWith('/me/exports'))).toBe(true);
  ready = true;
  await queryClient.invalidateQueries();
  await fireEvent.press(await screen.findByRole('button', { name: you.dataExport.download }));
  expect(open).toHaveBeenCalledWith('https://files.test/robes.zip');
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
  await fireEvent.press(
    screen.getByRole('button', {
      name: twin.observations.answer(twin.observations.keep, 'No double denim'),
    }),
  );
  await waitFor(() =>
    expect(calls.some((c) => c.method === 'POST' && c.path.endsWith('/keep'))).toBe(true),
  );
  expect(await screen.findByText(twin.noticed.kept)).toBeTruthy();
});
