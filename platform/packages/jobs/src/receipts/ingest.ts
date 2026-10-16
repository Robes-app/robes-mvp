import { AiError, type AiProvider, type Usage } from '@robes/ai';
import {
  buildUser,
  FEATURE,
  Output,
  type ReceiptItem,
  SYSTEM,
  toItems,
} from '@robes/ai/prompts/receipt-read';
import { QuotaExceeded, type SystemRepositories, type UserId } from '@robes/db';
import type { MediaStorage } from '@robes/media/storage';
import type { JobLogger } from '../logger';
import { localPartOf, parseMail, type SesNotification, verdictsPass } from './mail';

export interface HeldReceipt {
  userId: UserId;
  inboxId: string;
  retailer: string;
  count: number;
}

export interface ReceiptDeps {
  ai: AiProvider;
  storage: Pick<MediaStorage, 'getObject'>;
  intake: SystemRepositories['inboxIntake'];
  ledger: Pick<SystemRepositories['ledger'], 'record'>;
  // `in.<stage mail domain>`; mail to any other domain is not ours.
  domain: string;
  logger: JobLogger;
  // The "Robes read your receipt" email; a failure here never undoes the held row.
  onHeld?(receipt: HeldReceipt): Promise<void>;
}

export type IngestOutcome =
  | { status: 'held'; inboxId: string; items: number }
  | {
      status: 'dropped';
      reason:
        | 'verdict'
        | 'unknown_address'
        | 'duplicate'
        | 'missing'
        | 'unreadable'
        | 'not_a_receipt'
        | 'quota';
    };

function inboxItem(item: ReceiptItem) {
  return {
    label: item.label,
    brand: item.brand,
    price: item.price,
    currency: item.currency,
    imageUrl: item.imageUrl,
    sourceUrl: null,
    category: item.category,
    categoryL2: item.categoryL2,
    categoryL3: item.categoryL3,
    color: item.color,
    size: item.size,
    quantity: item.quantity,
  };
}

// A forwarded order mail → one held Inbox row (legacy inbox.js ingest, minus the image fetches:
// nothing in an inbound mail is ever followed). Returns an outcome instead of throwing for every
// "not for us" case, so SQS only retries genuinely transient failures (storage, the model).
export async function ingestReceipt(deps: ReceiptDeps, n: SesNotification): Promise<IngestOutcome> {
  const drop = (reason: Extract<IngestOutcome, { status: 'dropped' }>['reason']) => {
    deps.logger.info({ reason }, 'receipt_dropped');
    return { status: 'dropped', reason } as const;
  };
  if (!verdictsPass(n.receipt)) return drop('verdict');

  let userId: UserId | undefined;
  for (const recipient of n.receipt.recipients) {
    const local = localPartOf(recipient, deps.domain);
    if (local) userId = await deps.intake.userForAddress(local);
    if (userId) break;
  }
  if (!userId) return drop('unknown_address');

  const providerId = `ses:${n.mail.messageId}`;
  if (await deps.intake.hasProvider(providerId)) return drop('duplicate');

  const raw = await deps.storage.getObject(n.receipt.action.objectKey);
  if (!raw) return drop('missing');
  const mail = await parseMail(raw);
  if (!mail?.text) return drop('unreadable');

  let read: { data: Output; usage: Usage };
  try {
    read = await deps.ai.generateJson({
      feature: FEATURE,
      capability: 'text.fast',
      system: SYSTEM,
      user: buildUser(mail),
      schema: Output,
      maxOutputTokens: 8000,
      temperature: 0,
      // Well inside the inbound worker's 2-minute budget; a timeout lets SQS retry.
      signal: AbortSignal.timeout(90_000),
    });
  } catch (err) {
    if (err instanceof AiError && err.usage) {
      await deps.ledger.record({ ...err.usage, userId, feature: FEATURE, status: 'error' });
    }
    throw err;
  }
  await deps.ledger.record({ ...read.usage, userId, feature: FEATURE, status: 'ok' });

  const items = toItems(read.data);
  if (!read.data.is_receipt || items.length === 0) return drop('not_a_receipt');
  const retailer =
    read.data.retailer.trim().slice(0, 120) ||
    /@([a-z0-9.-]+)/i.exec(mail.from)?.[1] ||
    'A receipt';

  let held: { id: string; created: boolean };
  try {
    held = await deps.intake.fromReceipt(userId, {
      providerId,
      retailer,
      orderRef: read.data.order_ref.trim() || null,
      subject: mail.subject || null,
      fromEmail: mail.from || null,
      items: items.map(inboxItem),
    });
  } catch (err) {
    if (err instanceof QuotaExceeded) return drop('quota');
    throw err;
  }
  if (held.created && deps.onHeld) {
    try {
      await deps.onHeld({ userId, inboxId: held.id, retailer, count: items.length });
    } catch (err) {
      deps.logger.warn(
        { reason: err instanceof Error ? err.message : 'unknown' },
        'receipt_mail_failed',
      );
    }
  }
  deps.logger.info({ items: items.length }, 'receipt_held');
  return { status: 'held', inboxId: held.id, items: items.length };
}
