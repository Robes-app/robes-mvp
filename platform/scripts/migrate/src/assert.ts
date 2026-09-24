import { DAILY_STEPS, IdeaWay } from '@robes/contracts';
import { z } from 'zod';
import { withClient } from './db';
import { LEGACY_TYPE_MAP } from './lookbook';

export interface AssertReport {
  ok: boolean;
  failures: string[];
  warnings: string[];
  census: Record<string, { rows: number; invalid: number }>;
}

const MAPPED_TYPES = Object.entries(LEGACY_TYPE_MAP)
  .filter(([, t]) => t)
  .map(([k]) => `'${k}'`)
  .join(', ');

// Expected rows per user per domain, applying transform's drop rules to the legacy side; actual
// counts only rows that came from legacy (post-cutover platform rows never count).
const COUNTS_SQL = `
with expected as (
  select 'users' as domain, id as user_id, 1 as n from legacy.auth_users where nullif(trim(email), '') is not null
  union all select 'wardrobe_items', user_id, count(*) from legacy.wardrobe_items group by user_id
  union all select 'wishlist_items', user_id, count(*) from legacy.wishlist_items group by user_id
  union all select 'looks', user_id, count(*) from legacy.looks group by user_id
  union all select 'look_pieces', l.user_id, count(*) from legacy.look_pieces lp
    join legacy.looks l on l.id = lp.look_id
    join legacy.wardrobe_items w on w.id = lp.wardrobe_item_id and w.user_id = l.user_id group by l.user_id
  union all select 'wears', w.user_id, count(*) from legacy.wears w
    join legacy.looks l on l.id = w.look_id and l.user_id = w.user_id group by w.user_id
  union all select 'artifacts', user_id, count(*) from legacy.lookbook_items
    where type in (${MAPPED_TYPES}) group by user_id
  union all select 'planned_days', d.user_id, count(*) from legacy.planned_days d
    where d.source_type <> 'weekly' and (
      (d.source_type = 'look' and exists (select 1 from legacy.looks l where l.user_id = d.user_id
        and l.id::text = d.source_id))
      or (d.source_type <> 'look' and exists (select 1 from legacy.lookbook_items b where b.user_id = d.user_id
        and b.id::text = d.source_id and b.type in (${MAPPED_TYPES}))))
    group by d.user_id
  union all select 'notifications', user_id, count(*) from legacy.notifications
    where kind in ('looks_ready','look_waiting','borrowing','five','week_empty','morning','receipt','receipt_held')
    group by user_id
  union all select 'wardrobe_inbox', user_id, count(*) from legacy.wardrobe_inbox group by user_id
),
actual as (
  select 'users' as domain, id as user_id, 1 as n from app.users where id in (select id from legacy.auth_users)
  union all select 'wardrobe_items', user_id, count(*) from app.wardrobe_items
    where id in (select id from legacy.wardrobe_items) group by user_id
  union all select 'wishlist_items', user_id, count(*) from app.wishlist_items
    where id in (select id from legacy.wishlist_items) group by user_id
  union all select 'looks', user_id, count(*) from app.looks where id in (select id from legacy.looks) group by user_id
  union all select 'look_pieces', user_id, count(*) from app.look_pieces
    where look_id in (select id from legacy.looks) group by user_id
  union all select 'wears', user_id, count(*) from app.wears where id in (select id from legacy.wears) group by user_id
  union all select 'artifacts', user_id, count(*) from app.artifacts where legacy_id is not null group by user_id
  union all select 'planned_days', user_id, count(*) from app.planned_days
    where id in (select id from legacy.planned_days) group by user_id
  union all select 'notifications', user_id, count(*) from app.notifications
    where id in (select id from legacy.notifications) group by user_id
  union all select 'wardrobe_inbox', user_id, count(*) from app.wardrobe_inbox
    where id in (select id from legacy.wardrobe_inbox) group by user_id
)
select coalesce(e.domain, a.domain) as domain, coalesce(e.user_id, a.user_id)::text as user_id,
  coalesce(e.n, 0)::int as expected, coalesce(a.n, 0)::int as actual
from expected e full join actual a on a.domain = e.domain and a.user_id = e.user_id
where coalesce(e.n, 0) <> coalesce(a.n, 0)
order by 1, 2`;

