import type { SystemRepositories } from '@robes/db';
import { mediaKeys } from '@robes/media';
import type { MediaStorage } from '@robes/media/storage';
import type { JobLogger } from './logger';

export interface ExportDeps {
  exports: Pick<SystemRepositories['dataExport'], 'claimNext' | 'collect' | 'complete' | 'fail'>;
  storage: Pick<MediaStorage, 'putObject'>;
  logger: JobLogger;
  now?: () => Date;
}

export const EXPORT_FORMAT_VERSION = 1;

// SEC-81: one JSON document of everything she holds with Robes. Photos are listed by asset id and
// storage key only; signed URLs would expire long before anyone reads the file.
export async function processDataExports(deps: ExportDeps, limit = 10): Promise<number> {
  let done = 0;
  for (let i = 0; i < limit; i++) {
    const claim = await deps.exports.claimNext();
    if (!claim) break;
    try {
      const data = await deps.exports.collect(claim.userId);
      const document = {
        format: 'robes-data-export',
        version: EXPORT_FORMAT_VERSION,
        exportedAt: (deps.now?.() ?? new Date()).toISOString(),
        note: 'Photos are listed by asset id and storage key; the image files themselves are not included.',
        ...data,
        images: data.assets
          .filter((a) => a.status === 'ready' && !a.deletedAt)
          .map((a) => ({ assetId: a.id, kind: a.kind, key: mediaKeys.master(claim.userId, a.id) })),
      };
      const key = mediaKeys.dataExport(claim.userId, claim.id);
      await deps.storage.putObject(
        key,
        new TextEncoder().encode(JSON.stringify(document, null, 2)),
        {
          contentType: 'application/json',
          cacheControl: 'private, no-store',
        },
      );
      await deps.exports.complete(claim.id, key);
      deps.logger.info({ requestId: claim.id }, 'data_export_ready');
      done++;
    } catch (err) {
      await deps.exports.fail(claim.id);
      deps.logger.error(
        { requestId: claim.id, reason: err instanceof Error ? err.message : String(err) },
        'data_export_failed',
      );
    }
  }
  return done;
}
