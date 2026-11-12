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
