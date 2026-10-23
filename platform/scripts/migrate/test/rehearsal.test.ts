import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertMigration } from '../src/assert';
import { LEGACY_CATALOG } from '../src/catalog';
import { databaseUrl, dropDatabase, recreateDatabase, withClient } from '../src/db';
import { extract, legacyTableName } from '../src/extract';
import { CAT, L, NIALL, SHARE_TOKEN, W } from '../src/fixture-data';
import { legacyUuid } from '../src/ids';
import { buildLegacyFixture, legacySchemaPresent } from '../src/legacy-fixture';
import { planRehost } from '../src/rehost';
import { resetTarget } from '../src/reset';
import { reverseDelta } from '../src/reverse-delta';
import { recreateTarget } from '../src/target';
import { transform } from '../src/transform';

// Own databases, so a test run never clobbers a manual rehearsal (robes_legacy_fixture/robes_migrate).
// ROBES_DB_NAME namespaces them like the dev/test databases, for parallel worktrees.
const NS = process.env.ROBES_DB_NAME ? `${process.env.ROBES_DB_NAME}_` : 'robes_';
const LEGACY = `${NS}legacy_fixture_test`;
const TARGET = `${NS}migrate_test`;
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

// Needs the legacy app's supabase/*.sql beside platform/; main doesn't carry them, beta does.
describe.skipIf(!legacySchemaPresent())(
  'legacy → platform rehearsal (docs/migration.md §3)',
  () => {
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
        Object.fromEntries(
          Object.entries(LEGACY_CATALOG).map(([k, v]) => [k, v.map((x) => [...x])]),
        ),
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
        '1 suggested looks carried without their legacy set (no ↻)',
      );
    });

    it('carries the colour model: shades on the list, extras, prints and her palette', async () => {
      expect(first.report.warnings).toContain(
        "1 pieces had a colour or print the model doesn't know (left unset)",
      );
      const pieces = await withClient(
        targetUrl,
        async (c) =>
          (
            await c.query(
              `select id, colour_shade, colour_extra, print from app.wardrobe_items
               where id = any($1::uuid[]) order by created_at`,
              [[W.jeans, W.coat, W.shirt]],
            )
          ).rows,
      );
      expect(pieces).toEqual([
        // On the list as filed; extras deduped, the main shade and unknown ids dropped, at most three.
        {
          id: W.jeans,
          colour_shade: 'denim',
          colour_extra: ['optic', 'ivory', 'chalk'],
          print: 'stripes',
        },
        // No shade filed: the one her colour word names.
        { id: W.coat, colour_shade: 'camel', colour_extra: [], print: null },
        // Unknown shade and print, a colour word that names no shade: left unset.
        { id: W.shirt, colour_shade: null, colour_extra: [], print: null },
      ]);
      const wishes = await withClient(
        targetUrl,
        async (c) =>
          (
            await c.query(
              `select label, colour_shade, print from app.wishlist_items where user_id = $1 order by created_at`,
              [NIALL],
            )
          ).rows,
      );
      expect(wishes).toEqual([
        { label: 'Trench coat', colour_shade: 'sand', print: 'checks' },
        { label: 'Scarf', colour_shade: null, print: 'other' },
      ]);
      expect(
        await one(`select palette from app.style_profiles where user_id = $1`, [NIALL]),
      ).toEqual({
        palette: { fam: { blues: 1 }, shade: { cobalt: -1, navy: 0 }, print: { stripes: 1 } },
      });
    });

    it('carries the twin (migration 26): bust and waist in range, the image as an asset, no key', async () => {
      expect(
        await one(`select bust_band, bust_cup, bust_cm, waist_cm from app.profiles where id = $1`, [
          NIALL,
        ]),
      ).toEqual({ bust_band: 34, bust_cup: 'C', bust_cm: null, waist_cm: 72 });
      // Out of range is dropped, never a failed run.
      expect(
        await one(`select bust_band, bust_cup, bust_cm, waist_cm from app.profiles where id = $1`, [
          CAT,
        ]),
      ).toEqual({ bust_band: null, bust_cup: null, bust_cm: null, waist_cm: null });
      expect(first.report.warnings).toContain(
        '1 profiles had a bust or waist outside the ranges (left unset)',
      );
      const twins = await withClient(
        targetUrl,
        async (c) =>
          (
            await c.query(
              `select a.user_id, a.avatar_id, a.twin_key, s.provider, s.kind, s.status, s.sensitive,
                 s.legacy_url
               from app.avatars a join app.assets s on s.id = a.twin_asset_id and s.user_id = a.user_id
               where a.user_id = any($1::uuid[]) order by a.user_id`,
              [[NIALL, CAT]],
            )
          ).rows,
      );
      const asset = {
        provider: 'cloudinary_legacy',
        kind: 'generated',
        status: 'pending',
        sensitive: true,
      };
      expect(twins).toEqual([
        {
          user_id: NIALL,
          avatar_id: 'avatar-niall',
          twin_key: null,
          ...asset,
          legacy_url: 'https://res.cloudinary.com/robes/image/upload/niall-twin.png',
        },
        // No filed model: the catalog default for her presence, so the twin has a row to ride.
        {
          user_id: CAT,
          avatar_id: 'w-s3-h1-nt',
          twin_key: null,
          ...asset,
          legacy_url: 'https://res.cloudinary.com/robes/image/upload/cat-twin.png',
        },
      ]);
    });

    it('fails the gate when a twin is lost', async () => {
      await withClient(targetUrl, (c) =>
        c.query('update app.avatars set twin_asset_id = null where user_id = $1', [CAT]),
      );
      const report = await assertMigration(targetUrl);
      expect(report.failures.some((f) => f.includes('twin lost'))).toBe(true);
      // Re-running the transform puts it back.
      await transform(targetUrl);
      expect((await assertMigration(targetUrl)).ok).toBe(true);
    });

    it('carries her twin, her brief and the memory she told Robes', async () => {
      expect(
        await one(
          `select style_brands, investment_level, height_cm, size_uk, shoe_uk::float8 as shoe_uk, age_band
         from app.profiles where id = $1`,
          [NIALL],
        ),
      ).toEqual({
        style_brands: ['The Row', 'COS'],
        investment_level: '500_1500',
        height_cm: 168,
        size_uk: 10,
        shoe_uk: 5.5,
        age_band: '45_54',
      });
      const lines = await withClient(
        targetUrl,
        async (c) =>
          (
            await c.query(
              `select list, state, text, source, chip from app.style_brief_lines where user_id = $1
           order by state, list, created_at`,
              [NIALL],
            )
          ).rows,
      );
      expect(lines).toEqual([
        { list: 'avoids', state: 'kept', text: 'Heels', source: 'typed', chip: 'Heels' },
        { list: 'loves', state: 'kept', text: 'A defined waist', source: 'drafted', chip: null },
        { list: 'loves', state: 'kept', text: 'One sharp shoe', source: 'typed', chip: null },
        { list: 'loves', state: 'kept', text: 'Clean lines', source: 'drafted', chip: null },
        { list: 'rules', state: 'pending', text: 'No double denim', source: 'drafted', chip: null },
        {
          list: 'avoids',
          state: 'struck',
          text: 'You avoid colour',
          source: 'drafted',
          chip: null,
        },
      ]);
      expect(
        await one(`select brief_notes, user_overrides from app.style_profiles where user_id = $1`, [
          NIALL,
        ]),
      ).toMatchObject({
        brief_notes: 'You dress well when the structure is already there.',
        user_overrides: {
          loved_colors: expect.arrayContaining(['Navy', 'burgundy']),
          rejected_colors: ['camel'],
        },
      });
      const memory = await withClient(
        targetUrl,
        async (c) =>
          (
            await c.query(
              `select kind, subject, body, verdict, piece_out from app.style_memory where user_id = $1
           order by created_at desc`,
              [NIALL],
            )
          ).rows,
      );
      expect(memory).toEqual([
        { kind: 'ask', subject: null, body: 'Something warmer', verdict: null, piece_out: null },
        {
          kind: 'verdict',
          subject: 'Harbour Dinner',
          body: 'too safe',
          verdict: 0,
          piece_out: null,
        },
        { kind: 'swap', subject: null, body: null, verdict: null, piece_out: 'Tan loafers' },
        { kind: 'strike', subject: null, body: 'You avoid colour', verdict: null, piece_out: null },
      ]);
    });

    it('carries looks in every state; only saved ones take tags, renders and days', async () => {
      const looks = await one<{ rows: { id: string; status: string; anchor: string | null }[] }>(
        `select json_agg(json_build_object('id', id, 'status', status, 'anchor', anchor_piece_id)
         order by id) as rows from app.looks where user_id = $1`,
        [NIALL],
      );
      expect(looks.rows).toEqual([
        { id: L.office, status: 'saved', anchor: null },
        { id: L.weekend, status: 'saved', anchor: null },
        { id: L.suggested, status: 'suggested', anchor: W.coat },
        { id: L.draft, status: 'draft', anchor: null },
      ]);
      // How each piece is worn rides by her piece id (migration 24).
      const office = await one<{ styling: unknown }>(
        'select styling from app.looks where id = $1',
        [L.office],
      );
      expect(office.styling).toEqual({ [W.jeans]: 'cuffed once' });
      const leaks = await one<{ tags: number; assets: number; pieces: number }>(
        `select (select count(*)::int from app.tags where user_id = $1 and label = 'Holiday') as tags,
              (select count(*)::int from app.assets where legacy_url like '%suggested-render%') as assets,
              (select count(*)::int from app.look_pieces where look_id = $2) as pieces`,
        [NIALL, L.draft],
      );
      expect(leaks).toEqual({ tags: 0, assets: 0, pieces: 1 });
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
      // The database's clock, not this process's: Docker's can trail the host's by a few ms.
      const { now: cutover } = await one<{ now: Date }>('select clock_timestamp() as now');
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

    it('reset wipes a test copy so the cutover run copies the legacy app fresh', async () => {
      await rehearse();
      // Someone signed up on the new app while it was being tested: the final run must not keep them.
      await withClient(targetUrl, (c) =>
        c.query(`insert into app.users (id, email) values ($1, 'tester@new.test')`, [
          '55555555-5555-4555-8555-555555555555',
        ]),
      );
      const { usersRemoved } = await resetTarget(targetUrl);
      expect(usersRemoved).toBeGreaterThan(1);
      const owned = await withClient(targetUrl, async (c) => {
        const { rows } = await c.query<{ table_name: string }>(
          `select table_name from information_schema.columns
           where table_schema = 'app' and column_name = 'user_id'`,
        );
        const counts: Record<string, number> = {};
        for (const { table_name } of rows) {
          const r = await c.query<{ n: number }>(
            `select count(*)::int as n from app."${table_name}"`,
          );
          counts[table_name] = r.rows[0]?.n ?? 0;
        }
        return counts;
      });
      expect(Object.values(owned).every((n) => n === 0)).toBe(true);
      expect(await one<{ n: number }>('select count(*)::int as n from app.users')).toEqual({
        n: 0,
      });
      expect(
        await one<{ present: boolean }>(
          `select exists (select 1 from information_schema.schemata where schema_name = 'legacy') as present`,
        ),
      ).toEqual({ present: false });

      await extract(legacyUrl, targetUrl);
      await transform(targetUrl);
      const report = await assertMigration(targetUrl);
      expect(report.failures).toEqual([]);
      expect(
        await one<{ n: number }>(
          `select count(*)::int as n from app.users where email = 'tester@new.test'`,
        ),
      ).toEqual({ n: 0 });
    });
  },
);
