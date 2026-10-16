import { CreateUploadInput, CreateUploadOutput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { uploadDeps } from '@/server/upload-deps';
import { createUpload } from '@/server/uploads';

export const POST = route({
  auth: 'user',
  flag: 'uploads',
  input: CreateUploadInput,
  output: CreateUploadOutput,
  status: 201,
  rateLimit: { key: 'uploads.create', limit: 30, windowSeconds: 60 },
  handler: ({ user, input }) => createUpload(uploadDeps, verifiedUserId(user.id), input),
});
