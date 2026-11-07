import { fireEvent, screen } from '@testing-library/react-native';
import { PlaceSheet } from '../src/features/home/PlaceSheet';
import { mockFetch, renderWithApi } from './support/api';

jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

// Two towns can share a name and a country: each is its own row, told apart by where it is
// (the duplicate key once logged a console error and could drop one of them).
test('two towns with one name are two rows', async () => {
  const hit = (lat: number, lon: number) => ({
    city: 'Paris',
    country: 'United States',
    lat,
    lon,
    weather: null,
  });
  mockFetch({ 'GET /places': { items: [hit(33.66, -95.56), hit(36.3, -88.33)] } });
  const errors = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  await renderWithApi(
    <PlaceSheet
      open
      date="2026-11-06"
      today="2026-11-06"
      home={null}
      current={null}
      onPick={() => undefined}
      onClose={() => undefined}
    />,
  );
  await fireEvent.changeText(screen.getByTestId('place-search'), 'Paris');
  expect(await screen.findAllByRole('button', { name: /^Paris/ })).toHaveLength(2);
  expect(errors.mock.calls.some((c) => String(c[0]).includes('same key'))).toBe(false);
  errors.mockRestore();
});
