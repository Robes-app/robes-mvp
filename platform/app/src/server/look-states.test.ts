import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const repos = {
  looks: { get: vi.fn(), save: vi.fn() },
  profiles: { get: vi.fn() },
};
vi.mock('./db', () => ({ repos }));
vi.mock('./looks-entity', () => ({ toLook: vi.fn(async (_u, row) => row), toLooks: vi.fn() }));
vi.mock('./jobs', () => ({ startJob: vi.fn() }));
vi.mock('./model', () => ({ ensureGenericCells: vi.fn() }));
vi.mock('./flags', () => ({ isFlagEnabled: vi.fn() }));

const { saveLook, isUnnamedHandBuilt } = await import('./look-states');
// biome-ignore lint/suspicious/noExplicitAny: a test id
const USER = 'u1' as any;
const draft = { status: 'draft', nameProvisional: true, source: 'manual', setId: null };

describe('saving an unnamed look', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repos.looks.save.mockResolvedValue({ id: 'l1' });
    repos.profiles.get.mockResolvedValue({ timezone: 'Europe/Dublin' });
  });

  it('names a hand-built draft for her today, kept provisional', async () => {
    repos.looks.get.mockResolvedValue(draft);
    repos.profiles.get.mockResolvedValue({ timezone: 'Australia/Sydney' });
    // 14:00 UTC on the 27th is already the 28th in Sydney: her day, not the server's.
    await saveLook(USER, 'l1', undefined, new Date('2026-10-27T14:00:00Z'));
    expect(repos.looks.save).toHaveBeenCalledWith(USER, 'l1', {
      name: undefined,
      datedName: 'Wednesday 28 Oct',
    });
  });

  it('keeps a typed name, and Robes’ names on Robes’ looks', async () => {
    repos.looks.get.mockResolvedValue(draft);
    await saveLook(USER, 'l1', 'Gallery day');
    expect(repos.looks.save).toHaveBeenLastCalledWith(USER, 'l1', {
      name: 'Gallery day',
      datedName: undefined,
    });
    expect(isUnnamedHandBuilt({ ...draft, source: 'generated' })).toBe(false);
    expect(isUnnamedHandBuilt({ ...draft, setId: 's1' })).toBe(false);
    expect(isUnnamedHandBuilt({ ...draft, status: 'suggested' })).toBe(false);
    expect(isUnnamedHandBuilt({ ...draft, nameProvisional: false })).toBe(false);
  });

  it('is not_found for a look that is not hers', async () => {
    repos.looks.get.mockResolvedValue(undefined);
    await expect(saveLook(USER, 'l1', undefined)).rejects.toMatchObject({ code: 'not_found' });
    expect(repos.looks.save).not.toHaveBeenCalled();
  });
});
