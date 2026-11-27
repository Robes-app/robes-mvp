import 'server-only';
import type { UserId } from '@robes/db';
import { repos } from './db';
import { filedRackHash, type HashedRack } from './render-key';
import { proposalsOf } from './stored-proposals';

type LookRow = NonNullable<Awaited<ReturnType<typeof repos.looks.get>>>;

// The look's rack exactly as renderOnModel hashes it.
async function rackOf(userId: UserId, row: LookRow): Promise<HashedRack> {
  const pieces = await repos.looks.piecesFor(userId, [row.id]);
  return {
    pieces,
    notes: (row.styling && typeof row.styling === 'object' ? row.styling : {}) as Record<
      string,
      unknown
    >,
    pictureNote: row.pictureNote,
    proposals: proposalsOf(row.proposals),
  };
}

// The look as it stood before a write that files found rows (`UpdateLookInput.filed`).
export async function beforeFiling(userId: UserId, lookId: string) {
  const row = await repos.looks.get(userId, lookId);
  return row ? { row, rack: await rackOf(userId, row) } : null;
}

// Filing a found piece keeps her picture current (Annie, 26 Nov): her model was drawn wearing the
// found piece, and the piece she filed it as is the same one. When the write changed nothing else,
// the ready render on her model now stands for the new rack, so it is not stale and nothing is
// drawn again; any other change still makes it stale. Robes' frame is never carried.
export async function keepFiledPicture(
  userId: UserId,
  before: NonNullable<Awaited<ReturnType<typeof beforeFiling>>>,
  after: LookRow,
  filed: readonly { from: string; to: string }[],
): Promise<LookRow> {
  const key = before.row.renderKey;
  if (
    !key ||
    key.startsWith('frame:') ||
    before.row.renderStatus !== 'ready' ||
    before.row.renderAssetId === null ||
    after.renderKey !== key
  ) {
    return after;
  }
  const cut = key.lastIndexOf(':');
  const hash = filedRackHash(before.rack, await rackOf(userId, after), filed, key.slice(cut + 1));
  if (hash === null) return after;
  const next = `${key.slice(0, cut)}:${hash}`;
  if (next === key) return after;
  return (await repos.looks.carryRender(userId, after.id, key, next))
    ? { ...after, renderKey: next }
    : after;
}
