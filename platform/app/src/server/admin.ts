import 'server-only';
import { ApiError } from '@robes/api';
import {
  AdminArtifact,
  AdminCall,
  AdminCosts,
  AdminFeedbackPage,
  AdminFlag,
  AdminHealth,
  AdminMetrics,
  AdminUserDetail,
  AdminUserPage,
  AdminUserRecords,
  AuditPage,
} from '@robes/contracts';
import { JOB_KINDS } from '@robes/core/jobs';
import { type AdminActor, NotAdmin } from '@robes/db';
import { signedRenditions } from './asset-urls';
import { repos } from './db';
import { invalidateFlag } from './flags';
import { mediaDelivery } from './media';

type Reads = typeof repos.adminReads;
const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

// The repo re-checks admin as a second line behind route auth; a miss there is a 403, not a 500.
async function guarded<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (err) {
    if (err instanceof NotAdmin) throw new ApiError('forbidden');
    throw err;
  }
}

export async function listUsers(
  actor: AdminActor,
  q: Parameters<Reads['listUsers']>[1],
): Promise<AdminUserPage> {
  const page = await guarded(() => repos.adminReads.listUsers(actor, q));
  // Every output is parsed through its contract (CLAUDE.md rule 8).
  return AdminUserPage.parse({
    items: page.items.map((u) => ({
      ...u,
      createdAt: iso(u.createdAt),
      lastActiveAt: iso(u.lastActiveAt ? new Date(u.lastActiveAt) : null),
    })),
    nextCursor: page.nextCursor,
  });
}

export async function userDetail(actor: AdminActor, userId: string): Promise<AdminUserDetail> {
  const d = await guarded(() => repos.adminReads.userDetail(actor, userId));
  if (!d) throw new ApiError('not_found');
  return AdminUserDetail.parse({
    id: d.user.id,
    email: d.user.email,
    name: d.user.name,
    firstName: d.user.firstName,
    lastName: d.user.lastName,
    timezone: d.user.timezone,
    locale: d.user.locale,
    createdAt: iso(d.user.createdAt),
    onboardedAt: iso(d.user.onboardedAt),
    role: d.role,
    consents: d.consents.map((c) => ({ kind: c.kind, granted: c.granted, at: iso(c.createdAt) })),
    usageToday: d.usage,
    jobs: d.jobs.map((j) => ({
      ...j,
      createdAt: iso(j.createdAt),
      finishedAt: iso(j.finishedAt),
    })),
    deletion: d.deletion
      ? { status: d.deletion.status, requestedAt: iso(d.deletion.requestedAt) }
      : null,
  });
}

export async function health(actor: AdminActor): Promise<AdminHealth> {
  const h = await guarded(() => repos.adminReads.health(actor));
  return AdminHealth.parse({
    counts: h.counts,
    durations: h.durations.map((d) => ({
      kind: d.kind,
      p50Ms: d.p50Ms === null ? null : Math.round(Number(d.p50Ms)),
      p95Ms: d.p95Ms === null ? null : Math.round(Number(d.p95Ms)),
    })),
    errors: h.errors,
  });
}

export async function costs(actor: AdminActor, days: number): Promise<AdminCosts> {
  const c = await guarded(() => repos.adminReads.costs(actor, days));
  return AdminCosts.parse({
    days,
    daily: c.daily.map((r) => ({ ...r, costMicros: r.costMicros ?? 0 })),
    spenders: c.spenders.map((s) => ({ ...s, costMicros: s.costMicros ?? 0 })),
    budget: c.budget.map((b) => ({
      ...b,
      exhausted: Number(b.costMicros) >= Number(b.limitMicros),
    })),
  });
}

// Every kind gets a row, so a new or idle kind (style_brief, look_ask, frames…) shows as zero.
const METRIC_KINDS = [
  ...JOB_KINDS.filter((k) => k !== 'fake' && k !== 'look_render'),
  'look_render:frame',
  'look_render:look',
];

export async function metrics(actor: AdminActor, days: number): Promise<AdminMetrics> {
  const m = await guarded(() => repos.adminReads.metrics(actor, days));
  const seen = new Set(m.jobs.map((j) => j.kind));
  const idle = METRIC_KINDS.filter((k) => !seen.has(k)).map((kind) => ({
    kind,
    total: 0,
    succeeded: 0,
    failed: 0,
    cancelled: 0,
    p50Ms: null,
    p95Ms: null,
    costMicros: 0,
  }));
  const jobs = [...m.jobs, ...idle].sort(
    (a, b) => b.total - a.total || a.kind.localeCompare(b.kind),
  );
  return AdminMetrics.parse({ days, ...m, jobs });
}

const toFlag = (f: Awaited<ReturnType<Reads['flags']>>[number]): AdminFlag =>
  AdminFlag.parse({ ...f, updatedAt: iso(f.updatedAt) });

export async function flags(actor: AdminActor): Promise<{ items: AdminFlag[] }> {
  return { items: (await guarded(() => repos.adminReads.flags(actor))).map(toFlag) };
}

export async function setFlag(
  actor: AdminActor,
  key: string,
  enabled: boolean,
): Promise<AdminFlag> {
  const row = await guarded(() => repos.adminReads.setFlag(actor, key, enabled));
  if (!row) throw new ApiError('not_found');
  // This instance sees the change at once; others within the flag cache TTL.
  invalidateFlag(key);
  return toFlag(row);
}

