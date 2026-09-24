import { assertMigration } from '../assert';
import { targetUrl } from '../db';
import { print } from './args';

// pnpm migrate:assert — exits 1 on any failure (the cutover gate).
const report = await assertMigration(targetUrl());
print(report);
if (!report.ok) process.exit(1);
