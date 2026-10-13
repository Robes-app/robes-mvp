import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import nodemailer from 'nodemailer';

export interface Email {
  to: string;
  subject: string;
  text: string;
  html?: string;
  // e.g. List-Unsubscribe / List-Unsubscribe-Post (RFC 8058).
  headers?: Record<string, string>;
}

export interface Mailer {
  send(email: Email): Promise<void>;
}

// SES in deployed environments (ADR-021); SMTP to the local mail catcher in dev.
export type MailerConfig =
  | { transport: 'smtp'; url: string; from: string }
  | {
      transport: 'ses';
      region: string;
      from: string;
      configurationSet?: string | undefined;
      // Explicit keys (the Vercel API); omitted in Lambda, which uses its role.
      credentials?: { accessKeyId: string; secretAccessKey: string } | undefined;
    }
  | { transport: 'memory'; from: string };

// Test double that records mail instead of sending it.
export function createMemoryMailer(): Mailer & { sent: Email[] } {
  const sent: Email[] = [];
  return {
    sent,
    async send(email) {
      sent.push(email);
    },
  };
}

function createSmtpMailer(url: string, from: string): Mailer {
  const transport = nodemailer.createTransport(url);
  return {
    async send(email) {
      await transport.sendMail({ from, ...email });
    },
  };
}

// Credentials come from the standard AWS chain (env access keys on Vercel, the role in Lambda).
export function createSesMailer(
  config: {
    region: string;
    from: string;
    configurationSet?: string | undefined;
    credentials?: { accessKeyId: string; secretAccessKey: string } | undefined;
  },
  client: Pick<SESv2Client, 'send'> = new SESv2Client({
    region: config.region,
    ...(config.credentials ? { credentials: config.credentials } : {}),
  }),
): Mailer {
  return {
    async send(email) {
      try {
        await client.send(
          new SendEmailCommand({
            FromEmailAddress: config.from,
            Destination: { ToAddresses: [email.to] },
            ConfigurationSetName: config.configurationSet,
            Content: {
              Simple: {
                Subject: { Data: email.subject, Charset: 'UTF-8' },
                Body: {
                  Text: { Data: email.text, Charset: 'UTF-8' },
                  ...(email.html ? { Html: { Data: email.html, Charset: 'UTF-8' } } : {}),
                },
                ...(email.headers
                  ? {
                      Headers: Object.entries(email.headers).map(([Name, Value]) => ({
                        Name,
                        Value,
                      })),
                    }
                  : {}),
              },
            },
          }),
          { abortSignal: AbortSignal.timeout(10_000) },
        );
      } catch (err) {
        // Provider detail stays out of errors and logs (SEC-31/83).
        const name = err instanceof Error ? err.name : 'unknown';
        throw new Error(`email send failed (${name})`);
      }
    },
  };
}

export function createMailer(config: MailerConfig): Mailer {
  switch (config.transport) {
    case 'smtp':
      return createSmtpMailer(config.url, config.from);
    case 'ses':
      return createSesMailer(config);
    case 'memory':
      return createMemoryMailer();
  }
}
