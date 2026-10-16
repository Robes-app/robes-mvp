import 'server-only';
import { createMailer } from '@robes/mailer';
import { env } from './env';

// One transport per server instance: SMTP to Mailpit in dev, SES when deployed (ADR-021).
export const mailer = createMailer(env.mail);
