import 'server-only';
import { ApiError } from '@robes/api';
import type { UserId } from '@robes/db';
import { repos } from './db';

// The AdjustSheet's Send (D21): her words on how Robes' picture is drawn, kept with the look for
// every later redraw (renderOnModel, requestFrame). Absent, the look's own note stands; empty, it
// is cleared. The note the redraw now reads comes back.
export async function writePictureNote(
  userId: UserId,
  lookId: string,
  note: string | undefined,
  current: string | null,
): Promise<string | null> {
  if (note === undefined) return current;
  if (!(await repos.looks.setPictureNote(userId, lookId, note))) throw new ApiError('not_found');
  return note.trim() || null;
}
