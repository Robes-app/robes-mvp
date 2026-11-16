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

// Link with the iOS long-press parts: the Trigger's child opens the href, the menu's actions are
// plain buttons (named by their title) so a test can reach them, and the preview draws nothing.
function MockLink({ href, children }: { href: string; children: unknown }) {
  const React = require('react');
  return React.createElement(MockHref.Provider, { value: href }, children);
}
const MockHref = require('react').createContext('');
MockLink.Trigger = ({ children }: { children: unknown }) => {
  const React = require('react');
  const href = React.useContext(MockHref);
  return React.cloneElement(children, { onPress: () => mockRouter.push(href) });
};
MockLink.Preview = () => null;
MockLink.Menu = ({ children }: { children: unknown }) => children;
MockLink.MenuAction = ({ children, onPress }: { children: string; onPress?: () => void }) => {
  const { Pressable, Text } = require('react-native');
  const React = require('react');
  return React.createElement(
    Pressable,
    { accessibilityRole: 'button', accessibilityLabel: children, onPress },
    React.createElement(Text, null, children),
  );
};

export const mockRouterModule = {
  Link: MockLink,
  useRouter: () => mockRouter,
  useNavigation: () => mockNavigation,
  useLocalSearchParams: () => ({ ...mockParams }),
  // The SessionGate reads where it is: a test's screen stands at Home unless it says otherwise.
  usePathname: () => '/',
  useSegments: () => ['(tabs)'],
  Redirect: () => null,
  // A screen in a test is always the focused one: the effect runs once it mounts.
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
};
