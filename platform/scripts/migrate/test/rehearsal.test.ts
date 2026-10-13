import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertMigration } from '../src/assert';
import { LEGACY_CATALOG } from '../src/catalog';
import { databaseUrl, dropDatabase, recreateDatabase, withClient } from '../src/db';
import { extract, legacyTableName } from '../src/extract';
import { L, NIALL, SHARE_TOKEN } from '../src/fixture-data';
import { legacyUuid } from '../src/ids';
import { buildLegacyFixture } from '../src/legacy-fixture';
import { planRehost } from '../src/rehost';
import { reverseDelta } from '../src/reverse-delta';
import { recreateTarget } from '../src/target';
import { transform } from '../src/transform';

// Own databases, so a test run never clobbers a manual rehearsal (robes_legacy_fixture/robes_migrate).
const LEGACY = 'robes_legacy_fixture_test';
const TARGET = 'robes_migrate_test';
const legacyUrl = databaseUrl(LEGACY);
let targetUrl: string;

async function rehearse(extraLegacySql?: string) {
  await recreateDatabase(LEGACY);
  await buildLegacyFixture(legacyUrl, extraLegacySql);
  targetUrl = await recreateTarget(TARGET);
  const extracted = await extract(legacyUrl, targetUrl);
  const transformed = await transform(targetUrl);
  return { extracted, transformed, report: await assertMigration(targetUrl) };
}

const one = async <T>(sql: string, values: unknown[] = []) =>
  withClient(targetUrl, async (c) => (await c.query(sql, values)).rows[0] as T);

