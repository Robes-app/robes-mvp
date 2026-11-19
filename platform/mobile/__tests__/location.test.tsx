import { LOCATION_REFRESH_MS } from '@robes/core/location';
import { act, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { LocationSetup, sentAtKey, syncDeviceLocation } from '../src/lib/location';
import { ME, mockFetch, renderWithApi } from './support/api';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockStore.delete(k)),
}));
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

const { api } = require('../src/lib/api') as typeof import('../src/lib/api');
const perms = Location.getForegroundPermissionsAsync as jest.Mock;
const request = Location.requestForegroundPermissionsAsync as jest.Mock;
const current = Location.getCurrentPositionAsync as jest.Mock;
const lastKnown = Location.getLastKnownPositionAsync as jest.Mock;
const here = { coords: { latitude: 53.3498, longitude: -6.2603 } };
const now = 1_800_000_000_000;
const USER = 'user-1';
const SENT_AT_KEY = sentAtKey(USER);

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
  perms.mockResolvedValue({ status: 'undetermined' });
  lastKnown.mockResolvedValue(null);
  current.mockResolvedValue(here);
});

test('asks once on her first launch and sends where she is', async () => {
  request.mockResolvedValue({ status: 'granted' });
  const calls = mockFetch({ 'POST /me/location': { ok: true } });
  expect(await syncDeviceLocation(api, USER, now)).toBe('sent');
  expect(request).toHaveBeenCalledTimes(1);
  expect(current).toHaveBeenCalledWith({ accuracy: Location.Accuracy.Low });
  expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ lat: 53.3498, lon: -6.2603 });
  expect(mockStore.get(SENT_AT_KEY)).toBe(String(now));
});

test('a no is never asked again', async () => {
  request.mockResolvedValue({ status: 'denied' });
  const calls = mockFetch({});
  expect(await syncDeviceLocation(api, USER, now)).toBe('denied');
  perms.mockResolvedValue({ status: 'denied' });
  expect(await syncDeviceLocation(api, USER, now + 10 * LOCATION_REFRESH_MS)).toBe('denied');
  expect(request).toHaveBeenCalledTimes(1);
  expect(calls).toEqual([]);
});

test('declined in Settings before: no prompt, never asked', async () => {
  perms.mockResolvedValue({ status: 'denied' });
  expect(await syncDeviceLocation(api, USER, now)).toBe('denied');
  expect(request).not.toHaveBeenCalled();
});

// The keychain outlives a reinstall; the phone's own answer does not (19 Nov: never asked).
test('asked whenever the phone has not asked yet, whatever an earlier install kept', async () => {
  mockStore.set('robes.geo.asked', '1');
  request.mockResolvedValue({ status: 'granted' });
  mockFetch({ 'POST /me/location': { ok: true } });
  expect(await syncDeviceLocation(api, USER, now)).toBe('sent');
  expect(request).toHaveBeenCalledTimes(1);
});

// A new account on the same phone gets its city at once, not after the last one's few hours.
test("one account's last send never holds back another's", async () => {
  mockStore.set(sentAtKey('someone-else'), String(now - 60_000));
  perms.mockResolvedValue({ status: 'granted' });
  mockFetch({ 'POST /me/location': { ok: true } });
  expect(await syncDeviceLocation(api, USER, now)).toBe('sent');
});

test('later launches read quietly, at most every few hours, from a recent fix first', async () => {
  mockStore.set(SENT_AT_KEY, String(now - 60_000));
  perms.mockResolvedValue({ status: 'granted' });
  const calls = mockFetch({ 'POST /me/location': { ok: true } });
  expect(await syncDeviceLocation(api, USER, now)).toBe('skipped');
  lastKnown.mockResolvedValue(here);
  expect(await syncDeviceLocation(api, USER, now + LOCATION_REFRESH_MS)).toBe('sent');
  expect(current).not.toHaveBeenCalled();
  expect(request).not.toHaveBeenCalled();
  expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1);
});

test('no fix or a failed send tries again next launch', async () => {
  perms.mockResolvedValue({ status: 'granted' });
  current.mockRejectedValue(new Error('location services off'));
  expect(await syncDeviceLocation(api, USER, now)).toBe('failed');
  expect(mockStore.has(SENT_AT_KEY)).toBe(false);
});

// App Store review (P0, F2): the location prompt never stands on top of the usage question.
test('waits for her answer to the usage question before asking where she is', async () => {
  request.mockResolvedValue({ status: 'granted' });
  const consents = {
    analytics: null as boolean | null,
    replay: null,
    marketing_email: null,
    photo_analysis: null,
    look_sharing: null,
    recordings: null,
  };
  mockFetch({
    'GET /me': ME,
    'GET /me/consents': () => ({ ...consents }),
    'POST /me/location': { ok: true },
  });
  const view = await renderWithApi(<LocationSetup />);
  await act(() => new Promise((done) => setTimeout(done, 50)));
  expect(perms).not.toHaveBeenCalled();
  expect(request).not.toHaveBeenCalled();
  view.unmount();
  consents.analytics = false;
  await renderWithApi(<LocationSetup />);
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
});
