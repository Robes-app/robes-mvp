import * as Notifications from 'expo-notifications';
import { nativePath } from '../src/lib/links';
import { askForPushOnce, refreshPush, unregisterPush } from '../src/lib/push';
import { urlOf } from '../src/lib/use-push';
import { mockFetch } from './support/api';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockStore.delete(k)),
}));
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.2.0', extra: { eas: { projectId: 'proj-1' } } } },
}));
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

const { api } = require('../src/lib/api') as typeof import('../src/lib/api');
const perms = Notifications.getPermissionsAsync as jest.Mock;
const request = Notifications.requestPermissionsAsync as jest.Mock;
const TOKEN = 'ExponentPushToken[test-token-0000]';

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
  perms.mockResolvedValue({ status: 'undetermined' });
});

test('asks once after her first result, then registers this device', async () => {
  request.mockResolvedValue({ status: 'granted' });
  const calls = mockFetch({ 'PUT /me/push-tokens': { ok: true } });
  expect(await askForPushOnce(api)).toBe('registered');
  expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'proj-1' });
  expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({
    expoToken: TOKEN,
    platform: 'ios',
    appVersion: '1.2.0',
  });
  perms.mockResolvedValue({ status: 'granted' });
  await askForPushOnce(api);
  expect(request).toHaveBeenCalledTimes(1);
});

test('a "no" is respected and never asked again', async () => {
  request.mockResolvedValue({ status: 'denied' });
  const calls = mockFetch({});
  expect(await askForPushOnce(api)).toBe('denied');
  perms.mockResolvedValue({ status: 'denied' });
  expect(await askForPushOnce(api)).toBe('denied');
  expect(request).toHaveBeenCalledTimes(1);
  expect(calls).toEqual([]);
});

test('app start keeps an allowed device registered without prompting', async () => {
  perms.mockResolvedValue({ status: 'granted' });
  mockFetch({ 'PUT /me/push-tokens': { ok: true } });
  expect(await refreshPush(api)).toBe('registered');
  expect(request).not.toHaveBeenCalled();
});

test('sign-out revokes this device’s token', async () => {
  mockStore.set('robes.pushToken', TOKEN);
  const calls = mockFetch({
    [`DELETE /me/push-tokens/${encodeURIComponent(TOKEN)}`]: { ok: true },
  });
  await unregisterPush(api);
  expect(calls.map((c) => c.method)).toEqual(['DELETE']);
  expect(mockStore.has('robes.pushToken')).toBe(false);
});

test('notification links open the matching native screen', () => {
  const id = '55555555-5555-4555-8555-555555555555';
  expect(nativePath(`robes://looks/ideas/${id}`)).toBe(`/idea/${id}`);
  expect(nativePath('robes://plan')).toBe('/plan');
  expect(nativePath(`/looks/ideas/${id}?from=email`)).toBe(`/idea/${id}`);
  expect(nativePath('/you/notifications')).toBe('/you/notifications');
  expect(
    urlOf({ notification: { request: { content: { data: { url: 'robes://plan' } } } } } as never),
  ).toBe('robes://plan');
  expect(urlOf({} as never)).toBeNull();
});
