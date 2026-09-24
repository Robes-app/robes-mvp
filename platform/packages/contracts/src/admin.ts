import { JOB_KINDS, JOB_STATUSES } from '@robes/core/jobs';
import { z } from 'zod';

// Admin area (M6 task 6). Every read here is audited server-side; nothing carries prompts,
// model responses or secrets.
const id = z.uuid();
const at = z.iso.datetime();
const count = z.coerce.number().int().min(0);

export const AdminUserParams = z.object({ id });

export const ListAdminUsersInput = z.object({
  email: z.string().trim().max(254).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().max(200).optional(),
});

export const AdminUserRow = z.object({
  id,
  email: z.string(),
  name: z.string(),
  createdAt: at,
  pieces: count,
  looks: count,
  jobs: count,
  lastActiveAt: at.nullable(),
});
export type AdminUserRow = z.infer<typeof AdminUserRow>;

export const AdminUserPage = z.object({
  items: z.array(AdminUserRow),
  nextCursor: z.string().nullable(),
});
export type AdminUserPage = z.infer<typeof AdminUserPage>;

export const AdminUserDetail = z.object({
  id,
  email: z.string(),
  name: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  timezone: z.string(),
  locale: z.string(),
  createdAt: at,
  onboardedAt: at.nullable(),
  role: z.enum(['admin', 'support', 'analyst']).nullable(),
  consents: z.array(z.object({ kind: z.string(), granted: z.boolean(), at })),
  usageToday: z.array(z.object({ metric: z.string(), count })),
  jobs: z.array(
    z.object({
      id,
      kind: z.enum(JOB_KINDS),
      status: z.enum(JOB_STATUSES),
      // Short error code only (never provider text).
      error: z.string().nullable(),
      createdAt: at,
      finishedAt: at.nullable(),
      durationMs: z.number().int().nullable(),
    }),
  ),
  deletion: z.object({ status: z.string(), requestedAt: at }).nullable(),
});
export type AdminUserDetail = z.infer<typeof AdminUserDetail>;

export const AdminHealth = z.object({
  counts: z.array(z.object({ kind: z.string(), status: z.string(), n: count })),
  durations: z.array(
    z.object({ kind: z.string(), p50Ms: z.number().nullable(), p95Ms: z.number().nullable() }),
  ),
  errors: z.array(z.object({ kind: z.string(), error: z.string(), n: count })),
});
export type AdminHealth = z.infer<typeof AdminHealth>;

export const AdminCostsInput = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
});

export const AdminCosts = z.object({
  days: z.number().int(),
  daily: z.array(
    z.object({
      day: z.iso.date(),
      feature: z.string(),
      model: z.string(),
      calls: count,
      costMicros: count,
    }),
  ),
  spenders: z.array(z.object({ id, email: z.string(), calls: count, costMicros: count })),
  // Today's global breaker per model family (SEC-03).
  budget: z.array(
    z.object({
      modelFamily: z.string(),
      costMicros: count,
      limitMicros: count,
      exhausted: z.boolean(),
    }),
  ),
});
export type AdminCosts = z.infer<typeof AdminCosts>;

export const AdminFlag = z.object({
  key: z.string(),
  enabled: z.boolean(),
  description: z.string().nullable(),
  updatedAt: at,
});
export type AdminFlag = z.infer<typeof AdminFlag>;
export const AdminFlags = z.object({ items: z.array(AdminFlag) });
export const AdminFlagParams = z.object({ key: z.string().regex(/^[a-z][a-z0-9._-]{0,63}$/) });
export const SetAdminFlagInput = z.object({ enabled: z.boolean() });

export const ListAuditInput = z.object({
  userId: id.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  cursor: z.string().max(200).optional(),
});

export const AuditEntry = z.object({
  id,
  action: z.string(),
  actorId: id.nullable(),
  actorEmail: z.string().nullable(),
  subjectUserId: id.nullable(),
  subjectTable: z.string().nullable(),
  subjectId: z.string().nullable(),
  detail: z.record(z.string(), z.unknown()),
  ip: z.string().nullable(),
  createdAt: at,
});
export type AuditEntry = z.infer<typeof AuditEntry>;
export const AuditPage = z.object({
  items: z.array(AuditEntry),
  nextCursor: z.string().nullable(),
});
export type AuditPage = z.infer<typeof AuditPage>;
