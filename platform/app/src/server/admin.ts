import 'server-only';
import { ApiError } from '@robes/api';
import {
  AdminCosts,
  AdminFlag,
  AdminHealth,
  AdminUserDetail,
  AdminUserPage,
  AuditPage,
} from '@robes/contracts';
import { type AdminActor, NotAdmin } from '@robes/db';
import { repos } from './db';
import { invalidateFlag } from './flags';

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
