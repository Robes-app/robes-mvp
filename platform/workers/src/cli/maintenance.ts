import { workerContext } from '../context';
import { MAINTENANCE_TASKS, runMaintenance } from '../handlers/maintenance';

// `pnpm maintenance`: every maintenance task once, against the local DB (dev runs swept jobs inline).
const ctx = await workerContext();
try {
  await runMaintenance(ctx, MAINTENANCE_TASKS);
} finally {
  await ctx.close();
}
ctx.logger.info({ tasks: MAINTENANCE_TASKS }, 'maintenance_done');
