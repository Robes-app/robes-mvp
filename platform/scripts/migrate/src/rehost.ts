import { MAX_UPLOAD_BYTES } from '@robes/contracts';
import { mediaKeys } from '@robes/media';
import type { MediaStorage } from '@robes/media/storage';
import pg from 'pg';
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
// exactly as for a fresh upload — so the real copy (applyRehost) only has to PUT the bytes and
// flip provider → 's3' + bucket_key. This lists what it would do and never touches the network.
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

export interface RehostReport {
  copied: number;
  skipped: { assetId: string; reason: string }[];
  failed: { assetId: string; error: string }[];
}

type Fetch = (url: string, init: { signal: AbortSignal }) => Promise<Response>;

// Legacy images only ever came from our Cloudinary account; any other URL is not fetched.
function isCloudinary(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'res.cloudinary.com';
  } catch {
    return false;
  }
}

// The real copy: PUT the bytes to the upload key, then flip the row to S3. The S3 event renders it
// (RenditionFn sees a pending asset with a matching owner). A crash between the two steps leaves
// the row on cloudinary_legacy, so the next run re-PUTs harmlessly and flips it.
export async function applyRehost(
  targetUrl: string,
  storage: Pick<MediaStorage, 'putObject'>,
  opts: { fetch?: Fetch; concurrency?: number; timeoutMs?: number } = {},
): Promise<RehostReport> {
  const doFetch = opts.fetch ?? fetch;
  const report: RehostReport = { copied: 0, skipped: [], failed: [] };
  const queue = await planRehost(targetUrl);
  const concurrency = opts.concurrency ?? 4;
  const pool = new pg.Pool({
    connectionString: targetUrl,
    max: concurrency,
    application_name: 'robes-migrate',
  });
  try {
    const copy = async (item: RehostItem): Promise<void> => {
      if (!isCloudinary(item.from)) {
        report.skipped.push({ assetId: item.assetId, reason: 'not_cloudinary' });
        return;
      }
      try {
        const res = await doFetch(item.from, {
          signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (Number(res.headers.get('content-length') ?? 0) > MAX_UPLOAD_BYTES) {
          report.skipped.push({ assetId: item.assetId, reason: 'too_large' });
          return;
        }
        const body = new Uint8Array(await res.arrayBuffer());
        if (body.byteLength > MAX_UPLOAD_BYTES) {
          report.skipped.push({ assetId: item.assetId, reason: 'too_large' });
          return;
        }
        await storage.putObject(item.to, body, {
          contentType: res.headers.get('content-type') ?? 'application/octet-stream',
        });
        await pool.query(
          `update app.assets set provider = 's3', bucket_key = $2
           where id = $1 and provider = 'cloudinary_legacy'`,
          [item.assetId, item.to],
        );
        report.copied++;
      } catch (err) {
        report.failed.push({
          assetId: item.assetId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    };
    const workers = Array.from({ length: concurrency }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) await copy(item);
    });
    await Promise.all(workers);
    return report;
  } finally {
    await pool.end();
  }
}
