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
