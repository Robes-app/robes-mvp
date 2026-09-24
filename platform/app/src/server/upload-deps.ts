import 'server-only';
import { after } from 'next/server';
import { repos } from './db';
import { env } from './env';
import { mediaDelivery, mediaStorage } from './media';
import type { UploadDeps } from './uploads';

export const uploadDeps: UploadDeps = {
  assets: repos.assets,
  storage: mediaStorage,
  delivery: mediaDelivery,
  // Deployed: the S3 ObjectCreated event drives RenditionFn, so completing only verifies the object.
  // Lazy import keeps sharp and the system repositories out of deployed route bundles' load path.
  ...(env.APP_ENV === 'dev'
    ? {
        onUploaded: (key) =>
          after(async () => (await import('./local-rendition')).renderLocally(key)),
      }
    : {}),
};
