import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { CATALOG_KEY, catalogKey, ROBES_MODEL_NS, robesModelId } from '@robes/core/avatar';
import { mediaKeys } from '@robes/media';
import type { MediaStorage } from '@robes/media/storage';
import { withClient } from './db';

// The women's five Robes models Annie chose (7 Nov), preloaded so they are never drawn: each seed
// is put at its catalog key and its cell marked ready, so the server's claim finds it drawn. The
// men's five have no seeds and are drawn from ROBES_MODELS as before.
const SEEDS = new URL('../seed/robes-models/', import.meta.url);
const CONTENT_TYPE = 'image/jpeg';

export interface PreloadItem {
  cellKey: string;
  bucketKey: string;
  file: string;
}

export function planRobesModels(): PreloadItem[] {
  return ROBES_MODEL_NS.map((n) => {
    const cellKey = catalogKey(robesModelId('woman', n));
    if (!CATALOG_KEY.test(cellKey)) throw new Error(`invalid catalog key ${cellKey}`);
    return {
      cellKey,
      bucketKey: mediaKeys.avatarCell(cellKey, 'jpg'),
      file: fileURLToPath(new URL(`${cellKey}.jpg`, SEEDS)),
    };
  });
}

// PUT each portrait, then mark its cell ready (over any claim or failed draw). The key carries the
// style, so a cached portrait of another lineup is never overwritten. Safe to run again.
export async function applyRobesModels(
  targetUrl: string,
  storage: Pick<MediaStorage, 'putObject'>,
): Promise<{ preloaded: string[] }> {
  const plan = planRobesModels();
  const bodies = await Promise.all(plan.map((item) => readFile(item.file)));
  for (const [i, item] of plan.entries()) {
    await storage.putObject(item.bucketKey, new Uint8Array(bodies[i] as Buffer), {
      contentType: CONTENT_TYPE,
      cacheControl: 'public, max-age=31536000, immutable',
    });
  }
  await withClient(targetUrl, async (c) => {
    for (const item of plan) {
      await c.query(
        `insert into app.avatar_cells (id, status, bucket_key, content_type)
         values ($1, 'ready', $2, $3)
         on conflict (id) do update
           set status = 'ready', bucket_key = excluded.bucket_key,
               content_type = excluded.content_type, job_id = null`,
        [item.cellKey, item.bucketKey, CONTENT_TYPE],
      );
    }
  });
  return { preloaded: plan.map((item) => item.cellKey) };
}
