import type pg from 'pg';
import { withClient } from './db';
import { legacyUuid } from './ids';
import { type LegacyLookbookRow, reshapeLookbook, shareSnapshot, withAssets } from './lookbook';
import { COMMS_SQL, IDENTITY_SQL, LOOKS_SQL, PLAN_SQL, SESSION_SQL, WARDROBE_SQL } from './sql';

export type Domain = 'identity' | 'wardrobe' | 'looks' | 'artifacts' | 'plan' | 'comms';
export interface TransformReport {
  inserted: Record<Domain, number>;
  droppedLookbook: { legacyId: string; type: string }[];
}

// Legacy share ids are 40-bit: they keep working for 180 days, then owners re-share (data-model §5).
export const LEGACY_SHARE_DAYS = 180;

async function inTransaction<T>(c: pg.Client, fn: () => Promise<T>): Promise<T> {
  await c.query('begin');
  try {
    const out = await fn();
    await c.query('commit');
    return out;
  } catch (err) {
    await c.query('rollback');
    throw err;
  }
}

async function run(c: pg.Client, sql: string): Promise<number> {
  const res = (await c.query(sql)) as pg.QueryResult | pg.QueryResult[];
  const all = Array.isArray(res) ? res : [res];
  return all.filter((r) => r.command === 'INSERT').reduce((n, r) => n + (r.rowCount ?? 0), 0);
}

async function artifacts(c: pg.Client, report: TransformReport): Promise<number> {
  const { rows } = await c.query<LegacyLookbookRow & { gender: string | null }>(
    `select lb.id::text as id, lb.user_id, lb.type, lb.title, lb.subtitle, lb.data, lb.created_at,
            lb.share_id, lb.is_public, p.gender_identity as gender
     from legacy.lookbook_items lb
     join app.users u on u.id = lb.user_id
     left join app.profiles p on p.id = lb.user_id
     order by lb.user_id, lb.id`,
  );
  const pieces = await c.query<{ user_id: string; id: string }>(
    'select user_id, id from app.wardrobe_items where user_id in (select distinct user_id from legacy.lookbook_items)',
  );
  const owned = new Map<string, Set<string>>();
  for (const p of pieces.rows) owned.set(p.user_id, (owned.get(p.user_id) ?? new Set()).add(p.id));

  let inserted = 0;
  for (const row of rows) {
    const reshaped = reshapeLookbook(row, {
      ownedPieces: owned.get(row.user_id) ?? new Set(),
      wearer: row.gender === 'man' ? 'man' : 'woman',
    });
    if (!reshaped) {
      report.droppedLookbook.push({ legacyId: row.id, type: row.type });
      continue;
    }
    const assetIds = new Map<number, string>();
    for (const frame of reshaped.images) {
      const id = legacyUuid('asset', row.user_id, frame.url);
      const res = await c.query(
        `insert into app.assets (id, user_id, provider, legacy_url, kind, status, created_at)
         values ($1, $2, 'cloudinary_legacy', $3, 'generated', 'pending', $4)
         on conflict (id) do nothing`,
        [id, row.user_id, frame.url, row.created_at],
      );
      inserted += res.rowCount ?? 0;
      assetIds.set(frame.idx, id);
    }
    const artifactId = legacyUuid('artifact', row.user_id, row.id);
    const res = await c.query(
      `insert into app.artifacts (id, user_id, legacy_id, type, title, subtitle, cover_asset_id, data,
         schema_version, saved_at, expires_at, created_at)
       values ($1, $2, $3::bigint, $4, left($5, 160), left($6, 240), $7, $8::jsonb, 1, $9, null, $9)
       on conflict do nothing`,
      [
        artifactId,
        row.user_id,
        row.id,
        reshaped.type,
        reshaped.title,
        reshaped.subtitle,
        assetIds.values().next().value ?? null,
        JSON.stringify(withAssets(reshaped, assetIds)),
        row.created_at,
      ],
    );
    inserted += res.rowCount ?? 0;
    // Kept as the token so /board/<id> links survive; flagged for rotation (data-model.md §5).
    if (row.share_id && row.is_public) {
      const share = await c.query(
        `insert into app.shares (token, owner_id, subject_type, subject_id, snapshot, legacy_token,
           created_at, expires_at)
         values ($1, $2, 'artifact', $3, $4::jsonb, true, $5, now() + make_interval(days => $6))
         on conflict do nothing`,
        [
          row.share_id,
          row.user_id,
          artifactId,
          JSON.stringify(shareSnapshot(reshaped)),
          row.created_at,
          LEGACY_SHARE_DAYS,
        ],
      );
      inserted += share.rowCount ?? 0;
    }
  }
  return inserted;
}

// legacy.* (extract.ts) → app.*, one transaction per domain, safe to re-run (inserts nothing new).
export async function transform(targetUrl: string): Promise<TransformReport> {
  const report: TransformReport = {
    inserted: { identity: 0, wardrobe: 0, looks: 0, artifacts: 0, plan: 0, comms: 0 },
    droppedLookbook: [],
  };
  await withClient(targetUrl, async (c) => {
    const legacy = await c.query(
      "select 1 from information_schema.schemata where schema_name = 'legacy'",
    );
    if (legacy.rowCount === 0) throw new Error('no legacy schema in the target: run extract first');
    await c.query(SESSION_SQL);
    const steps: [Domain, () => Promise<number>][] = [
      ['identity', () => run(c, IDENTITY_SQL)],
      ['wardrobe', () => run(c, WARDROBE_SQL)],
      ['looks', () => run(c, LOOKS_SQL)],
      ['artifacts', () => artifacts(c, report)],
      ['plan', () => run(c, PLAN_SQL)],
      ['comms', () => run(c, COMMS_SQL)],
    ];
    for (const [domain, step] of steps) {
      try {
        report.inserted[domain] = await inTransaction(c, step);
      } catch (err) {
        throw new Error(`transform ${domain}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  });
  return report;
}
