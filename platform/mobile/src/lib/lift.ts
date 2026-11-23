import { LIFT_MAX_BYTES, LIFT_MAX_EDGE } from '@robes/core/cutout';
import { requireOptionalNativeModule } from 'expo';
import { File } from 'expo-file-system';

// What her phone lifted out of a photograph (cutout brief, 21 Nov 2026): Apple's subject lifting
// (iOS 17+), each lifted item kept apart in one PNG the server reads beside the photo. The
// native half is modules/robes-lift (Swift); it exists only in a development or store build on
// an iPhone. Everywhere else (Android, Expo Go, the Simulator, iOS 16, the tests) there is no
// lift, and a piece keeps its rectangle with nothing said. The web has no twin: it never lifts.

interface NativeLift {
  lift(
    uri: string,
    maxEdge: number,
  ): Promise<{ uri: string; width: number; height: number; items: number; ms: number } | null>;
}

const native = requireOptionalNativeModule<NativeLift>('RobesLift');

export interface Lift {
  file: File;
  items: number;
  ms: number;
}

// How long the read waits on the lift once the photo itself is up: capture stays fast, and a
// slow phone falls back to the rectangle.
export const LIFT_PATIENCE_MS = 4000;

// The lift of the photo at `uri`, or null: nothing to lift, nowhere to lift it, or it failed.
// Never throws: a cutout is never a reason for a photo not to be added.
export async function liftPhoto(uri: string): Promise<Lift | null> {
  if (!native) return null;
  try {
    const out = await native.lift(uri, LIFT_MAX_EDGE);
    if (!out) return null;
    const file = new File(out.uri);
    if (!file.size || file.size > LIFT_MAX_BYTES) {
      discardLift({ file });
      return null;
    }
    return { file, items: out.items, ms: out.ms };
  } catch {
    return null;
  }
}

export function discardLift(lift: Pick<Lift, 'file'>): void {
  try {
    lift.file.delete();
  } catch {
    // Already gone, or the system's to clear with the caches.
  }
}

// `work`, or null once `ms` has passed.
export function within<T>(work: Promise<T | null>, ms: number): Promise<T | null> {
  return Promise.race([
    work,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), ms);
    }),
  ]);
}
