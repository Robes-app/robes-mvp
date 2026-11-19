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

// The bell's onboarding cards she can put away: once comes back after a week, twice is for good.
export type BellCard = 'twin' | 'dna';
export interface BellCardPut {
  n: 1 | 2;
  at: string;
}
export interface BellCards {
  twinHad: boolean;
  twin: BellCardPut | null;
  dna: BellCardPut | null;
}

function parsePut(v: unknown): BellCardPut | null {
  if (!v || typeof v !== 'object') return null;
  const { n, at } = v as Record<string, unknown>;
  if ((n !== 1 && n !== 2) || typeof at !== 'string' || !Number.isFinite(Date.parse(at))) {
    return null;
  }
  return { n, at };
}

function parseCards(json: unknown): BellCards {
  const o =
    json && typeof json === 'object' && !Array.isArray(json)
      ? (json as Record<string, unknown>)
      : {};
  return { twinHad: o.twinHad === true, twin: parsePut(o.twin), dna: parsePut(o.dna) };
}

// UI continuity (app.user_ui_state, one row per user from the signup trigger): dismissed keys,
// when she last opened the bell, and its onboarding cards.
export function uiStateRepo(db: Db) {
  return {
    async bell(userId: UserId): Promise<{ seenAt: Date | null; cards: BellCards }> {
      const row = await db
        .selectFrom('userUiState')
        .select(['bellSeenAt', 'bellCards'])
        .where('userId', '=', userId)
        .executeTakeFirst();
      return { seenAt: row?.bellSeenAt ?? null, cards: parseCards(row?.bellCards) };
    },

    async markBellSeen(userId: UserId, at = new Date()): Promise<void> {
      await db
        .updateTable('userUiState')
        .set({ bellSeenAt: at })
        .where('userId', '=', userId)
        .execute();
    },

    // She has had a twin: written once, so deleting it never brings the card back.
    async markTwinHad(userId: UserId): Promise<void> {
      await db
        .updateTable('userUiState')
        .set({ bellCards: sql`bell_cards || '{"twinHad": true}'::jsonb` })
        .where('userId', '=', userId)
        .execute();
    },

    // Puts an onboarding card's showing `round` away: the first for a week, the second for good.
    // Only the round that is stored next moves, so a repeated or stale swipe never skips the week.
    async putAwayCard(
      userId: UserId,
      card: BellCard,
      round: 1 | 2,
      at = new Date(),
    ): Promise<void> {
      await db
        .updateTable('userUiState')
        .set({
          bellCards: sql`bell_cards || jsonb_build_object(${card}::text, jsonb_build_object(
            'n', ${round}::int, 'at', ${at.toISOString()}::text))`,
        })
        .where('userId', '=', userId)
        .where(
          sql<boolean>`coalesce((bell_cards -> ${card}::text ->> 'n')::int, 0) = ${round - 1}::int`,
        )
        .execute();
    },

    async dismissed(userId: UserId): Promise<Record<string, string>> {
      const row = await db
        .selectFrom('userUiState')
        .select('dismissed')
        .where('userId', '=', userId)
        .executeTakeFirst();
      return parse(row?.dismissed);
    },

    // Records a dismissal (one key, or every key the ✓ clears at once); stale keys fall away so
    // the object stays small.
    async dismiss(userId: UserId, key: string | readonly string[], at = new Date()): Promise<void> {
      const keys = (typeof key === 'string' ? [key] : key).slice(0, DISMISSED_MAX);
      if (keys.length === 0) return;
      const kept = Object.entries(await this.dismissed(userId))
        .filter(([, iso]) => at.getTime() - Date.parse(iso) < DISMISSED_KEEP_MS)
        .sort((a, b) => b[1].localeCompare(a[1]))
        .slice(0, DISMISSED_MAX - keys.length);
      const stamp = at.toISOString();
      const next = {
        ...Object.fromEntries(kept),
        ...Object.fromEntries(keys.map((k) => [k, stamp])),
      };
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
