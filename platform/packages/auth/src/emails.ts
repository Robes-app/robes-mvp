import type { Email } from '@robes/mailer';

type OtpType = 'sign-in' | 'email-verification' | 'forget-password' | 'change-email';

// Moves to @robes/emails (React Email + tokens) in M6; plain text keeps OTP mail deliverable now.
export function otpEmail(to: string, otp: string, type: OtpType): Email {
  const action = type === 'sign-in' ? 'sign in to Robes' : 'confirm your email';
  return {
    to,
    subject: `${otp} is your Robes code`,
    text: `Your code to ${action} is ${otp}.\n\nIt expires in 10 minutes. If you didn't ask for it, you can ignore this email.`,
  };
}
