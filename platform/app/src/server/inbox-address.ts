import 'server-only';
import { InboxAddress } from '@robes/contracts';
import type { UserId } from '@robes/db';
import { repos } from './db';
import { env } from './env';

type Row = { address: string; createdAt: Date };

export function toInboxAddress(row: Row): InboxAddress {
  return InboxAddress.parse({
    address: `${row.address}@${env.INBOUND_MAIL_DOMAIN}`,
    createdAt: row.createdAt.toISOString(),
  });
}

export async function ensureInboxAddress(userId: UserId): Promise<InboxAddress> {
  return toInboxAddress(await repos.inboxAddress.ensure(userId));
}
