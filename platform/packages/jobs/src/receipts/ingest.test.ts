import { readFileSync } from 'node:fs';
import { AiError, createFakeProvider } from '@robes/ai';
import { FEATURE, fakeOutput } from '@robes/ai/prompts/receipt-read';
import { QuotaExceeded, verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';
import { ingestReceipt, type ReceiptDeps } from './ingest';
import { notification } from './mail.test';

const EML = new Uint8Array(readFileSync(new URL('./fixtures/receipt.eml', import.meta.url)));
const NIALL = verifiedUserId('11111111-1111-4111-8111-111111111111');
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

function setup(over: Partial<ReceiptDeps> & { output?: object; owner?: boolean } = {}) {
  const intake = {
    userForAddress: vi.fn(async (a: string) =>
      over.owner === false || a !== 'abcdefghij0123456789' ? undefined : NIALL,
    ),
    hasProvider: vi.fn(async () => false),
    fromReceipt: vi.fn(async () => ({ id: 'inbox-1', created: true })),
    queuePhotoReads: vi.fn(async () => [
      { jobId: 'job-1', url: 'https://static.shop.test/coat.jpg' },
      { jobId: 'job-2', url: 'https://static.shop.test/scarf.jpg' },
    ]),
  };
  const deps: ReceiptDeps = {
    ai: createFakeProvider({ [FEATURE]: () => ({ ...fakeOutput(), ...over.output }) }),
    storage: { getObject: vi.fn(async () => EML) },
    intake: intake as never,
    ledger: { record: vi.fn(async () => {}) },
    domain: 'in.robes.local',
    logger,
    onHeld: vi.fn(async () => {}),
    ...over,
  };
  return { deps, intake };
}

describe('ingestReceipt', () => {
  it('holds the pieces for her review and sends the receipt mail once', async () => {
    const { deps, intake } = setup();
    expect(await ingestReceipt(deps, notification())).toEqual({
      status: 'held',
      inboxId: 'inbox-1',
      items: 2,
    });
    expect(deps.storage.getObject).toHaveBeenCalledWith('inbound/ses-message-1');
    expect(intake.fromReceipt).toHaveBeenCalledWith(
      NIALL,
      expect.objectContaining({
        providerId: 'ses:ses-message-1',
        retailer: 'Sézane',
        orderRef: 'SZ-100200',
        items: [
          expect.objectContaining({ label: 'Camel wool coat', price: 340, currency: 'EUR' }),
          expect.objectContaining({ label: 'Silk scarf' }),
        ],
      }),
    );
    expect(deps.onHeld).toHaveBeenCalledWith({
      userId: NIALL,
      inboxId: 'inbox-1',
      retailer: 'Sézane',
      count: 2,
    });
    expect(deps.ledger.record).toHaveBeenCalledWith(
      expect.objectContaining({ userId: NIALL, status: 'ok' }),
    );
  });

  // Legacy's vision pass: each line's photo is a receipt_read job, fetched only by the isolated
  // fetcher (SEC-40); this worker follows no link in the mail itself.
  it('asks the fetcher for each line’s photo once the receipt is held', async () => {
    const requestPhoto = vi.fn(async (_photo: { jobId: string; url: string }) => {});
    const { deps, intake } = setup({ requestPhoto });
    expect((await ingestReceipt(deps, notification())).status).toBe('held');
    expect(intake.queuePhotoReads).toHaveBeenCalledWith(NIALL, 'inbox-1');
    expect(requestPhoto.mock.calls.map((c) => c[0])).toEqual([
      { jobId: 'job-1', url: 'https://static.shop.test/coat.jpg' },
      { jobId: 'job-2', url: 'https://static.shop.test/scarf.jpg' },
    ]);
  });

  it('keeps the receipt when its photos can’t be asked for, and asks nothing for a re-read', async () => {
    const failing = setup({ requestPhoto: vi.fn(async () => Promise.reject(new Error('sqs'))) });
    expect((await ingestReceipt(failing.deps, notification())).status).toBe('held');
    expect(logger.warn).toHaveBeenCalledWith({ reason: 'sqs' }, 'receipt_photos_failed');
    const again = setup({ requestPhoto: vi.fn(async () => {}) });
    again.intake.fromReceipt.mockResolvedValue({ id: 'inbox-1', created: false });
    await ingestReceipt(again.deps, notification());
    expect(again.intake.queuePhotoReads).not.toHaveBeenCalled();
  });

  it('drops mail that is not for a live address, failed a check, or was already read', async () => {
    expect(await ingestReceipt(setup({ owner: false }).deps, notification())).toMatchObject({
      reason: 'unknown_address',
    });
    const spoof = notification({ spfVerdict: { status: 'FAIL' } });
    const failed = setup();
    expect(await ingestReceipt(failed.deps, spoof)).toMatchObject({ reason: 'verdict' });
    expect(failed.deps.storage.getObject).not.toHaveBeenCalled();
    const dup = setup();
    dup.intake.hasProvider.mockResolvedValue(true);
    expect(await ingestReceipt(dup.deps, notification())).toMatchObject({ reason: 'duplicate' });
  });

  it('drops a mail that is not a receipt, and one past her quota', async () => {
    const notReceipt = setup({ output: { is_receipt: false, items: [] } });
    expect(await ingestReceipt(notReceipt.deps, notification())).toMatchObject({
      reason: 'not_a_receipt',
    });
    const over = setup();
    over.intake.fromReceipt.mockRejectedValue(new QuotaExceeded(new Date()));
    expect(await ingestReceipt(over.deps, notification())).toMatchObject({ reason: 'quota' });
  });

  it('keeps the held row when the mail fails, and retries only transient model failures', async () => {
    const mailFails = setup({ onHeld: vi.fn(async () => Promise.reject(new Error('smtp down'))) });
    expect((await ingestReceipt(mailFails.deps, notification())).status).toBe('held');
    const ai = {
      name: 'fake' as const,
      generateJson: vi.fn(async () => {
        throw new AiError('timeout');
      }),
      generateImage: vi.fn(),
    };
    await expect(
      ingestReceipt(setup({ ai: ai as never }).deps, notification()),
    ).rejects.toBeInstanceOf(AiError);
  });
});
