import { emails } from '@robes/copy';
import type { Email } from '@robes/mailer';

type OtpType = 'sign-in' | 'email-verification' | 'forget-password' | 'change-email';

// Plain text keeps OTP mail deliverable; branded templates arrive with @robes/emails (M6).
export function otpEmail(to: string, otp: string, type: OtpType): Email {
  return {
    to,
    subject: emails.otpSubject(otp),
    text: emails.otpBody(otp, type === 'sign-in' ? 'sign-in' : 'verify'),
  };
}
