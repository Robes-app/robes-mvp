import { mediaKeys } from '@robes/media';
import { withClient } from './db';

export interface RehostItem {
  assetId: string;
  userId: string;
  kind: string;
  from: string;
  to: string;
}

// Cloudinary → S3 plan (docs/migration.md §3 step 5). Each legacy asset is copied to its upload
// key; the bucket's ObjectCreated event (RenditionFn) then builds renditions and marks it ready,
// exactly as for a fresh upload — so the real copy only has to PUT the bytes and flip
// provider → 's3' + bucket_key. That copy runs as idempotent maintenance work after cutover
// (not built yet); this lists what it would do and never touches the network.
export async function planRehost(targetUrl: string, limit = 10_000): Promise<RehostItem[]> {
  return withClient(targetUrl, async (c) => {
    const { rows } = await c.query<{
      id: string;
      user_id: string;
      kind: string;
      legacy_url: string;
    }>(
      `select id, user_id, kind, legacy_url from app.assets
       where provider = 'cloudinary_legacy' and legacy_url is not null and user_id is not null
         and deleted_at is null
       order by created_at, id limit $1`,
      [limit],
    );
    return rows.map((r) => ({
      assetId: r.id,
      userId: r.user_id,
      kind: r.kind,
      from: r.legacy_url,
      to: mediaKeys.original(r.user_id, r.id),
    }));
  });
}
