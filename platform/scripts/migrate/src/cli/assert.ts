import { assertMigration } from '../assert';
import { cliTarget, print } from './args';

// pnpm migrate:assert — exits 1 on any failure (the cutover gate).
const report = await assertMigration(cliTarget());
print(report);
if (!report.ok) process.exit(1);
