import { describe, expect, it } from 'vitest';
import {
  type AdjustEvent,
  adjustReduce,
  EMPTY_ADJUST,
  feedbackBubble,
  isWorking,
  openReasons,
  threadHistory,
} from './adjust';
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

describe('the question about a look', () => {
  const run = (events: AdjustEvent[]) => events.reduce(adjustReduce, EMPTY_ADJUST);
  const asked: AdjustEvent[] = [
    { type: 'her', text: 'relaxed weekend brunch' },
    { type: 'question', text: 'How is this look?' },
  ];

  it('stands apart from the thread, leaves a work line standing, and waits for one thumb', () => {
    const s = run(asked);
    expect(s.question).toBe('How is this look?');
    expect(s.verdict).toBe('ask');
    expect(s.thread.map((l) => l.text)).toEqual(['relaxed weekend brunch']);
    // The picture may still be drawing when Robes asks: its line stays.
    const drawing = run([
      { type: 'work', text: 'Dressing it…' },
      { type: 'question', text: 'How about now?' },
    ]);
    expect(isWorking(drawing)).toBe(true);
    // One answer per question: a second thumb changes nothing.
    const up = run([...asked, { type: 'up' }, { type: 'down' }]);
    expect(up.verdict).toBe('up');
  });

  it('takes up to three reasons after a thumbs down; a tap on a picked one clears it', () => {
    let s = run([...asked, { type: 'reason', reason: 'dressy' }]);
    // No reasons before the thumb.
    expect(s.reasons).toEqual([]);
    s = run([
      ...asked,
      { type: 'down' },
      { type: 'reason', reason: 'dressy' },
      { type: 'reason', reason: 'colours' },
      { type: 'reason', reason: 'fit' },
      { type: 'reason', reason: 'piece' },
    ]);
    expect(s.reasons).toEqual(['dressy', 'colours', 'fit']);
    expect(openReasons(s, { weather: true })).toEqual([]);
    s = adjustReduce(s, { type: 'reason', reason: 'colours' });
    expect(s.reasons).toEqual(['dressy', 'fit']);
    expect(openReasons(s, { weather: true })).toEqual(['casual', 'colours', 'piece', 'weather']);
    // A look with no weather never offers it (a saved look; the weather left out).
    expect(openReasons(s, { weather: false })).toEqual(['casual', 'colours', 'piece']);
  });

  it('keeps Restyle it all alone: it clears the reasons, and a reason clears it', () => {
    let s = run([...asked, { type: 'down' }, { type: 'reason', reason: 'dressy' }]);
    s = adjustReduce(s, { type: 'restyle' });
    expect(s.restyle).toBe(true);
    expect(s.reasons).toEqual([]);
    expect(openReasons(s, { weather: true })).toEqual([]);
    s = adjustReduce(s, { type: 'reason', reason: 'fit' });
    expect(s.restyle).toBe(false);
    expect(s.reasons).toEqual(['fit']);
  });

  it('closes when she sends, thumb or no thumb, and joins the thread above her line', () => {
    const s = run([...asked, { type: 'her', text: 'swap the trainers for boots' }]);
    expect(s.question).toBeNull();
    expect(s.verdict).toBeNull();
    expect(s.thread.map((l) => [l.who, l.text])).toEqual([
      ['her', 'relaxed weekend brunch'],
      ['robes', 'How is this look?'],
      ['her', 'swap the trainers for boots'],
    ]);
    expect(new Set(s.thread.map((l) => l.id)).size).toBe(3);
    const picked = run([
      ...asked,
      { type: 'down' },
      { type: 'reason', reason: 'dressy' },
      { type: 'her', text: 'Too dressy' },
    ]);
    expect(picked.reasons).toEqual([]);
    expect(picked.restyle).toBe(false);
  });

  it('writes her choice as one bubble: what she tapped, then her words in quotes', () => {
    expect(feedbackBubble(['Too dressy', 'The colours'], '')).toBe('Too dressy · The colours');
    expect(feedbackBubble(['The colours'], ' less matching ')).toBe(
      'The colours · “less matching”',
    );
    expect(feedbackBubble([], 'swap the trainers for boots')).toBe('swap the trainers for boots');
  });
});
