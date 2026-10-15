import { EmptyInput, Features } from '@robes/contracts';
import { clientFeatures } from '@/server/flags';
import { route } from '@/server/route';

// The flagged doors her clients show; read per request so an admin toggle reaches every device.
export const GET = route({
  auth: 'user',
  input: EmptyInput,
  output: Features,
  handler: () => clientFeatures(),
});
