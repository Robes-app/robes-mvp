import { EmptyInput, Model, UpdateModelInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { loadModel, updateModel } from '@/server/model';
import { route } from '@/server/route';

export const GET = route({
  auth: 'user',
  input: EmptyInput,
  output: Model,
  handler: ({ user }) => loadModel(verifiedUserId(user.id)),
});

// Her own model only (SEC-22): picks are catalog values; no image or likeness comes from the body.
export const PATCH = route({
  auth: 'user',
  input: UpdateModelInput,
  output: Model,
  rateLimit: { key: 'me.model.update', limit: 60, windowSeconds: 60 },
  handler: ({ user, req, input }) => updateModel(verifiedUserId(user.id), req, input),
});
