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
// Location is a native module: undecided and unread unless a test says otherwise.
jest.mock('expo-location', () => ({
  Accuracy: { Low: 2 },
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'undetermined' })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  getLastKnownPositionAsync: jest.fn(async () => null),
  getCurrentPositionAsync: jest.fn(async () => {
    throw new Error('no location under jest');
  }),
}));

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

// Photos are native files: 2048 bytes (0 for an `empty` path), uploaded through fetch so the
// tests' mockFetch sees the presigned PUT.
jest.mock('expo-file-system', () => ({
  UploadType: { BINARY_CONTENT: 0 },
  File: class {
    size: number;
    exists = true;
    path: string;
    constructor(path: string) {
      this.path = path;
      this.size = path.includes('empty') ? 0 : 2048;
    }
    // The first bytes say the format: a `heic` or `png` path is that, anything else a JPEG.
    open() {
      const path = this.path;
      const head = path.includes('heic')
        ? [0, 0, 0, 0x28, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]
        : path.includes('png')
          ? [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]
          : [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1];
      return { readBytes: async () => new Uint8Array(head), close: () => undefined };
    }
    async upload(url: string, opts: { httpMethod: string; headers?: Record<string, string> }) {
      const res = await fetch(url, { method: opts.httpMethod, headers: opts.headers });
      return { status: res.status, body: '', headers: {} };
    }
  },
}));

// iOS's own sheet (@expo/ui) is native: under jest the sheet is its content while presented, so
// the pickers on DetentSheet read as they draw.
jest.mock('@expo/ui/swift-ui', () => {
  const { Fragment, createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const pass = ({ children }: { children?: unknown }) => createElement(Fragment, null, children);
  return {
    Host: pass,
    // The sheet's heights and grabber ride the Group's modifiers, kept for a test to read.
    Group: ({ children, modifiers }: { children?: unknown; modifiers?: unknown }) =>
      createElement(View, { testID: 'sheet-presentation', modifiers }, children),
    RNHostView: pass,
    BottomSheet: ({ isPresented, children }: { isPresented: boolean; children?: unknown }) =>
      isPresented ? createElement(Fragment, null, children) : null,
  };
});
jest.mock('@expo/ui/swift-ui/modifiers', () => ({
  presentationBackground: (style: unknown) => ({ $type: 'presentationBackground', style }),
  presentationDetents: (detents: unknown) => ({ $type: 'presentationDetents', detents }),
  presentationDragIndicator: (visibility: unknown) => ({
    $type: 'presentationDragIndicator',
    visibility,
  }),
}));
