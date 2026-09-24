import { AiError, createFakeProvider } from '@robes/ai';
import { verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';
import { JobError } from '../runtime';
import { createAvatarCellHandler } from './avatar-cell';

const USER = verifiedUserId('11111111-1111-4111-8111-111111111111');

function setup(status: string | null = 'pending', fail = false) {
  const cells = {
    get: vi.fn(async () =>
      status
        ? { id: 'k', status, jobId: null, contentType: null, bucketKey: null, claimedAt: null }
        : undefined,
    ),
    ready: vi.fn(async () => {}),
    fail: vi.fn(async () => {}),
  };
  const ai = createFakeProvider();
  const generateImage = vi.spyOn(ai, 'generateImage');
  if (fail) generateImage.mockRejectedValue(new AiError('provider'));
  const storage = { putObject: vi.fn(async (_key: string) => {}) };
  const handler = createAvatarCellHandler({
    ai,
    storage,
    cells,
    ledger: { record: vi.fn(async () => {}) },
  });
  const run = (cellKey: string) =>
    handler.run({
      jobId: '66666666-6666-4666-8666-666666666666',
      userId: USER,
      input: { cellKey },
      signal: new AbortController().signal,
      writeStage: vi.fn(async () => {}),
      isCancelled: async () => false,
    });
  return { run, cells, storage, generateImage };
}

describe('avatar_cell', () => {
  it('draws the reference portrait once into the shared catalog', async () => {
    const { run, cells, storage, generateImage } = setup();
    await expect(run('w-s3-h1-nt@v2')).resolves.toEqual({ status: 'succeeded' });
    expect(generateImage.mock.calls[0]?.[0].prompt).toContain('this is the reference portrait');
    expect(storage.putObject.mock.calls[0]?.[0]).toMatch(
      /^catalog\/avatar\/w-s3-h1-nt@v2\.(png|jpg|webp)$/,
    );
    expect(cells.ready).toHaveBeenCalledWith(
      'w-s3-h1-nt@v2',
      expect.stringMatching(/^catalog\//),
      expect.any(String),
    );
  });

  it('does nothing for a cell that is already ready', async () => {
    const { run, generateImage } = setup('ready');
    await expect(run('w-s3-h1-nt@v2')).resolves.toEqual({ status: 'succeeded' });
    expect(generateImage).not.toHaveBeenCalled();
  });

  it('refuses keys outside the catalog and marks a failed draw so it can be retried', async () => {
    await expect(setup().run('../x@v2')).rejects.toEqual(new JobError('invalid_input'));
    const failing = setup('pending', true);
    await expect(failing.run('w-s3-h1-nt@v2')).rejects.toBeInstanceOf(JobError);
    expect(failing.cells.fail).toHaveBeenCalledWith('w-s3-h1-nt@v2');
  });
});
