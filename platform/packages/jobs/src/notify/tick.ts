import { NotificationPrefs } from '@robes/contracts';
import { notify as copy } from '@robes/copy';
import type { SystemRepositories } from '@robes/db';
import { renderEmail, signUnsub } from '@robes/emails';
import type { Email, Mailer } from '@robes/mailer';
import type { JobLogger } from '../logger';
import { composePush, PUSH_KINDS, type PushSender } from './push';
import {
  addDays,
  type NotifyState,
  ONCE_KINDS,
  type Planned,
  plan as planMessages,
  type Recipient,
} from './rules';

export interface NotifyDeps {
  notifier: SystemRepositories['notifier'];
  mailer: Mailer;
  // Public app origin for links, e.g. https://app.byrobes.com.
  appUrl: string;
  unsubSecret: string;
  // Where replies go (7-day brief delta 1: annie@byrobes.com); every mail then says so.
  replyTo?: string | undefined;
  logger: JobLogger;
  pageSize?: number;
  // Optional second channel: Expo push to her active devices (PUSH_KINDS only).
  push?: { sender: PushSender; tokens: SystemRepositories['pushDelivery'] } | undefined;
  // The trips flag; without it trips count as hidden (the launch default, legacy 2eacfb4).
  tripsOn?: (() => Promise<boolean>) | undefined;
}

type EmailKind = Exclude<Planned, { channel: 'push' }>;

function weekOneContent(mail: Extract<Planned, { kind: 'week_one' }>, link: (p: string) => string) {
  const c = copy.weekOne;
  const facts = [
    c.pieces(mail.counts.pieces),
    c.looks(mail.counts.looks),
    ...(mail.counts.model ? [c.model] : []),
    ...(mail.counts.dressed ? [c.dressed(mail.counts.dressed)] : []),
  ].join(' ');
  const next = {
    model: { line: c.next.model.line, cta: c.next.model.cta, path: '/you/model' },
    five: {
      line: c.next.five.line(Math.max(1, 5 - mail.counts.pieces)),
      cta: c.next.five.cta,
      path: '/wardrobe/add',
    },
    plan: { line: c.next.plan.line, cta: c.next.plan.cta, path: '/plan' },
    wear: { line: c.next.wear.line, cta: c.next.wear.cta, path: `/plan/${mail.date}` },
    done: { line: c.next.done.line, cta: c.next.done.cta, path: '/' },
  }[mail.next];
  return {
    subject: c.subject,
    body: `${facts}\n\n${next.line}`,
    cta: { label: next.cta, url: link(next.path) },
  };
}

