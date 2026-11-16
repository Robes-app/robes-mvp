import { firstRun as copy, you } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import Onboarding from '../src/app/onboarding/index';
import { ME, mockFetch, renderWithApi } from './support/api';

// Audit F7: onboarding keeps her answers on the phone as she goes, and offers a way out.
const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItem: (k: string) => mockStore.get(k) ?? null,
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockStore.delete(k)),
}));
jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
const mockSignOut = jest.fn(async () => ({}));
jest.mock('../src/lib/auth-client', () => ({
  authClient: { getCookie: () => null, signOut: () => mockSignOut() },
}));

const key = `robes.onboarding.${ME.id}`;
beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
});

test('closing the app mid-way brings her back to the step she was on, answers kept', async () => {
  mockStore.set(
    key,
    JSON.stringify({ step: 3, identity: 'man', styles: ['Utility'], brands: [], colours: {} }),
  );
  mockFetch({ 'GET /me': { ...ME, onboarded: false } });
  await renderWithApi(<Onboarding />);
  await waitFor(() =>
    expect(
      screen.getByText(`${copy.styles.title} ${copy.styles.titleEm}`, { exact: false }),
    ).toBeTruthy(),
  );
  expect(
    screen.getByRole('button', { name: 'Love Utility' }).props.accessibilityState,
  ).toMatchObject({ selected: true });
  // Each answer is kept as she gives it.
  await fireEvent.press(screen.getByRole('button', { name: 'Love Heritage' }));
  await waitFor(() => expect(JSON.parse(mockStore.get(key) ?? '{}').styles).toContain('Heritage'));
});

test('every step offers a way out: sign out', async () => {
  mockFetch({ 'GET /me': { ...ME, onboarded: false } });
  await renderWithApi(<Onboarding />);
  await fireEvent.press(screen.getByTestId('splash'));
  await fireEvent.press(screen.getByRole('button', { name: you.signOut }));
  await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
});
