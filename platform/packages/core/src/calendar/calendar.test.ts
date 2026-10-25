import { describe, expect, it } from 'vitest';
import { addDays, diaryDays, diaryPick, monthGrid, monthLabel, shiftMonth } from './index';

describe('calendar', () => {
  it('builds a Monday-first month grid', () => {
    const october = monthGrid('2026-10');
    expect(october).toMatchObject({ from: '2026-10-01', days: 31 });
    // 1 Oct 2026 is a Thursday: three blank cells first.
    expect(october.cells.slice(0, 4)).toEqual([null, null, null, '2026-10-01']);
    expect(october.cells.length % 7).toBe(0);
    expect(monthGrid('2027-02').days).toBe(28);
  });

  it('moves across months and years', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(monthLabel('2026-10')).toBe('October 2026');
  });
});

describe('day planning', () => {
  it('groups a window by week, today first', async () => {
    const { weekGroups } = await import('./index');
    // Wednesday 14 Oct 2026 → Sunday 25 Oct.
    const days = Array.from({ length: 12 }, (_, i) => ({ date: addDays('2026-10-14', i) }));
    const groups = weekGroups(days, '2026-10-14');
    expect(groups.map((g) => g.days.length)).toEqual([5, 7]);
    expect(groups[0]).toMatchObject({ range: null, wholeWeek: false });
    expect(groups[1]?.range).toBe('19–25 Oct');
    // From a Monday the first group is the whole week.
    expect(weekGroups([{ date: '2026-10-19' }], '2026-10-19')[0]?.wholeWeek).toBe(true);
  });

  it('labels ranges across months and long dates', async () => {
    const { rangeLabel, longDate, weekdayShort, mondayOf } = await import('./index');
    expect(rangeLabel('2026-09-28', '2026-10-04')).toBe('28 Sep – 4 Oct');
    expect(rangeLabel('2026-10-05', '2026-10-11')).toBe('5–11 Oct');
    const { dayMonth } = await import('./index');
    expect(dayMonth('2026-09-06')).toBe('6 Sep');
    expect(longDate('2026-10-13')).toBe('Tuesday 13 October');
    expect(weekdayShort('2026-10-13')).toBe('Tue');
    expect(mondayOf('2026-10-18')).toBe('2026-10-12');
  });

  it('summarises a day: her words, else the one look, else a count', async () => {
    const { daySummary } = await import('./index');
    const look = (name: string, n: number) => ({ name, pieces: Array.from({ length: n }) });
    expect(daySummary([])).toEqual({ name: null, looks: 0, pieces: 0 });
    expect(daySummary([{ activity: null, look: look('Errands', 3) }])).toEqual({
      name: 'Errands',
      looks: 1,
      pieces: 3,
    });
    expect(
      daySummary([
        { activity: null, look: look('A', 2) },
        { activity: ' Gallery opening ', look: look('B', 4) },
      ]),
    ).toEqual({ name: 'Gallery opening', looks: 2, pieces: 6 });
    expect(
      daySummary([
        { activity: null, look: look('A', 1) },
        { activity: null, look: look('B', 1) },
      ]).name,
    ).toBeNull();
    // Her name for the day leads, with or without looks on it.
    expect(daySummary([], 'Gallery opening').name).toBe('Gallery opening');
    expect(daySummary([{ activity: 'Office', look: look('A', 1) }], 'Gallery').name).toBe(
      'Gallery',
    );
  });
});

describe('trip bands', () => {
  it('runs a trip through its cells, rounding only its ends and heading each week', async () => {
    const { tripBands } = await import('./index');
    const grid = monthGrid('2026-10');
    const bands = tripBands(
      [{ id: 't1', destination: 'Lisbon', dateFrom: '2026-10-10', dateTo: '2026-10-13' }],
      grid.cells,
    );
    expect([...bands.keys()]).toEqual(['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13']);
    expect(bands.get('2026-10-10')).toMatchObject({ first: true, last: false, head: true });
    // 12 Oct is a Monday: the run continues on a new week row, headed again.
    expect(bands.get('2026-10-12')).toMatchObject({ first: false, head: true });
    expect(bands.get('2026-10-11')?.head).toBe(false);
    expect(bands.get('2026-10-13')).toMatchObject({ last: true, range: '10–13 Oct' });
  });

  it('offers today and the fortnight after, the named day preset only when it is one of them', () => {
    const { days, preset } = diaryDays('2026-10-30', '2026-11-02');
    expect(days).toHaveLength(14);
    expect(days[0]).toBe('2026-10-30');
    expect(days[13]).toBe('2026-11-12');
    expect(preset).toBe('2026-11-02');
    expect(diaryDays('2026-10-30', '2026-10-29').preset).toBeNull();
    expect(diaryDays('2026-10-30', null).preset).toBeNull();
    expect(diaryDays('2026-10-30', '2026-12-25').preset).toBeNull();
  });
});

describe('diaryPick', () => {
  const clear = { pinned: false, worn: false, filed: false };

  it('files a look on a day ahead, and says when something is already there', () => {
    expect(diaryPick('2026-10-25', '2026-10-23', clear)).toEqual({
      past: false,
      suffix: null,
      action: 'put',
    });
    expect(diaryPick('2026-10-25', '2026-10-23', { ...clear, filed: true }).suffix).toBe('filed');
  });

  it('opens the day when this look is already pinned to it', () => {
    expect(diaryPick('2026-10-25', '2026-10-23', { ...clear, pinned: true }).action).toBe(
      'already',
    );
  });

  // Beta's retro path, which the day-pill sheet could not reach at all.
  it('records a wear on a day gone by, and refuses a second one', () => {
    expect(diaryPick('2026-10-20', '2026-10-23', clear)).toEqual({
      past: true,
      suffix: 'worn',
      action: 'record',
    });
    expect(diaryPick('2026-10-20', '2026-10-23', { ...clear, worn: true }).action).toBe('recorded');
  });

  it('treats today as a day ahead, so it files rather than records', () => {
    expect(diaryPick('2026-10-23', '2026-10-23', clear).action).toBe('put');
  });
});
