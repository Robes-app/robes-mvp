import { describe, expect, it } from 'vitest';
import {
  firstLookCandidates,
  greetingName,
  type HomeState,
  isTripAsk,
  mapRows,
  noticedLine,
  ownLook,
  resolveHome,
  styleConfirmed,
} from './index';

const NOW = new Date('2026-10-16T12:00:00Z');
const base: HomeState = {
  styleConfirmed: false,
  twinOnFile: false,
  pics: 0,
  ownLookSaved: false,
  snoozed: {},
};

describe('resolveHome (legacy home_harness stages)', () => {
  it('stage 1: O1 leads, the map holds the other three', () => {
    const r = resolveHome(base, { now: NOW });
    expect(r).toMatchObject({ activated: false, next: 'O1', stage: 1 });
    expect(r.modules).toEqual(['H0', 'H1', 'H2', 'O1', 'G1', 'H4']);
    expect(mapRows(r)).toEqual(['O2', 'O3', 'O4']);
  });

  it('Later snoozes a step for a day: the next open step leads, then it comes back', () => {
    const snoozed = { O1: new Date(NOW.getTime() - 60_000).toISOString() };
    expect(resolveHome({ ...base, snoozed }, { now: NOW }).next).toBe('O2');
    const later = new Date(NOW.getTime() + 25 * 3_600_000);
    expect(resolveHome({ ...base, snoozed }, { now: later }).next).toBe('O1');
  });

  it('every step snoozed: the first undone still leads', () => {
    const at = NOW.toISOString();
    const r = resolveHome({ ...base, snoozed: { O1: at, O2: at, O3: at, O4: at } }, { now: NOW });
    expect(r.next).toBe('O1');
  });

  it('a tapped row expands that step for the session', () => {
    expect(resolveHome(base, { now: NOW, force: 'O4' }).next).toBe('O4');
    // A done step can't be forced.
    expect(resolveHome({ ...base, styleConfirmed: true }, { force: 'O1' }).next).toBe('O2');
  });

  it('stages 2–4 follow the steps in order', () => {
    expect(resolveHome({ ...base, styleConfirmed: true }).stage).toBe(2);
    expect(resolveHome({ ...base, styleConfirmed: true, twinOnFile: true }).next).toBe('O3');
    expect(resolveHome({ ...base, styleConfirmed: true, twinOnFile: true, pics: 5 })).toMatchObject(
      { next: 'O4', stage: 4 },
    );
  });

  it('activated = five photographed pieces and a look from hers; the week and the looks', () => {
    const r = resolveHome({ ...base, pics: 5, ownLookSaved: true });
    expect(r).toMatchObject({ activated: true, next: null, stage: 5 });
    expect(r.modules).toEqual(['H0', 'H1', 'H2', 'H3', 'H4', 'G1']);
    expect(mapRows(r)).toEqual(['O1']);
    const all = resolveHome({
      ...base,
      pics: 9,
      ownLookSaved: true,
      styleConfirmed: true,
      twinOnFile: true,
    });
    expect(all.modules).toEqual(['H0', 'H1', 'H2', 'H3', 'H4']);
    expect(mapRows(all)).toEqual([]);
  });
});

describe('the week from the first saved look (legacy 0.3)', () => {
  it('stands on an un-activated home once any look is saved, ahead of the leading step', () => {
    expect(resolveHome(base, { now: NOW }).modules).not.toContain('H3');
    expect(resolveHome({ ...base, anyLook: true }, { now: NOW }).modules).toEqual([
      'H0',
      'H1',
      'H2',
      'H3',
      'O1',
      'G1',
      'H4',
    ]);
  });
});

describe('the step tests', () => {
  it('two of three style rows confirm Style DNA', () => {
    expect(styleConfirmed({ brands: ['The Row'], icons: [], styles: [] })).toBe(false);
    expect(styleConfirmed({ brands: ['The Row'], icons: ['Jane Birkin'], styles: [] })).toBe(true);
  });

  it('a look from hers: a Robes build, or her pieces and nothing proposed', () => {
    const look = { status: 'saved', source: 'manual', pieces: 2, proposals: 0 };
    expect(ownLook(look)).toBe(true);
    expect(ownLook({ ...look, proposals: 1 })).toBe(false);
    expect(ownLook({ ...look, pieces: 0 })).toBe(false);
    expect(ownLook({ ...look, pieces: 0, proposals: 3, source: 'robes-build' })).toBe(true);
    expect(ownLook({ ...look, status: 'draft' })).toBe(false);
  });
});

describe('module helpers', () => {
  it('O4 candidates: the hero first, then the least worn, then the newest', () => {
    const p = (id: string, hero: number | null, worn: number, at: string) => ({
      id,
      heroPosition: hero,
      wearCount: worn,
      createdAt: at,
    });
    const picks = firstLookCandidates([
      p('w0', null, 0, '2026-10-01'),
      p('w1', null, 2, '2026-10-02'),
      p('w2', 1, 5, '2026-09-01'),
      p('w3', null, 3, '2026-10-03'),
    ]);
    expect(picks.map((x) => x.id)).toEqual(['w2', 'w0', 'w1']);
  });

  it('Robes noticed reads one short line, cut at a word', () => {
    expect(noticedLine('Navy over black')).toBe('Navy over black');
    const line = noticedLine('You reach for soft tailoring in muted neutrals most weeks');
    expect(line.length).toBeLessThanOrEqual(41);
    expect(line.endsWith('…')).toBe(true);
    expect(line).toBe('You reach for soft tailoring in muted…');
  });

  it('a name typed as an email greets alone', () => {
    expect(greetingName('annie@byrobes.com')).toBeNull();
    expect(greetingName(' Annie ')).toBe('Annie');
    expect(greetingName(null)).toBeNull();
  });

  it('a trip-shaped ask is read as one', () => {
    expect(isTripAsk('Four days in Lisbon from tomorrow')).toBe(true);
    expect(isTripAsk('A weekend away in the Cotswolds')).toBe(true);
    expect(isTripAsk('Packing for Rome')).toBe(true);
    expect(isTripAsk('Dinner on Friday')).toBe(false);
    expect(isTripAsk('Something for the weekend')).toBe(false);
  });
});
