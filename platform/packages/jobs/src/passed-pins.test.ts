import { describe, expect, it, vi } from 'vitest';
import {
  filePassedPins,
  PASSED_PINS_CATCH_UP_DAYS,
  PASSED_PINS_FROM,
  PASSED_PINS_PAGE,
} from './passed-pins';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-11-12T00:30:00Z');
const logger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });
const pin = (n: number, userId = A) => ({ id: `pin-${String(n).padStart(4, '0')}`, userId });

function deps(
  pages: { id: string; userId: string }[][],
  file = vi.fn(async (_userId: string, _pinId: string) => true),
) {
  const due = vi.fn(async (_opts: Record<string, unknown>) => pages.shift() ?? []);
  return { passedPins: { due, file }, logger: logger() };
}

describe('filePassedPins', () => {
  it('files each due pin as her own, from the ship day and the catch-up window', async () => {
    const d = deps([[pin(1), pin(2, B)]]);
    expect(await filePassedPins(d as never, NOW)).toEqual({ filed: 2, skipped: 0, failed: 0 });
    expect(d.passedPins.due).toHaveBeenCalledTimes(1);
    expect(d.passedPins.due).toHaveBeenCalledWith({
      now: NOW,
      earliest: PASSED_PINS_FROM,
      catchUpDays: PASSED_PINS_CATCH_UP_DAYS,
      limit: PASSED_PINS_PAGE,
      afterId: undefined,
      userIds: undefined,
    });
    expect(d.passedPins.file.mock.calls).toEqual([
      [A, 'pin-0001'],
      [B, 'pin-0002'],
    ]);
    expect(d.logger.info).toHaveBeenCalledWith(
      { filed: 2, skipped: 0, failed: 0 },
      'passed_pins_filed',
    );
  });

  it('pages on by pin id until a short page', async () => {
    const full = Array.from({ length: PASSED_PINS_PAGE }, (_, i) => pin(i));
    const d = deps([full, [pin(9999)]]);
    expect((await filePassedPins(d as never, NOW)).filed).toBe(PASSED_PINS_PAGE + 1);
    expect(d.passedPins.due).toHaveBeenCalledTimes(2);
    expect(d.passedPins.due.mock.calls[1]?.[0]).toMatchObject({ afterId: full.at(-1)?.id });
  });

  it('counts a pin she took back meanwhile as skipped, and carries on past a failure', async () => {
    const file = vi
      .fn(async (_userId: string, _pinId: string) => true)
      .mockResolvedValueOnce(false)
      .mockRejectedValueOnce(new Error('deadlock detected'));
    const d = deps([[pin(1), pin(2), pin(3)]], file);
    expect(await filePassedPins(d as never, NOW)).toEqual({ filed: 1, skipped: 1, failed: 1 });
    expect(d.logger.warn).toHaveBeenCalledWith(
      { reason: 'deadlock detected' },
      'passed_pin_failed',
    );
  });

  it('stops at maxPages and stays quiet when nothing is due', async () => {
    const full = () => Array.from({ length: PASSED_PINS_PAGE }, (_, i) => pin(i));
    const d = { ...deps([full(), full(), full()]), maxPages: 2 };
    await filePassedPins(d as never, NOW);
    expect(d.passedPins.due).toHaveBeenCalledTimes(2);

    const idle = deps([]);
    expect(await filePassedPins(idle as never, NOW)).toEqual({ filed: 0, skipped: 0, failed: 0 });
    expect(idle.logger.info).not.toHaveBeenCalled();
  });

  it('narrows to the users asked for', async () => {
    const d = deps([[]]);
    await filePassedPins(d as never, NOW, { userIds: [A] });
    expect(d.passedPins.due.mock.calls[0]?.[0]).toMatchObject({ userIds: [A] });
  });
});
