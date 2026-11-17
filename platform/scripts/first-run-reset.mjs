import { execFileSync } from 'node:child_process';
import { adminServerUrl, isLocal } from './lib/dbmate.mjs';

// Local only: walk Getting to know you again on the simulator (onboarding PRD, 17 Nov). Clears
// the flow's version and step for one account; her answers, looks and pieces are left as they are.
// Usage: pnpm first-run:reset you@example.com
const email = process.argv[2];
if (!email) {
  console.error('Usage: pnpm first-run:reset <email>');
  process.exit(1);
}
if (!isLocal(adminServerUrl())) {
  console.error('first-run:reset refuses to run against a non-local database.');
  process.exit(1);
}
const db = process.env.ROBES_DB_NAME ?? 'robes';
const out = execFileSync(
  'docker',
  [
    'compose',
    'exec',
    '-T',
    'postgres',
    'psql',
    '-U',
    'postgres',
    '-d',
    db,
    '-v',
    'ON_ERROR_STOP=1',
    '-v',
    `email=${email}`,
    '-qtA',
  ],
  {
    input: `update app.profiles p set first_run_version = null, first_run_step = null,
  first_run_skipped = '{}' from app.users u where u.id = p.id and lower(u.email) = lower(:'email')
  returning p.id;`,
    encoding: 'utf8',
  },
);
console.log(out.trim() ? `Reset Getting to know you for ${email}.` : `No account for ${email}.`);
