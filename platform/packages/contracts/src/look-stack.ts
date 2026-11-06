import type { StackBase } from '@robes/core/looks';
import type { Look } from './looks';

// A look's image stack as saved (D19): Robes' picture when Robes has drawn one (the frame, else
// the render on her model), whether she hid it, her photographs in order, and the cover — her
// photograph when one leads, else Robes' picture. Shared so web and native read it the same.
export function lookStack(
  look: Pick<Look, 'frame' | 'model' | 'images' | 'record' | 'robesHidden'>,
): StackBase {
  const robes = look.frame || look.model !== null;
  const first = look.images[0];
  const photoLeads = first !== undefined && (look.record === 'photo' || look.robesHidden || !robes);
  return {
    robes,
    robesHidden: look.robesHidden,
    photos: look.images.map((i) => i.id),
    cover: photoLeads ? { kind: 'photo', id: first.id } : { kind: 'robes' },
  };
}
