import { useToast } from '@robes/ui-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TabScreen } from '../src/components/TabScreen';
import { ME, mockFetch, renderWithApi } from './support/api';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({
  authClient: { useSession: () => ({ data: null, isPending: false }), getCookie: () => '' },
}));

beforeEach(() => {
  mockFetch({ 'GET /me': ME, 'GET /me/notifications': { items: [] } });
});

// On iOS a tab root's safe area includes the tab bar: an iPhone's, 83pt.
const TAB_BAR = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 83 },
};

function LetGo() {
  const toast = useToast();
  return (
    <Pressable onPress={() => toast.show({ message: 'Draft let go.' })}>
      <Text>Let go</Text>
    </Pressable>
  );
}

// A toast on a tab root stands above the tab bar, never on it: a tap meant for a tab landed on the
// toast, and on "Draft let go." its Undo brought the draft back (16 Nov).
test('a toast on a tab stands clear of the tab bar', async () => {
  await renderWithApi(
    <SafeAreaProvider initialMetrics={TAB_BAR}>
      <TabScreen greeting={null}>
        <LetGo />
      </TabScreen>
    </SafeAreaProvider>,
  );
  await fireEvent.press(screen.getByText('Let go'));
  const frame = StyleSheet.flatten(screen.getByTestId('toast-frame').props.style);
  // The bar's 83pt and the 12pt gap above it.
  expect(frame.bottom).toBe(95);
});
