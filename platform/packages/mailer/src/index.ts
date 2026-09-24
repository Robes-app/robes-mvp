import nodemailer from 'nodemailer';

export interface Email {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface Mailer {
  send(email: Email): Promise<void>;
}

export type MailerConfig =
  | { transport: 'smtp'; url: string; from: string }
  | { transport: 'resend'; apiKey: string; from: string }
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

function createResendMailer(apiKey: string, from: string): Mailer {
  return {
    async send(email) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from, ...email }),
        signal: AbortSignal.timeout(10_000),
      });
      // Provider detail stays out of errors and logs (SEC-31/83).
      if (!res.ok) throw new Error(`email send failed (${res.status})`);
    },
  };
}

export function createMailer(config: MailerConfig): Mailer {
  switch (config.transport) {
    case 'smtp':
      return createSmtpMailer(config.url, config.from);
    case 'resend':
      return createResendMailer(config.apiKey, config.from);
    case 'memory':
      return createMemoryMailer();
  }
}
