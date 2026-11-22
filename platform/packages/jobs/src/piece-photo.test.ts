import { mediaKeys } from '@robes/media';
import { describe, expect, it } from 'vitest';
import { pieceReference } from './piece-photo';

const USER = '11111111-1111-4111-8111-111111111111';
const ASSET = '22222222-2222-4222-8222-222222222222';
const bytes = (s: string) => new TextEncoder().encode(s);

function storage(objects: Record<string, Uint8Array>, broken: string[] = []) {
  return {
    getObject: async (key: string) => {
      if (broken.includes(key)) throw new Error('storage');
      return objects[key] ?? null;
    },
  };
}

describe('pieceReference', () => {
  const master = mediaKeys.master(USER, ASSET);
  const cutout = mediaKeys.cutoutReference(USER, ASSET);

  it('is the cutout on white where one was stored', async () => {
    const s = storage({ [master]: bytes('rectangle'), [cutout]: bytes('cutout') });
    expect(await pieceReference(s, USER, ASSET)).toEqual(bytes('cutout'));
  });

  it('is the rectangle where there is none, or the cutout cannot be read', async () => {
    expect(await pieceReference(storage({ [master]: bytes('rectangle') }), USER, ASSET)).toEqual(
      bytes('rectangle'),
    );
    const s = storage({ [master]: bytes('rectangle'), [cutout]: bytes('cutout') }, [cutout]);
    expect(await pieceReference(s, USER, ASSET)).toEqual(bytes('rectangle'));
  });

  it('is nothing when the piece has no stored photograph', async () => {
    expect(await pieceReference(storage({}), USER, ASSET)).toBeNull();
  });
});
