import { describe, expect, it } from 'vitest';
import { handPieceStart, pieceStart } from './piece-start';

describe('piece start', () => {
  it('hands her words and sources to the draft following that job, and to no other', () => {
    const start = {
      jobId: 'job-1',
      words: 'Drinks on Friday',
      sources: { wardrobe: true, shop: true },
    };
    handPieceStart(start);
    expect(pieceStart('job-1')).toEqual(start);
    expect(pieceStart('job-1')).toEqual(start);
    expect(pieceStart('job-2')).toBeNull();
    handPieceStart({ ...start, jobId: 'job-2' });
    expect(pieceStart('job-1')).toBeNull();
  });
});
