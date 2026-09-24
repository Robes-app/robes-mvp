import { NotificationPrefs } from '@robes/contracts';
import { notify as copy } from '@robes/copy';
import type { SystemRepositories } from '@robes/db';
import { renderEmail, signUnsub } from '@robes/emails';
import type { Email, Mailer } from '@robes/mailer';
import type { JobLogger } from '../logger';
import { composePush, PUSH_KINDS, type PushSender } from './push';
import { addDays, decide, type NotifyState, type Planned, type Recipient } from './rules';

export interface NotifyDeps {
  notifier: SystemRepositories['notifier'];
  mailer: Mailer;
  // Public app origin for links, e.g. https://app.byrobes.com.
  appUrl: string;
  unsubSecret: string;
  logger: JobLogger;
  pageSize?: number;
  // Optional second channel: Expo push to her active devices (PUSH_KINDS only).
  push?: { sender: PushSender; tokens: SystemRepositories['pushDelivery'] } | undefined;
}

export function composeEmail(
  deps: Pick<NotifyDeps, 'appUrl' | 'unsubSecret'>,
  user: Pick<Recipient, 'id' | 'email'>,
  mail: Planned,
): Email {
  const link = (path: string) => new URL(`${path}?from=email`, deps.appUrl).toString();
  const token = signUnsub(deps.unsubSecret, user.id, mail.pref);
  const unsubPage = new URL(`/unsubscribe?t=${encodeURIComponent(token)}`, deps.appUrl).toString();
  const oneClick = new URL(`/api/v1/public/unsub/${encodeURIComponent(token)}`, deps.appUrl);
  const content = (() => {
    switch (mail.kind) {
      case 'looks_ready':
        return {
          subject: copy.looksReady.subject,
          // Sentence start, as legacy: "Navy blazer, worn three ways."
          body: copy.looksReady.body(mail.piece.charAt(0).toUpperCase() + mail.piece.slice(1)),
          cta: { label: copy.looksReady.cta, url: link(`/looks/ideas/${mail.ideaId}`) },
        };
      case 'five':
        return {
          subject: copy.five.subject,
          body: copy.five.body,
          cta: { label: copy.five.cta, url: link('/looks/new') },
        };
      case 'week_empty':
        return {
          subject: copy.weekEmpty.subject,
          body: copy.weekEmpty.body,
          cta: { label: copy.weekEmpty.cta, url: link('/plan') },
        };
      case 'morning':
        return {
          subject: copy.morning.subject(mail.weekday, mail.title),
          body: mail.dailyLookId
            ? copy.morning.overnightBody
            : copy.morning.body(mail.look ?? mail.title),
          cta: {
            label: copy.morning.cta,
            url: link(mail.dailyLookId ? `/today/looks/${mail.dailyLookId}` : '/plan'),
          },
          footer: copy.morning.footer,
        };
    }
  })();
  const { html, text } = renderEmail({
    heading: content.subject,
    body: content.body,
    cta: content.cta,
    ...('footer' in content ? { footer: content.footer } : {}),
    notice: copy.notice,
    unsubUrl: unsubPage,
    unsubLabel: copy.unsubLabel,
    privacyUrl: new URL('/legal/privacy', deps.appUrl).toString(),
    privacyLabel: copy.privacyLabel,
  });
  return {
    to: user.email,
    subject: content.subject,
    html,
    text,
    // RFC 8058 one-click: mail clients POST here without opening a page.
    headers: {
      'List-Unsubscribe': `<${oneClick.toString()}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}

const groupBy = <T extends { userId: string }>(rows: readonly T[]) => {
  const map = new Map<string, T[]>();
  for (const r of rows) map.set(r.userId, [...(map.get(r.userId) ?? []), r]);
  return map;
};

async function sendPush(
  deps: NotifyDeps,
  push: NonNullable<NotifyDeps['push']>,
  userId: string,
  mail: Planned,
  devices: readonly { expoToken: string }[],
): Promise<number> {
  if (!(await deps.notifier.claim(userId, mail.kind, mail.ref, 'push'))) return 0;
  const content = composePush(mail);
  try {
    const { deadTokens } = await push.sender.send(
      devices.map((d) => ({ ...content, to: d.expoToken })),
    );
    await push.tokens.revokeTokens(deadTokens);
    return 1;
  } catch (err) {
    await deps.notifier.release(userId, mail.kind, mail.ref, 'push');
    deps.logger.warn(
      { kind: mail.kind, reason: err instanceof Error ? err.message : 'unknown' },
      'notify_push_failed',
    );
    return 0;
  }
}

// One pass over everyone (notify-tick, every 10 minutes). Never throws for one person's mail.
export async function notifyTick(deps: NotifyDeps, now = new Date()) {
  const out = { considered: 0, sent: 0, failed: 0, pushed: 0 };
  const pageSize = deps.pageSize ?? 500;
  // Wide enough for every timezone's "today" plus the week ahead.
  const utcToday = now.toISOString().slice(0, 10);
  const window = { from: addDays(utcToday, -1), to: addDays(utcToday, 9) };
  let afterId: string | undefined;
  for (;;) {
    const page = await deps.notifier.recipients({ afterId, limit: pageSize });
    if (page.length === 0) break;
    afterId = page.at(-1)?.id;
    const raw = await deps.notifier.state(
      page.map((u) => u.id),
      window,
    );
    const ledger = groupBy(raw.ledger);
    const ideas = new Map(raw.ideas.map((i) => [i.userId, i]));
    const pieces = new Map(raw.pieces.map((p) => [p.userId, p]));
    const looks = new Map(raw.looks.map((l) => [l.userId, l.n]));
    const plan = groupBy(raw.plan);
    const overnightByUser = groupBy(raw.overnight);
    const devicesByUser = groupBy(
      deps.push ? await deps.push.tokens.activeFor(page.map((u) => u.id)) : [],
    );

    for (const row of page) {
      out.considered++;
      const user: Recipient = {
        id: row.id,
        email: row.email,
        timezone: row.timezone,
        prefs: NotificationPrefs.parse(row.notificationPrefs ?? {}),
        createdAt: row.createdAt,
      };
      const idea = ideas.get(row.id);
      const state: NotifyState = {
        ledger: ledger.get(row.id) ?? [],
        latestIdea: idea
          ? {
              id: idea.id,
              title: idea.title,
              readyFrames: idea.readyFrames,
              createdAt: idea.createdAt,
            }
          : null,
        readyPieces: pieces.get(row.id)?.ready ?? 0,
        fifthPieceAt: pieces.get(row.id)?.fifthAt ?? null,
        looks: looks.get(row.id) ?? 0,
        plan: plan.get(row.id) ?? [],
        overnight: overnightByUser.get(row.id) ?? [],
      };
      for (const mail of decide(user, state, now)) {
        if (await deps.notifier.claim(user.id, mail.kind, mail.ref)) {
          try {
            await deps.mailer.send(composeEmail(deps, user, mail));
            out.sent++;
          } catch (err) {
            await deps.notifier.release(user.id, mail.kind, mail.ref);
            out.failed++;
            deps.logger.warn(
              { kind: mail.kind, reason: err instanceof Error ? err.message : 'unknown' },
              'notify_send_failed',
            );
          }
        }
        const devices = devicesByUser.get(user.id) ?? [];
        if (deps.push && PUSH_KINDS.has(mail.kind) && devices.length > 0) {
          out.pushed += await sendPush(deps, deps.push, user.id, mail, devices);
        }
      }
    }
    if (page.length < pageSize) break;
  }
  deps.logger.info(out, 'notify_tick');
  return out;
}
