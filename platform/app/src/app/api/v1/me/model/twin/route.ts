import { DeleteTwinInput, EmptyInput, Model } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { deleteTwin, drawTwin } from '@/server/model';
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

// Her own twin only (SEC-22): everything removed is found from her session's rows, and the files
// go with the maintenance sweep (only it may delete media).
export const DELETE = route({
  auth: 'user',
  input: DeleteTwinInput,
  output: Model,
  rateLimit: { key: 'me.model.twin.delete', limit: 10, windowSeconds: 60 },
  handler: ({ user, input }) => deleteTwin(verifiedUserId(user.id), input),
});
