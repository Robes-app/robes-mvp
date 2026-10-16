import type { Db } from '../client';
import type { UserId } from '../ids';

export function adminRepo(db: Db) {
  return {
    // support/analyst are staff roles, not admins (CLAUDE.md rule 8).
    async isAdmin(userId: UserId): Promise<boolean> {
      const row = await db
        .selectFrom('adminUsers')
        .select('role')
        .where('userId', '=', userId)
        .executeTakeFirst();
      return row?.role === 'admin';
    },

    async audit(entry: {
      actorId: UserId;
      action: string;
      subjectUserId?: string;
      subjectTable?: string;
      subjectId?: string;
      detail?: Record<string, unknown>;
    }): Promise<void> {
      await db
        .insertInto('auditLog')
        .values({
          actorId: entry.actorId,
          action: entry.action,
          subjectUserId: entry.subjectUserId ?? null,
          subjectTable: entry.subjectTable ?? null,
          subjectId: entry.subjectId ?? null,
          detail: JSON.stringify(entry.detail ?? {}),
        })
        .execute();
    },
  };
}
