import { writeFileSync } from 'node:fs';
import { targetUrl } from '../db';
import { reverseDelta } from '../reverse-delta';
import { flag, print } from './args';

// pnpm migrate:reverse-delta --since=<ISO> [--out=file.json] (docs/migration.md §5).
const since = flag('since');
if (!since || Number.isNaN(Date.parse(since))) {
  console.error('usage: migrate:reverse-delta --since=2026-11-01T09:00:00Z [--out=delta.json]');
  process.exit(1);
}
const delta = await reverseDelta(targetUrl(), new Date(since));
const out = flag('out');
if (out) writeFileSync(out, JSON.stringify(delta, null, 2));
else print(delta);
