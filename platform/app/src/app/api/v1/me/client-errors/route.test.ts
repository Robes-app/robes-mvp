import { beforeEach, describe, expect, it, vi } from 'vitest';

const warn = vi.fn();
vi.mock('@/server/logger', () => ({ logger: { warn: (...a: unknown[]) => warn(...a) } }));
vi.mock('@/server/route', () => ({
  route: (def: { handler: (ctx: unknown) => unknown }) => def,
}));

const { POST } = await import('./route');
const handler = (POST as unknown as { handler: (ctx: unknown) => Promise<unknown> }).handler;

describe('POST /me/client-errors', () => {
  beforeEach(() => warn.mockReset());

  it('logs the failure without who met it, and strips a signed URL query', async () => {
    const input = {
      where: 'wardrobe.read',
      name: 'Error',
      message:
        'upload failed: 403 https://bucket.s3/x.jpg?X-Amz-Signature=abc&X-Amz-Credential=def',
      appVersion: '0.1.3',
      analytics: false,
    };
    await expect(handler({ input, user: { id: 'u1' } })).resolves.toEqual({ ok: true });
    expect(warn).toHaveBeenCalledWith(
      { ...input, message: 'upload failed: 403 https://bucket.s3/x.jpg?…' },
      'client_error',
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain('u1');
  });
});
