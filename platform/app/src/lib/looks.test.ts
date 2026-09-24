import type { Idea, JobSnapshot } from '@robes/contracts';
import { describe, expect, it } from 'vitest';
import { daysLeft, framesLanding, ideaNeedsRefresh, jobProgressStage } from './looks';

const NOW = Date.parse('2026-09-24T12:00:00Z');
function idea(frames: Idea['frames'], createdAt = '2026-09-24T11:59:00Z'): Idea {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Coat',
    subtitle: null,
    anchor: { type: 'text', label: 'Coat' },
    fallback: false,
    wearer: 'woman',
    ways: [],
    frames,
    jobId: null,
    savedAt: null,
    expiresAt: null,
    createdAt,
  };
}
const frame = (status: 'pending' | 'ready' | 'failed') => ({ idx: 0, status, image: null });

describe('ideaNeedsRefresh', () => {
  it('waits for frames on a young idea', () => {
    expect(ideaNeedsRefresh(idea([]), NOW)).toBe(true);
    expect(ideaNeedsRefresh(idea([frame('ready'), frame('pending')]), NOW)).toBe(true);
  });
  it('stops once every frame settled, or the idea is old', () => {
    expect(ideaNeedsRefresh(idea([frame('ready'), frame('failed')]), NOW)).toBe(false);
    expect(ideaNeedsRefresh(idea([], '2026-09-24T11:00:00Z'), NOW)).toBe(false);
    expect(ideaNeedsRefresh(undefined, NOW)).toBe(false);
  });
});

describe('jobProgressStage', () => {
  const job = (stage: JobSnapshot['stage']) => ({ stage }) as JobSnapshot;
  it('maps job stages to progress copy', () => {
    expect(jobProgressStage(null)).toBe('styling');
    expect(jobProgressStage(job('text'))).toBe('styling');
    expect(jobProgressStage(job('images'))).toBe('dressing');
    expect(jobProgressStage(job('done'))).toBe('finishing');
  });
});

describe('daysLeft', () => {
  it('rounds up and never goes negative', () => {
    expect(daysLeft('2026-09-25T00:00:00Z', NOW)).toBe(1);
    expect(daysLeft('2026-09-20T00:00:00Z', NOW)).toBe(0);
  });
});

describe('framesLanding', () => {
  const frame = (idx: number, status: 'ready' | 'pending' | 'deferred' | 'failed') => ({
    idx,
    status,
    image: null,
  });
  it('keeps refreshing only for frames she asked for until they land or fail', () => {
    const idea = { frames: [frame(0, 'ready'), frame(1, 'pending'), frame(2, 'deferred')] };
    expect(framesLanding(idea as never, [])).toBe(false);
    expect(framesLanding(idea as never, [1])).toBe(true);
    expect(framesLanding({ frames: [frame(1, 'failed')] } as never, [1])).toBe(false);
    expect(framesLanding({ frames: [frame(1, 'ready')] } as never, [1])).toBe(false);
  });
});
