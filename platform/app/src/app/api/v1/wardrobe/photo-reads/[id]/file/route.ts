import { FileReadInput, FileReadOutput, PhotoReadParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { fileRead } from '@/server/photo-reads';
import { route } from '@/server/route';

export const POST = route({
  auth: 'user',
  input: FileReadInput,
  params: PhotoReadParams,
  output: FileReadOutput,
  rateLimit: { key: 'wardrobe.photoRead.file', limit: 30, windowSeconds: 60 },
  handler: ({ user, input, params }) =>
    fileRead(verifiedUserId(user.id), params.id, input.answers, input.to),
});
