import { EmptyInput, PhotoReadParams, ReadCrops } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { readCrops } from '@/server/photo-reads';
import { route } from '@/server/route';

// The crops of a read of hers, for found rows the look does not hold yet (a row just written,
// before the look comes back with it). Polled while a crop's renditions are being made.
export const GET = route({
  auth: 'user',
  input: EmptyInput,
  params: PhotoReadParams,
  output: ReadCrops,
  rateLimit: { key: 'wardrobe.photoRead.crops', limit: 120, windowSeconds: 60 },
  handler: ({ user, params }) => readCrops(verifiedUserId(user.id), params.id),
});
