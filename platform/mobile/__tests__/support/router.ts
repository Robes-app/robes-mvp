// Shared expo-router mock for screen tests: `jest.mock('expo-router', () => mockRouterModule)`.
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  setParams: jest.fn(),
};

// The screen's navigation: options set on it, and a screen that has always finished coming in
// (its transitionEnd is heard as soon as anyone listens).
export const mockNavigation = {
  setOptions: jest.fn(),
  addListener: jest.fn((type: string, listener: (e: { data: { closing: boolean } }) => void) => {
    if (type === 'transitionEnd') listener({ data: { closing: false } });
    return () => {};
  }),
};

// Search params a test can change between renders (a door naming a tab, say).
export const mockParams: Record<string, string> = {};

export const mockRouterModule = {
  useRouter: () => mockRouter,
  useNavigation: () => mockNavigation,
  useLocalSearchParams: () => ({ ...mockParams }),
  Redirect: () => null,
  // A screen in a test is always the focused one: the effect runs once it mounts.
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
};
