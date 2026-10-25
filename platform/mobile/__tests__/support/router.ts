// Shared expo-router mock for screen tests: `jest.mock('expo-router', () => mockRouterModule)`.
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  setParams: jest.fn(),
};

// Search params a test can change between renders (a door naming a tab, say).
export const mockParams: Record<string, string> = {};

export const mockRouterModule = {
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ ...mockParams }),
  Redirect: () => null,
};
