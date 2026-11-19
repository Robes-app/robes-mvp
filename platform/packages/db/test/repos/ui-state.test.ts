import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories } from '../../src/repos';
import { DISMISSED_KEEP_MS, DISMISSED_MAX } from '../../src/repos/ui-state';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const { uiState } = createRepositories(db);
let ann: UserId;
let bea: UserId;

beforeAll(async () => {
  ann = await createTestUser(db);
  bea = await createTestUser(db);
});
afterAll(async () => {
  await deleteTestUsers(db, ann, bea);
  await db.destroy();
});

describe('ui state repo', () => {
  it('keeps what she dismissed, hers alone, and forgets stale keys', async () => {
    const now = new Date('2026-11-02T09:00:00Z');
    expect(await uiState.dismissed(ann)).toEqual({});
    await uiState.dismiss(ann, 'diary:2026-10-01', new Date(now.getTime() - DISMISSED_KEEP_MS - 1));
    await uiState.dismiss(ann, 'diary:2026-11-01', now);
    await uiState.dismiss(ann, 'receipts:2', now);
    await uiState.dismiss(bea, 'receipts:9', now);
    expect(Object.keys(await uiState.dismissed(ann)).sort()).toEqual([
      'diary:2026-11-01',
      'receipts:2',
    ]);
    expect(Object.keys(await uiState.dismissed(bea))).toEqual(['receipts:9']);
  });

  it('takes every key the ✓ clears in one write', async () => {
    const now = new Date('2026-11-02T09:00:00Z');
    await uiState.dismiss(ann, ['receipts:2', 'diary:2026-11-01'], now);
    await uiState.dismiss(ann, [], now);
    expect(Object.keys(await uiState.dismissed(ann)).sort()).toEqual([
      'diary:2026-11-01',
      'receipts:2',
    ]);
  });

  it('never grows past the cap', async () => {
    const now = Date.now();
    for (let i = 0; i < DISMISSED_MAX + 5; i++) {
      await uiState.dismiss(ann, `k:${i}`, new Date(now + i * 1000));
    }
    const keys = Object.keys(await uiState.dismissed(ann));
    expect(keys).toHaveLength(DISMISSED_MAX);
    expect(keys).toContain(`k:${DISMISSED_MAX + 4}`);
    expect(keys).not.toContain('k:0');
  });

  it('keeps when she last opened the bell and her onboarding cards, hers alone', async () => {
    const at = new Date('2026-11-19T09:00:00Z');
    expect(await uiState.bell(ann)).toEqual({
      seenAt: null,
      cards: { twinHad: false, twin: null, dna: null },
    });
    await uiState.markBellSeen(ann, at);
    await uiState.markTwinHad(ann);
    await uiState.putAwayCard(ann, 'dna', 1, at);
    const mine = await uiState.bell(ann);
    expect(mine.seenAt?.toISOString()).toBe(at.toISOString());
    expect(mine.cards).toEqual({
      twinHad: true,
      twin: null,
      dna: { n: 1, at: at.toISOString() },
    });
    expect(await uiState.bell(bea)).toEqual({
      seenAt: null,
      cards: { twinHad: false, twin: null, dna: null },
    });
  });

  it('moves a card only from the round it is on, so a stale swipe never skips the week', async () => {
    const first = new Date('2026-11-01T09:00:00Z');
    const again = new Date('2026-11-02T09:00:00Z');
    await uiState.putAwayCard(bea, 'twin', 1, first);
    // A second swipe on round one (a cached sheet) changes nothing.
    await uiState.putAwayCard(bea, 'twin', 1, again);
    // Round two never moves before round one has.
    await uiState.putAwayCard(bea, 'dna', 2, again);
    expect((await uiState.bell(bea)).cards).toMatchObject({
      twin: { n: 1, at: first.toISOString() },
      dna: null,
    });
    await uiState.putAwayCard(bea, 'twin', 2, again);
    expect((await uiState.bell(bea)).cards.twin).toEqual({ n: 2, at: again.toISOString() });
  });
});
