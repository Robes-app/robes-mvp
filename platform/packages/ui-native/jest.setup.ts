// The library's own stand-in: zero insets, or what a test's SafeAreaProvider passes.
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);
