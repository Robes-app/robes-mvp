import { notify as copy } from '@robes/copy';
import type { Planned } from './rules';

// Push rides alongside email for the kinds worth a buzz; email and push dedupe independently
// (ledger channel 'push'). Rules stay in rules.ts.
export const PUSH_KINDS = new Set<Planned['kind']>(['looks_ready', 'morning']);

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  // Opened by expo-router on tap.
  data: { url: string };
}

export interface PushSender {
  // Returns tokens Expo says no longer reach a device, so the caller can revoke them.
  send(messages: readonly PushMessage[]): Promise<{ deadTokens: string[] }>;
}

export function composePush(mail: Planned): Omit<PushMessage, 'to'> {
  switch (mail.kind) {
    case 'looks_ready':
      return {
        title: copy.looksReady.subject,
        body: copy.looksReady.body(mail.piece.charAt(0).toUpperCase() + mail.piece.slice(1)),
        data: { url: `robes://looks/ideas/${mail.ideaId}` },
      };
    case 'morning':
      return {
        title: copy.morning.subject(mail.weekday, mail.title),
        body: mail.dailyLookId
          ? copy.morning.overnightBody
          : copy.morning.body(mail.look ?? mail.title),
        data: {
          url: mail.dailyLookId ? `robes://today/looks/${mail.dailyLookId}` : 'robes://plan',
        },
      };
    default:
      return { title: '', body: '', data: { url: 'robes://' } };
  }
}

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH = 100;

type Ticket = { status: 'ok' | 'error'; details?: { error?: string } };

// Expo's push service (https://docs.expo.dev/push-notifications/sending-notifications/).
export function createExpoPushSender(opts: {
  accessToken?: string | undefined;
  fetch?: typeof fetch;
}): PushSender {
  const doFetch = opts.fetch ?? fetch;
  return {
    async send(messages) {
      const deadTokens: string[] = [];
      for (let i = 0; i < messages.length; i += BATCH) {
        const batch = messages.slice(i, i + BATCH);
        const res = await doFetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json',
            ...(opts.accessToken ? { authorization: `Bearer ${opts.accessToken}` } : {}),
          },
          body: JSON.stringify(batch.map((m) => ({ ...m, sound: 'default' }))),
          signal: AbortSignal.timeout(10_000),
        });
        // Provider detail stays out of errors and logs (SEC-31/83).
        if (!res.ok) throw new Error(`push send failed (${res.status})`);
        const { data } = (await res.json()) as { data?: Ticket[] };
        (data ?? []).forEach((ticket, j) => {
          const to = batch[j]?.to;
          if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered' && to) {
            deadTokens.push(to);
          }
        });
      }
      return { deadTokens };
    },
  };
}

export function createMemoryPushSender(): PushSender & { sent: PushMessage[] } {
  const sent: PushMessage[] = [];
  return {
    sent,
    async send(messages) {
      sent.push(...messages);
      return { deadTokens: [] };
    },
  };
}
