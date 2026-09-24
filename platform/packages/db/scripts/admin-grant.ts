import { createDb } from '../src/client';

// `pnpm --filter @robes/db admin:grant <email> [admin|support|analyst]`: grants a role to an
// existing user. Local databases only unless --remote is passed (use a deliberate, reviewed run).
const [email, role = 'admin', ...flags] = process.argv.slice(2);
const ROLES = ['admin', 'support', 'analyst'];
if (!email || !ROLES.includes(role)) {
  console.error('usage: admin:grant <email> [admin|support|analyst] [--remote]');
  process.exit(2);
}
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set (app/.env.local)');
  process.exit(2);
}
const host = new URL(url).hostname;
if (!['127.0.0.1', 'localhost', '::1'].includes(host) && !flags.includes('--remote')) {
  console.error(`refusing to grant on ${host} without --remote`);
  process.exit(2);
}

const db = createDb({ connectionString: url, max: 1, applicationName: 'robes-admin-grant' });
try {
  const user = await db
    .selectFrom('users')
    .select('id')
    .where('email', '=', email)
    .executeTakeFirst();
  if (!user) {
    console.error(`no user with email ${email}; sign in once first`);
    process.exitCode = 1;
  } else {
    await db.transaction().execute(async (trx) => {
      await trx
        .insertInto('adminUsers')
        .values({ userId: user.id, role })
        .onConflict((oc) => oc.column('userId').doUpdateSet({ role }))
        .execute();
      await trx
        .insertInto('auditLog')
        .values({
          action: 'admin.grant',
          subjectUserId: user.id,
          subjectTable: 'admin_users',
          subjectId: user.id,
          detail: JSON.stringify({ role, via: 'script' }),
        })
        .execute();
    });
    console.info(`${email} is now ${role}`);
  }
} finally {
  await db.destroy();
}
