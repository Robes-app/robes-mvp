import { NotificationPrefs } from '@robes/contracts';
import { notify as copy } from '@robes/copy';
import type { SystemRepositories } from '@robes/db';
import { renderEmail, signUnsub } from '@robes/emails';
import type { Mailer } from '@robes/mailer';
import type { HeldReceipt } from '../receipts/ingest';

export interface ReceiptMailDeps {
  notifier: Pick<SystemRepositories['notifier'], 'recipient' | 'claim' | 'release'>;
  mailer: Mailer;
  appUrl: string;
  unsubSecret: string;
}

// "Robes read your Zara receipt." Once per held row (ledger kind 'receipt', ref = inbox id);
// skipped when she turned receipts off or her address is suppressed.
export async function sendReceiptMail(deps: ReceiptMailDeps, held: HeldReceipt): Promise<boolean> {
  const user = await deps.notifier.recipient(held.userId);
  if (!user) return false;
  if (!NotificationPrefs.parse(user.notificationPrefs ?? {}).receipts) return false;
  if (!(await deps.notifier.claim(held.userId, 'receipt', held.inboxId))) return false;
  const token = signUnsub(deps.unsubSecret, held.userId, 'receipts');
  const unsubPage = new URL(`/unsubscribe?t=${encodeURIComponent(token)}`, deps.appUrl).toString();
  const oneClick = new URL(`/api/v1/public/unsub/${encodeURIComponent(token)}`, deps.appUrl);
  const subject = copy.receipt.subject(held.retailer);
  const { html, text } = renderEmail({
    heading: copy.receipt.heading(held.retailer),
    body: copy.receipt.body(held.count),
    cta: {
      label: copy.receipt.cta(held.count),
      url: new URL('/wardrobe/inbox?from=email', deps.appUrl).toString(),
    },
    notice: copy.receipt.notice,
    unsubUrl: unsubPage,
    unsubLabel: copy.unsubLabel,
    privacyUrl: new URL('/legal/privacy', deps.appUrl).toString(),
    privacyLabel: copy.privacyLabel,
  });
  try {
    await deps.mailer.send({
      to: user.email,
      subject,
      html,
      text,
      headers: {
        'List-Unsubscribe': `<${oneClick.toString()}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
  } catch (err) {
    await deps.notifier.release(held.userId, 'receipt', held.inboxId);
    throw err;
  }
  return true;
}
