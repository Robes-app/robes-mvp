import { describe, expect, it } from 'vitest';
import { mirrored, selfieConstraints } from './selfie-capture';

describe('the selfie camera', () => {
  it('asks for the front camera first, the back one when turned, never the microphone', () => {
    expect(selfieConstraints('user')).toMatchObject({
      video: { facingMode: { ideal: 'user' } },
      audio: false,
    });
    expect(selfieConstraints('environment')).toMatchObject({
      video: { facingMode: { ideal: 'environment' } },
    });
    expect(mirrored('user')).toBe(true);
    expect(mirrored('environment')).toBe(false);
  });
});
