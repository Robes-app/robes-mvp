import { describe, expect, it } from 'vitest';
import { compareVersions } from './version';

describe('compareVersions', () => {
  it('orders dotted versions numerically', () => {
    expect(compareVersions('1.10.0', '1.9.9')).toBe(1);
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('0.9', '1')).toBe(-1);
    expect(compareVersions('garbage', '0.0.1')).toBe(-1);
  });
});
