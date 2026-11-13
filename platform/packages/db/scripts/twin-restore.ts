import { createDb } from '../src/client';
import { verifiedUserId } from '../src/ids';
import { createSystemRepositories } from '../src/repos';

// `pnpm --filter @robes/db twin:restore <email>`: puts back the digital twin she deleted, as it
// stood, if she asks within 30 days (repo twin-archives.ts). Local databases only unless --remote
// is passed (use a deliberate, reviewed run, with the admin DATABASE_URL in the environment).
const [email, ...flags] = process.argv.slice(2);
if (!email) {
  console.error('usage: twin:restore <email> [--remote]');
  process.exit(2);
}
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set (app/.env.local)');
  process.exit(2);
}
const host = new URL(url).hostname;
if (!['127.0.0.1', 'localhost', '::1'].includes(host) && !flags.includes('--remote')) {
  console.error(`refusing to restore on ${host} without --remote`);
  process.exit(2);
}

const db = createDb({ connectionString: url, max: 1, applicationName: 'robes-twin-restore' });
try {
  const user = await db
    .selectFrom('users')
    .select('id')
    .where('email', '=', email.trim().toLowerCase())
    .executeTakeFirst();
  if (!user) {
    console.error(`no user with email ${email}`);
    process.exitCode = 1;
  } else {
    // The operator has her request in hand: that is what verifies the id here.
    const restored = await createSystemRepositories(db).twinArchives.restore(
      verifiedUserId(user.id),
    );
    await db
      .insertInto('auditLog')
      .values({
        action: 'twin.restore',
        subjectUserId: user.id,
        subjectTable: 'twin_archives',
        subjectId: user.id,
        detail: JSON.stringify({ restored, via: 'script' }),
      })
      .execute();
    console.info(restored ? 'her twin is back' : 'nothing to restore inside the 30 days');
    if (!restored) process.exitCode = 1;
  }
} finally {
  await db.destroy();
}
