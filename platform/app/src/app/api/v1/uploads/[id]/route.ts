import { AssetParams, Deleted, EmptyInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { uploadDeps } from '@/server/upload-deps';
import { discardUpload } from '@/server/uploads';

// D20: Discard in image mode deletes the look photo she picked but never accepted. Not behind the
// `uploads` flag: pausing uploads must never stop her deleting her own photo.
export const DELETE = route({
  auth: 'user',
  input: EmptyInput,
  params: AssetParams,
  output: Deleted,
  rateLimit: { key: 'uploads.discard', limit: 60, windowSeconds: 60 },
  handler: ({ user, params }) => discardUpload(uploadDeps, verifiedUserId(user.id), params.id),
});
