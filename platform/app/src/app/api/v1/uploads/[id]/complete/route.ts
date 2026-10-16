import { Asset, AssetParams, EmptyInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { uploadDeps } from '@/server/upload-deps';
import { completeUpload } from '@/server/uploads';

export const POST = route({
  auth: 'user',
  flag: 'uploads',
  input: EmptyInput,
  params: AssetParams,
  output: Asset,
  rateLimit: { key: 'uploads.complete', limit: 60, windowSeconds: 60 },
  handler: ({ user, params }) => completeUpload(uploadDeps, verifiedUserId(user.id), params.id),
});
