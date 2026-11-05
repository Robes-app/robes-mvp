import { describe, expect, it } from 'vitest';
import { adjustReduce, EMPTY_ADJUST, isWorking, threadHistory } from './adjust';
import { ASK_THREAD_MAX } from './index';

describe('the adjust thread', () => {
  it('keeps one work line, last, and replaces it with the next line', () => {
    let s = adjustReduce(EMPTY_ADJUST, { type: 'her', text: 'softer shoes' });
    s = adjustReduce(s, { type: 'work', text: 'Reading your change…' });
    expect(isWorking(s)).toBe(true);
    s = adjustReduce(s, { type: 'work', text: 'Dressing it…' });
    expect(s.thread.map((l) => l.text)).toEqual(['softer shoes', 'Dressing it…']);
    s = adjustReduce(s, { type: 'robes', text: 'Updated the rack.' });
    expect(isWorking(s)).toBe(false);
    expect(s.thread.map((l) => [l.who, l.text])).toEqual([
      ['her', 'softer shoes'],
      ['robes', 'Updated the rack.'],
    ]);
    // Ids never repeat, even across a reset.
    const ids = s.thread.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    const reset = adjustReduce(s, { type: 'reset' });
    expect(reset.thread).toEqual([]);
    expect(adjustReduce(reset, { type: 'her', text: 'again' }).thread[0]?.id).toBeGreaterThan(
      Math.max(...ids),
    );
  });

  it('settles a work line with nothing after it', () => {
    const s = adjustReduce(adjustReduce(EMPTY_ADJUST, { type: 'work', text: 'Dressing it…' }), {
      type: 'settle',
    });
    expect(s.thread).toEqual([]);
    expect(adjustReduce(s, { type: 'settle' }).thread).toEqual([]);
  });

  it('counts the changes the picture is behind, until the model is asked again', () => {
    let s = adjustReduce(EMPTY_ADJUST, { type: 'changed' });
    s = adjustReduce(s, { type: 'changed', n: 2 });
    expect(s.pending).toBe(3);
    expect(adjustReduce(s, { type: 'drawn' }).pending).toBe(0);
  });

  it('holds the Dress it again question until she answers', () => {
    const asked = adjustReduce(EMPTY_ADJUST, { type: 'ask' });
    expect(asked.asking).toBe(true);
    expect(adjustReduce(asked, { type: 'answered' }).asking).toBe(false);
  });

  it('tells the prompt the last few of her and Robes’ lines, never the work lines', () => {
    let s = EMPTY_ADJUST;
    for (let i = 0; i < ASK_THREAD_MAX + 2; i += 1) {
      s = adjustReduce(s, { type: 'her', text: `ask ${i}` });
      s = adjustReduce(s, { type: 'filed', text: 'noticed' });
    }
    s = adjustReduce(s, { type: 'work', text: 'Dressing…' });
    const history = threadHistory(s.thread);
    expect(history).toHaveLength(ASK_THREAD_MAX);
    expect(history.every((l) => l.who === 'her')).toBe(true);
    expect(history.at(-1)?.text).toBe(`ask ${ASK_THREAD_MAX + 1}`);
  });
});
