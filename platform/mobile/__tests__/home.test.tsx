import { render, screen } from '@testing-library/react-native';
import { TodayView } from '../src/app/index';

jest.mock('../src/lib/auth-client', () => ({ authClient: {} }));

const me = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ann@test.dev',
  firstName: 'Ann',
  lastName: null,
  instagramHandle: null,
  locale: 'en-IE',
  timezone: 'Europe/Dublin',
  currency: 'EUR',
  homeCity: null,
  onboarded: true,
};

test('Today greets her by name and offers sign out', async () => {
  await render(<TodayView me={me} onSignOut={() => {}} />);
  expect(screen.getByText(/, Ann\.$/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
});
