import { describe, expect, it } from 'vitest';
import { UPLOAD_MAX, uploadSize } from './upload';

describe('upload size', () => {
  it('shrinks a photo larger than the server keeps to 2048 on its long side, aspect kept', () => {
    expect(UPLOAD_MAX).toBe(2048);
    expect(uploadSize(4032, 3024)).toEqual({ width: 2048, height: 1536 });
    expect(uploadSize(3024, 4032)).toEqual({ width: 1536, height: 2048 });
  });

  it('leaves a photo that already fits alone', () => {
    expect(uploadSize(2048, 1536)).toBeNull();
    expect(uploadSize(1600, 1200)).toBeNull();
  });
});
