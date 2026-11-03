import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import SignIn from '../src/app/(auth)/sign-in';
import { mockFetch, renderWithApi } from './support/api';

const mockSendVerificationOtp = jest.fn(async () => ({ error: null }));
const mockSignInEmailOtp = jest.fn(async () => ({ error: { message: 'bad' } }));
const mockSignInSocial = jest.fn(async (): Promise<{ error: unknown }> => ({ error: null }));
const mockGetSession = jest.fn(async (): Promise<{ data: unknown }> => ({ data: null }));
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('../src/lib/auth-client', () => ({
  authClient: {
    getCookie: () => null,
    getSession: () => mockGetSession(),
    emailOtp: { sendVerificationOtp: (...a: unknown[]) => mockSendVerificationOtp(...(a as [])) },
    signIn: {
      emailOtp: (...a: unknown[]) => mockSignInEmailOtp(...(a as [])),
      social: (...a: unknown[]) => mockSignInSocial(...(a as [])),
    },
  },
}));

beforeEach(() => jest.clearAllMocks());

const EMAIL_ONLY = { 'GET /public/auth-providers': { apple: false, google: false } };

test('rejects a malformed email without calling the server', async () => {
  mockFetch(EMAIL_ONLY);
  await renderWithApi(<SignIn />);
  // One line for testers who signed in with a password on beta (F4).
  expect(screen.getByText('Used a password? Robes emails you a code now.')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Email'), 'not-an-email');
  await fireEvent.press(screen.getByRole('button', { name: 'Email me a code' }));
  expect(await screen.findByText('That email doesn’t look quite right.')).toBeTruthy();
  expect(mockSendVerificationOtp).not.toHaveBeenCalled();
});

test('sends a code, then shows the code step and a wrong-code message', async () => {
  mockFetch(EMAIL_ONLY);
  await renderWithApi(<SignIn />);
  await fireEvent.changeText(screen.getByLabelText('Email'), 'niall@test.dev');
  await fireEvent.press(screen.getByRole('button', { name: 'Email me a code' }));
  expect(await screen.findByText('Check your email.')).toBeTruthy();
  expect(mockSendVerificationOtp).toHaveBeenCalledWith({
    email: 'niall@test.dev',
    type: 'sign-in',
  });

  await fireEvent.changeText(screen.getByLabelText('Code'), '12a3456');
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await waitFor(() =>
    expect(mockSignInEmailOtp).toHaveBeenCalledWith({ email: 'niall@test.dev', otp: '123456' }),
  );
  expect(await screen.findByText('That code didn’t match. Check it and try again.')).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});

// F5: the phone shows the providers the server runs, in the web's order (Apple, then Google).
test('shows no provider buttons while the server offers none', async () => {
  const calls = mockFetch(EMAIL_ONLY);
  await renderWithApi(<SignIn />);
  await waitFor(() => expect(calls.map((c) => c.path)).toContain('/api/v1/public/auth-providers'));
  expect(screen.queryByText('or')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Continue with Google' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Continue with Apple' })).toBeNull();
});

test('shows no provider buttons when the server cannot be asked', async () => {
  const calls = mockFetch({});
  await renderWithApi(<SignIn />);
  await waitFor(() => expect(calls.length).toBe(1));
  expect(screen.queryByRole('button', { name: 'Continue with Google' })).toBeNull();
});

test('signs in with Google when the server offers it, then goes home', async () => {
  mockFetch({ 'GET /public/auth-providers': { apple: false, google: true } });
  mockGetSession.mockResolvedValueOnce({ data: { user: { id: 'u' } } });
  await renderWithApi(<SignIn />);
  const google = await screen.findByRole('button', { name: 'Continue with Google' });
  expect(screen.queryByRole('button', { name: 'Continue with Apple' })).toBeNull();
  await fireEvent.press(google);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  expect(mockSignInSocial).toHaveBeenCalledWith({ provider: 'google', callbackURL: '/' });
});

test('puts Apple first, stays put when she cancels, and says when it fails', async () => {
  mockFetch({ 'GET /public/auth-providers': { apple: true, google: true } });
  await renderWithApi(<SignIn />);
  await screen.findByRole('button', { name: 'Continue with Google' });
  const labels = screen
    .getAllByRole('button')
    .map((b) => b.props.accessibilityLabel as string | undefined)
    .filter((l) => l?.startsWith('Continue with'));
  expect(labels).toEqual(['Continue with Apple', 'Continue with Google']);

  await fireEvent.press(screen.getByRole('button', { name: 'Continue with Apple' }));
  await waitFor(() => expect(mockGetSession).toHaveBeenCalled());
  expect(mockReplace).not.toHaveBeenCalled();

  mockSignInSocial.mockResolvedValueOnce({ error: { message: 'nope' } });
  await fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));
  expect(await screen.findByText('Robes couldn’t sign you in. Try again.')).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});
