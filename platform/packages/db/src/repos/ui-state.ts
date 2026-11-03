import { sql } from 'kysely';
import type { Db } from '../client';
import type { UserId } from '../ids';

// What she has dismissed is kept a month, then forgotten: a nudge's key is its date, so an old key
// can never come back, and a receipts key changes with the count.
export const DISMISSED_KEEP_MS = 30 * 24 * 60 * 60 * 1000;
export const DISMISSED_MAX = 60;

function parse(json: unknown): Record<string, string> {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return {};
  return Object.fromEntries(
    Object.entries(json as Record<string, unknown>).filter(
      (e): e is [string, string] => typeof e[1] === 'string',
    ),
  );
}

// UI continuity (app.user_ui_state, one row per user from the signup trigger): dismissed keys.
export function uiStateRepo(db: Db) {
  return {
    async dismissed(userId: UserId): Promise<Record<string, string>> {
      const row = await db
        .selectFrom('userUiState')
        .select('dismissed')
        .where('userId', '=', userId)
        .executeTakeFirst();
      return parse(row?.dismissed);
    },

    // Records a dismissal; stale keys fall away so the object stays small.
    async dismiss(userId: UserId, key: string, at = new Date()): Promise<void> {
      const kept = Object.entries(await this.dismissed(userId))
        .filter(([, iso]) => at.getTime() - Date.parse(iso) < DISMISSED_KEEP_MS)
        .sort((a, b) => b[1].localeCompare(a[1]))
        .slice(0, DISMISSED_MAX - 1);
      const next = { ...Object.fromEntries(kept), [key]: at.toISOString() };
      await db
        .insertInto('userUiState')
        .values({ userId, dismissed: JSON.stringify(next) })
        .onConflict((oc) =>
          oc.column('userId').doUpdateSet({ dismissed: sql`${JSON.stringify(next)}::jsonb` }),
        )
        .execute();
    },
  };
}
