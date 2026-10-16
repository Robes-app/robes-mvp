import { verifyUnsub } from '@robes/emails';
import { createMemoryMailer } from '@robes/mailer';
import { describe, expect, it, vi } from 'vitest';
import { sendReceiptMail } from './receipt';

const NIALL = '11111111-1111-4111-8111-111111111111';
const held = { userId: NIALL as never, inboxId: 'inbox-1', retailer: 'Sézane', count: 2 };

function setup(prefs: Record<string, boolean> = {}) {
  const notifier = {
    recipient: vi.fn(async () => ({
      id: NIALL,
      email: 'niall@test.dev',
      notificationPrefs: prefs,
    })),
    claim: vi.fn(async () => true),
    release: vi.fn(async () => {}),
  };
  const mailer = createMemoryMailer();
  return {
    notifier,
    mailer,
    deps: { notifier, mailer, appUrl: 'https://app.test', unsubSecret: 's'.repeat(40) },
  };
}

describe('sendReceiptMail', () => {
  it('mails once with a receipts-only one-click unsubscribe', async () => {
    const { deps, mailer, notifier } = setup();
    expect(await sendReceiptMail(deps, held)).toBe(true);
    const [mail] = mailer.sent;
    expect(mail?.subject).toBe('Robes read your Sézane receipt.');
    expect(mail?.text).toContain('https://app.test/wardrobe/inbox?from=email');
    const token = decodeURIComponent(
      new URL(mail?.headers?.['List-Unsubscribe']?.slice(1, -1) ?? '').pathname.split('/').at(-1) ??
        '',
    );
    expect(verifyUnsub('s'.repeat(40), token)).toEqual({ userId: NIALL, pref: 'receipts' });
    expect(notifier.claim).toHaveBeenCalledWith(NIALL, 'receipt', 'inbox-1');
  });

  it('respects the receipts preference and the ledger', async () => {
    const off = setup({ receipts: false });
    expect(await sendReceiptMail(off.deps, held)).toBe(false);
    expect(off.mailer.sent).toEqual([]);
    const sent = setup();
    sent.notifier.claim.mockResolvedValue(false);
    expect(await sendReceiptMail(sent.deps, held)).toBe(false);
  });

  it('gives the claim back when the transport fails', async () => {
    const { deps, notifier } = setup();
    const failing = {
      ...deps,
      mailer: { send: vi.fn(async () => Promise.reject(new Error('down'))) },
    };
    await expect(sendReceiptMail(failing, held)).rejects.toThrow('down');
    expect(notifier.release).toHaveBeenCalledWith(NIALL, 'receipt', 'inbox-1');
  });
});
