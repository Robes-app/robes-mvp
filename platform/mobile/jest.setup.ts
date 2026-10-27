// Native push isn't available under jest; tests that care override these per test.
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ status: 'undetermined' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[test-token-0000]' })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));
jest.mock('expo-device', () => ({ isDevice: false }));

// The clipboard is a native module: Paste and tap-to-copy read and write this stand-in.
jest.mock('expo-clipboard', () => {
  let text = '';
  return {
    getStringAsync: jest.fn(async () => text),
    setStringAsync: jest.fn(async (next: string) => {
      text = next;
      return true;
    }),
  };
});
