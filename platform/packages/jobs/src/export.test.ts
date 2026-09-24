import { verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';
import { processDataExports } from './export';

const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');
const REQ = '22222222-2222-4222-8222-222222222222';
const ASSET = '33333333-3333-4333-8333-333333333333';
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

function deps(
  collect = vi.fn(async () => ({
    pieces: [{ label: 'Coat' }],
    assets: [
      { id: ASSET, kind: 'wardrobe', status: 'ready', deletedAt: null },
      { id: REQ, kind: 'wardrobe', status: 'failed', deletedAt: null },
    ],
  })),
) {
  const queue = [{ id: REQ, userId: USER }];
  return {
    exports: {
      claimNext: vi.fn(async () => queue.shift()),
      collect,
      complete: vi.fn(async () => {}),
      fail: vi.fn(async () => {}),
    },
    storage: { putObject: vi.fn(async () => {}) },
    logger,
    now: () => new Date('2026-09-24T10:00:00Z'),
  };
}

describe('processDataExports', () => {
  it('writes one JSON document under exports/ and marks the request ready', async () => {
    const d = deps();
    expect(await processDataExports(d as never)).toBe(1);
    const [key, body, opts] = d.storage.putObject.mock.calls[0] as unknown as [
      string,
      Uint8Array,
      object,
    ];
    expect(key).toBe(`exports/${USER}/${REQ}.json`);
    expect(opts).toMatchObject({ contentType: 'application/json' });
    const doc = JSON.parse(new TextDecoder().decode(body));
    expect(doc).toMatchObject({
      format: 'robes-data-export',
      version: 1,
      pieces: [{ label: 'Coat' }],
    });
    expect(doc.images).toEqual([
      { assetId: ASSET, kind: 'wardrobe', key: `media/${USER}/${ASSET}/master.jpg` },
    ]);
    expect(JSON.stringify(doc)).not.toMatch(/https?:\/\//);
    expect(d.exports.complete).toHaveBeenCalledWith(REQ, key);
  });

  it('marks the request failed when collecting breaks, and writes nothing', async () => {
    const d = deps(
      vi.fn(async () => {
        throw new Error('db down');
      }),
    );
    expect(await processDataExports(d as never)).toBe(0);
    expect(d.exports.fail).toHaveBeenCalledWith(REQ);
    expect(d.storage.putObject).not.toHaveBeenCalled();
  });
});
