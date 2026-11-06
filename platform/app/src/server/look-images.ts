import 'server-only';
import { ApiError } from '@robes/api';
import { LookImagesFull, LookNeedsImage } from '@robes/db';

// The stack holds LOOK_IMAGES_MAX photographs; one more is refused, nothing written.
export async function imagesFull<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (err) {
    if (err instanceof LookImagesFull) {
      throw new ApiError('conflict', { details: { reason: 'look_images_full' } });
    }
    throw err;
  }
}

// A look always keeps one image (D19): the change that would leave none is refused, nothing
// written. Clients say so with `lookbook.savedLook.manager.lastImage`.
export async function keepsOneImage<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (err) {
    if (err instanceof LookNeedsImage) {
      throw new ApiError('conflict', { details: { reason: 'look_needs_image' } });
    }
    throw err;
  }
}
