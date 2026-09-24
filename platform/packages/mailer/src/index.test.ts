import { SendEmailCommand } from '@aws-sdk/client-sesv2';
import { describe, expect, it, vi } from 'vitest';
import { createMemoryMailer, createSesMailer } from './index';

describe('mailer', () => {
  it('records mail in memory', async () => {
    const mailer = createMemoryMailer();
    await mailer.send({ to: 'a@b.co', subject: 'Hi', text: 'Hello' });
    expect(mailer.sent).toEqual([{ to: 'a@b.co', subject: 'Hi', text: 'Hello' }]);
  });

  it('sends through SES with the configuration set', async () => {
    const send = vi.fn(async () => ({}));
    const mailer = createSesMailer(
      { region: 'eu-west-1', from: 'Robes <hello@mail.byrobes.com>', configurationSet: 'robes' },
      { send } as never,
    );
    await mailer.send({ to: 'a@b.co', subject: '123456 is your Robes code', text: 'x' });
    const command = (send.mock.calls[0] as unknown[] | undefined)?.[0] as SendEmailCommand;
    expect(command).toBeInstanceOf(SendEmailCommand);
    expect(command.input).toMatchObject({
      FromEmailAddress: 'Robes <hello@mail.byrobes.com>',
      Destination: { ToAddresses: ['a@b.co'] },
      ConfigurationSetName: 'robes',
    });
  });

  it('passes custom headers to SES (one-click unsubscribe)', async () => {
    const send = vi.fn(async () => ({}));
    const mailer = createSesMailer({ region: 'eu-west-1', from: 'x@y.z' }, { send } as never);
    await mailer.send({
      to: 'a@b.co',
      subject: 's',
      text: 't',
      headers: {
        'List-Unsubscribe': '<https://x/u>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
    const command = (send.mock.calls[0] as unknown[] | undefined)?.[0] as SendEmailCommand;
    expect(command.input.Content?.Simple?.Headers).toEqual([
      { Name: 'List-Unsubscribe', Value: '<https://x/u>' },
      { Name: 'List-Unsubscribe-Post', Value: 'List-Unsubscribe=One-Click' },
    ]);
  });

  it('never leaks the provider message', async () => {
    const failure = Object.assign(new Error('Email address is not verified: a@b.co'), {
      name: 'MessageRejected',
    });
    const mailer = createSesMailer({ region: 'eu-west-1', from: 'x@y.z' }, {
      send: vi.fn(async () => {
        throw failure;
      }),
    } as never);
    await expect(mailer.send({ to: 'a@b.co', subject: 's', text: 't' })).rejects.toThrow(
      'email send failed (MessageRejected)',
    );
  });
});
