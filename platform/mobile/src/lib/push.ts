import type { ApiClient } from '@robes/api-client';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { APP_VERSION } from './config';

const TOKEN_KEY = 'robes.pushToken';
const ASKED_KEY = 'robes.pushAsked';

export type PushResult =
  | 'registered'
  | 'denied'
  | 'unsupported' // simulator / web
  | 'no-project'; // no EAS projectId (Expo Go without `extra.eas.projectId`)

// EAS project id: from app config (extra.eas.projectId) or the EAS build; none in plain Expo Go.
function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
}

async function register(api: ApiClient): Promise<PushResult> {
  const id = projectId();
  if (!id) return 'no-project';
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Robes',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { data: expoToken } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  await api.call('me.pushTokens.register', {
    input: {
      expoToken,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      ...(/^\d+(\.\d+)*$/.test(APP_VERSION) ? { appVersion: APP_VERSION } : {}),
    },
  });
  await SecureStore.setItemAsync(TOKEN_KEY, expoToken);
  return 'registered';
}

// App start: keeps an already-allowed device registered; never shows the system prompt.
export async function refreshPush(api: ApiClient): Promise<PushResult> {
  if (!Device.isDevice) return 'unsupported';
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return 'denied';
  return register(api);
}

// Asks once, at a moment it makes sense (her first styled result), never on launch.
export async function askForPushOnce(api: ApiClient): Promise<PushResult> {
  if (!Device.isDevice) return 'unsupported';
  if (await SecureStore.getItemAsync(ASKED_KEY)) return refreshPush(api);
  const current = await Notifications.getPermissionsAsync();
  if (current.status !== 'undetermined') return refreshPush(api);
  await SecureStore.setItemAsync(ASKED_KEY, '1');
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted' ? register(api) : 'denied';
}

// Sign-out: this device stops getting her notifications. Best effort; the session is going anyway.
export async function unregisterPush(api: ApiClient): Promise<void> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) return;
  try {
    await api.call('me.pushTokens.revoke', { params: { token } });
  } catch {
    // Already revoked or offline: the server drops dead tokens when Expo reports them.
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
