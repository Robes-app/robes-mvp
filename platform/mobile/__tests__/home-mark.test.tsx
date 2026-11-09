import { ui } from '@robes/copy';
import { act, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { TabScreen } from '../src/components/TabScreen';
import { ME, mockFetch, renderWithApi } from './support/api';
import { Providers } from './support/providers';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({
  authClient: { useSession: () => ({ data: null, isPending: false }), getCookie: () => '' },
}));

const GREETING = 'Good morning, Niall.';

beforeEach(() => {
  mockFetch({ 'GET /me': ME, 'GET /me/notifications': { items: [] } });
});

// Home's bar (Front Door canvas 1a, Annie 9 Nov): the greeting centred on arrival, giving way to
// ROBES centred; once per launch, so coming back to Home finds ROBES standing.
test('the greeting holds the bar on arrival, ROBES takes its place, and only once', async () => {
  jest.useFakeTimers();
  try {
    // Until today's greeting is known the bar's centre stays empty.
    const view = await renderWithApi(
      <TabScreen key="loading" greeting={null}>
        <Text>home</Text>
      </TabScreen>,
    );
    const again = async (key: string) =>
      act(async () => {
        view.rerender(
          <Providers queryClient={view.queryClient}>
            <TabScreen key={key} greeting={GREETING}>
              <Text>home</Text>
            </TabScreen>
          </Providers>,
        );
      });
    expect(screen.queryByTestId('home-mark')).toBeNull();

    await again('first');
    expect(screen.getByTestId('home-mark').props.accessibilityLabel).toBe(GREETING);
    expect(screen.getByTestId('home-greeting')).toBeTruthy();
    expect(screen.getByText(ui.wordmark)).toBeTruthy();
    expect(screen.queryByTestId('tab-title')).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });

    // Back on Home (a fresh bar): ROBES stands, the greeting is still its name for readers.
    await again('second');
    expect(screen.queryByTestId('home-greeting')).toBeNull();
    expect(screen.getByText(ui.wordmark)).toBeTruthy();
    expect(screen.getByTestId('home-mark').props.accessibilityLabel).toBe(GREETING);
  } finally {
    jest.useRealTimers();
  }
});
