import { describe, expect, it } from 'vitest';
import * as v8 from './v8';
import { buildSystem, buildUser, fakeOutput, Output, occasionOf, VERSION } from './v9';

const ctx: Parameters<typeof buildSystem>[0] = {
  firstName: null,
  gender: 'woman',
  styleIcons: [],
  closet: [],
  styleDna: {},
  wardrobeCount: 0,
};

describe('style-piece v9 — one look for her words, and its occasion', () => {
  it('is version 9, and v8 byte for byte for the piece door', () => {
    expect(VERSION).toBe(9);
    expect(buildSystem(ctx, 'piece')).toBe(v8.buildSystem(ctx, 'piece'));
    expect(buildSystem(ctx, 'dress-me')).toBe(v8.buildSystem(ctx, 'dress-me'));
  });

  it('asks for one way and the occasion when her words make the look', () => {
    const system = buildSystem(ctx, 'dress-me', {}, null, { one: true });
    expect(system.startsWith(v8.buildSystem(ctx, 'dress-me'))).toBe(true);
    expect(system).toContain('ONE WAY ONLY');
    expect(system).toContain('write exactly ONE entry in "ways"');
    expect(system).toContain('THE OCCASION — also return "occasion"');
  });

  it('keeps the occasion to a word or two, and drops anything that is not one', () => {
    expect(occasionOf({ occasion: ' Brunch ' })).toBe('brunch');
    expect(occasionOf({ occasion: 'the office' })).toBe('the office');
    expect(occasionOf({ occasion: "a friend's wedding" })).toBe("a friend's wedding");
    expect(occasionOf({ occasion: '' })).toBe('');
    expect(occasionOf({})).toBe('');
    // A phrase, a sentence, punctuation or a run of words reads badly in the question (F4).
    expect(occasionOf({ occasion: 'a relaxed weekend brunch with friends' })).toBe('');
    expect(occasionOf({ occasion: 'brunch, then a walk' })).toBe('');
    expect(occasionOf({ occasion: 'Brunch.' })).toBe('');
    expect(occasionOf({ occasion: 'one two three four' })).toBe('');
  });

  it('still parses an answer with no occasion, and the offline fixture gives one way', () => {
    const three = fakeOutput({ label: 'Dinner', closetSize: 0, refine: false, dressMe: true });
    expect(Output.parse(three).occasion).toBeUndefined();
    expect(three.ways).toHaveLength(3);
    const one = fakeOutput({
      label: 'Dinner',
      closetSize: 0,
      refine: false,
      dressMe: true,
      one: true,
    });
    expect(one.ways).toHaveLength(1);
    expect(occasionOf(one)).toBe('dinner');
  });

  it('carries the words typed beside a piece into the styling call, fenced', () => {
    const piece = {
      mode: 'piece' as const,
      anchor: { type: 'piece' as const, label: 'Camel coat' },
    };
    const plain = buildUser(piece, { hasPhoto: false });
    expect(plain).toBe(v8.buildUser(piece, { hasPhoto: false }));
    // Until v9 these words reached the picture and never the styling call.
    expect(plain).not.toContain('a gallery opening');
    const said = buildUser(piece, { hasPhoto: false, occasion: ' a gallery opening ' });
    expect(said.startsWith(plain)).toBe(true);
    expect(said).toContain(
      'What the looks are for, in her words: <user_input>\na gallery opening\n</user_input>',
    );
    // Her words for a day already are the brief: nothing is added to that turn.
    const day = { mode: 'dress-me' as const, prompt: 'dinner', day: null };
    expect(buildUser(day, { hasPhoto: false, occasion: 'dinner' })).toBe(
      v8.buildUser(day, { hasPhoto: false }),
    );
  });
});
