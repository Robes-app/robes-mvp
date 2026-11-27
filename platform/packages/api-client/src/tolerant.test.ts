import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseTolerantly } from './tolerant';

const Piece = z.object({ id: z.string(), kind: z.enum(['top', 'shoe']) });
const Schema = z.object({
  id: z.string(),
  warmth: z.number().int().min(0).max(5),
  name: z.string().max(5),
  season: z.enum(['spring', 'summer']).optional(),
  colour: z.enum(['ink', 'cream']).nullable(),
  mood: z.enum(['calm', 'bold']).default('calm'),
  pieces: z.array(Piece),
  cover: z.object({ url: z.string(), fit: z.enum(['crop', 'pad']) }).nullable(),
});
const good = {
  id: 'a',
  warmth: 3,
  name: 'Look',
  colour: 'ink',
  mood: 'bold',
  pieces: [{ id: 'p', kind: 'top' }],
  cover: { url: 'u', fit: 'crop' },
};

describe('parseTolerantly (ADR-022)', () => {
  it('passes a valid body through untouched, with no drift', () => {
    expect(parseTolerantly(Schema, good)).toEqual({ success: true, data: good, drift: null });
  });

  it('clamps a wider range and cuts a longer string (#259 broke 0.7.0 on a wider range)', () => {
    const r = parseTolerantly(Schema, { ...good, warmth: 7, name: 'A longer name' });
    expect(r).toMatchObject({ success: true, data: { warmth: 5, name: 'A lon' } });
    expect(r.success && r.drift?.issues).toHaveLength(2);
  });

  it('reads a new value as null, absent or the default, as the field allows', () => {
    const r = parseTolerantly(Schema, { ...good, season: 'monsoon', colour: 'rust', mood: 'wild' });
    expect(r).toMatchObject({ success: true, data: { colour: null, mood: 'calm' } });
    expect(r.success && 'season' in r.data).toBe(false);
  });

  it('drops the list item whose required field holds a new value, keeping the rest', () => {
    const pieces = [
      { id: 'p1', kind: 'bag' },
      { id: 'p2', kind: 'shoe' },
      { id: 'p3', kind: 'hat' },
    ];
    const body = { ...good, pieces };
    const r = parseTolerantly(Schema, body);
    expect(r).toMatchObject({ success: true, data: { pieces: [{ id: 'p2', kind: 'shoe' }] } });
    expect(body.pieces).toHaveLength(3);
  });

  it('a required field that can only be dropped takes its nullable object with it', () => {
    const r = parseTolerantly(Schema, { ...good, cover: { url: 'u', fit: 'stretch' } });
    expect(r).toMatchObject({ success: true, data: { cover: null } });
  });

  it('mends a long list in a few rounds, keeping every item it can read', () => {
    const pieces = Array.from({ length: 500 }, (_, i) => ({
      id: `p${i}`,
      kind: i % 2 ? 'bag' : 'top',
    }));
    const r = parseTolerantly(Schema, { ...good, warmth: 9, pieces });
    expect(r.success && r.data.pieces.map((p) => p.id)).toEqual(
      pieces.filter((p) => p.kind === 'top').map((p) => p.id),
    );
    expect(r.success && r.data.warmth).toBe(5);
  });

  it('still fails when a required field outside any list is unreadable', () => {
    const r = parseTolerantly(Schema, { ...good, id: 42 });
    expect(r.success).toBe(false);
  });
});