describe('legacy → platform rehearsal (docs/migration.md §3)', () => {
  let first: Awaited<ReturnType<typeof rehearse>>;
  beforeAll(async () => {
    first = await rehearse();
  });
  afterAll(async () => {
    for (const db of [LEGACY, TARGET]) await dropDatabase(db);
  });

  it('keeps the catalogue in step with the legacy SQL', async () => {
    const actual = await withClient(
      legacyUrl,
      async (c) =>
        (
          await c.query<{ t: string; cols: [string, string][] }>(
            `select c.table_schema || '.' || c.table_name as t,
             json_agg(json_build_array(c.column_name, format_type(a.atttypid, a.atttypmod)) order by c.ordinal_position) as cols
           from information_schema.columns c
           join pg_attribute a on a.attrelid = (quote_ident(c.table_schema) || '.' || quote_ident(c.table_name))::regclass
             and a.attname = c.column_name
           where (c.table_schema = 'public' and c.table_name not in ('wardrobe_taxonomy','wardrobe_tag_defaults','wear_seed_labels'))
              or (c.table_schema = 'auth' and c.table_name = 'users')
           group by 1`,
          )
        ).rows,
    );
    expect(Object.fromEntries(actual.map((r) => [r.t, r.cols]))).toEqual(
      Object.fromEntries(Object.entries(LEGACY_CATALOG).map(([k, v]) => [k, v.map((x) => [...x])])),
    );
  });

  it('migrates the fixture and passes every assertion', () => {
    expect(first.report.failures).toEqual([]);
    expect(first.report.ok).toBe(true);
    expect(first.transformed.droppedLookbook).toEqual([
      { legacyId: '1720000000004', type: 'look' },
    ]);
    expect(first.report.census).toMatchObject({
      idea: { rows: 1, invalid: 0 },
      daily_look: { rows: 1, invalid: 0 },
    });
    expect(first.report.warnings.some((w) => w.includes('is_admin'))).toBe(true);
    expect(first.report.warnings).toContain(
      '2 suggested/draft looks not carried (only saved looks are)',
    );
    expect(first.report.warnings).toContain('1 saved looks have styling notes (not carried)');
  });

  it('carries saved looks only, and no tags or renders from unsaved ones', async () => {
    const looks = await one<{ ids: string[] }>(
      'select array_agg(id::text order by id) as ids from app.looks where user_id = $1',
      [NIALL],
    );
    expect(looks.ids).toEqual([L.office, L.weekend]);
    const leaks = await one<{ tags: number; assets: number; pieces: number }>(
      `select (select count(*)::int from app.tags where user_id = $1 and label = 'Holiday') as tags,
              (select count(*)::int from app.assets where legacy_url like '%suggested-render%') as assets,
              (select count(*)::int from app.look_pieces where look_id = $2) as pieces`,
      [NIALL, L.draft],
    );
    expect(leaks).toEqual({ tags: 0, assets: 0, pieces: 0 });
  });

  it('keeps ids, maps prefs to the contract keys, and holds values to the target checks', async () => {
    const p = await one<{ notification_prefs: unknown; timezone: string; first_name: string }>(
      'select notification_prefs, timezone, first_name from app.profiles where id = $1',
      [NIALL],
    );
    expect(p).toEqual({
      notification_prefs: { looksReady: true, morningCue: false, nudges: true, receipts: false },
      timezone: 'Australia/Sydney',
      first_name: 'Niall',
    });
    const admin = await one<{ n: number }>('select count(*)::int as n from app.admin_users');
    expect(admin.n).toBe(0);
    const share = await one<{ subject_id: string; legacy_token: boolean }>(
      'select subject_id, legacy_token from app.shares where token = $1',
      [SHARE_TOKEN],
    );
    expect(share).toEqual({
      subject_id: legacyUuid('artifact', NIALL, '1720000000001'),
      legacy_token: true,
    });
  });

  it('is safe to run twice: the second transform inserts nothing and still asserts clean', async () => {
    const again = await transform(targetUrl);
    expect(Object.values(again.inserted).every((n) => n === 0)).toBe(true);
    expect((await assertMigration(targetUrl)).ok).toBe(true);
  });

  it('plans the rehost of every Cloudinary image to its upload key, offline', async () => {
    const plan = await planRehost(targetUrl);
    expect(plan.length).toBeGreaterThan(0);
    for (const item of plan) {
      expect(item.from).toMatch(/^https:\/\/res\.cloudinary\.com\//);
      expect(item.to).toBe(`uploads/${item.userId}/${item.assetId}/original`);
    }
  });

  it('exports only what was created on the platform after cutover', async () => {
    const cutover = new Date();
    await withClient(targetUrl, (c) =>
      c.query(
        `insert into app.wardrobe_items (user_id, label) values ($1, 'Bought after cutover')`,
        [NIALL],
      ),
    );
    const delta = await reverseDelta(targetUrl, cutover);
    expect((delta.wardrobeItems as { label: string }[]).map((w) => w.label)).toEqual([
      'Bought after cutover',
    ]);
    expect(delta.artifacts).toEqual([]);
  });

  it('fails the gate when the target loses migrated data', async () => {
    await withClient(targetUrl, (c) => c.query(`delete from app.looks where name = 'Weekend'`));
    const report = await assertMigration(targetUrl);
    expect(report.ok).toBe(false);
    expect(report.failures.some((f) => f.startsWith('looks: user'))).toBe(true);
  });

  it('fails the gate on a corrupted legacy row (two accounts with one email)', async () => {
    const { report } = await rehearse(
      `insert into auth.users (id, email) values ('44444444-4444-4444-8444-444444444444', 'NIALL@legacy.test')`,
    );
    expect(report.ok).toBe(false);
    expect(report.failures).toContain(
      'users: user 44444444-4444-4444-8444-444444444444 expected 1, got 0',
    );
  });

  it('copes with a legacy database where later migrations never ran', async () => {
    const { extracted, report } = await rehearse(`
      alter table public.wardrobe_items drop column season_band, drop column season_source;
      drop table public.notifications;`);
    expect(extracted.tables['public.wardrobe_items']?.missingColumns).toEqual([
      'season_band',
      'season_source',
    ]);
    expect(extracted.tables['public.notifications']?.missingTable).toBe(true);
    expect(report.failures).toEqual([]);
    const jeans = await one<{ season_band: string; season_source: string }>(
      `select season_band, season_source from app.wardrobe_items where label = 'Straight jeans'`,
    );
    expect(jeans).toEqual({ season_band: 'spring_summer', season_source: 'user' });
    expect(legacyTableName('auth.users')).toBe('auth_users');
  });
});
