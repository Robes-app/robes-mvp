import { describe, expect, it } from 'vitest';
import { otpEmail } from './emails';

describe('otpEmail', () => {
  it('puts the code first in the subject so it shows in notifications', () => {
    const mail = otpEmail('a@b.co', '123456', 'sign-in');
    expect(mail.subject.startsWith('123456 ')).toBe(true);
    expect(mail.text).toContain('sign in to Robes');
    expect(mail.to).toBe('a@b.co');
  });

  it('describes verification codes differently from sign-in', () => {
    expect(otpEmail('a@b.co', '654321', 'email-verification').text).toContain('confirm your email');
  });
});
