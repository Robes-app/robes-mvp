import { describe, expect, it } from 'vitest';
import { generationRows, seconds } from './generations';

const job = (id: string, createdAt: string) => ({
  id,
  kind: 'look_ask' as const,
  status: 'succeeded' as const,
  error: null,
  createdAt,
  finishedAt: null,
  durationMs: null,
});
const call = (id: string, jobId: string | null, createdAt: string, costMicros = 10) => ({
  id,
  feature: 'looks.ask',
  model: 'm',
  status: 'ok',
  latencyMs: 1200,
  costMicros,
  images: 0,
  jobId,
  hasPrompt: true,
  createdAt,
});
const J1 = '11111111-1111-4111-8111-111111111111';
const J2 = '22222222-2222-4222-8222-222222222222';
const OLD = '33333333-3333-4333-8333-333333333333';

describe('generationRows', () => {
  it('groups calls under their job, oldest call first, newest row first', () => {
    const rows = generationRows(
      [job(J1, '2026-11-01T10:00:00.000Z'), job(J2, '2026-11-02T10:00:00.000Z')],
      [
        call('c2', J1, '2026-11-01T10:00:05.000Z', 5),
        call('c1', J1, '2026-11-01T10:00:01.000Z', 7),
        call('c3', OLD, '2026-10-01T09:00:00.000Z'),
        call('c4', null, '2026-11-03T08:00:00.000Z'),
      ],
    );
    expect(rows.map((r) => r.key)).toEqual(['c4', J2, J1, OLD]);
    const j1 = rows.find((r) => r.key === J1);
    expect(j1?.calls.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(j1?.costMicros).toBe(12);
    expect(rows.find((r) => r.key === J2)?.calls).toEqual([]);
    expect(rows.find((r) => r.key === OLD)).toMatchObject({
      job: null,
      at: '2026-10-01T09:00:00.000Z',
    });
  });

  it('writes latency in seconds', () => {
    expect(seconds(7830)).toBe('7.8s');
    expect(seconds(null)).toBeNull();
  });
});