const ORPHANS_SQL = `
select 'profile missing' as problem, u.id::text as ref from app.users u
  where u.id in (select id from legacy.auth_users) and not exists (select 1 from app.profiles p where p.id = u.id)
union all
select 'share subject missing', s.token from app.shares s
  where s.legacy_token and not exists (select 1 from app.artifacts a where a.id = s.subject_id and a.user_id = s.owner_id)
union all
select 'frame asset missing', a.id::text from app.artifacts a,
  jsonb_array_elements(case when jsonb_typeof(a.data -> 'images') = 'array' then a.data -> 'images' else '[]' end) f
  where a.legacy_id is not null and f ->> 'assetId' is not null
    and not exists (select 1 from app.assets x where x.id::text = f ->> 'assetId' and x.user_id = a.user_id)
union all
select 'daily piece not hers', a.id::text from app.artifacts a,
  jsonb_array_elements(coalesce(a.data -> 'look' -> 'steps', '[]')) s, jsonb_array_elements(s -> 'items') i
  where a.type = 'daily_look' and a.legacy_id is not null and i ->> 'pieceId' is not null
    and not exists (select 1 from app.wardrobe_items w where w.id::text = i ->> 'pieceId' and w.user_id = a.user_id)`;

const SHARES_SQL = `
select b.share_id as token from legacy.lookbook_items b
join app.users u on u.id = b.user_id
where b.share_id is not null and coalesce(b.is_public, false) and b.type in (${MAPPED_TYPES})
  and not exists (
    select 1 from app.shares s join app.artifacts a on a.id = s.subject_id
    where s.token = b.share_id and s.legacy_token and a.user_id = b.user_id and a.legacy_id = b.id)`;

// Shapes the app reads today: IdeaData (app/src/server/looks.ts) and StoredDaily
// (app/src/server/daily.ts), mirrored here from their contracts.
const Frames = z.array(
  z.object({ idx: z.number().int(), assetId: z.uuid(), status: z.enum(['ready', 'failed']) }),
);
export const CENSUS: Record<string, z.ZodType> = {
  idea: z.object({
    anchor: z.object({ type: z.literal('text'), label: z.string().min(1) }),
    fallback: z.boolean(),
    wearer: z.enum(['woman', 'man']),
    ways: z.array(IdeaWay).length(3),
    images: Frames,
  }),
  daily_look: z.object({
    look: z.object({
      headline: z.string(),
      palette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).max(3),
      steps: z.array(
        z.object({
          title: z.enum(DAILY_STEPS),
          items: z
            .array(
              z.object({
                name: z.string(),
                pieceId: z.string().nullable(),
                alternates: z.array(z.unknown()).max(3),
              }),
            )
            .max(2),
        }),
      ),
    }),
    images: Frames,
  }),
};

// Rehearsal gate (docs/migration.md §3 step 4): any failure means don't cut over.
export async function assertMigration(targetUrl: string): Promise<AssertReport> {
  const report: AssertReport = { ok: true, failures: [], warnings: [], census: {} };
  await withClient(targetUrl, async (c) => {
    for (const r of (await c.query(COUNTS_SQL)).rows) {
      report.failures.push(
        `${r.domain}: user ${r.user_id} expected ${r.expected}, got ${r.actual}`,
      );
    }
    for (const r of (await c.query(ORPHANS_SQL)).rows) {
      report.failures.push(`orphan: ${r.problem} (${r.ref})`);
    }
    for (const r of (await c.query(SHARES_SQL)).rows) {
      report.failures.push(`share token ${r.token} no longer resolves`);
    }
    const artifacts = await c.query<{ type: string; data: unknown; id: string }>(
      'select id, type, data from app.artifacts where legacy_id is not null',
    );
    for (const a of artifacts.rows) {
      const entry = report.census[a.type] ?? { rows: 0, invalid: 0 };
      report.census[a.type] = entry;
      entry.rows++;
      if (!z.uuid().safeParse(a.id).success) {
        report.failures.push(`artifact id ${a.id} isn't a valid uuid for the contracts`);
      }
      const schema = CENSUS[a.type];
      if (schema && !schema.safeParse(a.data).success) {
        entry.invalid++;
        report.failures.push(`census: ${a.type} ${a.id} doesn't match the app's shape`);
      }
    }
    // Needs a person, not a script.
    const admins = await c.query(
      'select id::text from legacy.profiles where is_admin is true order by 1',
    );
    for (const r of admins.rows) {
      report.warnings.push(
        `legacy is_admin on ${r.id}: review by hand before granting (data-model.md §5)`,
      );
    }
    const wornDiff = await c.query<{ n: number }>(
      `select count(*)::int as n from legacy.wardrobe_items w
       where w.times_worn > (select count(*) from legacy.wears x where w.id = any (x.piece_ids))`,
    );
    const n = wornDiff.rows[0]?.n ?? 0;
    if (n > 0)
      report.warnings.push(
        `${n} pieces have legacy times_worn above their recorded wears (count not carried)`,
      );
  });
  report.ok = report.failures.length === 0;
  return report;
}
