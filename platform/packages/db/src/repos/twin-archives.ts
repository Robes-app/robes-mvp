import { sql, type Transaction } from 'kysely';
import type { Db } from '../client';
import type { DB } from '../database.types';
import type { UserId } from '../ids';

// How long a deleted twin can still be put back (owner, 13 Nov 2026). Her photographs wait as long
// before their files go (staleUploads.dueRemoved).
export const TWIN_ARCHIVE_DAYS = 30;

// What a digital twin is made of, beyond her photographs and her filed model (the avatars row):
// the columns deleting it clears. This is the one list. Clearing, archiving and restoring are all
// derived from it below, so a column added here can never be cleared without being archived, or
// archived without being put back. (Her measurements also ride user_overrides.measurements.)
export const TWIN_STYLE_COLUMNS = [
  'headshot_asset_id',
  'full_length_asset_id',
  'season',
  'undertone',
  'contrast',
  'color_harmony',
  'colour_render',
  'body_type',
  'silhouette_proportions',
  'silhouette_render',
] as const;
export const TWIN_PROFILE_COLUMNS = [
  'height_cm',
  'size_uk',
  'bust_band',
  'bust_cup',
  'bust_cm',
  'waist_cm',
  'avatar_prefs',
] as const;
// Constant column names from the lists above, never input.
const list = (cols: readonly string[], prefix = '') =>
  sql.raw(cols.map((c) => `${prefix}${c}`).join(', '));
const nulled = (cols: readonly string[]) => sql.raw(cols.map((c) => `${c} = null`).join(', '));

export interface TwinLookPicture {
  id: string;
  renderAssetId: string | null;
  renderKey: string | null;
  renderStatus: string | null;
  frameAssetId: string | null;
  frameKey: string | null;
  stoodOn: string | null;
}

// Sets aside everything clearTwin is about to clear, as it stands, with the photographs the
// delete marks and the looks' pictures drawn on her twin. Nothing is archived when there is
// nothing on file (no photograph going and no model filed).
export async function archiveTwin(
  trx: Transaction<DB>,
  userId: UserId,
  going: readonly { id: string; status: string }[],
  looks: readonly TwinLookPicture[],
): Promise<void> {
  await sql`
    insert into app.twin_archives (user_id, snapshot)
    select ${userId}, jsonb_build_object(
      'assets', ${JSON.stringify(going)}::jsonb,
      'avatar', (select to_jsonb(a) from app.avatars a where a.user_id = ${userId}),
      'style', (select to_jsonb(x) from (
        select ${list(TWIN_STYLE_COLUMNS, 's.')}, s.user_overrides -> 'measurements' as measurements
        from app.style_profiles s where s.user_id = ${userId}) x),
      'profile', (select to_jsonb(x) from (
        select ${list(TWIN_PROFILE_COLUMNS, 'p.')} from app.profiles p where p.id = ${userId}) x),
      'looks', ${JSON.stringify(
        looks.map((l) => ({
          id: l.id,
          render_asset_id: l.renderAssetId,
          render_key: l.renderKey,
          render_status: l.renderStatus,
          frame_asset_id: l.frameAssetId,
          frame_key: l.frameKey,
          stood_on: l.stoodOn,
        })),
      )}::jsonb)
    where ${going.length > 0}
      or exists (select 1 from app.avatars a where a.user_id = ${userId})`.execute(trx);
}

// Clears what a twin is made of: her filed model, what Robes read from her photographs, her
// measurements and her picks. Her age band stays (Annie, 12 Nov): it is not in the lists.
export async function clearTwin(trx: Transaction<DB>, userId: UserId): Promise<void> {
  await sql`delete from app.avatars where user_id = ${userId}`.execute(trx);
  await sql`
    update app.style_profiles set ${nulled(TWIN_STYLE_COLUMNS)},
      user_overrides = user_overrides - 'measurements'
    where user_id = ${userId}`.execute(trx);
  await sql`update app.profiles set ${nulled(TWIN_PROFILE_COLUMNS)} where id = ${userId}`.execute(
    trx,
  );
}

