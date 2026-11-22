import 'server-only';
import { cutoutCall } from '@robes/core/cutout';
import { createSystemRepositories } from '@robes/db';
import { processUpload } from '@robes/media/process';
import { db } from './db';
import { mediaStorage } from './media';

// Dev stand-in for S3 ObjectCreated → RenditionFn (like the inline job transport); never used when deployed.
export async function renderLocally(key: string): Promise<void> {
  try {
    const system = createSystemRepositories(db);
    const result = await processUpload(
      {
        storage: mediaStorage,
        assets: system.assets,
        onCutout: ({ userId, outcome }) =>
          system.ledger.record({ ...cutoutCall(outcome), userId, jobId: outcome.jobId }),
      },
      key,
    );
    console.info(JSON.stringify({ level: 'info', msg: 'local_rendition', ...result }));
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'local_rendition_failed',
        err: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}
