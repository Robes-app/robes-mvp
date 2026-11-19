import { describe, expect, it } from 'vitest';
import { signUpFirstName } from './index';

describe('signUpFirstName', () => {
  it('keeps the first word she typed', () => {
    expect(signUpFirstName('  Isabel Marant ', null)).toBe('Isabel');
  });
  it('saves nothing when she left it empty', () => {
    expect(signUpFirstName('   ', null)).toBeNull();
  });
  it('never renames an account that already has a name', () => {
    expect(signUpFirstName('Isabel', 'Niall')).toBeNull();
  });
  it('names an account whose name is blank', () => {
    expect(signUpFirstName('Isabel', ' ')).toBe('Isabel');
  });
});
