import { fireEvent, screen } from '@testing-library/react-native';
import { StackScreen } from '../src/components/StackScreen';
import { ME, mockFetch, renderWithApi } from './support/api';
import { mockRouter } from './support/router';

jest.mock('expo-router', () => jest.requireActual('./support/router').mockRouterModule);
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

beforeEach(() => jest.clearAllMocks());

test('a screen reached from home or onboarding goes back home, never into onboarding', async () => {
  mockFetch({ 'GET /me': ME });
  await renderWithApi(<StackScreen home>{null}</StackScreen>);
  await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
  expect(mockRouter.back).not.toHaveBeenCalled();
  expect(mockRouter.replace).toHaveBeenCalledWith('/');
});
