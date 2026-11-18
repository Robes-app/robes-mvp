import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import SignIn from '../src/app/(auth)/sign-in';
import SignUp from '../src/app/(auth)/sign-up';
import { ME, mockFetch, renderWithApi } from './support/api';

const mockSendVerificationOtp = jest.fn(async () => ({ error: null }));
const mockSignInEmailOtp = jest.fn(async () => ({ error: { message: 'bad' } }));
const mockSignInSocial = jest.fn(async (): Promise<{ error: unknown }> => ({ error: null }));
const mockGetSession = jest.fn(async (): Promise<{ data: unknown }> => ({ data: null }));
const mockReplace = jest.fn();
const mockOpenBrowser = jest.fn(async (_url: string) => ({}));

const mockSearch: { next?: string } = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => ({ ...mockSearch }),
}));
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: (url: string) => mockOpenBrowser(url),
}));
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
  // No password line (audit P1, 15 Nov): sign-in is the email code alone.
  expect(screen.queryByText('Used a password? Robes emails you a code now.')).toBeNull();
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

// Audit F6: a link opened while signed out comes back after the code; only one of ours.
test.each([
  ['/look/0a1b', '/look/0a1b'],
  ['https://evil.test/x', '/'],
  ['//evil.test', '/'],
])('after the code, a link to %s lands on %s', async (next, lands) => {
  mockSearch.next = next;
  mockSignInEmailOtp.mockResolvedValueOnce({ error: null } as never);
  try {
    mockFetch(EMAIL_ONLY);
    await renderWithApi(<SignIn />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'niall@test.dev');
    await fireEvent.press(screen.getByRole('button', { name: 'Email me a code' }));
    await fireEvent.changeText(await screen.findByLabelText('Code'), '123456');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(lands));
  } finally {
    delete mockSearch.next;
  }
});

// Design "Sign in and sign up", 18 Nov: iOS is the email code alone, and never asks the server.
test('an iPhone offers no provider, even when the server runs them', async () => {
  const calls = mockFetch({ 'GET /public/auth-providers': { apple: true, google: true } });
  await renderWithApi(<SignIn />);
  await screen.findByRole('button', { name: 'Email me a code' });
  expect(calls).toHaveLength(0);
  expect(screen.queryByText('or')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Continue with Google' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Continue with Apple' })).toBeNull();
});

describe('on Android', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'android'));
  afterEach(() => jest.restoreAllMocks());

  test('shows no provider buttons while the server offers none', async () => {
    const calls = mockFetch(EMAIL_ONLY);
    await renderWithApi(<SignIn />);
    await waitFor(() =>
      expect(calls.map((c) => c.path)).toContain('/api/v1/public/auth-providers'),
    );
    expect(screen.queryByText('or')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Continue with Google' })).toBeNull();
  });

  test('signs in with Google when the server offers it, then goes home', async () => {
    mockFetch({ 'GET /public/auth-providers': { apple: true, google: true } });
    mockGetSession.mockResolvedValueOnce({ data: { user: { id: 'u' } } });
    await renderWithApi(<SignIn />);
    expect(screen.queryByRole('button', { name: 'Continue with Apple' })).toBeNull();
    await fireEvent.press(await screen.findByRole('button', { name: 'Continue with Google' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(mockSignInSocial).toHaveBeenCalledWith({ provider: 'google', callbackURL: '/' });
  });

  test('stays put when she cancels Google, and says when it fails', async () => {
    mockFetch({ 'GET /public/auth-providers': { apple: false, google: true } });
    await renderWithApi(<SignIn />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Continue with Google' }));
    await waitFor(() => expect(mockGetSession).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();

    mockSignInSocial.mockResolvedValueOnce({ error: { message: 'nope' } });
    await fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(await screen.findByText('Robes couldn’t sign you in. Try again.')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

// Web twin: the lines under app/src/app/auth/auth-form.tsx.
test('names the Terms and the Privacy notice before she signs in, and opens each', async () => {
  mockFetch(EMAIL_ONLY);
  await renderWithApi(<SignIn />);
  await fireEvent.press(screen.getByRole('link', { name: 'Terms' }));
  await fireEvent.press(screen.getByRole('link', { name: 'Privacy notice' }));
  expect(mockOpenBrowser.mock.calls.map((c) => c[0])).toEqual([
    'http://localhost:3300/legal/terms',
    'http://localhost:3300/legal/privacy',
  ]);
});

test('sign in and sign up link to each other, keeping the link she was opening', async () => {
  mockSearch.next = '/look/0a1b';
  try {
    mockFetch(EMAIL_ONLY);
    await renderWithApi(<SignIn />);
    await fireEvent.press(screen.getByRole('link', { name: 'Create an account' }));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/sign-up',
      params: { next: '/look/0a1b' },
    });
    await renderWithApi(<SignUp />);
    await fireEvent.press(screen.getByRole('link', { name: 'Sign in' }));
    expect(mockReplace).toHaveBeenLastCalledWith({
      pathname: '/sign-in',
      params: { next: '/look/0a1b' },
    });
  } finally {
    delete mockSearch.next;
  }
});

test('the code step offers a new code and a different email', async () => {
  mockFetch(EMAIL_ONLY);
  await renderWithApi(<SignIn />);
  await fireEvent.changeText(screen.getByLabelText('Email'), 'niall@test.dev');
  await fireEvent.press(screen.getByRole('button', { name: 'Email me a code' }));
  await fireEvent.press(await screen.findByRole('link', { name: 'send a new code' }));
  await waitFor(() => expect(mockSendVerificationOtp).toHaveBeenCalledTimes(2));
  await fireEvent.press(screen.getByRole('link', { name: 'Use a different one' }));
  expect(await screen.findByText('Sign in.')).toBeTruthy();
});

describe('sign up', () => {
  test('saves her first name once the code is verified', async () => {
    mockSignInEmailOtp.mockResolvedValueOnce({ error: null } as never);
    const calls = mockFetch({
      ...EMAIL_ONLY,
      'GET /me': { ...ME, firstName: null },
      'PATCH /me': { ...ME, firstName: 'Isabel' },
    });
    await renderWithApi(<SignUp />);
    expect(screen.getByText('Create your account.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Email'), 'isabel@test.dev');
    await fireEvent.changeText(screen.getByLabelText('First name (optional)'), ' Isabel M ');
    await fireEvent.press(screen.getByRole('button', { name: 'Email me a code' }));
    await fireEvent.changeText(await screen.findByLabelText('Code'), '123456');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    const patch = calls.find((c) => c.method === 'PATCH' && c.path === '/api/v1/me');
    expect(patch?.body).toEqual({ firstName: 'Isabel' });
  });

  test('never renames an account that already has a name', async () => {
    mockSignInEmailOtp.mockResolvedValueOnce({ error: null } as never);
    const calls = mockFetch({ ...EMAIL_ONLY, 'GET /me': { ...ME, firstName: 'Niall' } });
    await renderWithApi(<SignUp />);
    await fireEvent.changeText(screen.getByLabelText('Email'), 'niall@test.dev');
    await fireEvent.changeText(screen.getByLabelText('First name (optional)'), 'Isabel');
    await fireEvent.press(screen.getByRole('button', { name: 'Email me a code' }));
    await fireEvent.changeText(await screen.findByLabelText('Code'), '123456');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(calls.some((c) => c.method === 'PATCH')).toBe(false);
  });
});
