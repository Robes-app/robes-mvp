import { withClient } from './db';

export interface ReverseDelta {
  since: string;
  profiles: unknown[];
  wardrobeItems: unknown[];
  looks: unknown[];
  artifacts: unknown[];
}

// Rollback aid (docs/migration.md §5): rows written on the platform after cutover, so they can be
// replayed into legacy if DNS goes back. Profiles are those updated since; the rest were created
// since and didn't come from legacy.
export async function reverseDelta(targetUrl: string, since: Date): Promise<ReverseDelta> {
  return withClient(targetUrl, async (c) => {
    const q = async (sql: string) => (await c.query(sql, [since.toISOString()])).rows;
    return {
      since: since.toISOString(),
      profiles: await q(
        `select p.*, u.email from app.profiles p join app.users u on u.id = p.id
         where p.updated_at >= $1 order by p.updated_at`,
      ),
      wardrobeItems: await q(
        'select * from app.wardrobe_items where created_at >= $1 order by created_at',
      ),
      looks: await q('select * from app.looks where created_at >= $1 order by created_at'),
      artifacts: await q(
        `select * from app.artifacts where created_at >= $1 and legacy_id is null
         order by created_at`,
      ),
    };
  });
}
