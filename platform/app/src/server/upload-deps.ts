import 'server-only';
import { after } from 'next/server';
import { repos } from './db';
import { env } from './env';
import { renderLocally } from './local-rendition';
import { mediaDelivery, mediaStorage } from './media';
import type { UploadDeps } from './uploads';

export const uploadDeps: UploadDeps = {
  assets: repos.assets,
  storage: mediaStorage,
  delivery: mediaDelivery,
  // Deployed: the S3 ObjectCreated event drives RenditionFn, so completing only verifies the object.
  ...(env.APP_ENV === 'dev' ? { onUploaded: (key) => after(() => renderLocally(key)) } : {}),
};
