import { EmptyInput, HealthOutput } from '@robes/contracts';
import { route } from '@/server/route';

export const GET = route({
  auth: 'public',
  input: EmptyInput,
  output: HealthOutput,
  handler: async () => ({ ok: true as const }),
});