export async function auditLog(
  actor: AdminActor,
  q: Parameters<Reads['auditLog']>[1],
): Promise<AuditPage> {
  const page = await guarded(() => repos.adminReads.auditLog(actor, q));
  return AuditPage.parse({
    items: page.items.map((a) => ({ ...a, createdAt: iso(a.createdAt) })),
    nextCursor: page.nextCursor,
  });
}

type Thumb = { id: string; status: string; renditions: unknown } | null;

// The narrowest rendition of her photo, signed for the admin page (private media, SEC rule 9a).
async function thumb(userId: string, a: Thumb): Promise<string | null> {
  if (!a) return null;
  const { renditions } = await signedRenditions(mediaDelivery, userId, a);
  const narrowest = [...renditions].sort((x, y) => x.width - y.width)[0];
  return narrowest?.webp ?? null;
}

export async function userRecords(actor: AdminActor, userId: string): Promise<AdminUserRecords> {
  const r = await guarded(() => repos.adminReads.userRecords(actor, userId));
  if (!r) throw new ApiError('not_found');
  const sign = (a: unknown) => thumb(userId, a as Thumb);
  return AdminUserRecords.parse({
    pieceCount: r.pieceCount,
    pieces: await Promise.all(
      r.pieces.map(async (p) => ({
        id: p.id,
        label: p.label,
        category: p.category,
        brand: p.brand,
        colourShade: p.colourShade,
        material: p.material,
        status: p.status,
        acquiredVia: p.acquiredVia,
        hero: p.heroPosition !== null,
        wears: p.wears ?? 0,
        createdAt: iso(p.createdAt),
        image: await sign(p.image),
      })),
    ),
    wishlist: await Promise.all(
      r.wishlist.map(async (w) => ({
        id: w.id,
        label: w.label,
        brand: w.brand,
        sourceType: w.sourceType,
        price: w.price === null ? null : `${w.price}${w.currency ? ` ${w.currency}` : ''}`,
        bought: w.promotedItemId !== null,
        createdAt: iso(w.createdAt),
        image: await sign(w.image),
      })),
    ),
    looks: await Promise.all(
      r.looks.map(async (l) => ({
        id: l.id,
        name: l.name,
        status: l.status,
        source: l.source,
        pieces: l.pieces ?? 0,
        proposals: l.proposals,
        wears: l.wears ?? 0,
        lastWornOn: l.lastWornOn,
        createdAt: iso(l.createdAt),
        image: await sign(l.image),
      })),
    ),
    artifacts: r.artifacts.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      subtitle: a.subtitle,
      saved: a.savedAt !== null,
      createdAt: iso(a.createdAt),
    })),
    feedback: r.feedback.map((f) => ({ ...f, createdAt: iso(f.createdAt) })),
    memory: r.memory.map((m) => ({
      id: m.id,
      kind: m.kind,
      surface: m.surface,
      text:
        m.body ??
        m.subject ??
        (m.pieceOut || m.pieceIn ? `${m.pieceOut ?? '?'} → ${m.pieceIn ?? '?'}` : null),
      verdict: m.verdict,
      createdAt: iso(m.createdAt),
    })),
    brief: r.brief.map((b) => ({ ...b, createdAt: iso(b.createdAt) })),
    notifications: r.notifications.map((n) => ({
      id: n.id,
      kind: n.kind,
      channel: n.channel,
      status: n.status,
      sentAt: iso(n.sentAt),
    })),
    inbox: r.inbox.map((i) => ({
      id: i.id,
      retailer: i.retailer,
      status: i.status,
      items: i.items,
      filed: i.filed,
      filedTo: i.filedTo,
      receivedAt: iso(i.receivedAt),
    })),
    calls: r.calls.map((c) => ({
      id: c.id,
      feature: c.feature,
      model: c.model,
      status: c.status,
      latencyMs: c.latencyMs,
      costMicros: c.costMicros,
      images: c.images,
      jobId: c.jobId,
      hasPrompt: c.hasPrompt,
      createdAt: iso(c.createdAt),
    })),
    events: r.events.map((e) => ({ ...e, createdAt: iso(e.createdAt) })),
  });
}

export async function generationCall(actor: AdminActor, id: string): Promise<AdminCall> {
  const c = await guarded(() => repos.adminReads.generationCall(actor, id));
  if (!c) throw new ApiError('not_found');
  return AdminCall.parse({ ...c, createdAt: iso(c.createdAt) });
}

export async function feedbackFeed(
  actor: AdminActor,
  q: Parameters<Reads['feedbackFeed']>[1],
): Promise<AdminFeedbackPage> {
  const page = await guarded(() => repos.adminReads.feedbackFeed(actor, q));
  return AdminFeedbackPage.parse({
    items: page.items.map((f) => ({ ...f, createdAt: iso(f.createdAt) })),
    nextCursor: page.nextCursor,
  });
}

export async function artifact(actor: AdminActor, id: string): Promise<AdminArtifact> {
  const a = await guarded(() => repos.adminReads.artifact(actor, id));
  if (!a) throw new ApiError('not_found');
  return AdminArtifact.parse({
    ...a,
    createdAt: iso(a.createdAt),
    savedAt: iso(a.savedAt),
    deletedAt: iso(a.deletedAt),
  });
}
