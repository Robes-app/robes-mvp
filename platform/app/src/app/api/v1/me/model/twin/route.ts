import { EmptyInput, Model } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { drawTwin } from '@/server/model';
import { route } from '@/server/route';

// Her own twin only (SEC-22): everything it is drawn from is read from her rows, never the body.
// The draw is a job charged to her image quota; an unchanged twin never draws again.
export const POST = route({
  auth: 'user',
  input: EmptyInput,
  output: Model,
  rateLimit: { key: 'me.model.twin', limit: 20, windowSeconds: 60 },
  handler: ({ user, req }) => drawTwin(verifiedUserId(user.id), req),
});
