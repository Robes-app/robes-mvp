import { firstRun as copy, you } from '@robes/copy';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import Onboarding from '../src/app/onboarding/index';
import { ME, mockFetch, renderWithApi } from './support/api';

// Audit F7: onboarding keeps her answers on the phone as she goes.
const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItem: (k: string) => mockStore.get(k) ?? null,
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockStore.delete(k)),
}));
jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

const key = `robes.onboarding.${ME.id}`;
beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
});

test('closing the app mid-way brings her back to the step she was on, answers kept', async () => {
  mockStore.set(
    key,
    JSON.stringify({ step: 'styles', identity: 'man', styles: ['Utility'], brands: [] }),
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

test('the questions offer no sign out (Annie, 17 Nov)', async () => {
  mockFetch({ 'GET /me': { ...ME, onboarded: false } });
  await renderWithApi(<Onboarding />);
  await fireEvent.press(screen.getByTestId('splash'));
  expect(
    screen.getByText(`${copy.name.title} ${copy.name.titleEm}`, { exact: false }),
  ).toBeTruthy();
  expect(screen.queryByRole('button', { name: you.signOut })).toBeNull();
});
