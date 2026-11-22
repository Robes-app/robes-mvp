import { AssetParams, CreateLiftInput, CreateLiftOutput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { uploadDeps } from '@/server/upload-deps';
import { createLiftUpload } from '@/server/uploads';

// What her phone lifted out of a wardrobe photo it has just uploaded (cutout brief): a presigned
// PUT for the one file beside that photo. No quota: it rides the upload that was already charged.
export const POST = route({
  auth: 'user',
  flag: 'uploads',
  input: CreateLiftInput,
  params: AssetParams,
  output: CreateLiftOutput,
  status: 201,
  rateLimit: { key: 'uploads.lift', limit: 30, windowSeconds: 60 },
  handler: ({ user, input, params }) =>
    createLiftUpload(uploadDeps, verifiedUserId(user.id), params.id, input),
});
