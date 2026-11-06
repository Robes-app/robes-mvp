import 'server-only';
import { ApiError } from '@robes/api';
import { LookImagesFull } from '@robes/db';

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
