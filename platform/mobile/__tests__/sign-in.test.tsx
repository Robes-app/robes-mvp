import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import SignIn from '../src/app/sign-in';

const mockSendVerificationOtp = jest.fn(async () => ({ error: null }));
const mockSignInEmailOtp = jest.fn(async () => ({ error: { message: 'bad' } }));
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('../src/lib/auth-client', () => ({
  authClient: {
    emailOtp: { sendVerificationOtp: (...a: unknown[]) => mockSendVerificationOtp(...(a as [])) },
    signIn: { emailOtp: (...a: unknown[]) => mockSignInEmailOtp(...(a as [])) },
  },
}));

test('rejects a malformed email without calling the server', async () => {
  await render(<SignIn />);
  await fireEvent.changeText(screen.getByLabelText('Email'), 'not-an-email');
  await fireEvent.press(screen.getByRole('button', { name: 'Email me a code' }));
  expect(await screen.findByText('That email doesn’t look quite right.')).toBeTruthy();
  expect(mockSendVerificationOtp).not.toHaveBeenCalled();
});

test('sends a code, then shows the code step and a wrong-code message', async () => {
  await render(<SignIn />);
  await fireEvent.changeText(screen.getByLabelText('Email'), 'ann@test.dev');
  await fireEvent.press(screen.getByRole('button', { name: 'Email me a code' }));
  expect(await screen.findByText('Check your email.')).toBeTruthy();
  expect(mockSendVerificationOtp).toHaveBeenCalledWith({ email: 'ann@test.dev', type: 'sign-in' });

  await fireEvent.changeText(screen.getByLabelText('Code'), '12a3456');
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  await waitFor(() =>
    expect(mockSignInEmailOtp).toHaveBeenCalledWith({ email: 'ann@test.dev', otp: '123456' }),
  );
  expect(await screen.findByText('That code didn’t match. Check it and try again.')).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});
