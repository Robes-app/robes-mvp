import { nav, shell, twin, ui, you } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';
import NotFound from '../src/app/+not-found';
import TabsLayout from '../src/app/(tabs)/_layout';
import Today from '../src/app/(tabs)/index';
import Looks from '../src/app/(tabs)/looks';
import Plan from '../src/app/(tabs)/plan';
import Wardrobe from '../src/app/(tabs)/wardrobe';
import OnboardingLayout from '../src/app/onboarding/_layout';
import Soon from '../src/app/soon';
import NewTrip from '../src/app/trip/new';
import YouIndex from '../src/app/you/index';
import { nativePath } from '../src/lib/links';
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
      '+not-found': NotFound,
      soon: Soon,
      'trip/new': NewTrip,
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

type Node = { type: string; props: Record<string, unknown>; children: Node[] | null };

// Host views in render order whose props pass `match` (the system tab bar's own views).
function hostViews(match: (props: Record<string, unknown>) => boolean): Node[] {
  const out: Node[] = [];
  const walk = (n: unknown): void => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) {
      for (const child of n) walk(child);
      return;
    }
    const node = n as Node;
    if (match(node.props ?? {})) out.push(node);
    (node.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}

// The tab screens the system tab bar hosts: one per tab, in bar order.
const tabItems = () => hostViews((p) => typeof p.tabBarItemTestID === 'string');

test('four tabs in the system tab bar, in beta order, and no Create beside them', async () => {
  mockSession = { data: { user: { id: ME.id } }, isPending: false };
  mockFetch(ROUTES);
  await app();
  expect(await screen.findByText(/, Niall\.$/)).toBeTruthy();
  const tabs = tabItems();
  // Read in sentence case; shown in capitals.
  expect(tabs.map((t) => t.props.tabBarItemAccessibilityLabel)).toEqual([
    nav.today,
    nav.looks,
    nav.plan,
    nav.wardrobe,
  ]);
  expect(tabs.map((t) => t.props.title)).toEqual(['HOME', 'LOOKBOOK', 'DIARY', 'WARDROBE']);
  expect(tabs.map((t) => t.props.tabBarItemTestID)).toEqual([
    'today-tab',
    'looks-tab',
    'plan-tab',
    'wardrobe-tab',
  ]);
  // The sparkle is gone: dressing starts from home's composer.
  expect(screen.queryByRole('button', { name: nav.create })).toBeNull();
  // The bar carries the wordmark as a header labelled Robes, never a button.
  expect(screen.getAllByRole('header', { name: ui.wordmark }).length).toBeGreaterThan(0);
});

test('the bar minimises on scroll over the Lookbook and Wardrobe grids only', async () => {
  mockSession = { data: { user: { id: ME.id } }, isPending: false };
  mockFetch(ROUTES);
  const host = () =>
    hostViews((p) => p.tabBarMinimizeBehavior !== undefined)[0]?.props.tabBarMinimizeBehavior;
  await app();
  await screen.findByText(/, Niall\.$/);
  expect(host()).toBe('never');
  await app('/looks');
  await waitFor(() => expect(host()).toBe('onScrollDown'));
});

test('the avatar opens You', async () => {
  mockSession = { data: { user: { id: ME.id } }, isPending: false };
  mockFetch(ROUTES);
  const router = await app();
  await screen.findByText(/, Niall\.$/);
  // Every tab is mounted under the system tab bar; Home's bar is the first.
  const [avatar] = screen.getAllByTestId('open-you');
  if (!avatar) throw new Error('no avatar');
  // Felix's 30pt disc keeps a 44pt hit area.
  expect(avatar.props.hitSlop).toBe(7);
  await fireEvent.press(avatar);
  await waitFor(() => expect(router.getPathname()).toBe('/you'));
  expect(screen.getByText(twin.cards.twin)).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: twin.tabs.account }));
  expect(await screen.findByText(you.account.name)).toBeTruthy();
  expect(screen.getByText(you.deletion.title)).toBeTruthy();
});

test('trips are hidden by default: a deep link lands on Home', async () => {
  mockSession = { data: { user: { id: ME.id } }, isPending: false };
  mockFetch(ROUTES);
  const deep = await app('/trip/new');
  await waitFor(() => expect(deep.getPathname()).toBe('/'));
});

test('a link to a screen that isn’t here says so in one line and goes home', async () => {
  mockSession = { data: { user: { id: ME.id } }, isPending: false };
  mockFetch(ROUTES);
  const router = await app(nativePath('robes://looks/nope'));
  expect(await screen.findByText(shell.notFound.title)).toBeTruthy();
  expect(router.getPathname()).toBe('/looks/nope');
  await fireEvent.press(screen.getByRole('button', { name: shell.notFound.back }));
  expect(await screen.findByText(/, Niall\.$/)).toBeTruthy();
  expect(router.getPathname()).toBe('/');
});

test('the back chevron on a missing screen goes home too', async () => {
  mockSession = { data: { user: { id: ME.id } }, isPending: false };
  mockFetch(ROUTES);
  const router = await app('/plan/tomorrow');
  expect(await screen.findByText(shell.notFound.title)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ui.back }));
  await waitFor(() => expect(router.getPathname()).toBe('/'));
});
