import { describe, expect, it } from 'vitest';
import {
  type AdjustEvent,
  adjustReduce,
  dockDot,
  dockNext,
  dockStart,
  EMPTY_ADJUST,
  feedbackBubble,
  followUp,
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

describe('A piece I don’t like (Q6)', () => {
  const run = (events: AdjustEvent[]) => events.reduce(adjustReduce, EMPTY_ADJUST);
  const down: AdjustEvent[] = [{ type: 'question', text: 'How is this look?' }, { type: 'down' }];

  it('asks which piece before it becomes a token', () => {
    const s = run([...down, { type: 'reason', reason: 'piece' }]);
    expect(s.choosingPiece).toBe(true);
    expect(s.reasons).toEqual([]);
    expect(openReasons(s, { weather: true })).not.toContain('piece');
  });

  it('drops "Not the {piece}" in as a token once a piece is tapped', () => {
    const s = run([
      ...down,
      { type: 'reason', reason: 'dressy' },
      { type: 'reason', reason: 'piece' },
      { type: 'piece', key: 'r2' },
    ]);
    expect(s.choosingPiece).toBe(false);
    expect(s.reasons).toEqual(['dressy', 'piece']);
    expect(s.piece).toBe('r2');
    // A tap on the token clears the reason and the piece with it.
    const cleared = adjustReduce(s, { type: 'reason', reason: 'piece' });
    expect(cleared.reasons).toEqual(['dressy']);
    expect(cleared.piece).toBeNull();
  });

  it('offers no piece once three reasons are picked, and ignores a piece tap unasked', () => {
    const full = run([
      ...down,
      { type: 'reason', reason: 'dressy' },
      { type: 'reason', reason: 'fit' },
      { type: 'reason', reason: 'colours' },
      { type: 'reason', reason: 'piece' },
    ]);
    expect(full.choosingPiece).toBe(false);
    expect(run([...down, { type: 'piece', key: 'r1' }]).reasons).toEqual([]);
  });

  it('closes the choice when Restyle it all is picked or she sends', () => {
    const asked = run([...down, { type: 'reason', reason: 'piece' }]);
    expect(adjustReduce(asked, { type: 'restyle' }).choosingPiece).toBe(false);
    const sent = adjustReduce(asked, { type: 'her', text: 'the shoes' });
    expect(sent.choosingPiece).toBe(false);
    expect(sent.piece).toBeNull();
  });
});

describe('the follow-up question (Q1–Q4)', () => {
  it('asks about the occasion after the first look, else how it feels', () => {
    expect(followUp({ first: true, occasion: 'the office' })).toEqual({
      kind: 'occasion',
      occasion: 'the office',
    });
    expect(followUp({ first: true })).toEqual({ kind: 'feel' });
  });

  it('asks about the one reason she sent, with or without words', () => {
    expect(followUp({ reasons: ['dressy'] })).toEqual({ kind: 'reason', reason: 'dressy' });
    expect(followUp({ reasons: ['weather'], text: 'it will rain' })).toEqual({
      kind: 'reason',
      reason: 'weather',
    });
    expect(followUp({ reasons: ['piece'], piece: 'the loafers' })).toEqual({
      kind: 'piece',
      piece: 'the loafers',
    });
    expect(followUp({ restyle: true })).toEqual({ kind: 'restyle' });
  });

  it('asks "Closer?" after typed words alone or two or more reasons', () => {
    expect(followUp({ text: 'roll up the sleeves' })).toEqual({ kind: 'closer' });
    expect(followUp({ reasons: ['dressy', 'colours'] })).toEqual({ kind: 'closer' });
    expect(followUp({ reasons: ['dressy', 'piece'], piece: 'the loafers' })).toEqual({
      kind: 'closer',
    });
  });
});

describe('the dock (K2, K3, K6, K8)', () => {
  it('opens at the bar on a draft and at the sparkle on a saved look', () => {
    expect(dockStart('draft')).toBe('bar');
    expect(dockStart('saved')).toBe('spark');
  });

  it('moves between sparkle, bar and thread', () => {
    expect(dockNext('spark', 'restore')).toBe('bar');
    expect(dockNext('bar', 'expand')).toBe('thread');
    expect(dockNext('thread', 'collapse')).toBe('bar');
    // An empty send or a thumbs up folds it to the sparkle from anywhere.
    expect(dockNext('bar', 'minimise')).toBe('spark');
    expect(dockNext('thread', 'minimise')).toBe('spark');
    // Moves that do not apply leave it where it is.
    expect(dockNext('spark', 'expand')).toBe('spark');
    expect(dockNext('spark', 'collapse')).toBe('spark');
    expect(dockNext('thread', 'restore')).toBe('thread');
  });

  // Annie, 26 Nov (D6): on a saved look the prompt stays open while Robes works, and its question
  // folds it to the sparkle with the redraw; a draft stays where she had it.
  it('folds a saved look to the sparkle once Robes asks about the change, never a draft', () => {
    expect(dockNext('bar', 'answered', 'saved')).toBe('spark');
    expect(dockNext('thread', 'answered', 'saved')).toBe('spark');
    expect(dockNext('spark', 'answered', 'saved')).toBe('spark');
    expect(dockNext('bar', 'answered', 'draft')).toBe('bar');
    expect(dockNext('thread', 'answered', 'draft')).toBe('thread');
    expect(dockNext('spark', 'answered', 'draft')).toBe('spark');
    expect(dockNext('bar', 'answered')).toBe('bar');
  });

  it('marks the sparkle while a question waits', () => {
    const asked = adjustReduce(EMPTY_ADJUST, { type: 'question', text: 'How is this look?' });
    expect(dockDot('spark', asked)).toBe(true);
    expect(dockDot('bar', asked)).toBe(false);
    expect(dockDot('spark', adjustReduce(asked, { type: 'up' }))).toBe(false);
    expect(dockDot('spark', EMPTY_ADJUST)).toBe(false);
  });
});
