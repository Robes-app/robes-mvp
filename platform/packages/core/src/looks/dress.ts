// Whether opening a saved look asks her model to wear it (beta dressed every saved look on open;
// useDressOnOpen, web and native): a look with no picture of her model yet, or one whose picture
// stands on a model her looks no longer stand on (her twin created, redrawn or deleted, another
// Robes model chosen). A picture she hid stays hidden (a fresh one would show again, D19), one
// already drawing is waited for, and Robes' frame never gives way to her model.
export interface DressableLook {
  status: string;
  frame: boolean;
  pieces: readonly unknown[];
  model: unknown | null;
  onModel?: 'pending' | 'ready' | 'failed' | null | undefined;
  modelStale: boolean;
  robesHidden: boolean;
}

export function dressOnOpen(look: DressableLook): boolean {
  if (look.status !== 'saved' || look.frame || look.pieces.length === 0) return false;
  if (look.onModel === 'pending') return false;
  if (look.model === null) return true;
  return look.modelStale && !look.robesHidden;
}

// A look whose picture is still on its way: drawn by a job, or drawn and waiting for its
// renditions, which in AWS are made after the job finishes, from the S3 event. A page showing the
// look asks again while this holds: one that stopped at "ready" kept the bare model up forever
// (staging, 16 Nov). Her photograph, just taken, waits the same way.
type Picture = { status: 'pending' | 'ready' | 'failed' } | null | undefined;
export interface LandingLook {
  onModel?: 'pending' | 'ready' | 'failed' | null | undefined;
  framePending?: boolean;
  image?: Picture;
  model?: Picture;
  photo?: Picture;
}

export function pictureLanding(look: LandingLook | undefined): boolean {
  if (!look) return false;
  return (
    look.onModel === 'pending' ||
    look.framePending === true ||
    [look.image, look.model, look.photo].some((p) => p?.status === 'pending')
  );
}

// The pill on a look's picture (Annie, 27 Nov): her model is drawn when she asks, never by a
// change made by hand. `dress` is the first picture, for a look with pieces and none of her model
// yet; `update` once its pieces differ from the picture drawn; nothing while the picture is
// current, being drawn, or failed with its own Try again in the pill's place. A picture she hid is
// not offered afresh (D19), and Robes' frame is a picture already.
export type ModelPill = 'dress' | 'update';
export interface PillLook {
  frame: boolean;
  model: unknown | null;
  onModel?: 'pending' | 'ready' | 'failed' | null | undefined;
  framePending?: boolean | undefined;
  robesHidden: boolean;
  // Her photograph leads the look: a failed draw shows no Try again over it.
  record: string;
  photo: unknown | null;
}

export function modelPill(
  look: PillLook,
  s: {
    // The rows on the rack, her pieces and the pieces to find alike.
    rows: number;
    // The rack has moved on from the picture (`pictureStale`, or a change not yet written).
    stale: boolean;
    // A draw is in hand that the look does not read as pending yet.
    drawing: boolean;
  },
): ModelPill | null {
  if (s.rows === 0 || s.drawing || look.onModel === 'pending' || look.framePending) return null;
  const ownPhoto = look.photo !== null && look.record === 'photo';
  if (look.onModel === 'failed' && !ownPhoto) return null;
  if (!look.frame && look.model === null) return look.robesHidden && !s.stale ? null : 'dress';
  return s.stale ? 'update' : null;
}
