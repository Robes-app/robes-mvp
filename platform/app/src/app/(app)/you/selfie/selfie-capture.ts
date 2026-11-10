// The selfie camera's pure parts, testable without a stream.

export type Facing = 'user' | 'environment';

// Her face first: the front camera, big enough for a close-up to survive a full-length frame.
export function selfieConstraints(facing: Facing): MediaStreamConstraints {
  return {
    video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } },
    audio: false,
  };
}

// The front camera is shown as a mirror, as every phone shows it; the photo is kept as taken.
export const mirrored = (facing: Facing): boolean => facing === 'user';
