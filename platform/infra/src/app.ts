import { fileURLToPath } from 'node:url';
import type { App } from 'aws-cdk-lib';
import { type StageName, stages } from '../config';
import { RobesStage } from './stage';

export const WORKERS_ENTRY_DIR = fileURLToPath(
  new URL('../../workers/src/handlers', import.meta.url),
);
export const FIXTURE_ENTRY_DIR = fileURLToPath(
  new URL('../test/fixtures/handlers', import.meta.url),
);

function flag(value: unknown): boolean {
  return value === true || value === 'true';
}

// Context: `stage` (staging|production; default both), `fixtures` (stub handlers),
// `workersEntryDir` (explicit handler dir).
export function buildApp(app: App): RobesStage[] {
  const ctx = (key: string): unknown => app.node.tryGetContext(key);
  const workersEntryDir =
    (ctx('workersEntryDir') as string | undefined) ??
    (flag(ctx('fixtures')) ? FIXTURE_ENTRY_DIR : WORKERS_ENTRY_DIR);
  const selected = ctx('stage') as StageName | undefined;
  if (selected !== undefined && !(selected in stages)) {
    throw new Error(
      `Unknown stage "${selected}"; expected one of ${Object.keys(stages).join(', ')}`,
    );
  }
  const configs = selected ? [stages[selected]] : Object.values(stages);
  return configs.map((config) => new RobesStage(app, config, { workersEntryDir }));
}
