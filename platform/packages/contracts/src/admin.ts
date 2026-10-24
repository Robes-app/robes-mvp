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

// Operating metrics (aggregates only): the window is today and the days - 1 before it, UTC.
export const AdminMetricsInput = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
});

const bySource = z.array(z.object({ source: z.string(), n: count }));
export const AdminMetrics = z.object({
  days: z.number().int(),
  daily: z.array(z.object({ day: z.iso.date(), signups: count, active: count })),
  funnel: z.object({
    signedUp: count,
    firstPiece: count,
    firstSavedLook: count,
    returned: count,
  }),
  piecesBySource: bySource,
  looksBySource: bySource,
  deck: z.object({ kept: count, edited: count, passed: count, waiting: count }),
  jobs: z.array(
    z.object({
      kind: z.string(),
      total: count,
      succeeded: count,
      failed: count,
      cancelled: count,
      p50Ms: z.number().nullable(),
      p95Ms: z.number().nullable(),
      costMicros: count,
    }),
  ),
  queue: z.object({
    queued: count,
    running: count,
    oldestQueuedSeconds: z.number().nullable(),
    staleQueued: count,
    expiredLeases: count,
  }),
  email: z.object({
    sent: count,
    failed: count,
    suppressed: count,
    bounces: count,
    complaints: count,
    unsubscribes: count,
  }),
});
export type AdminMetrics = z.infer<typeof AdminMetrics>;

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

// One person's records (newest first, bounded). Photos arrive as short-lived signed URLs.
const image = z.string().nullable();
export const AdminUserRecords = z.object({
  pieceCount: count,
  pieces: z.array(
    z.object({
      id,
      label: z.string(),
      category: z.string(),
      brand: z.string().nullable(),
      colourShade: z.string().nullable(),
      status: z.string(),
      acquiredVia: z.string(),
      hero: z.boolean(),
      wears: count,
      createdAt: at,
      image,
    }),
  ),
  wishlist: z.array(
    z.object({
      id,
      label: z.string(),
      brand: z.string().nullable(),
      sourceType: z.string(),
      price: z.string().nullable(),
      bought: z.boolean(),
      createdAt: at,
      image,
    }),
  ),
  looks: z.array(
    z.object({
      id,
      name: z.string(),
      status: z.string(),
      source: z.string(),
      pieces: count,
      proposals: count,
      wears: count,
      lastWornOn: z.iso.date().nullable(),
      createdAt: at,
      image,
    }),
  ),
  artifacts: z.array(
    z.object({
      id,
      type: z.string(),
      title: z.string(),
      subtitle: z.string(),
      saved: z.boolean(),
      createdAt: at,
    }),
  ),
  feedback: z.array(
    z.object({
      id,
      rating: z.number().int().nullable(),
      note: z.string().nullable(),
      track: z.string().nullable(),
      subjectType: z.string(),
      createdAt: at,
    }),
  ),
  memory: z.array(
    z.object({
      id,
      kind: z.string(),
      surface: z.string().nullable(),
      text: z.string().nullable(),
      verdict: z.number().int().nullable(),
      createdAt: at,
    }),
  ),
  brief: z.array(
    z.object({
      id,
      list: z.string(),
      state: z.string(),
      source: z.string(),
      text: z.string(),
      because: z.string().nullable(),
      createdAt: at,
    }),
  ),
  notifications: z.array(
    z.object({ id, kind: z.string(), channel: z.string(), status: z.string(), sentAt: at }),
  ),
  inbox: z.array(
    z.object({
      id,
      retailer: z.string().nullable(),
      status: z.string(),
      items: count,
      filed: count,
      filedTo: z.string().nullable(),
      receivedAt: at,
    }),
  ),
  calls: z.array(
    z.object({
      id,
      feature: z.string(),
      model: z.string(),
      status: z.string(),
      latencyMs: z.number().int().nullable(),
      costMicros: count,
      images: count,
      jobId: id.nullable(),
      hasPrompt: z.boolean(),
      createdAt: at,
    }),
  ),
  events: z.array(z.object({ id, eventType: z.string(), createdAt: at })),
});
export type AdminUserRecords = z.infer<typeof AdminUserRecords>;

// One model call, read on purpose: its prompt and response (null once cleared at 30 days).
export const AdminCallParams = z.object({ id });
export const AdminCall = z.object({
  id,
  userId: id.nullable(),
  email: z.string().nullable(),
  feature: z.string(),
  model: z.string(),
  status: z.string(),
  latencyMs: z.number().int().nullable(),
  costMicros: count,
  images: count,
  tokensIn: z.number().int().nullable(),
  tokensOut: z.number().int().nullable(),
  jobId: id.nullable(),
  detail: z.record(z.string(), z.unknown()),
  prompt: z.string().nullable(),
  response: z.unknown().nullable(),
  createdAt: at,
});
export type AdminCall = z.infer<typeof AdminCall>;

export const ListAdminFeedbackInput = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().max(200).optional(),
});
export const AdminFeedbackPage = z.object({
  items: z.array(
    z.object({
      id,
      userId: id.nullable(),
      email: z.string().nullable(),
      rating: z.number().int().nullable(),
      note: z.string().nullable(),
      track: z.string().nullable(),
      subjectType: z.string(),
      createdAt: at,
    }),
  ),
  nextCursor: z.string().nullable(),
});
export type AdminFeedbackPage = z.infer<typeof AdminFeedbackPage>;

// The output viewer: one saved artifact as stored.
export const AdminArtifactParams = z.object({ id });
export const AdminArtifact = z.object({
  id,
  userId: id,
  email: z.string(),
  type: z.string(),
  title: z.string(),
  subtitle: z.string(),
  data: z.record(z.string(), z.unknown()),
  schemaVersion: z.number().int(),
  generationJobId: id.nullable(),
  createdAt: at,
  savedAt: at.nullable(),
  deletedAt: at.nullable(),
});
export type AdminArtifact = z.infer<typeof AdminArtifact>;
