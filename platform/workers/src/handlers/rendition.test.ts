import { describe, expect, it, vi } from 'vitest';

const processUpload = vi.fn(async (_deps: unknown, key: string) => ({ key, outcome: 'ready' }));
const info = vi.fn();
vi.mock('@robes/media/process', () => ({ processUpload }));
vi.mock('../context', () => ({
  workerContext: async () => ({ system: { assets: {} }, logger: { info } }),
}));

describe('rendition handler', () => {
  it('decodes S3 keys and processes each record', async () => {
    const { decodeS3Key, handler } = await import('./rendition');
    expect(decodeS3Key('uploads/a%2Fb/my+photo')).toBe('uploads/a/b/my photo');
    await handler(
      { Records: [{ s3: { object: { key: 'uploads/u1/a1/original' } } }] },
      { storage: {} as never },
    );
    expect(processUpload).toHaveBeenCalledWith(expect.anything(), 'uploads/u1/a1/original');
    expect(info).toHaveBeenCalledWith(
      { key: 'uploads/u1/a1/original', outcome: 'ready' },
      'rendition',
    );
  });
});
