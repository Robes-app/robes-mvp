import { queryKeys } from '@robes/api-client/react';
import { act, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { TimeZoneSync } from '../src/lib/timezone';
import { errorReply, ME, mockFetch, renderWithApi } from './support/api';

const mockSession = { data: { user: { id: ME.id } } as unknown };
jest.mock('../src/lib/auth-client', () => ({
  authClient: { getCookie: () => null, useSession: () => mockSession },
}));

const { api } = require('../src/lib/api') as typeof import('../src/lib/api');
const SYDNEY = 'Australia/Sydney';
const base = new Intl.DateTimeFormat('en-GB').resolvedOptions();
const onThePhone = (timeZone: string) =>
  jest
    .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
    .mockReturnValue({ ...base, timeZone });

beforeEach(() => {
  mockSession.data = { user: { id: ME.id } };
});
afterEach(() => jest.restoreAllMocks());

const updates = (calls: ReturnType<typeof mockFetch>) => calls.filter((c) => c.method === 'PATCH');

// B6: in Sydney on Thursday morning Home read "Wednesday 25" from the Dublin default.
test('sends the phone zone once signed in, then refetches today', async () => {
  onThePhone(SYDNEY);
  const calls = mockFetch({
    'GET /me': ME,
    'PATCH /me': (init: RequestInit) => ({ ...ME, ...JSON.parse(String(init.body)) }),
  });
  const { queryClient } = await renderWithApi(<TimeZoneSync client={api} />);
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
  await waitFor(() => expect(updates(calls)).toHaveLength(1));
  expect(updates(calls)[0]?.body).toEqual({ timezone: SYDNEY });
  await waitFor(() =>
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.route('today.get') }),
  );
  expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.route('plan.get') });
  expect(queryClient.getQueryData(queryKeys.call('me.get'))).toMatchObject({ timezone: SYDNEY });
});

test('sends nothing when the zone already matches, or while signed out', async () => {
  onThePhone('Europe/Dublin');
  const calls = mockFetch({ 'GET /me': ME });
  await renderWithApi(<TimeZoneSync client={api} />);
  await waitFor(() => expect(calls.some((c) => c.method === 'GET')).toBe(true));
  await act(() => new Promise((done) => setTimeout(done, 20)));
  expect(updates(calls)).toEqual([]);

  mockSession.data = null;
  onThePhone(SYDNEY);
  const none = mockFetch({});
  await renderWithApi(<TimeZoneSync client={api} />);
  await act(() => new Promise((done) => setTimeout(done, 20)));
  expect(none).toEqual([]);
});

test('a failed send is tried again when the app comes back to the foreground', async () => {
  onThePhone(SYDNEY);
  let fail = true;
  const listeners: ((s: string) => void)[] = [];
  const add = jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, fn) => {
    listeners.push(fn as (s: string) => void);
    return { remove: () => undefined } as ReturnType<typeof AppState.addEventListener>;
  });
  const calls = mockFetch({
    'GET /me': ME,
    'PATCH /me': () => (fail ? errorReply(429, 'rate_limited') : { ...ME, timezone: SYDNEY }),
  });
  await renderWithApi(<TimeZoneSync client={api} />);
  await waitFor(() => expect(updates(calls)).toHaveLength(1));
  fail = false;
  await act(async () => {
    for (const fn of listeners) fn('active');
  });
  await waitFor(() => expect(updates(calls)).toHaveLength(2));
  add.mockRestore();
});
