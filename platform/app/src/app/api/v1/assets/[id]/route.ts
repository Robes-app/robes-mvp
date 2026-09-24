import { Asset, AssetParams, EmptyInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { uploadDeps } from '@/server/upload-deps';
import { getAsset } from '@/server/uploads';

export const GET = route({
  auth: 'user',
  input: EmptyInput,
  params: AssetParams,
  output: Asset,
  rateLimit: { key: 'assets.get', limit: 300, windowSeconds: 60 },
  handler: ({ user, params }) => getAsset(uploadDeps, verifiedUserId(user.id), params.id),
});
