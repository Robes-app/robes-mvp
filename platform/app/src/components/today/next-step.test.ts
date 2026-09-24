import { describe, expect, it } from 'vitest';
import { nextStepCopy } from './next-step';

const look = { id: '11111111-1111-4111-8111-111111111111' };
const entry = (worn: boolean) => ({ worn, entry: { look } }) as never;

describe('nextStepCopy', () => {
  it('maps each rule to its sentence and door', () => {
    expect(nextStepCopy({ nextStep: { rule: 'start' }, today: [] }).door?.href).toBe(
      '/wardrobe/add',
    );
    expect(nextStepCopy({ nextStep: { rule: 'five', remaining: 1 }, today: [] }).text).toMatch(
      /^One more piece/,
    );
    expect(nextStepCopy({ nextStep: { rule: 'five', remaining: 3 }, today: [] }).text).toMatch(
      /^3 more pieces/,
    );
    expect(nextStepCopy({ nextStep: { rule: 'build' }, today: [] }).door?.href).toBe('/looks/new');
    expect(nextStepCopy({ nextStep: { rule: 'week' }, today: [] }).door?.href).toBe('/plan');
  });

  it('opens the unworn look for wear, and has no door without a rule', () => {
    const wear = nextStepCopy({ nextStep: { rule: 'wear' }, today: [entry(true), entry(false)] });
    expect(wear.door?.href).toBe(`/look/${look.id}`);
    expect(nextStepCopy({ nextStep: null, today: [] })).toEqual({
      text: 'What are we dressing for today?',
      door: null,
    });
  });
});
