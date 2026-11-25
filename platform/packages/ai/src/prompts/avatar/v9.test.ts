import type { TwinSpec } from '@robes/core/avatar';
import { describe, expect, it } from 'vitest';
import { twinFigureLine as v8Line, buildTwinPrompt as v8Twin } from './v8';
import { buildTwinPrompt, twinFigureLine, VERSION } from './v9';

const spec = (over: Partial<TwinSpec> = {}): TwinSpec => ({
  gender: 'woman',
  heightCm: 168,
  sizeUk: 12,
  stops: { shoulders: 0, bust: 1, hips: 2, waist: 0 },
  waistDiff: 20,
  age: 35,
  skin: 3,
  hair: 1,
  skinSet: false,
  hairSet: false,
  hasFace: false,
  ...over,
});

describe('avatar v9 (his waist scale, 24 Nov)', () => {
  it('draws her exactly as v8 did', () => {
    expect(VERSION).toBe(9);
    expect(twinFigureLine(spec())).toBe(v8Line(spec()));
    expect(buildTwinPrompt(spec())).toBe(v8Twin(spec()));
  });

  it('names his waist from his scale, never his hips', () => {
    const him = spec({ gender: 'man', stops: { shoulders: 1, bust: 1, hips: 2, waist: 1 } });
    const line = twinFigureLine(him);
    expect(line).toContain('a fuller waist');
    expect(line).toContain('a broad chest');
    expect(line).not.toContain('very full, rounded hips');
    expect(line).not.toContain('defined waist');
    expect(line.endsWith('.')).toBe(true);
    expect(buildTwinPrompt(him)).toContain(line);
  });

  it('says nothing of his waist at its middle', () => {
    const line = twinFigureLine(
      spec({ gender: 'man', stops: { shoulders: 0, bust: 0, hips: 0, waist: 0 } }),
    );
    expect(line).not.toContain('waist');
  });
});
