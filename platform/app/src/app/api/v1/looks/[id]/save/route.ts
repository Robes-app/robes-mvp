import { Look, LookParams, SaveLookInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { saveLook } from '@/server/look-states';
import { route } from '@/server/route';

// Suggested or draft → saved: Save to lookbook (as is), or a draft's Save. Saved never goes back.
export const POST = route({
  auth: 'user',
  input: SaveLookInput,
  params: LookParams,
  output: Look,
  rateLimit: { key: 'looks.save', limit: 120, windowSeconds: 60 },
  handler: ({ user, input, params }) => saveLook(verifiedUserId(user.id), params.id, input.name),
});