// What model.deleteTwin set aside. System only: a restore is run by hand at her ask
// (scripts/twin-restore.ts), never from a route.
export function twinArchivesRepo(db: Db) {
  return {
    // Puts her most recent deleted twin back as it stood: her photographs and twins, her model
    // on file, what Robes read, her measurements and picks, and the pictures of her looks drawn
    // on it (only where the look has not been drawn again since). Her asking is her yes to the
    // twin again. False when there is nothing to restore inside the 30 days.
    async restore(userId: UserId): Promise<boolean> {
      return db.transaction().execute(async (trx) => {
        const archive = await trx
          .selectFrom('twinArchives')
          .select(['id', 'snapshot'])
          .where('userId', '=', userId)
          .where('restoredAt', 'is', null)
          .where('createdAt', '>', sql<Date>`now() - make_interval(days => ${TWIN_ARCHIVE_DAYS})`)
          .orderBy('createdAt', 'desc')
          .limit(1)
          .forUpdate()
          .executeTakeFirst();
        if (!archive) return false;
        const snap = sql`${JSON.stringify(archive.snapshot)}::jsonb`;

        await sql`
          update app.assets a set status = x.status, deleted_at = null
          from jsonb_to_recordset(${snap} -> 'assets') as x(id uuid, status text)
          where a.id = x.id and a.user_id = ${userId} and a.deleted_at is not null`.execute(trx);
        // The model she has filed since (a Robes model, picked after the delete) gives way to the
        // one she asked to have back.
        await sql`delete from app.avatars where user_id = ${userId}
          and jsonb_typeof(${snap} -> 'avatar') = 'object'`.execute(trx);
        await sql`
          insert into app.avatars
          select (jsonb_populate_record(null::app.avatars, ${snap} -> 'avatar')).*
          where jsonb_typeof(${snap} -> 'avatar') = 'object'`.execute(trx);
        await sql`
          update app.style_profiles s set
            (${list(TWIN_STYLE_COLUMNS)}) =
            (select ${list(TWIN_STYLE_COLUMNS, 'r.')}
             from jsonb_populate_record(null::app.style_profiles, ${snap} -> 'style') r),
            user_overrides = case
              when jsonb_typeof(${snap} -> 'style' -> 'measurements') = 'object'
                then s.user_overrides || jsonb_build_object('measurements', ${snap} -> 'style' -> 'measurements')
              else s.user_overrides end
          where s.user_id = ${userId} and jsonb_typeof(${snap} -> 'style') = 'object'`.execute(trx);
        await sql`
          update app.profiles p set
            (${list(TWIN_PROFILE_COLUMNS)}) =
            (select ${list(TWIN_PROFILE_COLUMNS, 'r.')}
             from jsonb_populate_record(null::app.profiles, ${snap} -> 'profile') r)
          where p.id = ${userId} and jsonb_typeof(${snap} -> 'profile') = 'object'`.execute(trx);
        await sql`
          update app.looks l set render_asset_id = x.render_asset_id, render_key = x.render_key,
            render_status = x.render_status, frame_asset_id = x.frame_asset_id,
            frame_key = x.frame_key, stood_on = x.stood_on
          from jsonb_to_recordset(${snap} -> 'looks') as x(id uuid, render_asset_id uuid,
            render_key text, render_status text, frame_asset_id uuid, frame_key text, stood_on text)
          where l.id = x.id and l.user_id = ${userId} and l.render_asset_id is null`.execute(trx);
        await trx
          .insertInto('consents')
          .values({ userId, kind: 'photo_analysis', granted: true, source: 'email' })
          .execute();
        await trx
          .updateTable('twinArchives')
          .set({ restoredAt: sql`now()` })
          .where('id', '=', archive.id)
          .execute();
        return true;
      });
    },

    // The maintenance sweep: an archive past its 30 days goes, restored or not.
    async purge(): Promise<number> {
      const res = await db
        .deleteFrom('twinArchives')
        .where('createdAt', '<', sql<Date>`now() - make_interval(days => ${TWIN_ARCHIVE_DAYS})`)
        .executeTakeFirst();
      return Number(res.numDeletedRows);
    },
  };
}
