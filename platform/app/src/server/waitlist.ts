import 'server-only';
import { ApiError } from '@robes/api';
import { marketing } from '@robes/copy';
import { renderEmail, signToken, verifyToken } from '@robes/emails';
import { repos } from './db';
import { env } from './env';
import { logger } from './logger';
import { mailer } from './mailer';

const PURPOSE = 'waitlist-confirm';
const copy = marketing.waitlist;

// Cloudflare Turnstile (SEC-60). Dev without keys skips the check; config requires them elsewhere.
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  if (!env.turnstile) return true;
  if (!token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: env.turnstile.secretKey, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5_000),
    });
    const body = (await res.json()) as { success?: boolean };
    return body.success === true;
  } catch {
    return false;
  }
}

export interface JoinInput {
  email: string;
  name?: string | undefined;
  source?: string | undefined;
  utm?: Record<string, string> | undefined;
  turnstileToken?: string | undefined;
}

// New addresses get one confirmation email; a repeat signup changes and sends nothing, and the
// caller sees the same answer either way.
export async function joinWaitlist(input: JoinInput, ip: string): Promise<void> {
  if (!(await verifyTurnstile(input.turnstileToken, ip))) throw new ApiError('forbidden');
  const id = await repos.waitlist.join(input);
  if (!id) return;
  const link = new URL(
    `/waitlist/confirm?t=${encodeURIComponent(signToken(env.UNSUB_HMAC_KEY, PURPOSE, id))}`,
    env.BETTER_AUTH_URL,
  ).toString();
  const { html, text } = renderEmail({
    heading: copy.email.subject,
    body: copy.email.body,
    cta: { label: copy.email.cta, url: link },
    notice: copy.email.notice,
    privacyUrl: new URL('/legal/privacy', env.BETTER_AUTH_URL).toString(),
    privacyLabel: 'Privacy',
  });
  try {
    await mailer.send({ to: input.email, subject: copy.email.subject, html, text });
  } catch (err) {
    // The row stands; a retry of the signup is a no-op, so log for follow-up rather than fail.
    logger.warn({ reason: err instanceof Error ? err.message : 'unknown' }, 'waitlist_mail_failed');
  }
}

export function readConfirmToken(token: string): string | null {
  return verifyToken(env.UNSUB_HMAC_KEY, PURPOSE, token);
}

export async function confirmWaitlist(token: string): Promise<boolean> {
  const id = readConfirmToken(token);
  if (!id) return false;
  await repos.waitlist.confirm(id);
  return (await repos.waitlist.get(id))?.confirmedAt != null;
}
