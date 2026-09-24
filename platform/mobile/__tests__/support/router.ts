// Shared expo-router mock for screen tests: `jest.mock('expo-router', () => mockRouterModule)`.
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
};

export const mockRouterModule = {
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
};