export function composeEmail(
  deps: Pick<NotifyDeps, 'appUrl' | 'unsubSecret' | 'replyTo'>,
  user: Pick<Recipient, 'id' | 'email'>,
  mail: EmailKind,
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
          cta: {
            label: copy.looksReady.cta,
            url: link(mail.set ? `/looks/deck/${mail.ideaId}` : `/looks/ideas/${mail.ideaId}`),
          },
        };
      case 'look_waiting':
        return {
          subject: copy.lookWaiting.subject,
          body: copy.lookWaiting.body(mail.look),
          cta: { label: copy.lookWaiting.cta, url: link('/you/model') },
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
          footer: copy.weekEmpty.footer,
        };
      case 'first_piece':
        return {
          subject: copy.firstPiece.subject,
          body: copy.firstPiece.body,
          cta: { label: copy.firstPiece.cta, url: link('/wardrobe/add') },
        };
      case 'pick_one':
        return {
          subject: copy.pickOne.subject,
          body: copy.pickOne.body(mail.piece.charAt(0).toUpperCase() + mail.piece.slice(1)),
          cta: {
            label: copy.pickOne.cta,
            url: link(mail.set ? `/looks/deck/${mail.ref}` : '/looks?tab=suggested'),
          },
        };
      case 'week_one':
        return weekOneContent(mail, link);
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
  const footer: string[] = [];
  if ('footer' in content && content.footer) footer.push(content.footer);
  if (deps.replyTo) footer.push(copy.replyLine);
  const { html, text } = renderEmail({
    heading: content.subject,
    body: content.body,
    cta: content.cta,
    ...(footer.length ? { footer: footer.join('\n\n') } : {}),
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
    ...(deps.replyTo ? { replyTo: deps.replyTo } : {}),
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

type Outcome = 'sent' | 'skipped' | 'failed';

async function sendPush(
  deps: NotifyDeps,
  push: NonNullable<NotifyDeps['push']>,
  userId: string,
  mail: Planned,
  devices: readonly { expoToken: string }[],
): Promise<Outcome> {
  if (!(await deps.notifier.claim(userId, mail.kind, mail.ref, 'push'))) return 'skipped';
  const content = composePush(mail);
  try {
    const { deadTokens } = await push.sender.send(
      devices.map((d) => ({ ...content, to: d.expoToken })),
    );
    await push.tokens.revokeTokens(deadTokens);
    return 'sent';
  } catch (err) {
    await deps.notifier.release(userId, mail.kind, mail.ref, 'push');
    deps.logger.warn(
      { kind: mail.kind, reason: err instanceof Error ? err.message : 'unknown' },
      'notify_push_failed',
    );
    return 'failed';
  }
}

// One pass over everyone (notify-tick, every 10 minutes). Never throws for one person's mail.
export async function notifyTick(deps: NotifyDeps, now = new Date()) {
  const out = { considered: 0, sent: 0, failed: 0, pushed: 0 };
  const pageSize = deps.pageSize ?? 500;
  // Wide enough for every timezone's "today" plus the week ahead.
  const utcToday = now.toISOString().slice(0, 10);
  const window = { from: addDays(utcToday, -1), to: addDays(utcToday, 9) };
  const hideTravel = !((await deps.tripsOn?.()) ?? false);
  let afterId: string | undefined;
  for (;;) {
    const page = await deps.notifier.recipients({ afterId, limit: pageSize });
    if (page.length === 0) break;
    afterId = page.at(-1)?.id;
    const raw = await deps.notifier.state(
      page.map((u) => u.id),
      window,
      { hideTravel, onceKinds: ONCE_KINDS },
    );
    const ledger = groupBy(raw.ledger);
    const ideas = new Map(raw.ideas.map((i) => [i.userId, i]));
    const pieces = new Map(raw.pieces.map((p) => [p.userId, p]));
    const looks = new Map(raw.looks.map((l) => [l.userId, l.n]));
    const newest = new Map(
      raw.looks.map((l) => [l.userId, { id: l.newestId, name: l.newestName }]),
    );
    const withModel = new Set(raw.models.map((m) => m.userId));
    const started = new Set(raw.started.map((r) => r.userId));
    const onceByUser = new Map<string, string[]>();
    for (const r of raw.onceSent)
      onceByUser.set(r.userId, [...(onceByUser.get(r.userId) ?? []), r.kind]);
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
              set: idea.isSet,
            }
          : null,
        readyPieces: pieces.get(row.id)?.ready ?? 0,
        fifthPieceAt: pieces.get(row.id)?.fifthAt ?? null,
        looks: looks.get(row.id) ?? 0,
        hasModel: withModel.has(row.id),
        newestLook: newest.get(row.id) ?? null,
        plan: plan.get(row.id) ?? [],
        overnight: overnightByUser.get(row.id) ?? [],
        started: started.has(row.id),
        onceSent: onceByUser.get(row.id) ?? [],
        hasPush: (devicesByUser.get(row.id) ?? []).length > 0,
      };
      const devices = devicesByUser.get(user.id) ?? [];
      const deliver = async (mail: Planned): Promise<Outcome> => {
        if ('channel' in mail) {
          if (!deps.push || devices.length === 0) return 'skipped';
          const r = await sendPush(deps, deps.push, user.id, mail, devices);
          if (r === 'sent') out.pushed++;
          return r;
        }
        // A kind that moved to push stops sending as email once she has push on.
        if (deps.push !== undefined && PUSH_KINDS.has(mail.kind) && devices.length > 0) {
          const r = await sendPush(deps, deps.push, user.id, mail, devices);
          if (r === 'sent') out.pushed++;
          return r;
        }
        if (!(await deps.notifier.claim(user.id, mail.kind, mail.ref))) return 'skipped';
        try {
          await deps.mailer.send(composeEmail(deps, user, mail));
          out.sent++;
          return 'sent';
        } catch (err) {
          await deps.notifier.release(user.id, mail.kind, mail.ref);
          out.failed++;
          deps.logger.warn(
            { kind: mail.kind, reason: err instanceof Error ? err.message : 'unknown' },
            'notify_send_failed',
          );
          return 'failed';
        }
      };
      const { sequence, moments } = planMessages(user, state, now);
      // The day's one message: the first the ledger lets through; a claim that collides (sent
      // before) never burns the day.
      for (const mail of sequence) {
        if ((await deliver(mail)) !== 'skipped') break;
      }
      for (const mail of moments) await deliver(mail);
    }
    if (page.length < pageSize) break;
  }
  deps.logger.info(out, 'notify_tick');
  return out;
}
