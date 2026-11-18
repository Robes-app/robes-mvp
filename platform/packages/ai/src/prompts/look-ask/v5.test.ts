import { describe, expect, it } from 'vitest';
import * as v4 from './v4';
import {
  type AskContext,
  buildSystem,
  fakeOutput,
  normaliseAnswer,
  Output,
  REPLACED,
  VERSION,
} from './v5';

const ctx: AskContext = {
  gender: 'woman',
  styleDna: {},
  styleIcons: [],
  pool: { kind: 'wardrobe', items: [] },
  rack: [
    {
      name: 'Camel wool coat',
      category: 'Outerwear',
      owned: true,
      keep: false,
      was: null,
      styled: null,
    },
  ],
  context: {},
  thread: [],
};
const out = (over: Partial<Output>): Output =>
  Output.parse({
    intent: 'picture',
    reply: '',
    swaps: [],
    back: [],
    styled: [],
    draft: '',
    rule: '',
    follow_up: '',
    ...over,
  });

describe('look-ask v5', () => {
  it('is version 5', () => {
    expect(VERSION).toBe(5);
  });

  it('reads a note about the whole picture as "picture", and how one piece is worn as "styled"', () => {
    const system = buildSystem(ctx);
    expect(system).toContain('THE PICTURE ITSELF');
    expect(system).toContain('intent "picture"');
    expect(system).toContain('how ONE piece is worn is "styled", never "picture"');
  });

  it('replaces sentences v4 still carries', () => {
    const before = v4.buildSystem(ctx);
    for (const sentence of REPLACED) expect(before).toContain(sentence);
  });

  it('carries her picture note and changes nothing on the look', () => {
    const answer = normaliseAnswer(
      out({
        picture: '  a  different pose, walking ',
        reply: 'Done.',
        swaps: [
          {
            i: 0,
            pool_index: -1,
            name: 'x',
            brand: '',
            retailer_hint: '',
            price_point: '',
            category: 'Tops',
          },
        ],
        follow_up: 'How is the pose?',
      }),
      ctx,
    );
    expect(answer.intent).toBe('picture');
    expect(answer.picture).toBe('a different pose, walking');
    expect(answer.swaps).toEqual([]);
    expect(answer.adds).toEqual([]);
    expect(answer.styled).toEqual([]);
    // Shown, never told: the client asks "Closer?" (docked prompt PRD M5).
    expect(answer.reply).toBe('');
    expect(answer.followUp).toBe('');
  });

  it('treats a picture answer with no note as nothing changed', () => {
    const answer = normaliseAnswer(out({ picture: '   ', reply: 'Say a bit more?' }), ctx);
    expect(answer.intent).toBe('none');
    expect(answer.picture).toBe('');
  });

  it('carries no picture note on any other intent', () => {
    const answer = normaliseAnswer(out({ intent: 'none', picture: 'outdoors', reply: 'x' }), ctx);
    expect(answer.intent).toBe('none');
    expect(answer.picture).toBe('');
  });

  it('reads an answer from before the picture existed', () => {
    const old = Output.parse({
      intent: 'none',
      reply: 'x',
      swaps: [],
      back: [],
      styled: [],
      draft: '',
      rule: '',
    });
    expect(old.picture).toBe('');
  });

  it('runs offline: a note about the pose comes back as a picture note', () => {
    const fake = fakeOutput(
      buildSystem(ctx),
      'She says: <user_input>\na different pose\n</user_input>',
    );
    expect(fake.intent).toBe('picture');
    expect(fake.picture).toBe('a different pose');
  });
});
