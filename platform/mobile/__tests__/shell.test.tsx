import { lookbook, nav, shell, twin, wardrobe, you } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';
import TabsLayout from '../src/app/(tabs)/_layout';
import Today from '../src/app/(tabs)/index';
import Looks from '../src/app/(tabs)/looks';
import Plan from '../src/app/(tabs)/plan';
import Wardrobe from '../src/app/(tabs)/wardrobe';
import Create from '../src/app/create';
import OnboardingLayout from '../src/app/onboarding/_layout';
import Soon from '../src/app/soon';
import NewTrip from '../src/app/trip/new';
import CameraRoute from '../src/app/wardrobe/camera';
import YouIndex from '../src/app/you/index';
import { ME, mockFetch, newQueryClient } from './support/api';
import { Providers } from './support/providers';

let mockSession: { data: unknown; isPending: boolean } = { data: null, isPending: false };
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));
jest.mock('../src/lib/auth-client', () => ({
  authClient: {
    useSession: () => mockSession,
    getCookie: () => 'robes.session_token=abc',
    signOut: jest.fn(async () => ({})),
  },
}));

// renderRouter is async (expo-router 58): await it for the router helpers.
async function app(initialUrl = '/') {
  const queryClient = newQueryClient();
  const router = await renderRouter(
    {
      _layout: {
        default: () => {
          const { Stack } = jest.requireActual('expo-router');
          return (
            <Providers queryClient={queryClient}>
              <Stack screenOptions={{ headerShown: false }} />
            </Providers>
          );
        },
      },
      '(tabs)/_layout': TabsLayout,
      '(tabs)/index': Today,
      '(tabs)/wardrobe': Wardrobe,
      '(tabs)/looks': Looks,
      '(tabs)/plan': Plan,
      create: Create,
      soon: Soon,
      'trip/new': NewTrip,
      'wardrobe/camera': CameraRoute,
      'you/index': YouIndex,
      'sign-in': () => <Text>sign-in screen</Text>,
      'onboarding/_layout': OnboardingLayout,
      'onboarding/index': () => <Text>onboarding screen</Text>,
    },
    { initialUrl },
  );
  return { getPathname: () => router.getPathname() };
}

const ROUTES = {
  'GET /me': ME,
  'GET /me/features': { trips: false },
  'GET /today': {
    date: '2026-10-01',
    hour: 9,
    firstName: 'Niall',
    nextStep: { rule: 'start' },
    today: [],
    week: Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-0${i + 1}`, looks: 0 })),
    tray: [],
    ideas: [],
    inboxCount: 0,
    overnight: null,
    home: {
      state: {
        styleConfirmed: false,
        twinOnFile: false,
        pics: 0,
        ownLookSaved: false,
        snoozed: {},
      },
      rows: { brands: [], icons: [], styles: [] },
      recent: [],
      candidates: [],
      receipts: null,
      noticed: null,
      saved: [],
      suggested: [],
    },
  },
  'GET /today/weather': null,
  'GET /wardrobe/items': { items: [], nextCursor: null },
  'GET /looks/ideas': { items: [] },
};

test('signed out, every tab root sends her to sign in', async () => {
  mockSession = { data: null, isPending: false };
  mockFetch(ROUTES);
  const router = await app();
  expect(await screen.findByText('sign-in screen')).toBeTruthy();
  expect(router.getPathname()).toBe('/sign-in');
});

test('signed in but not onboarded goes to onboarding', async () => {
  mockSession = { data: { user: { id: ME.id } }, isPending: false };
  mockFetch({ ...ROUTES, 'GET /me': { ...ME, onboarded: false } });
  const router = await app();
  expect(await screen.findByText('onboarding screen')).toBeTruthy();
  expect(router.getPathname()).toBe('/onboarding');
});

test('an onboarded person who lands on onboarding goes home', async () => {
  mockSession = { data: { user: { id: ME.id } }, isPending: false };
  mockFetch(ROUTES);
  const router = await app('/onboarding');
  expect(await screen.findByText(/, Niall\.$/)).toBeTruthy();
  expect(router.getPathname()).toBe('/');
});

test('four tabs in beta order; the sparkle beside them opens Create', async () => {
  mockSession = { data: { user: { id: ME.id } }, isPending: false };
  mockFetch(ROUTES);
  const router = await app();
  expect(await screen.findByText(/, Niall\.$/)).toBeTruthy();
  const tabs = screen.getAllByRole('tab').map((t) => t.props.accessibilityLabel);
  expect(tabs).toEqual([nav.today, nav.looks, nav.plan, nav.wardrobe]);
  expect(screen.getByRole('tab', { name: nav.today }).props.accessibilityState).toEqual({
    selected: true,
  });
  // The tab bar names the place, so the header carries the wordmark and the tab name is read only.
  expect(screen.getByRole('header', { name: nav.today })).toBeTruthy();

  await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${nav.create}`) }));
  await waitFor(() => expect(router.getPathname()).toBe('/create'));
  expect(screen.getByText(wardrobe.add.doors.photograph)).toBeTruthy();
  // Ask Robes is the new-look box itself, leading the sheet (beta's sparkle).
  expect(screen.getByLabelText(lookbook.prompt.doorNew)).toBeTruthy();
});

test('a long press on the sparkle goes straight to the camera', async () => {
  mockSession = { data: { user: { id: ME.id } }, isPending: false };
  mockFetch(ROUTES);
  const router = await app();
  expect(await screen.findByText(/, Niall\.$/)).toBeTruthy();
  await fireEvent(screen.getByRole('button', { name: new RegExp(`^${nav.create}`) }), 'longPress');
  // Create passes straight through to the in-app camera (legacy bc56305), not the OS one.
  await waitFor(() => expect(router.getPathname()).toBe('/wardrobe/camera'));
  expect(screen.getByRole('button', { name: wardrobe.camera.shutter })).toBeTruthy();
});

test('the avatar opens You', async () => {
  mockSession = { data: { user: { id: ME.id } }, isPending: false };
  mockFetch(ROUTES);
  const router = await app();
  await screen.findByText(/, Niall\.$/);
  await fireEvent.press(screen.getByTestId('open-you'));
  await waitFor(() => expect(router.getPathname()).toBe('/you'));
  expect(screen.getByText(twin.cards.twin)).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: twin.tabs.account }));
  expect(screen.getByRole('button', { name: you.account.title })).toBeTruthy();
  expect(screen.getByText(you.deletion.title)).toBeTruthy();
});

test('trips are hidden by default: no Create door, and a deep link lands on Today', async () => {
  mockSession = { data: { user: { id: ME.id } }, isPending: false };
  mockFetch(ROUTES);
  const router = await app();
  await screen.findByText(/, Niall\.$/);
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${nav.create}`) }));
  await waitFor(() => expect(router.getPathname()).toBe('/create'));
  await screen.findByText(wardrobe.add.doors.photograph);
  expect(screen.queryByText(shell.create.planTrip)).toBeNull();

  const deep = await app('/trip/new');
  await waitFor(() => expect(deep.getPathname()).toBe('/'));
});

test('with trips on, Create offers Plan a trip', async () => {
  mockSession = { data: { user: { id: ME.id } }, isPending: false };
  mockFetch({ ...ROUTES, 'GET /me/features': { trips: true } });
  const router = await app();
  await screen.findByText(/, Niall\.$/);
  await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${nav.create}`) }));
  await waitFor(() => expect(router.getPathname()).toBe('/create'));
  expect(await screen.findByText(shell.create.planTrip)).toBeTruthy();
});
