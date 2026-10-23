import { withClient } from './db';

export interface ResetReport {
  usersRemoved: number;
}

// Wipes a test copy before the final cutover run (docs/migration.md §4): every user row and, by
// cascade, everything she owns, plus the `legacy` copy schema. Reference data and migrations stay.
// Re-running transform then copies the legacy app as it stands at the switch.
export async function resetTarget(targetUrl: string): Promise<ResetReport> {
  return withClient(targetUrl, async (c) => {
    await c.query('begin');
    try {
      const { rows } = await c.query<{ n: number }>('select count(*)::int as n from app.users');
      await c.query('truncate app.users cascade');
      await c.query('drop schema if exists legacy cascade');
      await c.query('commit');
      return { usersRemoved: rows[0]?.n ?? 0 };
    } catch (err) {
      await c.query('rollback');
      throw err;
    }
  });
}
